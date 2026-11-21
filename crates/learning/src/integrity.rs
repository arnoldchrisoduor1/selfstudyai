use study_core::{IntegrityEvent, IntegrityEventKind, IntegrityStatus};

/// Classify integrity for a finished (or in-progress) focus-mode test.
pub fn classify_integrity(
    focus_mode: bool,
    fullscreen_ever_entered: bool,
    events: &[IntegrityEvent],
) -> IntegrityStatus {
    if !focus_mode || !fullscreen_ever_entered {
        return IntegrityStatus::Unverified;
    }
    let flagged = events.iter().any(|e| {
        IntegrityEventKind::parse(&e.kind)
            .map(|k| k.is_flagging())
            .unwrap_or(false)
    });
    if flagged {
        IntegrityStatus::Flagged
    } else {
        IntegrityStatus::Clean
    }
}

pub fn earns_test_bonus(status: IntegrityStatus) -> bool {
    matches!(status, IntegrityStatus::Clean)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ev(kind: &str) -> IntegrityEvent {
        IntegrityEvent {
            id: "1".into(),
            test_id: "t".into(),
            kind: kind.into(),
            at: "2026-01-01T00:00:00Z".into(),
            meta: serde_json::json!({}),
        }
    }

    #[test]
    fn unverified_without_focus_or_fullscreen() {
        assert_eq!(
            classify_integrity(false, false, &[]),
            IntegrityStatus::Unverified
        );
        assert_eq!(
            classify_integrity(true, false, &[]),
            IntegrityStatus::Unverified
        );
    }

    #[test]
    fn clean_when_focus_and_no_flags() {
        assert_eq!(
            classify_integrity(true, true, &[ev("focus_regained")]),
            IntegrityStatus::Clean
        );
    }

    #[test]
    fn flagged_on_blur_or_paste() {
        assert_eq!(
            classify_integrity(true, true, &[ev("focus_lost")]),
            IntegrityStatus::Flagged
        );
        assert_eq!(
            classify_integrity(true, true, &[ev("paste")]),
            IntegrityStatus::Flagged
        );
        assert!(!earns_test_bonus(IntegrityStatus::Flagged));
        assert!(earns_test_bonus(IntegrityStatus::Clean));
    }
}
