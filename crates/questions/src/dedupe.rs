use crate::error::QuestionsError;

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let mut dot = 0.0f32;
    let mut na = 0.0f32;
    let mut nb = 0.0f32;
    for i in 0..a.len() {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    let denom = na.sqrt() * nb.sqrt();
    if denom == 0.0 {
        0.0
    } else {
        dot / denom
    }
}

/// Drop candidates whose stem embedding is too similar to an existing stem.
pub fn filter_near_duplicates(
    candidates: &[(String, Vec<f32>)],
    existing: &[(String, Vec<f32>)],
    threshold: f32,
) -> Result<Vec<usize>, QuestionsError> {
    if !(0.0..=1.0).contains(&threshold) {
        return Err(QuestionsError::Invalid("dedupe threshold must be 0..=1"));
    }
    let mut kept = Vec::new();
    let mut accepted_vecs: Vec<Vec<f32>> = existing.iter().map(|(_, v)| v.clone()).collect();
    for (idx, (_stem, vec)) in candidates.iter().enumerate() {
        let too_close = accepted_vecs
            .iter()
            .any(|other| cosine_similarity(vec, other) >= threshold);
        if !too_close {
            kept.push(idx);
            accepted_vecs.push(vec.clone());
        }
    }
    Ok(kept)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dedupe_drops_near_duplicates() {
        let existing = vec![("What is osmosis?".into(), vec![1.0, 0.0, 0.0])];
        let candidates = vec![
            ("What is osmosis exactly?".into(), vec![0.99, 0.01, 0.0]),
            ("Define mitosis".into(), vec![0.0, 1.0, 0.0]),
        ];
        let kept = filter_near_duplicates(&candidates, &existing, 0.9).unwrap();
        assert_eq!(kept, vec![1]);
    }

    #[test]
    fn identical_stems_in_batch_dedupe() {
        let candidates = vec![
            ("Same".into(), vec![1.0, 0.0]),
            ("Same again".into(), vec![1.0, 0.0]),
        ];
        let kept = filter_near_duplicates(&candidates, &[], 0.95).unwrap();
        assert_eq!(kept, vec![0]);
    }
}
