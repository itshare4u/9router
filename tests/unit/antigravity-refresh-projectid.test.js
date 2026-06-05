import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  proxyAwareFetch: vi.fn(),
  getProjectIdForConnection: vi.fn(),
  invalidateProjectId: vi.fn(),
}));

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: mocks.proxyAwareFetch,
}));

vi.mock("../../open-sse/services/projectId.js", () => ({
  getProjectIdForConnection: mocks.getProjectIdForConnection,
  invalidateProjectId: mocks.invalidateProjectId,
}));

function tokenResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Antigravity credential refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves the stored projectId without fetching projectId during token refresh", async () => {
    mocks.proxyAwareFetch.mockResolvedValueOnce(tokenResponse({
      access_token: "new-access-token",
      expires_in: 3600,
    }));

    const { AntigravityExecutor } = await import("../../open-sse/executors/antigravity.js");
    const executor = new AntigravityExecutor();

    const refreshed = await executor.refreshCredentials({
      connectionId: "ag-connection",
      accessToken: "old-access-token",
      refreshToken: "refresh-token",
      projectId: "stored-project-id",
    }, null);

    expect(refreshed).toMatchObject({
      accessToken: "new-access-token",
      refreshToken: "refresh-token",
      expiresIn: 3600,
      projectId: "stored-project-id",
    });
    expect(mocks.getProjectIdForConnection).not.toHaveBeenCalled();
    expect(mocks.invalidateProjectId).not.toHaveBeenCalled();
  });
});
