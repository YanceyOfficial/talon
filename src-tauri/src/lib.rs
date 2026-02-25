use tauri::{
    AppHandle, Listener, Manager, Runtime,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent, TrayIconId},
};

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

// Update tray menu with new status
fn update_tray_menu<R: Runtime>(app: &AppHandle<R>, status: &str) -> tauri::Result<()> {
    let status_emoji = match status {
        "connected" => "🟢",
        "connecting" => "🟡",
        _ => "🔴",
    };
    let status_label = match status {
        "connected" => "Connected",
        "connecting" => "Connecting...",
        _ => "Disconnected",
    };

    let status_item = MenuItem::with_id(
        app,
        "status",
        format!("{} {}", status_emoji, status_label),
        false,
        None::<&str>,
    )?;
    let show_i = MenuItem::with_id(app, "show", "Show Clippy", true, None::<&str>)?;
    let hide_i = MenuItem::with_id(app, "hide", "Hide Clippy", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&status_item, &show_i, &hide_i, &quit_i])?;

    if let Some(tray) = app.tray_by_id(&TrayIconId::new("main")) {
        tray.set_menu(Some(menu))?;
    }

    Ok(())
}

// Setup system tray
fn setup_tray<R: Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    let status_item = MenuItem::with_id(app, "status", "🔴 Disconnected", false, None::<&str>)?;
    let show_i = MenuItem::with_id(app, "show", "Show Clippy", true, None::<&str>)?;
    let hide_i = MenuItem::with_id(app, "hide", "Hide Clippy", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&status_item, &show_i, &hide_i, &quit_i])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("Clippy - AI Assistant")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    window.hide().unwrap();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        window.hide().unwrap();
                    } else {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            setup_tray(app)?;

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

            // Listen for status changes from frontend
            let app_handle = app.handle().clone();
            app.listen("status-changed", move |event| {
                let payload = event.payload();
                // Parse JSON payload to get status
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(payload) {
                    if let Some(status) = data.get("status").and_then(|s| s.as_str()) {
                        let _ = update_tray_menu(&app_handle, status);
                    }
                }
            });

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
