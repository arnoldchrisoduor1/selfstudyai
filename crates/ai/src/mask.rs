/// Shows only the last four characters, prefixed with `****`.
pub fn mask_api_key(key: &str) -> String {
    if key.is_empty() {
        return "****".to_string();
    }
    if key.len() <= 4 {
        return format!("****{}", key);
    }
    format!("****{}", &key[key.len() - 4..])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masks_all_but_last_four() {
        assert_eq!(mask_api_key("sk-abcdefghijklmnop"), "****mnop");
    }

    #[test]
    fn short_key() {
        assert_eq!(mask_api_key("ab"), "****ab");
    }
}