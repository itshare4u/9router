import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/usageDb.js", () => ({
  appendRequestLog: vi.fn(),
  saveRequestDetail: vi.fn(),
  saveRequestUsage: vi.fn(),
}));

import { extractUsageFromResponse } from "../../open-sse/handlers/chatCore/requestDetail.js";
import { translateNonStreamingResponse } from "../../open-sse/handlers/chatCore/nonStreamingHandler.js";
import { FORMATS } from "../../open-sse/translator/formats.js";
import { openaiToAntigravityRequest } from "../../open-sse/translator/request/openai-to-gemini.js";

describe("Antigravity non-stream normalization", () => {
  it("sets a full output budget when OpenAI clients omit max tokens", () => {
    const result = openaiToAntigravityRequest(
      "gemini-3.5-flash-low",
      {
        messages: [{ role: "user", content: "translate this" }],
        stream: false,
      },
      false,
      { projectId: "project-123", connectionId: "conn-123" },
    );

    expect(result.request.generationConfig.maxOutputTokens).toBe(16384);
  });

  it("raises low client token caps for Antigravity thinking output", () => {
    const result = openaiToAntigravityRequest(
      "gemini-3.5-flash-low",
      {
        messages: [{ role: "user", content: "translate this" }],
        stream: false,
        max_tokens: 500,
      },
      false,
      { projectId: "project-123", connectionId: "conn-123" },
    );

    expect(result.request.generationConfig.maxOutputTokens).toBe(16384);
  });

  it("reads wrapped Gemini usage metadata from Antigravity JSON responses", () => {
    const usage = extractUsageFromResponse({
      response: {
        usageMetadata: {
          promptTokenCount: 11,
          candidatesTokenCount: 22,
          totalTokenCount: 38,
          cachedContentTokenCount: 4,
          thoughtsTokenCount: 5,
        },
      },
    });

    expect(usage).toEqual({
      prompt_tokens: 11,
      completion_tokens: 27,
      total_tokens: 38,
      cached_tokens: 4,
      reasoning_tokens: 5,
    });
  });

  it("includes Antigravity usage in translated non-stream OpenAI responses", () => {
    const translated = translateNonStreamingResponse({
      response: {
        responseId: "response-123",
        modelVersion: "gemini-3.5-flash-low",
        candidates: [{
          content: {
            parts: [{ text: "translated text" }],
          },
          finishReason: "STOP",
        }],
        usageMetadata: {
          promptTokenCount: 11,
          candidatesTokenCount: 22,
          totalTokenCount: 38,
          thoughtsTokenCount: 5,
        },
      },
    }, FORMATS.ANTIGRAVITY, FORMATS.OPENAI);

    expect(translated.choices[0].message.content).toBe("translated text");
    expect(translated.choices[0].finish_reason).toBe("stop");
    expect(translated.usage).toEqual({
      prompt_tokens: 11,
      completion_tokens: 27,
      total_tokens: 38,
      completion_tokens_details: { reasoning_tokens: 5 },
    });
  });
});
