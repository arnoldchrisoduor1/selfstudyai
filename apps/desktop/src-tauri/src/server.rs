use std::io::{Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpStream};
use std::path::Path;
use std::time::Duration;

use tokio::net::TcpListener;

pub fn sqlite_url() -> String {
    let dir = dirs::data_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join("self-study-ai");
    std::fs::create_dir_all(&dir).expect("app data dir");
    let path = dir.join("selfstudy.db");
    format!("sqlite://{}?mode=rwc", path_for_sqlite(&path))
}

fn path_for_sqlite(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

pub fn spawn(port: u16) -> u16 {
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("tokio runtime");
        runtime.block_on(async move {
            let store = storage::connect(&sqlite_url()).await.expect("database");
            let state = api::AppState { store };
            let origins = vec![
                "http://tauri.localhost".to_owned(),
                "https://tauri.localhost".to_owned(),
                "http://localhost:3000".to_owned(),
                "http://127.0.0.1:3000".to_owned(),
            ];
            let app = api::router(state, &origins);
            let listener = TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, port)))
                .await
                .expect("bind api");
            let bound = listener.local_addr().expect("local addr").port();
            tx.send(bound).expect("port channel");
            axum::serve(listener, app).await.expect("api serve");
        });
    });
    rx.recv().expect("api port")
}

pub fn health_ok(port: u16) -> bool {
    let address = format!("127.0.0.1:{port}");
    for _ in 0..50 {
        if let Ok(mut stream) = TcpStream::connect(&address) {
            let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
            let request =
                format!("GET /healthz HTTP/1.1\r\nHost: {address}\r\nConnection: close\r\n\r\n");
            if stream.write_all(request.as_bytes()).is_ok() {
                let mut buffer = String::new();
                if stream.read_to_string(&mut buffer).is_ok()
                    && buffer.contains("200")
                    && buffer.contains("ok")
                {
                    return true;
                }
            }
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    false
}
