import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProcessingProgressBar from "../components/upload/ProcessingProgressBar";
import type { QueueItem } from "../hooks/useProcessQueue";

describe("ProcessingProgressBar Component", () => {
  it("does not render when queue is empty", () => {
    const { container } = render(<ProcessingProgressBar queue={[]} isProcessing={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("does not render when all queue items are completed", () => {
    const queue: QueueItem[] = [
      { id: 1, uuid: "u-1", nickname: "item-1", imageOriginal: "img1.png", status: "completed" },
      { id: 2, uuid: "u-2", nickname: "item-2", imageOriginal: "img2.png", status: "completed" },
    ];
    const { container } = render(<ProcessingProgressBar queue={queue} isProcessing={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders progress state correctly when items are pending or processing", () => {
    const queue: QueueItem[] = [
      { id: 1, uuid: "u-1", nickname: "item-1", imageOriginal: "img1.png", status: "completed" },
      { id: 2, uuid: "u-2", nickname: "item-2", imageOriginal: "img2.png", status: "processing" },
      { id: 3, uuid: "u-3", nickname: "item-3", imageOriginal: "img3.png", status: "pending" },
    ];

    render(<ProcessingProgressBar queue={queue} isProcessing={true} />);

    expect(screen.getByText("Processing Wardrobe")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 (33%)")).toBeInTheDocument();
    expect(screen.getByText("Removing background & optimizing WebP assets...")).toBeInTheDocument();
  });

  it("renders rembg fallback warning if an item used fallback", () => {
    const queue: QueueItem[] = [
      { id: 1, uuid: "u-1", nickname: "item-1", imageOriginal: "img1.png", status: "completed", usedFallback: true },
      { id: 2, uuid: "u-2", nickname: "item-2", imageOriginal: "img2.png", status: "processing" },
    ];

    render(<ProcessingProgressBar queue={queue} isProcessing={true} />);

    expect(screen.getByText("AI Background Removal Off:")).toBeInTheDocument();
    expect(screen.getByText(/Install `rembg` on your system/)).toBeInTheDocument();
  });
});
