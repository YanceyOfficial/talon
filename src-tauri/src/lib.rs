use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

#[tauri::command]
fn reload_window(app: tauri::AppHandle, label: String) {
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.eval("window.location.reload()");
    }
}

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
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(true);
                let _ = window.set_visible_on_all_workspaces(true);

                let win = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = win.hide();
                    }
                });
            }

            // ---------- Tray Menu ----------
            let toggle =
                MenuItem::with_id(app, "toggle", "Show / Hide Clippy", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Clippy", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &toggle,
                    &PredefinedMenuItem::separator(app)?,
                    &settings,
                    &PredefinedMenuItem::separator(app)?,
                    &quit,
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
                        rect,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();

                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                                return;
                            }

                            // ---------- 定位到 tray icon 下方 ----------
                            if let Ok(win_size) = window.outer_size() {
                                let win_w = win_size.width as f64;

                                let (tray_x, tray_y) = match rect.position {
                                    tauri::Position::Physical(p) => (p.x as f64, p.y as f64),
                                    tauri::Position::Logical(p) => (p.x, p.y),
                                };

                                let (tray_w, tray_h) = match rect.size {
                                    tauri::Size::Physical(s) => (s.width as f64, s.height as f64),
                                    tauri::Size::Logical(s) => (s.width, s.height),
                                };

                                let mut x = tray_x + tray_w / 2.0 - win_w / 2.0;
                                let y = tray_y + tray_h + 8.0;

                                if let Ok(Some(monitor)) = window.current_monitor() {
                                    let screen_w = monitor.size().width as f64;
                                    x = x.max(8.0).min(screen_w - win_w - 8.0);
                                }

                                let _ = window.set_position(tauri::Position::Physical(
                                    tauri::PhysicalPosition {
                                        x: x as i32,
                                        y: y as i32,
                                    },
                                ));
                            }
                            let _ = window.show();
                            let _ = window.set_focus();
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

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![reload_window, update_tray_tooltip])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}