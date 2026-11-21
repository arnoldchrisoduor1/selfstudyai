use study_core::{RatingThresholds, ReviewRating};

/// Map attempt score (0..=1) to FSRS rating using configurable thresholds.
pub fn score_to_rating(score: f64, thresholds: &RatingThresholds) -> ReviewRating {
    let score = score.clamp(0.0, 1.0);
    if score < thresholds.again_below {
        ReviewRating::Again
    } else if score < thresholds.hard_below {
        ReviewRating::Hard
    } else if score < thresholds.good_below {
        ReviewRating::Good
    } else {
        ReviewRating::Easy
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_thresholds_map_scores() {
        let t = RatingThresholds::default();
        assert_eq!(score_to_rating(0.0, &t), ReviewRating::Again);
        assert_eq!(score_to_rating(0.39, &t), ReviewRating::Again);
        assert_eq!(score_to_rating(0.4, &t), ReviewRating::Hard);
        assert_eq!(score_to_rating(0.69, &t), ReviewRating::Hard);
        assert_eq!(score_to_rating(0.7, &t), ReviewRating::Good);
        assert_eq!(score_to_rating(0.94, &t), ReviewRating::Good);
        assert_eq!(score_to_rating(0.95, &t), ReviewRating::Easy);
        assert_eq!(score_to_rating(1.0, &t), ReviewRating::Easy);
    }

    #[test]
    fn custom_thresholds_change_mapping() {
        let t = RatingThresholds {
            again_below: 0.5,
            hard_below: 0.8,
            good_below: 0.99,
        };
        assert_eq!(score_to_rating(0.49, &t), ReviewRating::Again);
        assert_eq!(score_to_rating(0.5, &t), ReviewRating::Hard);
        assert_eq!(score_to_rating(0.8, &t), ReviewRating::Good);
        assert_eq!(score_to_rating(0.99, &t), ReviewRating::Easy);
    }
}
