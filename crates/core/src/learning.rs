//! Learning-engine domain types: SRS, points, streaks, tests, integrity.

use serde::{Deserialize, Serialize};

fn trimmed(value: String) -> String {
    value.trim().to_owned()
}

fn optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim().to_owned();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

// ─── Enums ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CardLearningState {
    New,
    Learning,
    Review,
    Relearning,
}

impl CardLearningState {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::New => "new",
            Self::Learning => "learning",
            Self::Review => "review",
            Self::Relearning => "relearning",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "new" => Ok(Self::New),
            "learning" => Ok(Self::Learning),
            "review" => Ok(Self::Review),
            "relearning" => Ok(Self::Relearning),
            _ => Err("card state must be new, learning, review, or relearning"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReviewRating {
    Again = 1,
    Hard = 2,
    Good = 3,
    Easy = 4,
}

impl ReviewRating {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Again => "again",
            Self::Hard => "hard",
            Self::Good => "good",
            Self::Easy => "easy",
        }
    }

    pub fn as_u8(self) -> u8 {
        self as u8
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "again" => Ok(Self::Again),
            "hard" => Ok(Self::Hard),
            "good" => Ok(Self::Good),
            "easy" => Ok(Self::Easy),
            _ => Err("rating must be again, hard, good, or easy"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TestStatus {
    Draft,
    InProgress,
    Submitted,
    Expired,
}

impl TestStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::InProgress => "in_progress",
            Self::Submitted => "submitted",
            Self::Expired => "expired",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "draft" => Ok(Self::Draft),
            "in_progress" => Ok(Self::InProgress),
            "submitted" => Ok(Self::Submitted),
            "expired" => Ok(Self::Expired),
            _ => Err("test status must be draft, in_progress, submitted, or expired"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IntegrityStatus {
    Clean,
    Flagged,
    Unverified,
}

impl IntegrityStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Clean => "clean",
            Self::Flagged => "flagged",
            Self::Unverified => "unverified",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "clean" => Ok(Self::Clean),
            "flagged" => Ok(Self::Flagged),
            "unverified" => Ok(Self::Unverified),
            _ => Err("integrity_status must be clean, flagged, or unverified"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IntegrityEventKind {
    FocusLost,
    FocusRegained,
    TabHidden,
    FullscreenExit,
    Paste,
    Copy,
    ContextMenu,
    Resize,
}

impl IntegrityEventKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::FocusLost => "focus_lost",
            Self::FocusRegained => "focus_regained",
            Self::TabHidden => "tab_hidden",
            Self::FullscreenExit => "fullscreen_exit",
            Self::Paste => "paste",
            Self::Copy => "copy",
            Self::ContextMenu => "context_menu",
            Self::Resize => "resize",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "focus_lost" => Ok(Self::FocusLost),
            "focus_regained" => Ok(Self::FocusRegained),
            "tab_hidden" => Ok(Self::TabHidden),
            "fullscreen_exit" => Ok(Self::FullscreenExit),
            "paste" => Ok(Self::Paste),
            "copy" => Ok(Self::Copy),
            "context_menu" => Ok(Self::ContextMenu),
            "resize" => Ok(Self::Resize),
            _ => Err("invalid integrity event kind"),
        }
    }

    /// Events that mark a focus-mode test as flagged.
    pub fn is_flagging(self) -> bool {
        matches!(
            self,
            Self::FocusLost
                | Self::TabHidden
                | Self::FullscreenExit
                | Self::Paste
                | Self::Copy
                | Self::ContextMenu
                | Self::Resize
        )
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionItemKind {
    New,
    Review,
}

impl SessionItemKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::New => "new",
            Self::Review => "review",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "new" => Ok(Self::New),
            "review" => Ok(Self::Review),
            _ => Err("item_kind must be new or review"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FeedbackTiming {
    Immediate,
    End,
}

impl FeedbackTiming {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Immediate => "immediate",
            Self::End => "end",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "immediate" => Ok(Self::Immediate),
            "end" => Ok(Self::End),
            _ => Err("feedback_timing must be immediate or end"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TestNavigation {
    Free,
    OneWay,
}

impl TestNavigation {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Free => "free",
            Self::OneWay => "one_way",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "free" => Ok(Self::Free),
            "one_way" => Ok(Self::OneWay),
            _ => Err("navigation must be free or one_way"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SettingSource {
    System,
    User,
    Subject,
}

impl SettingSource {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::System => "system",
            Self::User => "user",
            Self::Subject => "subject",
        }
    }
}

// ─── Card / review ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CardState {
    pub id: String,
    pub question_id: String,
    pub due: String,
    pub stability: f64,
    pub difficulty: f64,
    pub state: String,
    pub reps: i32,
    pub lapses: i32,
    pub last_review: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReviewLog {
    pub id: String,
    pub question_id: String,
    pub attempt_id: String,
    pub rating: String,
    pub state_before: String,
    pub state_after: String,
    pub scheduled_days: f64,
    pub elapsed_days: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DueQueueItem {
    pub question_id: String,
    pub card_state: CardState,
    pub overdue_days: f64,
}

// ─── Points / activity ───────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PointsLedgerEntry {
    pub id: String,
    pub amount: i32,
    pub reason: String,
    pub attempt_id: Option<String>,
    pub test_id: Option<String>,
    pub multiplier_breakdown: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DailyActivity {
    pub id: String,
    pub date: String,
    pub questions_answered: i32,
    pub points_earned: i32,
    pub minutes_studied: i32,
    pub goal_met: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StreakInfo {
    pub current: u32,
    pub longest: u32,
    pub timezone: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PointsBreakdown {
    pub base: f64,
    pub score_multiplier: f64,
    pub gold_multiplier: f64,
    pub streak_bonus: f64,
    pub test_multiplier: f64,
    pub anti_farm_multiplier: f64,
    pub total: i32,
}

// ─── Learning settings ───────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RatingThresholds {
    /// score < again_below → Again
    pub again_below: f64,
    /// score < hard_below → Hard
    pub hard_below: f64,
    /// score < good_below → Good; else Easy
    pub good_below: f64,
}

impl Default for RatingThresholds {
    fn default() -> Self {
        Self {
            again_below: 0.4,
            hard_below: 0.7,
            good_below: 0.95,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PointsConfig {
    pub base_mcq: f64,
    pub base_written: f64,
    pub level_recall: f64,
    pub level_understand: f64,
    pub level_apply: f64,
    pub level_analyze: f64,
    pub gold_multiplier: f64,
    pub streak_bonus_per_day: f64,
    pub streak_bonus_cap: f64,
    pub test_multiplier: f64,
    pub same_day_repeat_multiplier: f64,
}

impl Default for PointsConfig {
    fn default() -> Self {
        Self {
            base_mcq: 10.0,
            base_written: 15.0,
            level_recall: 1.0,
            level_understand: 1.1,
            level_apply: 1.25,
            level_analyze: 1.4,
            gold_multiplier: 1.5,
            streak_bonus_per_day: 0.05,
            streak_bonus_cap: 0.5,
            test_multiplier: 1.25,
            same_day_repeat_multiplier: 0.0,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StreakRules {
    pub daily_goal_questions: u32,
}

impl Default for StreakRules {
    fn default() -> Self {
        Self {
            daily_goal_questions: 10,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TestDefaults {
    pub question_count: u32,
    pub time_limit_s: Option<u32>,
    pub pass_mark: f64,
    pub include_gold: bool,
    pub feedback_timing: String,
    pub navigation: String,
    pub focus_mode: bool,
    pub kind_mcq_pct: u8,
    pub kind_written_pct: u8,
}

impl Default for TestDefaults {
    fn default() -> Self {
        Self {
            question_count: 10,
            time_limit_s: Some(1800),
            pass_mark: 0.7,
            include_gold: true,
            feedback_timing: FeedbackTiming::End.as_str().to_owned(),
            navigation: TestNavigation::Free.as_str().to_owned(),
            focus_mode: false,
            kind_mcq_pct: 50,
            kind_written_pct: 50,
        }
    }
}

impl TestDefaults {
    pub fn normalized(self) -> Result<Self, &'static str> {
        if !(1..=100).contains(&self.question_count) {
            return Err("question_count must be 1..=100");
        }
        if !(0.0..=1.0).contains(&self.pass_mark) {
            return Err("pass_mark must be 0..=1");
        }
        if self.kind_mcq_pct as u16 + self.kind_written_pct as u16 != 100 {
            return Err("kind percentages must sum to 100");
        }
        let feedback_timing = FeedbackTiming::parse(self.feedback_timing.trim())?
            .as_str()
            .to_owned();
        let navigation = TestNavigation::parse(self.navigation.trim())?
            .as_str()
            .to_owned();
        Ok(Self {
            question_count: self.question_count,
            time_limit_s: self.time_limit_s,
            pass_mark: self.pass_mark,
            include_gold: self.include_gold,
            feedback_timing,
            navigation,
            focus_mode: self.focus_mode,
            kind_mcq_pct: self.kind_mcq_pct,
            kind_written_pct: self.kind_written_pct,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LearningSettings {
    pub desired_retention: f64,
    pub daily_goal: u32,
    pub new_questions_per_day: u32,
    pub review_new_ratio: f64,
    pub timezone: String,
    pub rating_thresholds: RatingThresholds,
    pub points: PointsConfig,
    pub streak: StreakRules,
    pub test_defaults: TestDefaults,
}

impl Default for LearningSettings {
    fn default() -> Self {
        Self {
            desired_retention: 0.9,
            daily_goal: 10,
            new_questions_per_day: 20,
            review_new_ratio: 0.7,
            timezone: "UTC".to_owned(),
            rating_thresholds: RatingThresholds::default(),
            points: PointsConfig::default(),
            streak: StreakRules::default(),
            test_defaults: TestDefaults::default(),
        }
    }
}

impl LearningSettings {
    pub fn normalized(self) -> Result<Self, &'static str> {
        if !(0.7..=0.99).contains(&self.desired_retention) {
            return Err("desired_retention must be 0.7..=0.99");
        }
        if self.daily_goal == 0 {
            return Err("daily_goal must be >= 1");
        }
        if self.new_questions_per_day == 0 {
            return Err("new_questions_per_day must be >= 1");
        }
        if !(0.0..=1.0).contains(&self.review_new_ratio) {
            return Err("review_new_ratio must be 0..=1");
        }
        let timezone = trimmed(self.timezone);
        if timezone.is_empty() {
            return Err("timezone required");
        }
        let test_defaults = self.test_defaults.normalized()?;
        Ok(Self {
            desired_retention: self.desired_retention,
            daily_goal: self.daily_goal,
            new_questions_per_day: self.new_questions_per_day,
            review_new_ratio: self.review_new_ratio,
            timezone,
            rating_thresholds: self.rating_thresholds,
            points: self.points,
            streak: StreakRules {
                daily_goal_questions: self.daily_goal,
            },
            test_defaults,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ResolvedField<T> {
    pub value: T,
    pub source: SettingSource,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ResolvedLearningSettings {
    pub settings: LearningSettings,
    pub sources: LearningSettingsSources,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LearningSettingsSources {
    pub desired_retention: SettingSource,
    pub daily_goal: SettingSource,
    pub new_questions_per_day: SettingSource,
    pub review_new_ratio: SettingSource,
    pub timezone: SettingSource,
    pub points: SettingSource,
    pub test_defaults: SettingSource,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct LearningSettingsPatch {
    pub desired_retention: Option<f64>,
    pub daily_goal: Option<u32>,
    pub new_questions_per_day: Option<u32>,
    pub review_new_ratio: Option<f64>,
    pub timezone: Option<String>,
    pub rating_thresholds: Option<RatingThresholds>,
    pub points: Option<PointsConfig>,
    pub test_defaults: Option<TestDefaults>,
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TestConfig {
    pub subject_id: String,
    pub source_ids: Vec<String>,
    pub topic_ids: Vec<String>,
    pub question_count: u32,
    pub time_limit_s: Option<u32>,
    pub kinds: TestKindMix,
    pub cognitive_mix: crate::CognitiveMix,
    pub include_gold: bool,
    pub use_existing: bool,
    pub pass_mark: f64,
    pub feedback_timing: String,
    pub navigation: String,
    pub focus_mode: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TestKindMix {
    pub mcq_pct: u8,
    pub written_pct: u8,
}

impl Default for TestKindMix {
    fn default() -> Self {
        Self {
            mcq_pct: 50,
            written_pct: 50,
        }
    }
}

impl TestConfig {
    pub fn normalized(self) -> Result<Self, &'static str> {
        if self.subject_id.trim().is_empty() {
            return Err("subject_id required");
        }
        if !(1..=100).contains(&self.question_count) {
            return Err("question_count must be 1..=100");
        }
        if !(0.0..=1.0).contains(&self.pass_mark) {
            return Err("pass_mark must be 0..=1");
        }
        if self.kinds.mcq_pct as u16 + self.kinds.written_pct as u16 != 100 {
            return Err("kind percentages must sum to 100");
        }
        self.cognitive_mix.validate()?;
        let feedback_timing = FeedbackTiming::parse(self.feedback_timing.trim())?
            .as_str()
            .to_owned();
        let navigation = TestNavigation::parse(self.navigation.trim())?
            .as_str()
            .to_owned();
        Ok(Self {
            subject_id: trimmed(self.subject_id),
            source_ids: self.source_ids,
            topic_ids: self.topic_ids,
            question_count: self.question_count,
            time_limit_s: self.time_limit_s,
            kinds: self.kinds,
            cognitive_mix: self.cognitive_mix,
            include_gold: self.include_gold,
            use_existing: self.use_existing,
            pass_mark: self.pass_mark,
            feedback_timing,
            navigation,
            focus_mode: self.focus_mode,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FinalTest {
    pub id: String,
    pub subject_id: String,
    pub config: serde_json::Value,
    pub status: String,
    pub started_at: Option<String>,
    pub submitted_at: Option<String>,
    pub time_limit_s: Option<i32>,
    pub score: Option<f64>,
    pub pass: Option<bool>,
    pub integrity_status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TestQuestion {
    pub id: String,
    pub test_id: String,
    pub question_id: String,
    pub position: i32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IntegrityEvent {
    pub id: String,
    pub test_id: String,
    pub kind: String,
    pub at: String,
    pub meta: serde_json::Value,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NewIntegrityEvent {
    pub kind: String,
    pub at: Option<String>,
    pub meta: Option<serde_json::Value>,
}

impl NewIntegrityEvent {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let kind = IntegrityEventKind::parse(self.kind.trim())?
            .as_str()
            .to_owned();
        Ok(Self {
            kind,
            at: optional_text(self.at),
            meta: self.meta,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TestResults {
    pub test: FinalTest,
    pub score: f64,
    pub pass: bool,
    pub time_taken_s: Option<i64>,
    pub per_question: Vec<TestQuestionResult>,
    pub topic_breakdown: Vec<TopicBreakdown>,
    pub integrity_timeline: Vec<IntegrityEvent>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TestQuestionResult {
    pub question_id: String,
    pub position: i32,
    pub attempt: Option<crate::Attempt>,
    pub question: crate::Question,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TopicBreakdown {
    pub topic_id: Option<String>,
    pub topic_title: String,
    pub answered: u32,
    pub correct: u32,
    pub average_score: f64,
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Dashboard {
    pub total_points: i64,
    pub level: u32,
    pub level_progress: f64,
    pub streak: StreakInfo,
    pub today: DailyGoalProgress,
    pub due_today: u32,
    pub heatmap: Vec<HeatmapDay>,
    pub accuracy_trend: Vec<TrendPoint>,
    pub points_trend: Vec<TrendPoint>,
    pub mastery: Vec<MasteryRow>,
    pub weakest_topics: Vec<MasteryRow>,
    pub recent_tests: Vec<FinalTest>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DailyGoalProgress {
    pub date: String,
    pub answered: u32,
    pub goal: u32,
    pub points_earned: i32,
    pub goal_met: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HeatmapDay {
    pub date: String,
    pub questions_answered: i32,
    pub points_earned: i32,
    pub goal_met: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TrendPoint {
    pub date: String,
    pub value: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MasteryRow {
    pub id: String,
    pub label: String,
    pub kind: String,
    pub retention_estimate: f64,
    pub recent_accuracy: f64,
    pub due_count: u32,
}

// ─── Study modes ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StudyMode {
    Practice,
    ReviewDue,
    Mixed,
}

impl StudyMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Practice => "practice",
            Self::ReviewDue => "review_due",
            Self::Mixed => "mixed",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "practice" => Ok(Self::Practice),
            "review_due" => Ok(Self::ReviewDue),
            "mixed" => Ok(Self::Mixed),
            _ => Err("mode must be practice, review_due, or mixed"),
        }
    }
}

// ─── Setting keys ────────────────────────────────────────────────────────────

pub const SETTING_TIMEZONE: &str = "learning_timezone";
pub const SETTING_DESIRED_RETENTION: &str = "learning_desired_retention";
pub const SETTING_DAILY_GOAL: &str = "learning_daily_goal";
pub const SETTING_NEW_PER_DAY: &str = "learning_new_questions_per_day";
pub const SETTING_REVIEW_NEW_RATIO: &str = "learning_review_new_ratio";
pub const SETTING_RATING_THRESHOLDS: &str = "learning_rating_thresholds";
pub const SETTING_POINTS_CONFIG: &str = "learning_points_config";
pub const SETTING_TEST_DEFAULTS: &str = "learning_test_defaults";
pub const SETTING_STREAK_CURRENT: &str = "learning_streak_current";
pub const SETTING_STREAK_LONGEST: &str = "learning_streak_longest";

pub fn subject_setting_key(subject_id: &str, key: &str) -> String {
    format!("subject:{subject_id}:{key}")
}
