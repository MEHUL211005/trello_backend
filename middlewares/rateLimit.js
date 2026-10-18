// Small in-memory rate limiter (per IP). Fine for a single server process;
// use a shared store such as Redis if the API is ever scaled to several.
// `keyFn(req)` chooses who is counted; by default it is the IP address.
// With `onlySuccessful`, only requests that end well use up the allowance, so
// someone fixing typos is never locked out for them.
const rateLimit = ({
  windowMs,
  max,
  message,
  keyFn = (req) => req.ip,
  onlySuccessful = false,
}) => {
  const hits = new Map();

  // Drop expired entries so the map cannot grow forever
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyFn(req);
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    const refuse = () => {
      res.set("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({
        success: false,
        message: message || "Too many requests, please try again later",
      });
    };

    if (onlySuccessful) {
      if (entry.count >= max) return refuse();

      // Count it only if it ends well
      res.on("finish", () => {
        if (res.statusCode < 400) entry.count += 1;
      });

      return next();
    }

    entry.count += 1;

    if (entry.count > max) return refuse();

    next();
  };
};

module.exports = rateLimit;
