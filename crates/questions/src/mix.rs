use study_core::{CognitiveLevel, CognitiveMix};

/// Allocate cognitive levels across a burst by percentage mix.
pub fn allocate_levels(burst_size: usize, mix: &CognitiveMix) -> Vec<CognitiveLevel> {
    if burst_size == 0 {
        return Vec::new();
    }
    let _ = mix.validate();
    let levels = CognitiveLevel::all();
    let mut counts: Vec<(CognitiveLevel, f64, usize)> = levels
        .iter()
        .map(|level| {
            let weight = f64::from(mix.weight(*level)) / 100.0;
            let exact = weight * burst_size as f64;
            (*level, exact, exact.floor() as usize)
        })
        .collect();

    let mut assigned: usize = counts.iter().map(|c| c.2).sum();
    while assigned < burst_size {
        counts.sort_by(|a, b| {
            let rem_a = a.1 - a.2 as f64;
            let rem_b = b.1 - b.2 as f64;
            rem_b.partial_cmp(&rem_a).unwrap_or(std::cmp::Ordering::Equal)
        });
        counts[0].2 += 1;
        assigned += 1;
    }

    let mut out = Vec::with_capacity(burst_size);
    for (level, _, count) in counts {
        for _ in 0..count {
            out.push(level);
        }
    }
    // Alternate kinds later; keep stable order by level for determinism.
    out.sort_by_key(|l| match l {
        CognitiveLevel::Recall => 0,
        CognitiveLevel::Understand => 1,
        CognitiveLevel::Apply => 2,
        CognitiveLevel::Analyze => 3,
    });
    out.truncate(burst_size);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mix_allocation_sums_to_burst() {
        let mix = CognitiveMix::default();
        for size in [1, 4, 7, 10] {
            let levels = allocate_levels(size, &mix);
            assert_eq!(levels.len(), size);
        }
    }

    #[test]
    fn apply_heavy_mix_prefers_apply() {
        let mix = CognitiveMix {
            recall: 10,
            understand: 10,
            apply: 70,
            analyze: 10,
        };
        let levels = allocate_levels(10, &mix);
        let apply = levels
            .iter()
            .filter(|l| **l == CognitiveLevel::Apply)
            .count();
        assert!(apply >= 6);
    }

    #[test]
    fn burst_size_change_reallocates() {
        let mix = CognitiveMix::default();
        assert_eq!(allocate_levels(2, &mix).len(), 2);
        assert_eq!(allocate_levels(8, &mix).len(), 8);
    }
}
