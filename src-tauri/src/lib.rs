use std::fs;
use tauri::Manager;
use base64::{engine::general_purpose::STANDARD, Engine as _};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            save_data,
            load_data,
            get_data_path,
            save_background_image,
            load_background_image,
            delete_background_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}