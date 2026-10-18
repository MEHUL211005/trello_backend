// The backgrounds a board can use. The client shows the actual colours
// (trello/src/lib/boardBackgrounds.js); the server only stores which one was
// picked, and accepts nothing outside this list.
const GRADIENTS = [
  "g-violet",
  "g-teal",
  "g-sunset",
  "g-ocean",
  "g-amber",
  "g-forest",
  "g-midnight",
  "g-rose",
  "g-lavender",
  "g-mint",
  "g-peach",
  "g-fog",
  "g-candy",
  "g-neon",
  "g-cherry",
  "g-emerald",
];

const SOLIDS = [
  "s-indigo",
  "s-violet",
  "s-pink",
  "s-red",
  "s-orange",
  "s-green",
  "s-teal",
  "s-blue",
  "s-slate",
  "s-charcoal",
];

const BACKGROUND_KEYS = new Set([...GRADIENTS, ...SOLIDS]);

// Empty means "use the default look"; anything else must be a known key
const normalizeBackground = (value) => {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === "") return { ok: true, value: null };

  if (typeof value === "string" && BACKGROUND_KEYS.has(value)) {
    return { ok: true, value };
  }

  return { ok: false, value: undefined };
};

module.exports = { BACKGROUND_KEYS, normalizeBackground };
