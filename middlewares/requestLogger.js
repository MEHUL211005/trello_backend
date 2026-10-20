// Prints one line in the console for every request, when it finishes:
//
//   14:32:07  POST   /api/auth/login        200   182ms  user:5    203.0.113.9
//
// so you can see who is using the project while it runs. Colours show the
// result (green = ok, yellow = client error, red = server error).
//
// Turn it off with LOG_REQUESTS=off. Passwords and other request bodies are
// never printed, and the query string is cut off so tokens in it cannot leak.
const COLORS = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (COLORS ? `\x1b[${code}m${text}\x1b[0m` : text);

const statusColor = (status) =>
  status >= 500 ? 31 : status >= 400 ? 33 : status >= 300 ? 36 : 32;

// Page assets and the socket's polling pings would drown out the useful lines
const QUIET = /^\/(assets\/|favicon|socket\.io\/)|\.(js|css|map|png|jpe?g|svg|ico|woff2?)$/i;

const clock = () => new Date().toTimeString().slice(0, 8);

const clientIp = (req) =>
  (req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.ip || "")
    .toString()
    .split(",")[0]
    .trim()
    .replace(/^::ffff:/, "");

const requestLogger = (req, res, next) => {
  if (process.env.LOG_REQUESTS === "off") return next();

  const started = process.hrtime.bigint();

  res.on("finish", () => {
    const path = req.originalUrl.split("?")[0];
    if (QUIET.test(path) && res.statusCode < 400) return;

    const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
    const who = req.user?.id ? `user:${req.user.id}` : "guest";

    console.log(
      [
        paint(90, clock()),
        paint(1, req.method.padEnd(6)),
        path.length > 48 ? `${path.slice(0, 45)}...` : path.padEnd(48),
        paint(statusColor(res.statusCode), String(res.statusCode)),
        paint(90, `${String(ms).padStart(5)}ms`),
        who.padEnd(9),
        paint(90, clientIp(req)),
      ].join("  ")
    );
  });

  next();
};

module.exports = requestLogger;
