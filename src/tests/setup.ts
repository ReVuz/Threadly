import "@testing-library/jest-dom";
import { vi } from "vitest";

// ─── Mock @tauri-apps/plugin-sql ───────────────────────────

class MockDatabase {
  static async load(path: string) {
    return new MockDatabase();
  }

  async execute(sql: string, params?: any[]) {
    return { lastInsertId: 1, rowsAffected: 1 };
  }

  async select(sql: string, params?: any[]) {
    // Return appropriate mocks depending on the query
    if (sql.includes("wardrobes")) {
      return [{ id: 1, name: "My Wardrobe", created_at: "2026-07-17T12:00:00Z" }];
    }
    if (sql.includes("clothes")) {
      return [];
    }
    return [];
  }
}

vi.mock("@tauri-apps/plugin-sql", () => {
  return {
    default: MockDatabase,
  };
});

// ─── Mock other Tauri APIs ──────────────────────────────────

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  default: {
    writeTextFile: vi.fn(),
    readTextFile: vi.fn(),
    mkdir: vi.fn(),
    copyFile: vi.fn(),
  },
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  default: {
    open: vi.fn(),
  },
}));
