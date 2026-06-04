import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    connections: [],
    getProviderConnections: vi.fn(async ({ provider, isActive } = {}) => (
      state.connections
        .filter((conn) => (provider ? conn.provider === provider : true))
        .filter((conn) => (isActive === undefined ? true : conn.isActive === isActive))
        .sort((a, b) => (a.priority || 999) - (b.priority || 999))
    )),
    getSettings: vi.fn(async () => ({
      fallbackStrategy: "fill-first",
      providerStrategies: {
        antigravity: { fallbackStrategy: "round-robin", stickyRoundRobinLimit: 1 },
      },
    })),
    updateProviderConnection: vi.fn(async (id, data) => {
      const conn = state.connections.find((item) => item.id === id);
      if (!conn) return null;
      Object.assign(conn, data);
      return { ...conn };
    }),
    validateApiKey: vi.fn(async () => true),
    resolveConnectionProxyConfig: vi.fn(async () => ({
      connectionProxyEnabled: false,
      connectionProxyUrl: "",
      connectionNoProxy: "",
      proxyPoolId: null,
      vercelRelayUrl: "",
    })),
  };
  return state;
});

vi.mock("@/lib/localDb", () => ({
  getProviderConnections: mocks.getProviderConnections,
  getSettings: mocks.getSettings,
  updateProviderConnection: mocks.updateProviderConnection,
  validateApiKey: mocks.validateApiKey,
}));

vi.mock("@/lib/network/connectionProxy", () => ({
  resolveConnectionProxyConfig: mocks.resolveConnectionProxyConfig,
}));

vi.mock("../../src/sse/utils/logger.js", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe("provider credential selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    mocks.connections = [
      {
        id: "ag-1",
        provider: "antigravity",
        authType: "oauth",
        name: "AG One",
        email: "one@example.com",
        priority: 1,
        isActive: true,
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresAt,
        expiresIn: 3600,
        projectId: "project-1",
        providerSpecificData: { custom: "one" },
      },
      {
        id: "ag-2",
        provider: "antigravity",
        authType: "oauth",
        name: "AG Two",
        email: "two@example.com",
        priority: 2,
        isActive: true,
        accessToken: "access-2",
        refreshToken: "refresh-2",
        expiresAt,
        expiresIn: 3600,
        projectId: "project-2",
        providerSpecificData: { custom: "two" },
      },
    ];
  });

  it("preserves OAuth metadata needed by Antigravity round-robin accounts", async () => {
    const { getProviderCredentials } = await import("../../src/sse/services/auth.js");

    const first = await getProviderCredentials("antigravity", null, "gemini-3-flash-agent");
    const second = await getProviderCredentials("antigravity", null, "gemini-3-flash-agent");

    expect(first).toMatchObject({
      connectionId: "ag-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 3600,
      projectId: "project-1",
      email: "one@example.com",
    });
    expect(first.expiresAt).toEqual(mocks.connections[0].expiresAt);

    expect(second).toMatchObject({
      connectionId: "ag-2",
      accessToken: "access-2",
      refreshToken: "refresh-2",
      expiresIn: 3600,
      projectId: "project-2",
      email: "two@example.com",
    });
    expect(second.expiresAt).toEqual(mocks.connections[1].expiresAt);
  });
});
