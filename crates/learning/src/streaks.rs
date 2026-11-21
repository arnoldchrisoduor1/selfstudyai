use chrono::{DateTime, Duration, NaiveDate, Utc};
use study_core::DailyActivity;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StreakState {
    pub current: u32,
    pub longest: u32,
}

/// Compute streak from daily_activity rows where goal_met, using user-local dates.
/// `today` is the calendar date in the user's timezone.
pub fn compute_streak(activities: &[DailyActivity], today: NaiveDate) -> StreakState {
    let mut goal_days: Vec<NaiveDate> = activities
        .iter()
        .filter(|a| a.goal_met)
        .filter_map(|a| NaiveDate::parse_from_str(&a.date, "%Y-%m-%d").ok())
        .collect();
    goal_days.sort();
    goal_days.dedup();

    let longest = longest_run(&goal_days);
    let current = current_run(&goal_days, today);
    StreakState { current, longest }
}

fn longest_run(days: &[NaiveDate]) -> u32 {
    if days.is_empty() {
        return 0;
    }
    let mut best = 1u32;
    let mut run = 1u32;
    for window in days.windows(2) {
        if window[1] == window[0] + Duration::days(1) {
            run += 1;
            best = best.max(run);
        } else {
            run = 1;
        }
    }
    best
}

fn current_run(days: &[NaiveDate], today: NaiveDate) -> u32 {
    if days.is_empty() {
        return 0;
    }
    let last = *days.last().unwrap();
    // Streak alive if last goal day is today or yesterday.
    if last != today && last != today - Duration::days(1) {
        return 0;
    }
    let mut cursor = last;
    let mut run = 0u32;
    for day in days.iter().rev() {
        if *day == cursor {
            run += 1;
            cursor = cursor - Duration::days(1);
        } else if *day < cursor {
            break;
        }
    }
    run
}

/// Convert UTC instant to calendar date in an IANA-ish offset timezone string.
/// Supports `UTC`, `Z`, and fixed offsets like `+03:00` / `-05:00`.
/// Named zones without offset fall back to UTC (document in LEARNING_ENGINE.md).
pub fn local_date(now: DateTime<Utc>, timezone: &str) -> NaiveDate {
    let offset_secs = parse_fixed_offset_secs(timezone).unwrap_or(0);
    (now + Duration::seconds(offset_secs)).date_naive()
}

pub fn parse_fixed_offset_secs(timezone: &str) -> Option<i64> {
    let tz = timezone.trim();
    if tz.eq_ignore_ascii_case("utc") || tz == "Z" {
        return Some(0);
    }
    // Etc/GMT±N is inverted; skip and treat as UTC.
    if !tz.starts_with('+') && !tz.starts_with('-') {
        // Try trailing offset: "Europe/X" unsupported → UTC
        return None;
    }
    let sign = if tz.starts_with('-') { -1i64 } else { 1i64 };
    let body = &tz[1..];
    let parts: Vec<&str> = body.split(':').collect();
    if parts.is_empty() {
        return None;
    }
    let hours: i64 = parts[0].parse().ok()?;
    let mins: i64 = if parts.len() > 1 {
        parts[1].parse().ok()?
    } else {
        0
    };
    Some(sign * (hours * 3600 + mins * 60))
}

#[cfg(test)]
mod tests {
    use super::*;
    use study_core::{Clock, FakeClock};

    fn act(date: &str, goal_met: bool) -> DailyActivity {
        DailyActivity {
            id: date.into(),
            date: date.into(),
            questions_answered: if goal_met { 10 } else { 1 },
            points_earned: 10,
            minutes_studied: 5,
            goal_met,
        }
    }

    #[test]
    fn streak_across_day_boundary() {
        let today = NaiveDate::from_ymd_opt(2026, 6, 5).unwrap();
        let activities = vec![
            act("2026-06-03", true),
            act("2026-06-04", true),
            act("2026-06-05", true),
        ];
        let s = compute_streak(&activities, today);
        assert_eq!(s.current, 3);
        assert_eq!(s.longest, 3);
    }

    #[test]
    fn gap_resets_current_keeps_longest() {
        let today = NaiveDate::from_ymd_opt(2026, 6, 10).unwrap();
        let activities = vec![
            act("2026-06-01", true),
            act("2026-06-02", true),
            act("2026-06-03", true),
            act("2026-06-10", true),
        ];
        let s = compute_streak(&activities, today);
        assert_eq!(s.current, 1);
        assert_eq!(s.longest, 3);
    }

    #[test]
    fn missed_yesterday_resets() {
        let today = NaiveDate::from_ymd_opt(2026, 6, 5).unwrap();
        let activities = vec![act("2026-06-03", true)];
        let s = compute_streak(&activities, today);
        assert_eq!(s.current, 0);
        assert_eq!(s.longest, 1);
    }

    #[test]
    fn timezone_offset_shifts_date() {
        let clock = FakeClock::new(
            DateTime::parse_from_rfc3339("2026-06-05T22:30:00Z")
                .unwrap()
                .with_timezone(&Utc),
        );
        let utc_date = local_date(clock.now_utc(), "UTC");
        let plus3 = local_date(clock.now_utc(), "+03:00");
        assert_eq!(utc_date, NaiveDate::from_ymd_opt(2026, 6, 5).unwrap());
        assert_eq!(plus3, NaiveDate::from_ymd_opt(2026, 6, 6).unwrap());
    }
}
