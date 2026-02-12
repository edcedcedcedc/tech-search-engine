// react-app/webhook/server/receiver.ts

import http from "http";
import fs from "fs";
import path from "path";

const PORT = 5179;

const BASE_DIR = process.cwd();
const LOG_DIR = path.join(BASE_DIR, "logs");
const LOG_FILE = path.join(LOG_DIR, "ui-search.log");
const DB_LOG_FILE = path.join(LOG_DIR, "db-debug.log");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function writeLog(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 23);
  fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`, "utf-8");
}

function writeDbLog(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 23);
  fs.appendFileSync(DB_LOG_FILE, `[${ts}] ${msg}\n`, "utf-8");
}

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  // Only handle POST requests
  if (req.method !== "POST") {
    res.statusCode = 404;
    return res.end();
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    try {
      const parsed = JSON.parse(body);
      const { msg } = parsed;
      
      // Route based on URL
      if (req.url === "/ui-debug") {
        writeLog(msg);
        res.end("ok");
      } 
      else if (req.url === "/db-debug") {
        writeDbLog(msg);
        
        // Also pretty print to console with colors
        try {
          const data = JSON.parse(msg);
          
          // Color-code by operation type
          let color = '\x1b[36m'; // cyan default
          let symbol = '🔍';
          
          switch (data.operation) {
            case 'CACHE_HIT':
              color = '\x1b[32m'; // green
              symbol = '✅';
              break;
            case 'CACHE_MISS':
              color = '\x1b[33m'; // yellow
              symbol = '❓';
              break;
            case 'CACHE_EXPIRED':
              color = '\x1b[35m'; // magenta
              symbol = '⏰';
              break;
            case 'CACHE_CLEAR_ALL':
              color = '\x1b[31m'; // red
              symbol = '🧹';
              break;
            case 'SAVE_PRODUCTS':
              color = '\x1b[34m'; // blue
              symbol = '💾';
              break;
            case 'SAVE_OFFERS':
              color = '\x1b[34m'; // blue
              symbol = '💾';
              break;
            case 'CACHE_STATE':
              color = '\x1b[36m'; // cyan
              symbol = '📊';
              break;
            case 'CACHE_STATE_ERROR':
              color = '\x1b[31m'; // red
              symbol = '❌';
              break;
          }
          
          const timestamp = new Date().toLocaleTimeString();
          console.log(`${color}${symbol} [DB]${'\x1b[0m'} ${timestamp} - ${data.operation}`);
          
          // Pretty print details
          if (data.details) {
            if (data.operation === 'CACHE_STATE') {
              console.log(`   📦 Products: ${data.details.products || 0} queries`);
              console.log(`   🏷️ Offers: ${data.details.offers || 0} products`);
              if (data.details.productsKeys?.length) {
                console.log(`   🔑 Keys: ${data.details.productsKeys.slice(0, 3).join(', ')}${data.details.productsKeys.length > 3 ? '...' : ''}`);
              }
            } else {
              Object.entries(data.details).forEach(([key, value]) => {
                console.log(`   ${key}: ${value}`);
              });
            }
            console.log(''); // empty line
          }
        } catch (e) {
          // If not JSON, just log raw
          console.log(`[DB] ${msg}`);
        }
        
        res.end("ok");
      }
      else {
        res.statusCode = 404;
        res.end("not found");
      }
    } catch (err) {
      console.error('Error parsing body:', err);
      res.statusCode = 400;
      res.end("bad request");
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 UI Logger running on http://localhost:${PORT}`);
  console.log(`📝 UI Log: ${LOG_FILE}`);
  console.log(`🗄️  DB Log: ${DB_LOG_FILE}\n`);
});