// Simple HTTP server wrapper for VPS deployment
// This keeps the original Vercel-style handler in backend/index.js utuh,
// hanya menambahkan server HTTP agar bisa dijalankan di VPS lewat `node server.js`.

const http = require("http");
const handler = require("./backend/index");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  try {
    const maybePromise = handler(req, res);
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.catch((err) => {
        console.error("Unhandled error in handler:", err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ ok: false, message: "Internal server error" }));
        }
      });
    }
  } catch (err) {
    console.error("Sync error in handler:", err);
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, message: "Internal server error" }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
