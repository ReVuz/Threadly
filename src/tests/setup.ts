import "@testing-library/jest-dom";
import { vi } from "vitest";

const localStorageStore = new Map<string, string>();

if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.getItem !== "function") {
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => (localStorageStore.has(key) ? localStorageStore.get(key)! : null),
      setItem: (key: string, value: string) => {
        localStorageStore.set(key, String(value));
      },
      removeItem: (key: string) => {
        localStorageStore.delete(key);
      },
      clear: () => {
        localStorageStore.clear();
      },
    },
    configurable: true,
  });
}

// ─── Mock @tauri-apps/plugin-sql ───────────────────────────

class MockDatabase {
  static async load(_path: string) {
    return new MockDatabase();
  }

  async execute(_sql: string, _params?: any[]) {
    return { lastInsertId: 1, rowsAffected: 1 };
  }

  async select(_sql: string, _params?: any[]) {
    // Return appropriate mocks depending on the query
    if (_sql.includes("wardrobes")) {
      return [{ id: 1, name: "My Wardrobe", created_at: "2026-07-17T12:00:00Z" }];
    }
    if (_sql.includes("clothes")) {
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
  convertFileSrc: vi.fn((path: string) => path),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  default: {
    writeTextFile: vi.fn(),
    readTextFile: vi.fn(),
    mkdir: vi.fn(),
    copyFile: vi.fn(),
    remove: vi.fn(),
  },
  remove: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  default: {
    open: vi.fn(),
  },
}));
