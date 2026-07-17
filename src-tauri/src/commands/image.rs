use std::fs;
use std::process::Command;
use tauri::Manager;

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ProcessResult {
    pub uuid: String,
    pub processed_path: String,
    pub thumbnail_path: String,
    pub used_fallback: bool,
}

#[tauri::command]
pub fn remove_background(
    app: tauri::AppHandle,
    uuid: String,
    extension: String,
) -> Result<ProcessResult, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let original_path = app_dir.join("originals").join(format!("{}.{}", uuid, extension));
    let processed_dir = app_dir.join("processed");
    let thumbnails_dir = app_dir.join("thumbnails");

    // Ensure processed and thumbnails dirs exist
    if !processed_dir.exists() {
        fs::create_dir_all(&processed_dir)
            .map_err(|e| format!("Failed to create processed directory: {}", e))?;
    }
    if !thumbnails_dir.exists() {
        fs::create_dir_all(&thumbnails_dir)
            .map_err(|e| format!("Failed to create thumbnails directory: {}", e))?;
    }

    let processed_path = processed_dir.join(format!("{}.webp", uuid));
    let thumbnail_path = thumbnails_dir.join(format!("{}.webp", uuid));

    if !original_path.exists() {
        return Err(format!("Original image not found: {:?}", original_path));
    }

    // Try executing rembg CLI
    let mut used_fallback = false;
    let mut rembg_cmd = Command::new("rembg");
    rembg_cmd.args(&["i", original_path.to_str().unwrap(), processed_path.to_str().unwrap()]);

    match rembg_cmd.output() {
        Ok(output) if output.status.success() => {
            // Background removal succeeded
        }
        _ => {
            // Fallback: If rembg fails or is not installed, open the original image and save it as WebP directly
            used_fallback = true;
            let img = image::open(&original_path)
                .map_err(|e| format!("Fallback failed: cannot open original image: {}", e))?;
            img.save(&processed_path)
                .map_err(|e| format!("Fallback failed: cannot save processed image as WebP: {}", e))?;
        }
    }

    // Generate thumbnail (max 300x300 WebP)
    let processed_img = image::open(&processed_path)
        .map_err(|e| format!("Failed to open processed image for thumbnail: {}", e))?;
    
    let thumbnail = processed_img.thumbnail(300, 300);
    thumbnail.save(&thumbnail_path)
        .map_err(|e| format!("Failed to save thumbnail image: {}", e))?;

    Ok(ProcessResult {
        uuid,
        processed_path: processed_path.to_string_lossy().to_string(),
        thumbnail_path: thumbnail_path.to_string_lossy().to_string(),
        used_fallback,
    })
}
