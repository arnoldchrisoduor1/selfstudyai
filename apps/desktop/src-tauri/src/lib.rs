mod server;

pub fn run() {
    let smoke = std::env::args().any(|arg| arg == "--smoke");
    let port = server::spawn(if smoke { 0 } else { 18080 });
    if smoke {
        if server::health_ok(port) {
            std::process::exit(0);
        }
        eprintln!("embedded api healthz failed");
        std::process::exit(1);
    }

    tauri::Builder::default()
        .append_invoke_initialization_script("window.__STUDY_API_BASE__='http://127.0.0.1:18080';")
        .run(tauri::generate_context!())
        .expect("error while running tauri");
}
