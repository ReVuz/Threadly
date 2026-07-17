use std::fs;
use std::path::Path;
use sha2::{Digest, Sha256};
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ImportResult {
    pub uuid: String,
    pub original_path: String,
    pub file_size: u64,
    pub width: u32,
    pub height: u32,
    pub checksum: String,
}

#[tauri::command]
pub fn setup_directories(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let subdirs = vec!["originals", "processed", "thumbnails", "cache"];
    for subdir in subdirs {
        let dir_path = app_dir.join(subdir);
        if !dir_path.exists() {
            fs::create_dir_all(&dir_path)
                .map_err(|e| format!("Failed to create directory {:?}: {}", dir_path, e))?;
        }
    }

    Ok(app_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn import_image(app: tauri::AppHandle, source_path: String) -> Result<ImportResult, String> {
    let source = Path::new(&source_path);
    if !source.exists() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Create directories just in case they don't exist yet
    let originals_dir = app_dir.join("originals");
    if !originals_dir.exists() {
        fs::create_dir_all(&originals_dir)
            .map_err(|e| format!("Failed to create originals dir: {}", e))?;
    }

    // Determine extension
    let extension = source.extension()
        .map(|ext| ext.to_string_lossy().to_string().to_lowercase())
        .unwrap_or_else(|| "png".to_string());

    // Generate UUID
    let file_uuid = Uuid::new_v4().to_string();
    let dest_filename = format!("{}.{}", file_uuid, extension);
    let dest_path = originals_dir.join(&dest_filename);

    // Copy file
    fs::copy(source, &dest_path)
        .map_err(|e| format!("Failed to copy file to originals: {}", e))?;

    // Get file size
    let metadata = fs::metadata(&dest_path)
        .map_err(|e| format!("Failed to read destination metadata: {}", e))?;
    let file_size = metadata.len();

    // Get image dimensions using image crate header parser (fast)
    let (width, height) = image::image_dimensions(&dest_path)
        .map_err(|e| format!("Failed to read image dimensions: {}", e))?;

    // Calculate SHA-256 checksum
    let mut file_content = fs::read(&dest_path)
        .map_err(|e| format!("Failed to read copied file for checksum: {}", e))?;
    
    let mut hasher = Sha256::new();
    hasher.update(&file_content);
    let checksum = format!("{:x}", hasher.finalize());

    // Clean up memory buffer
    file_content.clear();
    file_content.shrink_to_fit();

    Ok(ImportResult {
        uuid: file_uuid,
        original_path: dest_path.to_string_lossy().to_string(),
        file_size,
        width,
        height,
        checksum,
    })
}
