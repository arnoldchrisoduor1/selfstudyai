use study_core::{
    CognitiveLevel, PointsBreakdown, PointsConfig, QuestionKind,
};

#[derive(Debug, Clone)]
pub struct PointsInput<'a> {
    pub kind: QuestionKind,
    pub level: CognitiveLevel,
    pub score: f64,
    pub is_gold: bool,
    pub streak_days: u32,
    pub in_test: bool,
    pub already_answered_today: bool,
    pub integrity_earns_bonus: bool,
    pub config: &'a PointsConfig,
}

pub fn calculate_points(input: PointsInput<'_>) -> PointsBreakdown {
    let cfg = input.config;
    let base_kind = match input.kind {
        QuestionKind::Mcq => cfg.base_mcq,
        QuestionKind::Written => cfg.base_written,
    };
    let level_mult = match input.level {
        CognitiveLevel::Recall => cfg.level_recall,
        CognitiveLevel::Understand => cfg.level_understand,
        CognitiveLevel::Apply => cfg.level_apply,
        CognitiveLevel::Analyze => cfg.level_analyze,
    };
    let base = base_kind * level_mult;
    let score_multiplier = input.score.clamp(0.0, 1.0);
    let gold_multiplier = if input.is_gold {
        cfg.gold_multiplier
    } else {
        1.0
    };
    let streak_bonus = (input.streak_days as f64 * cfg.streak_bonus_per_day)
        .min(cfg.streak_bonus_cap);
    let test_multiplier = if input.in_test && input.integrity_earns_bonus {
        cfg.test_multiplier
    } else {
        1.0
    };
    let anti_farm_multiplier = if input.already_answered_today {
        cfg.same_day_repeat_multiplier
    } else {
        1.0
    };
    let raw = base
        * score_multiplier
        * gold_multiplier
        * (1.0 + streak_bonus)
        * test_multiplier
        * anti_farm_multiplier;
    let total = raw.round() as i32;
    PointsBreakdown {
        base,
        score_multiplier,
        gold_multiplier,
        streak_bonus,
        test_multiplier,
        anti_farm_multiplier,
        total,
    }
}

pub fn level_from_points(total_points: i64) -> (u32, f64) {
    // Level n requires n*100 cumulative points in that level band.
    let mut remaining = total_points.max(0);
    let mut level = 1u32;
    loop {
        let need = (level as i64) * 100;
        if remaining < need {
            let progress = if need == 0 {
                0.0
            } else {
                remaining as f64 / need as f64
            };
            return (level, progress.clamp(0.0, 1.0));
        }
        remaining -= need;
        level += 1;
        if level > 999 {
            return (999, 1.0);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quality_and_gold_affect_points() {
        let cfg = PointsConfig::default();
        let low = calculate_points(PointsInput {
            kind: QuestionKind::Mcq,
            level: CognitiveLevel::Recall,
            score: 0.5,
            is_gold: false,
            streak_days: 0,
            in_test: false,
            already_answered_today: false,
            integrity_earns_bonus: true,
            config: &cfg,
        });
        let gold = calculate_points(PointsInput {
            kind: QuestionKind::Mcq,
            level: CognitiveLevel::Recall,
            score: 1.0,
            is_gold: true,
            streak_days: 0,
            in_test: false,
            already_answered_today: false,
            integrity_earns_bonus: true,
            config: &cfg,
        });
        assert!(gold.total > low.total);
        assert_eq!(gold.gold_multiplier, cfg.gold_multiplier);
    }

    #[test]
    fn anti_farming_zeroes_same_day_repeat() {
        let cfg = PointsConfig::default();
        let pts = calculate_points(PointsInput {
            kind: QuestionKind::Written,
            level: CognitiveLevel::Apply,
            score: 1.0,
            is_gold: false,
            streak_days: 5,
            in_test: false,
            already_answered_today: true,
            integrity_earns_bonus: true,
            config: &cfg,
        });
        assert_eq!(pts.total, 0);
        assert_eq!(pts.anti_farm_multiplier, 0.0);
    }

    #[test]
    fn flagged_test_skips_test_multiplier() {
        let cfg = PointsConfig::default();
        let clean = calculate_points(PointsInput {
            kind: QuestionKind::Mcq,
            level: CognitiveLevel::Recall,
            score: 1.0,
            is_gold: false,
            streak_days: 0,
            in_test: true,
            already_answered_today: false,
            integrity_earns_bonus: true,
            config: &cfg,
        });
        let flagged = calculate_points(PointsInput {
            kind: QuestionKind::Mcq,
            level: CognitiveLevel::Recall,
            score: 1.0,
            is_gold: false,
            streak_days: 0,
            in_test: true,
            already_answered_today: false,
            integrity_earns_bonus: false,
            config: &cfg,
        });
        assert!(clean.total > flagged.total);
        assert_eq!(flagged.test_multiplier, 1.0);
    }

    #[test]
    fn streak_bonus_caps() {
        let cfg = PointsConfig::default();
        let pts = calculate_points(PointsInput {
            kind: QuestionKind::Mcq,
            level: CognitiveLevel::Recall,
            score: 1.0,
            is_gold: false,
            streak_days: 100,
            in_test: false,
            already_answered_today: false,
            integrity_earns_bonus: true,
            config: &cfg,
        });
        assert_eq!(pts.streak_bonus, cfg.streak_bonus_cap);
    }
}
