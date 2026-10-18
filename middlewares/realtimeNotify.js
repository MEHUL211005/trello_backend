const Card = require("../models/Card");
const List = require("../models/List");
const Checklist = require("../models/Checklist");
const ChecklistItem = require("../models/ChecklistItem");
const Comment = require("../models/Comment");
const Attachment = require("../models/Attachment");
const { emitBoardChanged } = require("../realtime/socket");

// After any successful change (POST / PUT / PATCH / DELETE) work out which
// board it touched and tell the people viewing that board. Doing it here, in
// one place, means no controller has to remember to announce its changes.

const toId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const boardOfList = async (listId) => {
  const id = toId(listId);
  if (!id) return null;
  const list = await List.findByPk(id, { attributes: ["boardId"] });
  return list ? list.boardId : null;
};

const boardOfCard = async (cardId) => {
  const id = toId(cardId);
  if (!id) return null;
  const card = await Card.findByPk(id, { attributes: ["listId"] });
  return card ? boardOfList(card.listId) : null;
};

const boardOfChecklist = async (checklistId) => {
  const id = toId(checklistId);
  if (!id) return null;
  const checklist = await Checklist.findByPk(id, { attributes: ["cardId"] });
  return checklist ? boardOfCard(checklist.cardId) : null;
};

const boardOfItem = async (itemId) => {
  const id = toId(itemId);
  if (!id) return null;
  const item = await ChecklistItem.findByPk(id, { attributes: ["checklistId"] });
  return item ? boardOfChecklist(item.checklistId) : null;
};

// Map the request URL (relative to /api) to the board it affects
const resolveBoardId = async (req) => {
  const [resource, a, b] = req.path.split("/").filter(Boolean);
  const body = req.body || {};

  switch (resource) {
    case "boards":
      // /boards/:id/... (rename, background, delete, sharing). Not /boards
      // itself, and starring is personal so it tells nobody else.
      return b === "star" ? null : toId(a);

    case "lists":
      if (!a) return toId(body.boardId); // create
      if (a === "reorder") return boardOfList(body.lists?.[0]?.id);
      return boardOfList(a); // rename / delete

    case "cards":
      if (!a) return boardOfList(body.listId); // create
      if (a === "reorder") return boardOfCard(body.cards?.[0]?.id);
      return boardOfCard(a); // edit / delete / due date / complete

    case "labels":
      if (!a) return toId(body.boardId); // create label
      if (a === "cards") return boardOfCard(b); // attach / detach
      return null;

    case "members":
      return a === "cards" ? boardOfCard(b) : null;

    case "comments":
      if (a === "cards") return boardOfCard(b);
      if (toId(a)) {
        const comment = await Comment.findByPk(toId(a), { attributes: ["cardId"] });
        return comment ? boardOfCard(comment.cardId) : null;
      }
      return null;

    case "checklists":
      if (a === "cards") return boardOfCard(b);
      if (a === "items") return boardOfItem(b);
      return boardOfChecklist(a); // add item / rename / delete

    case "attachments":
      if (a === "cards") return boardOfCard(b);
      if (toId(a)) {
        const attachment = await Attachment.findByPk(toId(a), {
          attributes: ["cardId"],
        });
        return attachment ? boardOfCard(attachment.cardId) : null;
      }
      return null;

    default:
      return null;
  }
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const realtimeNotify = async (req, res, next) => {
  // Reads change nothing, and anonymous requests will be rejected anyway
  if (SAFE_METHODS.has(req.method) || !req.headers.authorization) {
    return next();
  }

  // Resolve first: after a DELETE the card/list/etc. no longer exists
  let boardId = null;

  try {
    boardId = await resolveBoardId(req);
  } catch (error) {
    console.error("Realtime: could not resolve board:", error.message);
  }

  if (boardId) {
    res.on("finish", () => {
      // Only announce changes that actually succeeded
      if (res.statusCode < 400) {
        emitBoardChanged(boardId, req.user?.id ?? null);
      }
    });
  }

  next();
};

module.exports = realtimeNotify;
