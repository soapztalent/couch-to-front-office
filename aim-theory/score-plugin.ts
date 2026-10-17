import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { boardFor, parseBoards, submitScore, type Boards } from "./src/board/store";

function fileFor(root: string): string {
  return path.join(root, "data", "scores.json");
}

function readBoards(file: string): Boards {
  try {
    return parseBoards(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function writeBoards(file: string, boards: Boards): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(boards));
}

function send(res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (s: string) => void }, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req: NodeJS.ReadableStream & { destroy: () => void }): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      if (chunks.reduce((n, c) => n + c.length, 0) > 4000) {
        reject(new Error("too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function scorePlugin(root = process.cwd()): Plugin {
  const file = fileFor(root);
  return {
    name: "aim-theory-scores",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };

  function handle(req: { url?: string; method?: string; on: NodeJS.ReadableStream["on"]; destroy: () => void }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (s: string) => void }, next: () => void) {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/api/scores") {
      next();
      return;
    }
    if (req.method === "GET") {
      const lessonId = url.searchParams.get("lesson") ?? "";
      send(res, 200, { lessonId, entries: boardFor(readBoards(file), lessonId) });
      return;
    }
    if (req.method === "POST") {
      void readBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as { lessonId?: string; name?: string; score?: number };
          const boards = readBoards(file);
          const lessonId = String(body.lessonId ?? "");
          const result = submitScore(boards, {
            lessonId,
            name: String(body.name ?? ""),
            score: Number(body.score),
            at: Date.now(),
          });
          if (!result.ok) {
            send(res, 400, result);
            return;
          }
          boards[lessonId] = result.entries;
          writeBoards(file, boards);
          send(res, 200, result);
        })
        .catch(() => send(res, 400, { ok: false, error: "That score cannot be posted." }));
      return;
    }
    send(res, 405, { ok: false, error: "That score cannot be posted." });
  }
}
