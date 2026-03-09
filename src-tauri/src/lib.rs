use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

/// Reload a webview window by label (used to sync theme changes across windows).
#[tauri::command]
fn reload_window(app: tauri::AppHandle, label: String) {
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.eval("window.location.reload()");
    }
}

/// Called from frontend when connection status changes — updates tray tooltip.
#[tauri::command]
fn update_tray_tooltip(app: tauri::AppHandle, status: String) {
    if let Some(tray) = app.tray_by_id("main") {
        let tooltip = match status.as_str() {
            "connected" => "Clippy · Connected",
            "connecting" => "Clippy · Connecting…",
            "error" => "Clippy · Connection Error",
            _ => "Clippy",
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // ── Tray menu ────────────────────────────────────────────────────
            let show_hide =
                MenuItem::with_id(app, "toggle", "Show / Hide Clippy", true, None::<&str>)?;
            let settings_item =
                MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
            let quit_item =
                MenuItem::with_id(app, "quit", "Quit Clippy", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &show_hide,
                    &PredefinedMenuItem::separator(app)?,
                    &settings_item,
                    &PredefinedMenuItem::separator(app)?,
                    &quit_item,
                ],
            )?;

            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Clippy")
                .show_menu_on_left_click(false)
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
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "settings" => {
                        let _ = app.emit("tray-open-settings", ());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // ── Position main window at bottom-right corner ──────────────────
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen_size = monitor.size();
                        let window_size = window.outer_size().unwrap_or_default();
                        let margin = 20;
                        let x =
                            screen_size.width as i32 - window_size.width as i32 - margin;
                        let y =
                            screen_size.height as i32 - window_size.height as i32 - margin;
                        let _ = window.set_position(tauri::Position::Physical(
                            tauri::PhysicalPosition { x, y },
                        ));
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![reload_window, update_tray_tooltip])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
