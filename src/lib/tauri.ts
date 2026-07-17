import { invoke } from "@tauri-apps/api/core";

export interface ImportImageResult {
  uuid: string;
  original_path: string;
  file_size: number;
  width: number;
  height: number;
  checksum: string;
}

/**
 * Initializes the required subdirectories in the application data directory
 * (originals, processed, thumbnails, cache).
 * Returns the resolved base application data directory path.
 */
export async function setupDirectories(): Promise<string> {
  return invoke<string>("setup_directories");
}

/**
 * Imports a clothing image into the originals folder.
 * Copies the source file, generates a UUID filename, calculates SHA-256 checksum,
 * and reads the image dimensions.
 */
export async function importImage(sourcePath: string): Promise<ImportImageResult> {
  return invoke<ImportImageResult>("import_image", { sourcePath });
}

export interface ProcessResult {
  uuid: string;
  processed_path: string;
  thumbnail_path: string;
  used_fallback: boolean;
}

/**
 * Removes the background of a clothing item using the rembg CLI, and generates a WebP thumbnail.
 * If rembg is not installed, it falls back to copying the original image.
 */
export async function removeBackground(uuid: string, extension: string): Promise<ProcessResult> {
  return invoke<ProcessResult>("remove_background", { uuid, extension });
}
