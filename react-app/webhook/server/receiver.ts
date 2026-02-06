// react-app/webhook/server/receiver.ts

import http from "http";
import fs from "fs";
import path from "path";

const PORT = 5179;

const BASE_DIR = process.cwd();
const LOG_DIR = path.join(BASE_DIR, "logs");
const LOG_FILE = path.join(LOG_DIR, "ui-search.log");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function writeLog(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 23);
  fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`, "utf-8");
}

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173"); // only allow your Vite dev server
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  // Only handle POST /log
  if (req.method !== "POST" || req.url !== "/log") {
    res.statusCode = 404;
    return res.end();
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    try {
      const { msg } = JSON.parse(body);
      writeLog(msg);
      res.end("ok");
    } catch {
      res.statusCode = 400;
      res.end("bad log");
    }
  });
});

server.listen(PORT, () => {
  console.log(`UI logger running on http://localhost:${PORT}`);
});
