// The address of the website that links in emails should open.
//
// Normally that is CLIENT_URL (the dev site, http://localhost:5173). For a
// live demo the website lives at a public address instead, which the demo
// script passes in as PUBLIC_URL, so emailed links open the demo and not
// "localhost" on whatever device the email is read on.
//
// It is read from the server's own settings, never from request headers:
// a header could be forged to make emails point at someone else's site.
const appUrl = () =>
  (process.env.PUBLIC_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(
    /\/+$/,
    ""
  );

module.exports = appUrl;
