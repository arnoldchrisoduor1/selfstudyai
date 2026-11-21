use sha2::{Digest, Sha256};

pub fn content_hash(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    hex::encode(digest)
}