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
