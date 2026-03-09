import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import * as fs from "node:fs";
import * as path from "node:path";

const app = new Hono();

// ─── Data directory for JSON cache ───
const DATA_DIR = path.join(process.cwd(), "data", "prds");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

ensureDataDir();

// Enable CORS for local development
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// ─── Cache API Routes ───────────────────────────────────────

// List all cached PRDs (metadata only, no content for performance)
app.get("/api/cache", (c) => {
  try {
    ensureDataDir();
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
    const items = files
      .map((file) => {
        try {
          const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
          const item = JSON.parse(raw);
          // Return everything (including content for full sync)
          return item;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return c.json({ items });
  } catch (err) {
    return c.json({ error: "Failed to list cached PRDs" }, 500);
  }
});

// Get a single cached PRD
app.get("/api/cache/:id", (c) => {
  const id = c.req.param("id");
  const filePath = path.join(DATA_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return c.json({ error: "PRD not found" }, 404);
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return c.json(JSON.parse(raw));
  } catch {
    return c.json({ error: "Failed to read PRD" }, 500);
  }
});

// Save a PRD to cache
app.post("/api/cache", async (c) => {
  try {
    ensureDataDir();
    const item = await c.req.json();

    if (!item.id || !item.title || !item.content) {
      return c.json(
        { error: "id, title, and content are required" },
        400
      );
    }

    const filePath = path.join(DATA_DIR, `${item.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(item, null, 2), "utf-8");

    return c.json({ success: true, id: item.id });
  } catch (err) {
    return c.json({ error: "Failed to save PRD" }, 500);
  }
});

// Delete a single cached PRD
app.delete("/api/cache/:id", (c) => {
  const id = c.req.param("id");
  const filePath = path.join(DATA_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return c.json({ error: "PRD not found" }, 404);
  }

  try {
    fs.unlinkSync(filePath);
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Failed to delete PRD" }, 500);
  }
});

// Clear all cached PRDs
app.delete("/api/cache", (c) => {
  try {
    ensureDataDir();
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      fs.unlinkSync(path.join(DATA_DIR, file));
    }
    return c.json({ success: true, deleted: files.length });
  } catch {
    return c.json({ error: "Failed to clear cache" }, 500);
  }
});

// ─── Existing Routes ─────────────────────────────────────────

// Validate OpenRouter API key
app.post("/api/validate-key", async (c) => {
  const { apiKey } = await c.req.json();

  if (!apiKey) {
    return c.json({ valid: false, error: "API key is required" }, 400);
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.ok) {
      const data = await res.json();
      return c.json({ valid: true, data });
    } else {
      const error = await res.text();
      return c.json({ valid: false, error: `Invalid API key: ${error}` }, 401);
    }
  } catch (err) {
    return c.json(
      { valid: false, error: "Network error: could not reach OpenRouter" },
      503
    );
  }
});

// Fetch available models from OpenRouter
app.get("/api/models", async (c) => {
  const apiKey = c.req.header("Authorization")?.replace("Bearer ", "");

  if (!apiKey) {
    return c.json({ error: "API key required" }, 401);
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      return c.json({ error: "Failed to fetch models" }, res.status);
    }

    const data = await res.json();
    // Filter to text-capable models and return relevant fields
    const models = data.data
      .filter(
        (m: any) =>
          m.architecture?.modality === "text->text" ||
          m.architecture?.modality === "text+image->text"
      )
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        context_length: m.context_length,
        pricing: m.pricing,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return c.json({ models });
  } catch (err) {
    return c.json({ error: "Network error fetching models" }, 503);
  }
});

// Generate PRD via OpenRouter (streaming)
app.post("/api/generate", async (c) => {
  const { apiKey, model, messages } = await c.req.json();

  if (!apiKey || !model || !messages) {
    return c.json({ error: "apiKey, model, and messages are required" }, 400);
  }

  try {
    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "prd-bin",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: 8192,
        }),
      }
    );

    if (!res.ok) {
      const errorBody = await res.text();
      const status = res.status;

      if (status === 401) {
        return c.json(
          { error: "Invalid API key. Please check your OpenRouter API key." },
          401
        );
      }
      if (status === 429) {
        return c.json(
          {
            error:
              "Rate limit exceeded or quota exhausted. Please wait and try again.",
          },
          429
        );
      }
      return c.json(
        { error: `OpenRouter error (${status}): ${errorBody}` },
        status
      );
    }

    // Stream SSE back to client
    return streamSSE(c, async (stream) => {
      const reader = res.body?.getReader();
      if (!reader) {
        await stream.writeSSE({ data: JSON.stringify({ error: "No response body" }), event: "error" });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              await stream.writeSSE({ data: "[DONE]", event: "message" });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                await stream.writeSSE({
                  data: JSON.stringify({ content }),
                  event: "message",
                });
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
        await stream.writeSSE({ data: "[DONE]", event: "message" });
      } catch (err) {
        await stream.writeSSE({
          data: JSON.stringify({ error: "Stream interrupted" }),
          event: "error",
        });
      }
    });
  } catch (err) {
    return c.json(
      { error: "Network error: could not reach OpenRouter. Check your internet connection." },
      503
    );
  }
});

const port = 3001;
console.log(`🚀 prd-bin server running on http://localhost:${port}`);
console.log(`📁 PRD cache: ${DATA_DIR}`);

serve({
  fetch: app.fetch,
  port,
});
