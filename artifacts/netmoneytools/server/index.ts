import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set("trust proxy", true);

const PORT = Number(process.env.PORT) || 3000;
const CANONICAL_HOST = "netmoneytools.com";

/**
 * 301 redirect middleware — enforces a single canonical URL:
 *   https://netmoneytools.com (no www, https only)
 *
 * Handles:
 *   http://netmoneytools.com      -> https://netmoneytools.com
 *   http://www.netmoneytools.com  -> https://netmoneytools.com
 *   https://www.netmoneytools.com -> https://netmoneytools.com
 *
 * Replit terminates TLS upstream, so the original client protocol is only
 * available via the `x-forwarded-proto` header, not `req.protocol`.
 *
 * The redirect is scoped to the netmoneytools.com apex/www hosts only, so
 * Replit preview/dev domains (e.g. *.replit.dev) are never redirected.
 */
app.use((req, res, next) => {
  const host = req.headers.host ?? "";
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto ?? req.protocol;

  const hostname = host.split(":")[0].toLowerCase();
  const isOurDomain = hostname === CANONICAL_HOST || hostname === `www.${CANONICAL_HOST}`;
  const isCanonical = hostname === CANONICAL_HOST && proto === "https";

  if (isOurDomain && !isCanonical) {
    res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
    return;
  }

  next();
});

const clientDir = path.resolve(__dirname, "..");

app.use(
  express.static(clientDir, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);

// SPA fallback — all remaining GET requests serve the React app shell.
app.use((req, res, next) => {
  if (req.method !== "GET") {
    next();
    return;
  }
  res.sendFile(path.join(clientDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NetMoneyTools server listening on port ${PORT}`);
});
