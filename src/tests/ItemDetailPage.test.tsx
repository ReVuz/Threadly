import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ItemDetailPage from "../pages/ItemDetailPage";

const navigateMock = vi.hoisted(() => vi.fn());
const syncFtsMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const executeMock = vi.hoisted(() => vi.fn().mockResolvedValue({ rowsAffected: 1 }));
const selectMock = vi.hoisted(() => vi.fn());
const refreshAllMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: "1" }),
  };
});

vi.mock("../context/QueueContext", () => ({
  useQueue: () => ({
    refreshAll: refreshAllMock,
    queue: [],
    isProcessing: false,
    addToQueue: vi.fn(),
    refreshQueue: vi.fn(),
    analysisQueue: [],
    isAnalyzing: false,
    startAnalysis: vi.fn(),
    refreshAnalysisQueue: vi.fn(),
  }),
}));

vi.mock("../lib/db", () => ({
  db: {
    select: selectMock,
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoNothing: vi.fn() })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  },
  initDb: vi.fn().mockResolvedValue({ execute: executeMock }),
  syncFts: syncFtsMock,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  remove: vi.fn().mockResolvedValue(undefined),
}));

describe("ItemDetailPage", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    syncFtsMock.mockClear();
    executeMock.mockClear();
    selectMock.mockReset();
    refreshAllMock.mockClear();

    let callCount = 0;
    selectMock.mockImplementation(() => ({
      from: () => ({
        innerJoin: () => ({
          where: async () => [
            {
              id: 1,
              name: "Tailored",
            },
          ],
        }),
        where: async () => {
          callCount += 1;
          if (callCount === 1) {
            return [
              {
                id: 1,
                uuid: "uuid-1",
                nickname: "Classic Shirt",
                type: "top",
                primaryColor: "white",
                secondaryColor: null,
                pattern: "solid",
                material: "linen",
                fit: "relaxed",
                formality: "smart-casual",
                sleeveLength: "long",
                neckline: "collar",
                brand: "Threadly",
                condition: "new",
                weatherSuitability: "warm-weather",
                imageOriginal: "/tmp/original.png",
                imageProcessed: "/tmp/processed.png",
                imageThumbnail: "/tmp/thumb.png",
                fileSize: 1200,
                width: 800,
                height: 1000,
                checksum: "checksum-1",
              },
            ];
          }
          return [
            {
              id: 11,
              name: "Tailored",
            },
          ];
        },
      }),
    }));
  });

  it("syncs the FTS index after saving metadata", async () => {
    render(
      <MemoryRouter>
        <ItemDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Classic Shirt")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Edit Metadata"));

    const colorInput = screen.getByLabelText("Color");
    fireEvent.change(colorInput, { target: { value: "ivory" } });

    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(syncFtsMock).toHaveBeenCalledWith(1);
    });
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE clothes"),
      expect.arrayContaining(["ivory"])
    );
  });
});
