import { describe, it, expect, vi } from "vitest";
import { setupDirectories, importImage } from "../lib/tauri";
import { invoke } from "@tauri-apps/api/core";

describe("Tauri commands wrapper", () => {
  it("setupDirectories invokes setup_directories command", async () => {
    const mockPath = "/home/user/.local/share/Threadly";
    vi.mocked(invoke).mockResolvedValueOnce(mockPath);

    const result = await setupDirectories();
    expect(invoke).toHaveBeenCalledWith("setup_directories");
    expect(result).toBe(mockPath);
  });

  it("importImage invokes import_image command with sourcePath parameter", async () => {
    const mockResult = {
      uuid: "test-uuid-12345",
      original_path: "/path/to/originals/test-uuid-12345.png",
      file_size: 204857,
      width: 800,
      height: 1000,
      checksum: "sha256-checksum-hash-here",
    };
    vi.mocked(invoke).mockResolvedValueOnce(mockResult);

    const result = await importImage("/source/photo.jpg");
    expect(invoke).toHaveBeenCalledWith("import_image", { sourcePath: "/source/photo.jpg" });
    expect(result).toEqual(mockResult);
  });
});
