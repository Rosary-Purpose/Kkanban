use std::fs;
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use base64::{engine::general_purpose::STANDARD, Engine as _};

mod alarms;

fn full_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let docs = app.path().document_dir().map_err(|e| e.to_string())?;
    Ok(docs.join("kkanban").join("kkanban-data.json"))
}

fn backgrounds_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let docs = app.path().document_dir().map_err(|e| e.to_string())?;
    Ok(docs.join("kkanban").join("backgrounds"))
}

fn background_path(app: &tauri::AppHandle, board_id: &str) -> Result<std::path::PathBuf, String> {
    Ok(backgrounds_dir(app)?.join(format!("{}.bg", board_id)))
}

// Whiteboard photos follow the exact same one-file-per-item pattern as
// board background images, and for the same reason: keeping image bytes
// out of the main JSON so routine saves stay small and fast. Keyed by the
// photo shape's own id (not board id) since a board's pages can hold many
// photos, not just one.
fn wb_photos_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let docs = app.path().document_dir().map_err(|e| e.to_string())?;
    Ok(docs.join("kkanban").join("wb-photos"))
}

fn wb_photo_path(app: &tauri::AppHandle, photo_id: &str) -> Result<std::path::PathBuf, String> {
    Ok(wb_photos_dir(app)?.join(format!("{}.img", photo_id)))
}

#[tauri::command]
fn save_data(app: tauri::AppHandle, data: String) -> Result<(), String> {
    let path = full_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_data(app: tauri::AppHandle) -> Result<String, String> {
    let path = full_path(&app)?;
    if path.exists() {
        return fs::read_to_string(path).map_err(|e| e.to_string());
    }
    // One-time migration: earlier versions of kkanban saved to a different,
    // hidden location. If that old file exists, copy it to the new
    // Documents\kkanban location so nothing is lost.
    if let Ok(old_dir) = app.path().app_data_dir() {
        let old_path = old_dir.join("board.json");
        if old_path.exists() {
            let content = fs::read_to_string(&old_path).map_err(|e| e.to_string())?;
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::write(&path, &content).map_err(|e| e.to_string())?;
            return Ok(content);
        }
    }
    Err("no data file found yet".to_string())
}

#[tauri::command]
fn get_data_path(app: tauri::AppHandle) -> Result<String, String> {
    full_path(&app).map(|p| p.to_string_lossy().to_string())
}

// Export/import write to and read from a path the user picks themselves via
// a native Save/Open dialog (see the frontend's exportBackup/importBackup,
// which call the tauri-plugin-dialog JS API for that picker, then invoke
// these). Unlike save_data/load_data above, this path is arbitrary and
// user-chosen rather than the app's own fixed data file.
#[tauri::command]
fn write_text_file(path: String, data: String) -> Result<(), String> {
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

// Daily automatic backup: Documents/kkanban/backups/kkanban-auto-<date>.json,
// written at most once per day (returns false if today's already exists),
// keeping only the newest AUTO_BACKUP_KEEP files. The date comes from the
// frontend (local time) and must be plain YYYY-MM-DD, so it can never form
// any other path.
const AUTO_BACKUP_KEEP: usize = 14;

#[tauri::command]
fn auto_backup(app: tauri::AppHandle, date: String, data: String) -> Result<bool, String> {
    let valid = date.len() == 10
        && date.chars().enumerate().all(|(i, c)| if i == 4 || i == 7 { c == '-' } else { c.is_ascii_digit() });
    if !valid {
        return Err("invalid date".to_string());
    }
    let docs = app.path().document_dir().map_err(|e| e.to_string())?;
    let dir = docs.join("kkanban").join("backups");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("kkanban-auto-{}.json", date));
    if path.exists() {
        return Ok(false);
    }
    fs::write(&path, data).map_err(|e| e.to_string())?;
    // Names sort by date, so everything before the newest N is old.
    let mut names: Vec<String> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter(|n| n.starts_with("kkanban-auto-") && n.ends_with(".json"))
        .collect();
    names.sort();
    if names.len() > AUTO_BACKUP_KEEP {
        for old in &names[..names.len() - AUTO_BACKUP_KEEP] {
            let _ = fs::remove_file(dir.join(old));
        }
    }
    Ok(true)
}

// Background images are stored as their own file per board (instead of
// embedded as base64 inside the main JSON) so that routine saves - adding a
// card, checking a checklist item, etc. - don't have to rewrite a
// multi-megabyte string to disk every single time. Each board's image lives
// at Documents/kkanban/backgrounds/<board_id>.bg - the ".bg" extension is
// arbitrary; the actual image format is preserved separately in the JSON as
// a small mime-type string, and the raw bytes are decoded straight back
// into that format on load.
#[tauri::command]
fn save_background_image(app: tauri::AppHandle, board_id: String, data_base64: String) -> Result<(), String> {
    let dir = backgrounds_dir(&app)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let bytes = STANDARD.decode(data_base64).map_err(|e| e.to_string())?;
    let path = background_path(&app, &board_id)?;
    fs::write(path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_background_image(app: tauri::AppHandle, board_id: String) -> Result<String, String> {
    let path = background_path(&app, &board_id)?;
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(bytes))
}

#[tauri::command]
fn delete_background_image(app: tauri::AppHandle, board_id: String) -> Result<(), String> {
    let path = background_path(&app, &board_id)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn save_wb_photo(app: tauri::AppHandle, photo_id: String, data_base64: String) -> Result<(), String> {
    let dir = wb_photos_dir(&app)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let bytes = STANDARD.decode(data_base64).map_err(|e| e.to_string())?;
    let path = wb_photo_path(&app, &photo_id)?;
    fs::write(path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_wb_photo(app: tauri::AppHandle, photo_id: String) -> Result<String, String> {
    let path = wb_photo_path(&app, &photo_id)?;
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(bytes))
}

#[tauri::command]
fn delete_wb_photo(app: tauri::AppHandle, photo_id: String) -> Result<(), String> {
    let path = wb_photo_path(&app, &photo_id)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Lists what's actually on disk (bare id, no extension) for each of the two
// separate-file image stores - the frontend diffs these against what its
// own data currently references, in both directions: a file present here
// but never referenced is an orphan (safe to delete); a reference with no
// matching id here means the file itself went missing.
fn list_ids_in_dir(dir: std::path::PathBuf) -> Result<Vec<String>, String> {
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut ids = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if let Some(stem) = entry.path().file_stem() {
            ids.push(stem.to_string_lossy().to_string());
        }
    }
    Ok(ids)
}

#[tauri::command]
fn list_wb_photos(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    list_ids_in_dir(wb_photos_dir(&app)?)
}

#[tauri::command]
fn list_backgrounds(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    list_ids_in_dir(backgrounds_dir(&app)?)
}

// Reads an arbitrary user-chosen path (from the native "Locate File" file
// picker, not one of this app's own managed folders) and returns its bytes
// as base64 - used to relink a shape/board to a replacement image file.
#[tauri::command]
fn read_file_as_base64(path: String) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(bytes))
}

// A kkanban:// link (from an alarm's "Open" button) that launched the app
// before the page was ready to receive it.
struct PendingOpenUrl(Mutex<Option<String>>);

#[tauri::command]
fn take_open_url(state: tauri::State<PendingOpenUrl>) -> Option<String> {
    state.0.lock().unwrap().take()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    alarms::claim_app_id();
    tauri::Builder::default()
        // Must be registered first. Clicking "Open" on an alarm launches
        // kkanban via a kkanban:// link; if it's already running, this hands
        // the link to the running copy (through the deep-link plugin below)
        // instead of opening a second window.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(PendingOpenUrl(Mutex::new(None)))
        .setup(|app| {
            use tauri_plugin_deep_link::DeepLinkExt;
            // The installer registers kkanban:// too; this re-points it at
            // whichever copy launched last (covers `tauri dev`).
            #[cfg(windows)]
            let _ = app.deep_link().register_all();
            // Launched cold by a link: the page isn't loaded yet, so park the
            // link for the frontend to collect (take_open_url) once it is.
            if let Ok(Some(urls)) = app.deep_link().get_current() {
                if let Some(u) = urls.first() {
                    *app.state::<PendingOpenUrl>().0.lock().unwrap() = Some(u.to_string());
                }
            }
            // Link arriving while already running: hand it straight over.
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(u) = event.urls().first() {
                    let _ = handle.emit("open-url", u.to_string());
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_data,
            load_data,
            get_data_path,
            write_text_file,
            read_text_file,
            auto_backup,
            save_background_image,
            load_background_image,
            delete_background_image,
            save_wb_photo,
            load_wb_photo,
            delete_wb_photo,
            list_wb_photos,
            list_backgrounds,
            read_file_as_base64,
            take_open_url,
            alarms::sync_due_alarms,
            alarms::show_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}