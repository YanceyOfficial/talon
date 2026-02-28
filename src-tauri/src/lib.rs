use tauri::Manager;

// Tauri commands
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn toggle_window(window: tauri::Window) {
    if window.is_visible().unwrap_or(false) {
        window.hide().unwrap();
    } else {
        window.show().unwrap();
        window.set_focus().unwrap();
    }
}

#[tauri::command]
fn show_window(window: tauri::Window) {
    window.show().unwrap();
    window.set_focus().unwrap();
}

#[tauri::command]
fn hide_window(window: tauri::Window) {
    window.hide().unwrap();
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Position main window at bottom-right corner
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen_size = monitor.size();
                        let window_size = window.outer_size().unwrap_or_default();

                        // Position at bottom-right with 20px margin
                        let margin = 20;
                        let x = screen_size.width as i32 - window_size.width as i32 - margin;
                        let y = screen_size.height as i32 - window_size.height as i32 - margin;

                        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            toggle_window,
            show_window,
            hide_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
