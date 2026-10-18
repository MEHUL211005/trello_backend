const { Op, fn, col } = require("sequelize");
const BoardStar = require("../models/BoardStar");
const List = require("../models/List");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");

// Ids (from `boardIds`) that this user has starred
const starredSet = async (userId, boardIds) => {
  if (!boardIds.length) return new Set();

  const rows = await BoardStar.findAll({
    where: { userId, boardId: { [Op.in]: boardIds } },
    attributes: ["boardId"],
  });

  return new Set(rows.map((row) => row.boardId));
};

// How many lists (not archived) each board has: Map of boardId -> count
const listCounts = async (boardIds) => {
  if (!boardIds.length) return new Map();

  const rows = await List.findAll({
    where: { boardId: { [Op.in]: boardIds }, isArchived: false },
    attributes: ["boardId", [fn("COUNT", col("id")), "count"]],
    group: ["boardId"],
    raw: true,
  });

  return new Map(rows.map((row) => [row.boardId, Number(row.count)]));
};

// Board rows as plain objects, with `isStarred` meaning "starred by me" and
// `listCount` the number of lists on the board
const withStars = async (userId, boards) => {
  const ids = boards.map((board) => board.id);
  const [stars, counts] = await Promise.all([
    starredSet(userId, ids),
    listCounts(ids),
  ]);

  return boards.map((board) => ({
    ...(typeof board.toJSON === "function" ? board.toJSON() : board),
    isStarred: stars.has(board.id),
    listCount: counts.get(board.id) || 0,
  }));
};

// Before per-user stars, "starred" was one flag on the board. Give each
// such star to the board's owner, then clear the old flag so this only ever
// does work once.
const migrateLegacyStars = async () => {
  const starred = await Board.findAll({ where: { isStarred: true } });

  for (const board of starred) {
    const workspace = await Workspace.findByPk(board.workspaceId, {
      attributes: ["userId"],
    });

    if (workspace) {
      await BoardStar.findOrCreate({
        where: { boardId: board.id, userId: workspace.userId },
      });
    }

    board.isStarred = false;
    await board.save();
  }

  if (starred.length) {
    console.log(`Moved ${starred.length} old board star(s) to per-user stars`);
  }
};

module.exports = { starredSet, withStars, listCounts, migrateLegacyStars };
