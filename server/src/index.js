import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { buildPassagePayload, tokenize, tokensMatch } from "./pipeline.js";
import { getUser, resolvePetState, awardExercise, dailyCheckIn } from "./store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const PORT = Number(process.env.PORT || 8787);

const newsFixture = JSON.parse(
  readFileSync(join(__dirname, "../data/news-fixture.json"), "utf8")
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function sendJson(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(raw);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function userIdFrom(req) {
  return req.headers["x-user-id"] || "demo";
}

function serveStatic(req, res, urlPath) {
  const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(ROOT, safe);
  if (!filePath.startsWith(ROOT) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(readFileSync(filePath));
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    return sendJson(res, 204, {});
  }

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, service: "juwo-server" });
    }

    if (req.method === "GET" && url.pathname === "/api/passage") {
      const article = newsFixture.articles[0];
      const payload = buildPassagePayload(article, {
        fetchedAt: newsFixture.fetchedAt,
        limit: 1,
      });
      return sendJson(res, 200, payload);
    }

    if (req.method === "GET" && url.pathname === "/api/pet") {
      const user = getUser(userIdFrom(req));
      return sendJson(res, 200, resolvePetState(user));
    }

    if (req.method === "POST" && url.pathname === "/api/exercise/submit") {
      const body = await readBody(req);
      const user = userIdFrom(req);
      const answerTokens = Array.isArray(body.answerTokens) ? body.answerTokens : [];
      const expected = tokenize(body.expectedEn || "");
      const correct = tokensMatch(answerTokens, expected);
      const firstTry = Boolean(body.firstTry);
      const exerciseKey = body.exerciseKey || `${body.passageId || "p"}:${body.exerciseId || "s1"}`;

      if (!correct) {
        return sendJson(res, 200, {
          correct: false,
          revealEn: body.expectedEn,
          revealZh: body.expectedZh || "",
          noteZh: body.noteZh || "",
          pet: resolvePetState(getUser(user)),
        });
      }

      const award = awardExercise(user, { exerciseKey, firstTry });
      return sendJson(res, 200, {
        correct: true,
        revealEn: body.expectedEn,
        revealZh: body.expectedZh || "",
        noteZh: body.noteZh || "",
        gained: award.gained,
        alreadyDone: award.alreadyDone,
        pet: award.pet,
      });
    }

    if (req.method === "POST" && url.pathname === "/api/checkin") {
      const result = dailyCheckIn(userIdFrom(req));
      return sendJson(res, 200, result);
    }

    // Static assets for pet images during local/dev
    if (req.method === "GET" && (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/data/"))) {
      return serveStatic(req, res, url.pathname.slice(1));
    }

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/dev")) {
      return serveStatic(req, res, "server/dev-harness.html");
    }

    sendJson(res, 404, { error: "not_found" });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "server_error", message: String(err.message || err) });
  }
}

createServer(handler).listen(PORT, "0.0.0.0", () => {
  console.log(`juwo-server listening on http://127.0.0.1:${PORT}`);
  console.log(`  GET  /api/passage`);
  console.log(`  GET  /api/pet`);
  console.log(`  POST /api/exercise/submit`);
  console.log(`  POST /api/checkin`);
  console.log(`  DEV  http://127.0.0.1:${PORT}/dev`);
});
