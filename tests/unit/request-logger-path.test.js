import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("request logger path", () => {
  const originalEnableLogs = process.env.ENABLE_REQUEST_LOGS;
  const originalLogsDir = process.env.NINE_ROUTER_LOGS_DIR;
  const originalRouterLogsDir = process.env.ROUTER_LOGS_DIR;

  afterEach(() => {
    if (originalEnableLogs === undefined) delete process.env.ENABLE_REQUEST_LOGS;
    else process.env.ENABLE_REQUEST_LOGS = originalEnableLogs;

    if (originalLogsDir === undefined) delete process.env.NINE_ROUTER_LOGS_DIR;
    else process.env.NINE_ROUTER_LOGS_DIR = originalLogsDir;

    if (originalRouterLogsDir === undefined) delete process.env.ROUTER_LOGS_DIR;
    else process.env.ROUTER_LOGS_DIR = originalRouterLogsDir;

    vi.resetModules();
  });

  it("writes request logs under the user data directory by default", async () => {
    process.env.ENABLE_REQUEST_LOGS = "true";
    delete process.env.NINE_ROUTER_LOGS_DIR;
    delete process.env.ROUTER_LOGS_DIR;
    vi.resetModules();

    const { createRequestLogger } = await import("../../open-sse/utils/requestLogger.js");
    const logger = await createRequestLogger("openai", "antigravity", "gemini-3.5-flash-low");

    const expectedBase = process.platform === "win32"
      ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "9router", "logs")
      : path.join(os.homedir(), ".9router", "logs");

    expect(logger.sessionPath).toContain(expectedBase);

    if (logger.sessionPath) {
      fs.rmSync(logger.sessionPath, { recursive: true, force: true });
    }
  });
});
