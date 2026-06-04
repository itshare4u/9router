import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  refreshCredentials: vi.fn(),
  onRequestSuccess: vi.fn(),
  trackPendingRequest: vi.fn(),
  appendRequestLog: vi.fn(() => Promise.resolve()),
  saveRequestDetail: vi.fn(() => Promise.resolve()),
  saveRequestUsage: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/usageDb.js", () => ({
  trackPendingRequest: mocks.trackPendingRequest,
  appendRequestLog: mocks.appendRequestLog,
  saveRequestDetail: mocks.saveRequestDetail,
  saveRequestUsage: mocks.saveRequestUsage,
}));

vi.mock("../../open-sse/executors/index.js", () => ({
  getExecutor: vi.fn(() => ({
    noAuth: false,
    execute: mocks.execute,
    refreshCredentials: mocks.refreshCredentials,
  })),
}));

vi.mock("../../open-sse/utils/requestLogger.js", () => ({
  createRequestLogger: vi.fn(async () => ({
    logClientRawRequest: vi.fn(),
    logRawRequest: vi.fn(),
    logTargetRequest: vi.fn(),
    logProviderResponse: vi.fn(),
    logConvertedResponse: vi.fn(),
    logError: vi.fn(),
    appendProviderChunk: vi.fn(),
    appendConvertedChunk: vi.fn(),
    appendOpenAIChunk: vi.fn(),
    logOpenAIRequest: vi.fn(),
  })),
}));

const { handleChatCore } = await import("../../open-sse/handlers/chatCore.js");

function providerJsonResponse() {
  return new Response(JSON.stringify({
    id: "chatcmpl-test",
    object: "chat.completion",
    created: 123,
    model: "gpt-4o-mini",
    choices: [{
      index: 0,
      message: { role: "assistant", content: "ok" },
      finish_reason: "stop",
    }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function runOpenAI(body) {
  mocks.execute.mockResolvedValueOnce({
    response: providerJsonResponse(),
    url: "https://api.openai.com/v1/chat/completions",
    headers: {},
    transformedBody: body,
  });

  return handleChatCore({
    body,
    modelInfo: { provider: "openai", model: "gpt-4o-mini" },
    credentials: { apiKey: "sk-test" },
    log: null,
    onRequestSuccess: mocks.onRequestSuccess,
    clientRawRequest: {
      endpoint: "/v1/chat/completions",
      body,
      headers: {},
    },
  });
}

describe("handleChatCore stream mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not force upstream streaming when an OpenAI client sends stream=false", async () => {
    const body = {
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      stream: false,
    };

    const result = await runOpenAI(body);

    expect(result.success).toBe(true);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    const upstream = mocks.execute.mock.calls[0][0];
    expect(upstream.stream).toBe(false);
    expect(upstream.body.stream).toBe(false);
  });

  it("defaults OpenAI-compatible chat requests to non-streaming when stream is omitted", async () => {
    const body = {
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
    };

    const result = await runOpenAI(body);

    expect(result.success).toBe(true);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    const upstream = mocks.execute.mock.calls[0][0];
    expect(upstream.stream).toBe(false);
    expect(upstream.body.stream).toBeUndefined();
  });

  it("still streams upstream when an OpenAI client sends stream=true", async () => {
    const body = {
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      stream: true,
    };

    mocks.execute.mockResolvedValueOnce({
      response: new Response("data: [DONE]\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
      url: "https://api.openai.com/v1/chat/completions",
      headers: {},
      transformedBody: body,
    });

    const result = await handleChatCore({
      body,
      modelInfo: { provider: "openai", model: "gpt-4o-mini" },
      credentials: { apiKey: "sk-test" },
      log: null,
      clientRawRequest: {
        endpoint: "/v1/chat/completions",
        body,
        headers: {},
      },
    });

    expect(result.success).toBe(true);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    const upstream = mocks.execute.mock.calls[0][0];
    expect(upstream.stream).toBe(true);
    expect(upstream.body.stream).toBe(true);
  });
});
