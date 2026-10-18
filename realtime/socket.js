const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Board = require("../models/Board");
const { getBoardRole } = require("../utils/boardAccess");

// No board data ever travels over the socket. Clients only hear that
// "something changed" and refetch through the normal, permission-checked API.

const MAX_BOARD_ROOMS_PER_SOCKET = 25;

let io = null;

const boardRoom = (boardId) => `board:${boardId}`;
const userRoom = (userId) => `user:${userId}`;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // Same access token the REST API uses
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("unauthorized"));

      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (error) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // Personal channel: "a board was shared with you", "your access changed"
    socket.join(userRoom(socket.user.id));

    socket.on("board:join", async (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};

      try {
        const boardId = Number(payload?.boardId);

        if (!Number.isInteger(boardId) || boardId < 1) {
          return reply({ ok: false, message: "Invalid board" });
        }

        const joined = [...socket.rooms].filter((room) =>
          room.startsWith("board:")
        );

        if (joined.length >= MAX_BOARD_ROOMS_PER_SOCKET) {
          return reply({ ok: false, message: "Too many boards open" });
        }

        const board = await Board.findByPk(boardId, {
          attributes: ["id", "workspaceId"],
        });
        const role = board ? await getBoardRole(socket.user.id, board) : null;

        if (!role) {
          return reply({ ok: false, message: "Access denied" });
        }

        await socket.join(boardRoom(boardId));
        reply({ ok: true });
      } catch (error) {
        reply({ ok: false, message: "Could not join the board" });
      }
    });

    socket.on("board:leave", (payload) => {
      const boardId = Number(payload?.boardId);
      if (Number.isInteger(boardId)) socket.leave(boardRoom(boardId));
    });
  });

  return io;
};

// Everyone currently viewing this board should refetch it
const emitBoardChanged = (boardId, by = null) => {
  if (!io || !boardId) return;
  io.to(boardRoom(boardId)).emit("board:changed", {
    boardId: Number(boardId),
    by,
  });
};

// Tell one person (all of their open tabs)
const emitToUser = (userId, event, payload = {}) => {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
};

// Stop sending a board's events to a person who lost access to it
const kickFromBoard = (userId, boardId) => {
  if (!io) return;
  io.in(userRoom(userId)).socketsLeave(boardRoom(boardId));
};

module.exports = { initSocket, emitBoardChanged, emitToUser, kickFromBoard };
