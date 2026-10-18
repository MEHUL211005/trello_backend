const { Op } = require("sequelize");
const BoardStar = require("../models/BoardStar");
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

// Board rows as plain objects, with `isStarred` meaning "starred by me"
const withStars = async (userId, boards) => {
  const stars = await starredSet(
    userId,
    boards.map((board) => board.id)
  );

  return boards.map((board) => ({
    ...(typeof board.toJSON === "function" ? board.toJSON() : board),
    isStarred: stars.has(board.id),
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

module.exports = { starredSet, withStars, migrateLegacyStars };
