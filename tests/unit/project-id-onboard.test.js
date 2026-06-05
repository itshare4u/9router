import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getProjectIdForConnection,
  invalidateProjectId,
  stopCacheCleanup,
} from "../../open-sse/services/projectId.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("project ID onboarding", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    invalidateProjectId("conn-after-onboard");
    invalidateProjectId("conn-top-level-project");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    stopCacheCleanup();
  });

  it("reloads loadCodeAssist after onboardUser is done without a project in the operation response", async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({
        allowedTiers: [{ id: "standard-tier", isDefault: true }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        done: true,
        response: {},
      }))
      .mockResolvedValueOnce(jsonResponse({
        cloudaicompanionProject: { id: "project-after-onboard" },
      }));

    const projectId = await getProjectIdForConnection("conn-after-onboard", "access-token");

    expect(projectId).toBe("project-after-onboard");
    expect(fetch).toHaveBeenCalledTimes(3);

    const onboardBody = JSON.parse(fetch.mock.calls[1][1].body);
    expect(onboardBody.tierId).toBe("standard-tier");
  });

  it("accepts project IDs returned directly by onboardUser", async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({
        allowedTiers: [{ id: "standard-tier", isDefault: true }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        done: true,
        project_id: "project-from-onboard",
      }));

    const projectId = await getProjectIdForConnection("conn-top-level-project", "access-token");

    expect(projectId).toBe("project-from-onboard");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
