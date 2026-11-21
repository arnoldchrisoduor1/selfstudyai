use chrono::{DateTime, Duration, NaiveDate, Utc};
use learning::{
    calculate_points, classify_integrity, compute_streak, earns_test_bonus, format_due,
    level_from_points, local_date, order_due_queue, overdue_days, parse_fixed_offset_secs,
    schedule_with_clock, score_to_rating, PointsInput,
};
use questions::strip_answer_fields;
use serde::Serialize;
use storage::{
    ActivityIncrement, AttemptRepository, CardStateRepository, DailyActivityRepository,
    FinalTestRepository, IntegrityEventRepository, LearningSettingsRepository,
    NewFinalTestRow, NewPointsLedgerRow, NewReviewLogRow, NewUsageEvent, PointsLedgerRepository,
    QuestionRepository, ReviewLogRepository, StudySessionRepository, TestQuestionRepository,
    UsageEventRepository,
};
use study_core::{
    Attempt, AttemptVerdict, CognitiveLevel, DailyActivity, DailyGoalProgress, Dashboard,
    DueQueueItem, FeedbackTiming, FinalTest, HeatmapDay, IntegrityStatus, LearningSettingsPatch,
    NewIntegrityEvent, Question, QuestionFilter, QuestionKind,
    ResolvedLearningSettings, SessionItemKind, StreakInfo, StudyMode, StudySession,
    TestConfig, TestQuestionResult, TestResults, TestStatus, TrendPoint,
};

use crate::error::ApiError;
use crate::services::{citation_source_text, load_chat_provider};
use crate::state::AppState;
use study_core::{CardLearningState, CardState, QuestionPublic, SubmitAnswer, TopicBreakdown};
use questions::{grade_from_ai_json, grade_mcq, grading_system_prompt, grading_user_prompt};
use ai::ChatMessage;

const LEDGER_REASON_ANSWER: &str = "answer";
const LEDGER_REASON_OVERRIDE: &str = "override_compensation";

pub async fn get_resolved_settings(
    state: &AppState,
    subject_id: Option<&str>,
) -> Result<ResolvedLearningSettings, ApiError> {
    Ok(state.store.get_resolved(subject_id).await?)
}

pub async fn patch_learning_settings(
    state: &AppState,
    subject_id: Option<&str>,
    patch: LearningSettingsPatch,
) -> Result<ResolvedLearningSettings, ApiError> {
    if let Some(id) = subject_id {
        state.store.update_subject_patch(id, patch).await?;
    } else {
        state.store.update_user_patch(patch).await?;
    }
    get_resolved_settings(state, subject_id).await
}

pub async fn due_queue(
    state: &AppState,
    subject_id: Option<&str>,
) -> Result<Vec<DueQueueItem>, ApiError> {
    let now = state.clock.now_utc();
    let as_of = format_due(now);
    let cards = state.store.list_due(&as_of).await?;
    let mut items = Vec::new();
    for card in cards {
        let Some(question) = state.store.get_question(&card.question_id).await? else {
            continue;
        };
        if let Some(sid) = subject_id {
            if question.subject_id != sid {
                continue;
            }
        }
        items.push(DueQueueItem {
            question_id: card.question_id.clone(),
            overdue_days: overdue_days(&card.due, now),
            card_state: card,
        });
    }
    Ok(order_due_queue(items, now))
}

pub async fn backfill(state: &AppState) -> Result<u32, ApiError> {
    Ok(state.store.backfill_card_states_from_attempts().await?)
}

fn day_start_utc(date: NaiveDate, timezone: &str) -> DateTime<Utc> {
    let offset_secs = parse_fixed_offset_secs(timezone).unwrap_or(0);
    let naive = date.and_hms_opt(0, 0, 0).expect("midnight");
    let utc_midnight = DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc)
        - Duration::seconds(offset_secs);
    utc_midnight
}

pub async fn record_learning_outcome(
    state: &AppState,
    attempt: &Attempt,
    question: &Question,
    settings: &ResolvedLearningSettings,
    in_test: bool,
    integrity_earns_bonus: bool,
) -> Result<(), ApiError> {
    if state.store.exists_for_attempt(&attempt.id).await? {
        return Ok(());
    }

    let retention = settings.settings.desired_retention;
    let rating = score_to_rating(attempt.score as f64, &settings.settings.rating_thresholds);

    let prior = state.store.get_by_question(&question.id).await?;
    let state_before = prior
        .as_ref()
        .map(|c| c.state.clone())
        .unwrap_or_else(|| CardLearningState::New.as_str().to_owned());

    let outcome = schedule_with_clock(
        state.scheduler.as_ref(),
        prior.as_ref(),
        rating,
        state.clock.as_ref(),
        retention,
    )
    .map_err(|e| ApiError::InvalidOwned(e.to_string()))?;

    let stamp = state.clock.now_rfc3339();
    let card = CardState {
        id: prior.as_ref().map(|c| c.id.clone()).unwrap_or_default(),
        question_id: question.id.clone(),
        due: format_due(outcome.due),
        stability: outcome.stability,
        difficulty: outcome.difficulty,
        state: outcome.state.as_str().to_owned(),
        reps: outcome.reps,
        lapses: outcome.lapses,
        last_review: Some(format_due(outcome.last_review)),
        created_at: prior
            .as_ref()
            .map(|c| c.created_at.clone())
            .unwrap_or_else(|| stamp.clone()),
        updated_at: stamp,
    };
    state.store.upsert(card).await?;

    ReviewLogRepository::create(
        &state.store,
        NewReviewLogRow {
            question_id: question.id.clone(),
            attempt_id: attempt.id.clone(),
            rating: rating.as_str().to_owned(),
            state_before,
            state_after: outcome.state.as_str().to_owned(),
            scheduled_days: outcome.scheduled_days,
            elapsed_days: outcome.elapsed_days,
        },
    )
    .await?;

    let today = local_date(state.clock.now_utc(), &settings.settings.timezone);
    let since = format_due(day_start_utc(today, &settings.settings.timezone));
    let prior_count = state
        .store
        .prior_attempts_same_day(&question.id, &since, &attempt.id)
        .await?;
    let already_answered_today = prior_count > 0;

    let streak = streak_state(state).await?;
    let kind = QuestionKind::parse(&question.kind).map_err(ApiError::Invalid)?;
    let level = CognitiveLevel::parse(&question.cognitive_level).map_err(ApiError::Invalid)?;

    let breakdown = calculate_points(PointsInput {
        kind,
        level,
        score: attempt.score as f64,
        is_gold: question.is_gold,
        streak_days: streak.current,
        in_test,
        already_answered_today,
        integrity_earns_bonus,
        config: &settings.settings.points,
    });

    if breakdown.total != 0 {
        let _ = state
            .store
            .append(NewPointsLedgerRow {
                amount: breakdown.total,
                reason: LEDGER_REASON_ANSWER.to_owned(),
                attempt_id: Some(attempt.id.clone()),
                test_id: attempt.test_id.clone(),
                multiplier_breakdown: serde_json::to_value(&breakdown)
                    .unwrap_or(serde_json::json!({})),
            })
            .await?;
    }

    update_daily_activity(
        state,
        &settings.settings.timezone,
        settings.settings.daily_goal,
        breakdown.total,
    )
    .await?;
    Ok(())
}

async fn update_daily_activity(
    state: &AppState,
    timezone: &str,
    daily_goal: u32,
    points: i32,
) -> Result<bool, ApiError> {
    let today = local_date(state.clock.now_utc(), timezone);
    let date = today.format("%Y-%m-%d").to_string();
    let existing = state.store.get_by_date(&date).await?;
    let answered = existing.as_ref().map(|d| d.questions_answered).unwrap_or(0) + 1;
    let goal_met = answered >= daily_goal as i32;
    let delta = ActivityIncrement {
        questions_answered: 1,
        points_earned: points,
        minutes_studied: 0,
        goal_met,
    };
    DailyActivityRepository::upsert_increment(&state.store, &date, delta).await?;
    Ok(goal_met)
}

pub async fn streak_info(state: &AppState) -> Result<StreakInfo, ApiError> {
    let resolved = state.store.get_resolved(None).await?;
    Ok(streak_state_with_settings(state, &resolved).await?)
}

async fn streak_state(state: &AppState) -> Result<StreakInfo, ApiError> {
    let resolved = state.store.get_resolved(None).await?;
    streak_state_with_settings(state, &resolved).await
}

async fn streak_state_with_settings(
    state: &AppState,
    resolved: &ResolvedLearningSettings,
) -> Result<StreakInfo, ApiError> {
    let activities = DailyActivityRepository::list_all(&state.store).await?;
    let today = local_date(state.clock.now_utc(), &resolved.settings.timezone);
    let computed = compute_streak(&activities, today);
    Ok(StreakInfo {
        current: computed.current,
        longest: computed.longest,
        timezone: resolved.settings.timezone.clone(),
    })
}

pub async fn list_daily_activity(
    state: &AppState,
    from: Option<&str>,
    to: Option<&str>,
) -> Result<Vec<DailyActivity>, ApiError> {
    match (from, to) {
        (Some(f), Some(t)) => Ok(DailyActivityRepository::list_range(&state.store, f, t).await?),
        _ => Ok(DailyActivityRepository::list_all(&state.store).await?),
    }
}

pub async fn points_ledger(state: &AppState, limit: u32) -> Result<Vec<study_core::PointsLedgerEntry>, ApiError> {
    Ok(PointsLedgerRepository::list(&state.store, limit).await?)
}

pub async fn build_dashboard(state: &AppState) -> Result<Dashboard, ApiError> {
    let resolved = state.store.get_resolved(None).await?;
    let total_points = PointsLedgerRepository::sum_total(&state.store).await?;
    let (level, level_progress) = level_from_points(total_points);
    let streak = streak_state_with_settings(state, &resolved).await?;
    let now = state.clock.now_utc();
    let today_date = local_date(now, &resolved.settings.timezone);
    let today_str = today_date.format("%Y-%m-%d").to_string();
    let today_row = state.store.get_by_date(&today_str).await?;
    let today = DailyGoalProgress {
        date: today_str.clone(),
        answered: today_row.as_ref().map(|d| d.questions_answered as u32).unwrap_or(0),
        goal: resolved.settings.daily_goal,
        points_earned: today_row.as_ref().map(|d| d.points_earned).unwrap_or(0),
        goal_met: today_row.as_ref().map(|d| d.goal_met).unwrap_or(false),
    };

    let due_items = due_queue(state, None).await?;
    let due_today = due_items
        .iter()
        .filter(|i| i.overdue_days <= 0.0)
        .count() as u32;

    let activities = DailyActivityRepository::list_all(&state.store).await?;
    let heatmap: Vec<HeatmapDay> = activities
        .iter()
        .rev()
        .take(30)
        .map(|d| HeatmapDay {
            date: d.date.clone(),
            questions_answered: d.questions_answered,
            points_earned: d.points_earned,
            goal_met: d.goal_met,
        })
        .collect();

    let accuracy_trend: Vec<TrendPoint> = activities
        .iter()
        .map(|d| TrendPoint {
            date: d.date.clone(),
            value: if d.questions_answered > 0 {
                d.points_earned as f64 / d.questions_answered as f64
            } else {
                0.0
            },
        })
        .collect();
    let points_trend: Vec<TrendPoint> = activities
        .iter()
        .map(|d| TrendPoint {
            date: d.date.clone(),
            value: d.points_earned as f64,
        })
        .collect();

    let recent_tests = FinalTestRepository::list(&state.store, None)
        .await?
        .into_iter()
        .take(5)
        .collect();

    Ok(Dashboard {
        total_points,
        level,
        level_progress,
        streak,
        today,
        due_today,
        heatmap,
        accuracy_trend,
        points_trend,
        mastery: Vec::new(),
        weakest_topics: Vec::new(),
        recent_tests,
    })
}

pub async fn override_attempt_learning(
    state: &AppState,
    attempt_id: &str,
    verdict: &str,
    score: f32,
) -> Result<Attempt, ApiError> {
    let Some(attempt) = state
        .store
        .override_attempt(attempt_id, verdict, score)
        .await?
    else {
        return Err(ApiError::NotFound);
    };
    let question = state
        .store
        .get_question(&attempt.question_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    let resolved = state
        .store
        .get_resolved(Some(&question.subject_id))
        .await?;

    if state.store.exists_for_attempt(attempt_id).await? {
        let _ = state.store.delete_for_attempt(attempt_id).await?;
        apply_override_compensation(state, &attempt, &question, &resolved, score).await?;
    }
    record_learning_outcome(state, &attempt, &question, &resolved, attempt.test_id.is_some(), true)
        .await?;
    Ok(attempt)
}

async fn apply_override_compensation(
    state: &AppState,
    attempt: &Attempt,
    question: &Question,
    resolved: &ResolvedLearningSettings,
    new_score: f32,
) -> Result<(), ApiError> {
    let entries = PointsLedgerRepository::list(&state.store, 500).await?;
    let old = entries
        .iter()
        .find(|e| e.attempt_id.as_deref() == Some(&attempt.id) && e.reason == LEDGER_REASON_ANSWER)
        .map(|e| e.amount)
        .unwrap_or(0);

    let streak = streak_state(state).await?;
    let kind = QuestionKind::parse(&question.kind).map_err(ApiError::Invalid)?;
    let level = CognitiveLevel::parse(&question.cognitive_level).map_err(ApiError::Invalid)?;
    let breakdown = calculate_points(PointsInput {
        kind,
        level,
        score: new_score as f64,
        is_gold: question.is_gold,
        streak_days: streak.current,
        in_test: attempt.test_id.is_some(),
        already_answered_today: false,
        integrity_earns_bonus: true,
        config: &resolved.settings.points,
    });
    let delta = breakdown.total - old;
    if delta != 0 {
        let _ = state
            .store
            .append(NewPointsLedgerRow {
                amount: delta,
                reason: LEDGER_REASON_OVERRIDE.to_owned(),
                attempt_id: Some(attempt.id.clone()),
                test_id: attempt.test_id.clone(),
                multiplier_breakdown: serde_json::to_value(&breakdown)
                    .unwrap_or(serde_json::json!({})),
            })
            .await?;
    }
    Ok(())
}

pub async fn attach_review_burst(
    state: &AppState,
    session: &StudySession,
    burst_index: i32,
) -> Result<Vec<storage::SessionQuestion>, ApiError> {
    let mode = StudyMode::parse(session.mode.trim()).unwrap_or(StudyMode::Practice);
    if matches!(mode, StudyMode::Practice) {
        return Err(ApiError::Invalid("not a review session"));
    }

    let resolved = state.store.get_resolved(Some(&session.subject_id)).await?;
    let now = state.clock.now_utc();
    let due = due_queue(state, Some(&session.subject_id)).await?;
    let burst_size = session.burst_size.max(1) as usize;

    let (review_take, new_slots) = match mode {
        StudyMode::ReviewDue => (burst_size.min(due.len()), 0usize),
        StudyMode::Mixed => {
            let review_n =
                ((burst_size as f64) * resolved.settings.review_new_ratio).round() as usize;
            let review_n = review_n.min(due.len()).min(burst_size);
            (review_n, burst_size.saturating_sub(review_n))
        }
        StudyMode::Practice => unreachable!(),
    };

    let review_ids: Vec<String> = due
        .iter()
        .take(review_take)
        .map(|d| d.question_id.clone())
        .collect();

    let mut links = Vec::new();
    if !review_ids.is_empty() {
        links = state
            .store
            .add_session_questions(
                &session.id,
                &review_ids,
                burst_index,
                Some(SessionItemKind::Review.as_str()),
            )
            .await?;
    }

    if new_slots > 0 && matches!(mode, StudyMode::Mixed) {
        let cap = resolved.settings.new_questions_per_day as usize;
        let new_take = new_slots.min(cap);
        if new_take > 0 {
            let questions = state
                .store
                .list_questions(QuestionFilter {
                    subject_id: Some(session.subject_id.clone()),
                    source_id: None,
                    topic_id: None,
                    kind: None,
                    cognitive_level: None,
                    gold: None,
                    gold_status: None,
                    grounding: None,
                    status: Some("active".into()),
                })
                .await?;
            let due_set: std::collections::HashSet<_> =
                due.iter().map(|d| d.question_id.as_str()).collect();
            let new_ids: Vec<String> = questions
                .into_iter()
                .filter(|q| !due_set.contains(q.id.as_str()))
                .take(new_take)
                .map(|q| q.id)
                .collect();
            if !new_ids.is_empty() {
                let generated = state
                    .store
                    .add_session_questions(
                        &session.id,
                        &new_ids,
                        burst_index,
                        Some(SessionItemKind::New.as_str()),
                    )
                    .await?;
                links.extend(generated);
            }
        }
    }
    let _ = now;
    Ok(links)
}

// ─── Tests ───────────────────────────────────────────────────────────────────


#[derive(Debug, Serialize)]
pub struct TestDetail {
    pub test: FinalTest,
    pub questions: Vec<QuestionPublic>,
}

pub async fn create_test(state: &AppState, config: TestConfig) -> Result<FinalTest, ApiError> {
    let config = config.normalized().map_err(ApiError::Invalid)?;
    let resolved = state.store.get_resolved(Some(&config.subject_id)).await?;
    let row = NewFinalTestRow {
        subject_id: config.subject_id.clone(),
        config: serde_json::to_value(&config).map_err(|_| ApiError::Invalid("config serialize"))?,
        time_limit_s: config
            .time_limit_s
            .map(|v| v as i32)
            .or(resolved.settings.test_defaults.time_limit_s.map(|v| v as i32)),
    };
    let test = FinalTestRepository::create(&state.store, row).await?;
    let questions = pick_test_questions(state, &config).await?;
    let ids: Vec<String> = questions.iter().map(|q| q.id.clone()).collect();
    TestQuestionRepository::add_many(&state.store, &test.id, &ids).await?;
    Ok(test)
}

async fn pick_test_questions(state: &AppState, config: &TestConfig) -> Result<Vec<Question>, ApiError> {
    let mut filter = QuestionFilter {
        subject_id: Some(config.subject_id.clone()),
        source_id: None,
        topic_id: None,
        kind: None,
        cognitive_level: None,
        gold: None,
        gold_status: None,
        grounding: None,
        status: Some("active".into()),
    };
    if !config.include_gold {
        filter.gold = Some(false);
    }
    let mut pool = state.store.list_questions(filter).await?;
    if !config.topic_ids.is_empty() {
        pool.retain(|q| {
            q.topic_id
                .as_ref()
                .map(|t| config.topic_ids.iter().any(|id| id == t))
                .unwrap_or(false)
        });
    }
    pool.truncate(config.question_count as usize);
    if pool.len() < config.question_count as usize && !config.use_existing {
        return Err(ApiError::Invalid("not enough questions in pool"));
    }
    Ok(pool)
}

pub async fn list_tests(
    state: &AppState,
    subject_id: Option<&str>,
) -> Result<Vec<FinalTest>, ApiError> {
    Ok(FinalTestRepository::list(&state.store, subject_id).await?)
}

pub async fn get_test_detail(state: &AppState, test_id: &str) -> Result<TestDetail, ApiError> {
    let test = FinalTestRepository::get(&state.store, test_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    let tqs = TestQuestionRepository::list_for_test(&state.store, test_id).await?;
    let mut questions = Vec::new();
    for tq in &tqs {
        if let Some(q) = state.store.get_question(&tq.question_id).await? {
            questions.push(public_question_for_test(&test, &q)?);
        }
    }
    Ok(TestDetail { test, questions })
}

fn public_question_for_test(test: &FinalTest, question: &Question) -> Result<QuestionPublic, ApiError> {
    let status = TestStatus::parse(test.status.trim()).map_err(ApiError::Invalid)?;
    let finished = matches!(status, TestStatus::Submitted | TestStatus::Expired);
  // Strip answers until submit unless immediate feedback is enabled.
    if finished {
        Ok(question.to_public())
    } else {
        Ok(strip_answer_fields(question))
    }
}

fn test_config(test: &FinalTest) -> Result<TestConfig, ApiError> {
    let cfg: TestConfig = serde_json::from_value(test.config.clone())
        .map_err(|_| ApiError::Invalid("invalid test config"))?;
    Ok(cfg)
}

pub async fn start_test(state: &AppState, test_id: &str) -> Result<FinalTest, ApiError> {
    let test = FinalTestRepository::get(&state.store, test_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    let status = TestStatus::parse(test.status.trim()).map_err(ApiError::Invalid)?;
    if !matches!(status, TestStatus::Draft) {
        return Err(ApiError::Invalid("test not in draft status"));
    }
    FinalTestRepository::start_test(&state.store, test_id)
        .await?
        .ok_or(ApiError::NotFound)
}

fn test_expired(test: &FinalTest, now: DateTime<Utc>) -> bool {
    let Some(limit) = test.time_limit_s else {
        return false;
    };
    let Some(started) = test.started_at.as_deref() else {
        return false;
    };
    let Ok(started_at) = DateTime::parse_from_rfc3339(started) else {
        return false;
    };
    let started_utc = started_at.with_timezone(&Utc);
    now.signed_duration_since(started_utc).num_seconds() > i64::from(limit)
}

pub async fn submit_test_answer(
    state: &AppState,
    test_id: &str,
    body: SubmitAnswer,
) -> Result<AnswerWithLeakGuard, ApiError> {
    let body = body.normalized().map_err(ApiError::Invalid)?;
    let test = FinalTestRepository::get(&state.store, test_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    let status = TestStatus::parse(test.status.trim()).map_err(ApiError::Invalid)?;
    if !matches!(status, TestStatus::InProgress) {
        return Err(ApiError::Invalid("test not in progress"));
    }
    if test_expired(&test, state.clock.now_utc()) {
        let _ = FinalTestRepository::expire_test(&state.store, test_id).await?;
        return Err(ApiError::Invalid("test expired"));
    }
    let tqs = TestQuestionRepository::list_for_test(&state.store, test_id).await?;
    if !tqs.iter().any(|tq| tq.question_id == body.question_id) {
        return Err(ApiError::Invalid("question not in test"));
    }

    let config = test_config(&test)?;
    let resolved = state.store.get_resolved(Some(&config.subject_id)).await?;
    let integrity = IntegrityStatus::parse(test.integrity_status.trim())
        .unwrap_or(IntegrityStatus::Unverified);
    let integrity_bonus = earns_test_bonus(integrity);

    let graded = grade_test_answer(state, &test, &body).await?;
    let attempt = state
        .store
        .create_attempt(storage::NewAttemptRow {
            question_id: body.question_id.clone(),
            session_id: None,
            test_id: Some(test_id.to_owned()),
            answer_text: body.answer_text,
            selected_option: body.selected_option,
            score: graded.score,
            verdict: graded.verdict.as_str().to_owned(),
            feedback: serde_json::to_value(&graded.feedback)
                .map_err(|_| ApiError::Invalid("feedback serialize"))?,
            graded_by: graded.graded_by.as_str().to_owned(),
            confidence: graded.confidence,
            time_taken_ms: body.time_taken_ms,
        })
        .await?;

    let question = state
        .store
        .get_question(&body.question_id)
        .await?
        .ok_or(ApiError::NotFound)?;

    record_learning_outcome(
        state,
        &attempt,
        &question,
        &resolved,
        true,
        integrity_bonus,
    )
    .await?;

    let timing = FeedbackTiming::parse(config.feedback_timing.trim()).map_err(ApiError::Invalid)?;
    let response_question = if matches!(timing, FeedbackTiming::Immediate) {
        question
    } else {
        Question {
            correct_option: None,
            model_answer: None,
            explanation: None,
            ..question
        }
    };

    Ok(AnswerWithLeakGuard {
        attempt,
        question: response_question,
    })
}

#[derive(Debug, Serialize)]
pub struct AnswerWithLeakGuard {
    pub attempt: Attempt,
    pub question: Question,
}

struct GradeLike {
    score: f32,
    verdict: AttemptVerdict,
    feedback: study_core::AttemptFeedback,
    graded_by: study_core::GradedBy,
    confidence: Option<f32>,
}

async fn grade_test_answer(
    state: &AppState,
    _test: &FinalTest,
    body: &SubmitAnswer,
) -> Result<GradeLike, ApiError> {
    let question = state
        .store
        .get_question(&body.question_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    let kind = QuestionKind::parse(&question.kind).map_err(ApiError::Invalid)?;
    let grade = match kind {
        QuestionKind::Mcq => {
            let selected = body
                .selected_option
                .as_deref()
                .ok_or(ApiError::Invalid("selected_option required"))?;
            grade_mcq(&question, selected)?
        }
        QuestionKind::Written => {
            let answer = body
                .answer_text
                .as_deref()
                .ok_or(ApiError::Invalid("answer_text required"))?;
            let source_text = citation_source_text(&state.store, &question).await?;
            let (provider, provider_label, chat_model) = load_chat_provider(state).await?;
            let messages = [
                ChatMessage {
                    role: "system".into(),
                    content: grading_system_prompt(),
                },
                ChatMessage {
                    role: "user".into(),
                    content: grading_user_prompt(
                        &question.stem,
                        question.model_answer.as_deref().unwrap_or(""),
                        answer,
                        &source_text,
                    ),
                },
            ];
            let raw = provider
                .chat(&messages)
                .await
                .map_err(|e| ApiError::Upstream(e.to_string()))?;
            let _ = state
                .store
                .create_usage_event(NewUsageEvent {
                    provider: provider_label,
                    model: chat_model,
                    kind: "grading".into(),
                    tokens_in: 0,
                    tokens_out: 0,
                })
                .await?;
            grade_from_ai_json(&raw, question.model_answer.clone())?
        }
    };
    Ok(GradeLike {
        score: grade.score,
        verdict: grade.verdict,
        feedback: grade.feedback,
        graded_by: grade.graded_by,
        confidence: grade.confidence,
    })
}

pub async fn submit_test(state: &AppState, test_id: &str) -> Result<FinalTest, ApiError> {
    let test = FinalTestRepository::get(&state.store, test_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    if test_expired(&test, state.clock.now_utc()) {
        return FinalTestRepository::expire_test(&state.store, test_id)
            .await?
            .ok_or(ApiError::NotFound);
    }
    let attempts = state.store.list_attempts_for_test(test_id).await?;
    let tqs = TestQuestionRepository::list_for_test(&state.store, test_id).await?;
    let total = tqs.len().max(1) as f64;
    let sum: f64 = attempts.iter().map(|a| f64::from(a.score)).sum();
    let score = sum / total;
    let cfg = test_config(&test)?;
    let pass = score >= cfg.pass_mark;
    reclassify_test_integrity(state, test_id).await?;
    FinalTestRepository::submit_test(&state.store, test_id, score, pass)
        .await?
        .ok_or(ApiError::NotFound)
}

pub async fn expire_test(state: &AppState, test_id: &str) -> Result<FinalTest, ApiError> {
    FinalTestRepository::expire_test(&state.store, test_id)
        .await?
        .ok_or(ApiError::NotFound)
}

pub async fn ingest_integrity_event(
    state: &AppState,
    test_id: &str,
    input: NewIntegrityEvent,
) -> Result<study_core::IntegrityEvent, ApiError> {
    let event = IntegrityEventRepository::create(&state.store, test_id, input).await?;
    reclassify_test_integrity(state, test_id).await?;
    Ok(event)
}

pub async fn reclassify_test_integrity(state: &AppState, test_id: &str) -> Result<(), ApiError> {
    let test = FinalTestRepository::get(&state.store, test_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    let cfg = test_config(&test)?;
    let events = IntegrityEventRepository::list_for_test(&state.store, test_id).await?;
    let fullscreen = events
        .iter()
        .any(|e| e.kind.contains("fullscreen") || e.kind == "focus_regained");
    let status = classify_integrity(cfg.focus_mode, fullscreen, &events);
    FinalTestRepository::update_integrity_status(&state.store, test_id, status.as_str()).await?;
    Ok(())
}

pub async fn test_results(state: &AppState, test_id: &str) -> Result<TestResults, ApiError> {
    let test = FinalTestRepository::get(&state.store, test_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    let status = TestStatus::parse(test.status.trim()).map_err(ApiError::Invalid)?;
    if !matches!(status, TestStatus::Submitted | TestStatus::Expired) {
        return Err(ApiError::Invalid("test not finished"));
    }
    let cfg = test_config(&test)?;
    let attempts = state.store.list_attempts_for_test(test_id).await?;
    let tqs = TestQuestionRepository::list_for_test(&state.store, test_id).await?;
    let integrity_timeline =
        IntegrityEventRepository::list_for_test(&state.store, test_id).await?;

    let mut per_question = Vec::new();
    for tq in &tqs {
        let question = state
            .store
            .get_question(&tq.question_id)
            .await?
            .ok_or(ApiError::NotFound)?;
        let attempt = attempts
            .iter()
            .find(|a| a.question_id == tq.question_id)
            .cloned();
        per_question.push(TestQuestionResult {
            question_id: tq.question_id.clone(),
            position: tq.position,
            attempt,
            question,
        });
    }

    let score = test.score.unwrap_or(0.0);
    let pass = test.pass.unwrap_or(false);
    let time_taken_s = match (test.started_at.as_deref(), test.submitted_at.as_deref()) {
        (Some(a), Some(b)) => {
            let a = DateTime::parse_from_rfc3339(a)
                .map(|d| d.with_timezone(&Utc))
                .ok();
            let b = DateTime::parse_from_rfc3339(b)
                .map(|d| d.with_timezone(&Utc))
                .ok();
            match (a, b) {
                (Some(a), Some(b)) => Some(b.signed_duration_since(a).num_seconds()),
                _ => None,
            }
        }
        _ => None,
    };

    Ok(TestResults {
        test: test.clone(),
        score,
        pass,
        time_taken_s,
        per_question,
        topic_breakdown: vec![TopicBreakdown {
            topic_id: None,
            topic_title: cfg.subject_id.clone(),
            answered: attempts.len() as u32,
            correct: attempts
                .iter()
                .filter(|a| a.verdict == AttemptVerdict::Correct.as_str())
                .count() as u32,
            average_score: score,
        }],
        integrity_timeline,
    })
}