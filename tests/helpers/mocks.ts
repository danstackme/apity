import { vi } from "vitest";

// Define mock implementations
const writeFileSyncMock = vi.fn();
const mkdirSyncMock = vi.fn();
const existsSyncMock = vi.fn().mockReturnValue(false);
const writeFileMock = vi.fn();
const mkdirMock = vi.fn();
const readFileMock = vi.fn().mockResolvedValue("");
const watchMock = vi.fn(() => ({
  on: vi.fn(),
}));

// Hoist mocks
vi.mock("fs", () => ({
  writeFileSync: writeFileSyncMock,
  mkdirSync: mkdirSyncMock,
  existsSync: existsSyncMock,
  promises: {
    writeFile: writeFileMock,
    mkdir: mkdirMock,
    readFile: readFileMock,
  },
}));

vi.mock("chokidar", () => ({
  watch: watchMock,
}));

vi.mock("glob", () => ({
  glob: vi.fn().mockResolvedValue([]),
}));

// Export mocks for assertions
export const fsMock = {
  writeFileSync: writeFileSyncMock,
  mkdirSync: mkdirSyncMock,
  existsSync: existsSyncMock,
  promises: {
    writeFile: writeFileMock,
    mkdir: mkdirMock,
    readFile: readFileMock,
  },
};

export const chokidarMock = {
  watch: watchMock,
};
