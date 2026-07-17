import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UploadZone from "../components/upload/UploadZone";
import { open } from "@tauri-apps/plugin-dialog";
import { importImage } from "../lib/tauri";
import { db } from "../lib/db";

// Mock tauri functions
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("../lib/tauri", () => ({
  importImage: vi.fn(),
}));

// We'll mock the database select and insert methods
vi.mock("../lib/db", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]), // Default: no duplicate found
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue({}),
  };
  return {
    db: mockDb,
    initDb: vi.fn(),
  };
});

describe("UploadZone Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload call to action", () => {
    render(<UploadZone />);
    expect(screen.getByText("Add Clothing Items")).toBeInTheDocument();
    expect(screen.getByText(/Click to choose photos/)).toBeInTheDocument();
  });

  it("opens file dialog when clicked", async () => {
    vi.mocked(open).mockResolvedValueOnce(null); // User cancels
    render(<UploadZone />);
    
    const clickArea = screen.getByText("Add Clothing Items").closest("div");
    expect(clickArea).toBeDefined();
    if (clickArea) {
      fireEvent.click(clickArea);
    }
    
    expect(open).toHaveBeenCalledWith({
      multiple: true,
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp"],
        },
      ],
    });
  });

  it("adds picked files to import queue and completes the import flow", async () => {
    // Picked 1 file
    vi.mocked(open).mockResolvedValueOnce("/home/user/Pictures/test-shirt.jpg");
    
    // Mock importImage return
    const mockImport = {
      uuid: "shirt-uuid-1",
      original_path: "/appdata/originals/shirt-uuid-1.jpg",
      file_size: 154200,
      width: 600,
      height: 800,
      checksum: "unique-checksum-123",
    };
    vi.mocked(importImage).mockResolvedValueOnce(mockImport);

    // Mock db check return - empty means no duplicate
    vi.mocked(db.where).mockResolvedValueOnce([]);

    const completeSpy = vi.fn();
    render(<UploadZone onImportComplete={completeSpy} />);
    
    const clickArea = screen.getByText("Add Clothing Items").closest("div");
    if (clickArea) {
      fireEvent.click(clickArea);
    }

    // Wait for the queue item to display and show status completed
    await waitFor(() => {
      expect(screen.getByText("test-shirt.jpg")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Imported")).toBeInTheDocument();
    });

    expect(importImage).toHaveBeenCalledWith("/home/user/Pictures/test-shirt.jpg");
    expect(db.insert).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalledWith([mockImport]);
  });
});
