use study_core::{
    LearningSettings, LearningSettingsPatch, LearningSettingsSources, PointsConfig,
    RatingThresholds, ResolvedLearningSettings, SettingSource, TestDefaults,
};

#[derive(Debug, Clone, Default)]
pub struct SettingsLayers {
    pub user: Option<LearningSettingsPatch>,
    pub subject: Option<LearningSettingsPatch>,
}

/// Resolve subject override → user default → system default.
pub fn resolve_learning_settings(layers: SettingsLayers) -> ResolvedLearningSettings {
    let system = LearningSettings::default();
    let mut settings = system.clone();
    let mut sources = LearningSettingsSources {
        desired_retention: SettingSource::System,
        daily_goal: SettingSource::System,
        new_questions_per_day: SettingSource::System,
        review_new_ratio: SettingSource::System,
        timezone: SettingSource::System,
        points: SettingSource::System,
        test_defaults: SettingSource::System,
    };

    apply_patch(
        &mut settings,
        &mut sources,
        layers.user.as_ref(),
        SettingSource::User,
    );
    apply_patch(
        &mut settings,
        &mut sources,
        layers.subject.as_ref(),
        SettingSource::Subject,
    );

    // Keep streak daily goal in sync with daily_goal.
    settings.streak.daily_goal_questions = settings.daily_goal;

    ResolvedLearningSettings { settings, sources }
}

fn apply_patch(
    settings: &mut LearningSettings,
    sources: &mut LearningSettingsSources,
    patch: Option<&LearningSettingsPatch>,
    source: SettingSource,
) {
    let Some(patch) = patch else {
        return;
    };
    if let Some(v) = patch.desired_retention {
        settings.desired_retention = v;
        sources.desired_retention = source;
    }
    if let Some(v) = patch.daily_goal {
        settings.daily_goal = v;
        sources.daily_goal = source;
    }
    if let Some(v) = patch.new_questions_per_day {
        settings.new_questions_per_day = v;
        sources.new_questions_per_day = source;
    }
    if let Some(v) = patch.review_new_ratio {
        settings.review_new_ratio = v;
        sources.review_new_ratio = source;
    }
    if let Some(ref v) = patch.timezone {
        settings.timezone = v.clone();
        sources.timezone = source;
    }
    if let Some(ref v) = patch.rating_thresholds {
        settings.rating_thresholds = v.clone();
    }
    if let Some(ref v) = patch.points {
        settings.points = v.clone();
        sources.points = source;
    }
    if let Some(ref v) = patch.test_defaults {
        settings.test_defaults = v.clone();
        sources.test_defaults = source;
    }
}

pub fn merge_patch(base: &LearningSettings, patch: &LearningSettingsPatch) -> LearningSettings {
    let mut out = base.clone();
    if let Some(v) = patch.desired_retention {
        out.desired_retention = v;
    }
    if let Some(v) = patch.daily_goal {
        out.daily_goal = v;
    }
    if let Some(v) = patch.new_questions_per_day {
        out.new_questions_per_day = v;
    }
    if let Some(v) = patch.review_new_ratio {
        out.review_new_ratio = v;
    }
    if let Some(ref v) = patch.timezone {
        out.timezone = v.clone();
    }
    if let Some(ref v) = patch.rating_thresholds {
        out.rating_thresholds = v.clone();
    }
    if let Some(ref v) = patch.points {
        out.points = v.clone();
    }
    if let Some(ref v) = patch.test_defaults {
        out.test_defaults = v.clone();
    }
    out.streak.daily_goal_questions = out.daily_goal;
    out
}

pub fn patch_from_settings(settings: &LearningSettings) -> LearningSettingsPatch {
    LearningSettingsPatch {
        desired_retention: Some(settings.desired_retention),
        daily_goal: Some(settings.daily_goal),
        new_questions_per_day: Some(settings.new_questions_per_day),
        review_new_ratio: Some(settings.review_new_ratio),
        timezone: Some(settings.timezone.clone()),
        rating_thresholds: Some(settings.rating_thresholds.clone()),
        points: Some(settings.points.clone()),
        test_defaults: Some(settings.test_defaults.clone()),
    }
}

#[allow(dead_code)]
pub fn default_points() -> PointsConfig {
    PointsConfig::default()
}

#[allow(dead_code)]
pub fn default_thresholds() -> RatingThresholds {
    RatingThresholds::default()
}

#[allow(dead_code)]
pub fn default_test_defaults() -> TestDefaults {
    TestDefaults::default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn subject_overrides_user_overrides_system() {
        let resolved = resolve_learning_settings(SettingsLayers {
            user: Some(LearningSettingsPatch {
                desired_retention: Some(0.85),
                daily_goal: Some(15),
                timezone: Some("+02:00".into()),
                ..Default::default()
            }),
            subject: Some(LearningSettingsPatch {
                daily_goal: Some(5),
                ..Default::default()
            }),
        });
        assert_eq!(resolved.settings.desired_retention, 0.85);
        assert_eq!(
            resolved.sources.desired_retention,
            SettingSource::User
        );
        assert_eq!(resolved.settings.daily_goal, 5);
        assert_eq!(resolved.sources.daily_goal, SettingSource::Subject);
        assert_eq!(resolved.settings.timezone, "+02:00");
        assert_eq!(resolved.sources.timezone, SettingSource::User);
        assert_eq!(
            resolved.sources.new_questions_per_day,
            SettingSource::System
        );
    }
}
