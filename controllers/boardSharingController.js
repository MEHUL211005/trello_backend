const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");
const List = require("../models/List");
const Card = require("../models/Card");
const User = require("../models/User");
const BoardMember = require("../models/BoardMember");
const BoardInvitation = require("../models/BoardInvitation");
const BoardStar = require("../models/BoardStar");
const { starredSet } = require("../utils/stars");
const sendEmail = require("../utils/sendEmail");
const { boardInviteEmail } = require("../utils/emailTemplates");
const { validateEmail } = require("../utils/validators");
const { ensureDefaultWorkspace } = require("../utils/invitations");
const { emitToUser, kickFromBoard } = require("../realtime/socket");
const {
  getBoardRole,
  getAccessibleBoardIds,
  roleLabel,
  parseShareRole,
  canRead,
  canAdmin,
  denied,
} = require("../utils/boardAccess");

const notFound = (res, message = "Board not found") =>
  res.status(404).json({ success: false, message });

const fail = (res, error, label) => {
  console.error(`${label}:`, error);
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};

// Email problems must never block sharing, so they are only logged
const notify = async (payload) => {
  try {
    await sendEmail(payload);
  } catch (error) {
    console.error("Share notification email failed:", error.message);
  }
};

const clientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";

// Load the board and the requester's role in one go
const loadBoard = async (boardId, userId) => {
  const board = await Board.findByPk(boardId);
  if (!board) return { board: null, role: null };
  return { board, role: await getBoardRole(userId, board) };
};

// ---------------------------------------------------------------------
// POST /boards/:id/invite   { email, role: "EDITOR" | "VIEWER" }
// ---------------------------------------------------------------------
const inviteToBoard = async (req, res) => {
  try {
    const { board, role: requesterRole } = await loadBoard(
      req.params.id,
      req.user.id
    );

    if (!board) return notFound(res);

    if (!requesterRole) return denied(res);

    if (!canAdmin(requesterRole)) {
      return res.status(403).json({
        success: false,
        message: "Only the board owner can share this board",
      });
    }

    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ success: false, message: emailError });
    }

    const role = parseShareRole(req.body.role || "EDITOR");
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role must be Editor or Viewer",
      });
    }

    const inviter = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email"],
    });

    if (inviter.email === email) {
      return res.status(400).json({
        success: false,
        message: "You can't share a board with yourself",
      });
    }

    const target = await User.findOne({ where: { email } });

    // ---- Registered user: grant access straight away -----------------
    if (target) {
      const existingRole = await getBoardRole(target.id, board);

      if (existingRole) {
        return res.status(409).json({
          success: false,
          message:
            existingRole === "OWNER"
              ? "That person owns this board"
              : `Already on this board as ${
                  roleLabel(existingRole) === "EDITOR" ? "an Editor" : "a Viewer"
                }`,
        });
      }

      const member = await BoardMember.create({
        boardId: board.id,
        userId: target.id,
        role,
      });

      // Keep the invitation history tidy if they had been invited before
      await BoardInvitation.update(
        { status: "ACCEPTED" },
        { where: { boardId: board.id, email, status: "PENDING" } }
      );

      await ensureDefaultWorkspace(target.id);

      emitToUser(target.id, "shared:updated", { boardId: board.id });

      notify({
        to: target.email,
        ...boardInviteEmail({
          inviterName: inviter.name,
          boardName: board.name,
          role: roleLabel(role),
          link: `${clientUrl()}/dashboard`,
          isNewUser: false,
        }),
      });

      return res.status(201).json({
        success: true,
        status: "added",
        message: `${target.name} was added as ${
          roleLabel(role) === "EDITOR" ? "an Editor" : "a Viewer"
        }`,
        member: {
          userId: target.id,
          name: target.name,
          email: target.email,
          role: roleLabel(member.role),
        },
      });
    }

    // ---- No account yet: keep a pending invitation --------------------
    let invitation = await BoardInvitation.findOne({
      where: { boardId: board.id, email },
    });

    if (invitation && invitation.status === "PENDING") {
      return res.status(409).json({
        success: false,
        message: "An invitation has already been sent to this email",
      });
    }

    if (invitation) {
      invitation.status = "PENDING";
      invitation.role = role;
      invitation.invitedBy = req.user.id;
      await invitation.save();
    } else {
      invitation = await BoardInvitation.create({
        boardId: board.id,
        email,
        role,
        invitedBy: req.user.id,
      });
    }

    notify({
      to: email,
      ...boardInviteEmail({
        inviterName: inviter.name,
        boardName: board.name,
        role: roleLabel(role),
        link: `${clientUrl()}/signup`,
        isNewUser: true,
      }),
    });

    return res.status(201).json({
      success: true,
      status: "pending",
      message: `Invitation sent to ${email}. They'll get access when they sign up.`,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: roleLabel(invitation.role),
        status: invitation.status,
        createdAt: invitation.createdAt,
      },
    });
  } catch (error) {
    return fail(res, error, "Invite to board error");
  }
};

// ---------------------------------------------------------------------
// GET /boards/:id/members  - everyone on the board + pending invitations
// ---------------------------------------------------------------------
const getBoardMembers = async (req, res) => {
  try {
    const { board, role: myRole } = await loadBoard(req.params.id, req.user.id);

    if (!board) return notFound(res);
    if (!canRead(myRole)) return denied(res);

    const [workspace, memberships] = await Promise.all([
      Workspace.findByPk(board.workspaceId, { attributes: ["userId"] }),
      BoardMember.findAll({
        where: { boardId: board.id },
        include: [{ model: User, attributes: ["id", "name", "email"] }],
        order: [["createdAt", "ASC"]],
      }),
    ]);

    const ownerId = workspace?.userId;
    const owner = ownerId
      ? await User.findByPk(ownerId, { attributes: ["id", "name", "email"] })
      : null;

    const members = [];

    if (owner) {
      members.push({
        userId: owner.id,
        name: owner.name,
        email: owner.email,
        role: "OWNER",
        isOwner: true,
        joinedAt: board.createdAt,
      });
    }

    for (const membership of memberships) {
      // Skip the owner (already first) and members whose account is gone
      if (membership.userId === ownerId || !membership.User) continue;

      members.push({
        userId: membership.User.id,
        name: membership.User.name,
        email: membership.User.email,
        role: roleLabel(membership.role),
        isOwner: membership.role === "OWNER",
        joinedAt: membership.createdAt,
      });
    }

    // Pending invitations are only visible to the people who manage sharing
    let invitations = [];

    if (canAdmin(myRole)) {
      const pending = await BoardInvitation.findAll({
        where: { boardId: board.id, status: "PENDING" },
        include: [{ model: User, as: "inviter", attributes: ["name"] }],
        order: [["createdAt", "DESC"]],
      });

      invitations = pending.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: roleLabel(invitation.role),
        status: invitation.status,
        invitedBy: invitation.inviter?.name || null,
        createdAt: invitation.createdAt,
      }));
    }

    return res.status(200).json({
      success: true,
      myRole: roleLabel(myRole),
      canManage: canAdmin(myRole),
      members,
      invitations,
    });
  } catch (error) {
    return fail(res, error, "Get board members error");
  }
};

// ---------------------------------------------------------------------
// PATCH /boards/:id/members/:userId   { role }
// ---------------------------------------------------------------------
const updateMemberRole = async (req, res) => {
  try {
    const { board, role: requesterRole } = await loadBoard(
      req.params.id,
      req.user.id
    );

    if (!board) return notFound(res);
    if (!canAdmin(requesterRole)) return denied(res);

    const role = parseShareRole(req.body.role);
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role must be Editor or Viewer",
      });
    }

    const userId = Number(req.params.userId);
    const targetRole = await getBoardRole(userId, board);

    if (!targetRole) {
      return res.status(404).json({
        success: false,
        message: "That person is not on this board",
      });
    }

    if (targetRole === "OWNER") {
      return res.status(400).json({
        success: false,
        message: "The owner's role can't be changed",
      });
    }

    await BoardMember.update({ role }, { where: { boardId: board.id, userId } });

    emitToUser(userId, "board:access-changed", { boardId: board.id });

    return res.status(200).json({
      success: true,
      message: `Role changed to ${roleLabel(role) === "EDITOR" ? "Editor" : "Viewer"}`,
      role: roleLabel(role),
    });
  } catch (error) {
    return fail(res, error, "Update member role error");
  }
};

// ---------------------------------------------------------------------
// DELETE /boards/:id/members/:userId
//   owners remove anyone; members may remove themselves (leave the board)
// ---------------------------------------------------------------------
const removeMember = async (req, res) => {
  try {
    const { board, role: requesterRole } = await loadBoard(
      req.params.id,
      req.user.id
    );

    if (!board) return notFound(res);
    if (!requesterRole) return denied(res);

    const userId = Number(req.params.userId);
    const isSelf = userId === req.user.id;

    if (!isSelf && !canAdmin(requesterRole)) return denied(res);

    const targetRole = await getBoardRole(userId, board);

    if (!targetRole) {
      return res.status(404).json({
        success: false,
        message: "That person is not on this board",
      });
    }

    if (targetRole === "OWNER") {
      return res.status(400).json({
        success: false,
        message: "The board owner can't be removed",
      });
    }

    await sequelize.transaction(async (transaction) => {
      await BoardMember.destroy({
        where: { boardId: board.id, userId },
        transaction,
      });

      // A star on a board they can no longer open goes with their access
      await BoardStar.destroy({
        where: { boardId: board.id, userId },
        transaction,
      });

      // They can no longer be assigned to cards on this board
      const cards = await Card.findAll({
        attributes: ["id"],
        include: [
          {
            model: List,
            attributes: [],
            where: { boardId: board.id },
            required: true,
          },
        ],
        transaction,
      });

      if (cards.length > 0) {
        await sequelize.models.CardMembers.destroy({
          where: { userId, cardId: { [Op.in]: cards.map((card) => card.id) } },
          transaction,
        });
      }
    });

    kickFromBoard(userId, board.id);
    emitToUser(userId, "board:access-changed", { boardId: board.id });

    return res.status(200).json({
      success: true,
      message: isSelf ? "You left the board" : "Member removed",
    });
  } catch (error) {
    return fail(res, error, "Remove member error");
  }
};

// ---------------------------------------------------------------------
// DELETE /boards/:id/invitations/:invitationId   (revoke a pending invite)
// ---------------------------------------------------------------------
const revokeInvitation = async (req, res) => {
  try {
    const { board, role: requesterRole } = await loadBoard(
      req.params.id,
      req.user.id
    );

    if (!board) return notFound(res);
    if (!canAdmin(requesterRole)) return denied(res);

    const invitation = await BoardInvitation.findOne({
      where: {
        id: req.params.invitationId,
        boardId: board.id,
        status: "PENDING",
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    invitation.status = "REVOKED";
    await invitation.save();

    return res.status(200).json({
      success: true,
      message: "Invitation revoked",
    });
  } catch (error) {
    return fail(res, error, "Revoke invitation error");
  }
};

// ---------------------------------------------------------------------
// GET /boards/shared   - boards other people have shared with me
// ---------------------------------------------------------------------
const getSharedBoards = async (req, res) => {
  try {
    const memberships = await BoardMember.findAll({
      where: {
        userId: req.user.id,
        role: { [Op.in]: ["MEMBER", "VIEWER"] },
      },
      include: [
        {
          model: Board,
          required: true,
          include: [
            {
              model: Workspace,
              as: "workspace",
              attributes: ["id", "name", "userId"],
              required: true,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const ownerIds = [
      ...new Set(memberships.map((m) => m.Board.workspace.userId)),
    ];

    const owners = ownerIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: ownerIds } },
          attributes: ["id", "name", "email"],
        })
      : [];

    const ownerById = new Map(owners.map((owner) => [owner.id, owner]));

    const stars = await starredSet(
      req.user.id,
      memberships.map((m) => m.Board.id)
    );

    const boards = memberships
      // Skip boards in the user's own workspaces (they own those)
      .filter((m) => m.Board.workspace.userId !== req.user.id)
      .map((m) => {
        const owner = ownerById.get(m.Board.workspace.userId);

        return {
          id: m.Board.id,
          name: m.Board.name,
          background: m.Board.background,
          isStarred: stars.has(m.Board.id),
          workspaceId: m.Board.workspaceId,
          role: roleLabel(m.role),
          sharedAt: m.createdAt,
          owner: owner
            ? { id: owner.id, name: owner.name, email: owner.email }
            : null,
        };
      });

    return res.status(200).json({ success: true, boards });
  } catch (error) {
    return fail(res, error, "Get shared boards error");
  }
};

// ---------------------------------------------------------------------
// GET /boards/people - everyone I share a board with
// ---------------------------------------------------------------------
const getPeople = async (req, res) => {
  try {
    const boardIds = await getAccessibleBoardIds(req.user.id);

    if (boardIds.length === 0) {
      return res.status(200).json({ success: true, people: [] });
    }

    const [boards, memberships] = await Promise.all([
      Board.findAll({
        where: { id: { [Op.in]: boardIds } },
        include: [
          {
            model: Workspace,
            as: "workspace",
            attributes: ["id", "userId"],
            required: true,
          },
        ],
        attributes: ["id", "name", "workspaceId"],
      }),
      BoardMember.findAll({
        where: { boardId: { [Op.in]: boardIds } },
        attributes: ["boardId", "userId", "role"],
      }),
    ]);

    // person id -> board id -> role on that board
    const placements = new Map();
    const place = (userId, boardId, role) => {
      if (userId === req.user.id) return;
      if (!placements.has(userId)) placements.set(userId, new Map());
      const byBoard = placements.get(userId);
      // The owner role wins if someone is listed twice
      if (byBoard.get(boardId) !== "OWNER") byBoard.set(boardId, role);
    };

    for (const board of boards) {
      place(board.workspace.userId, board.id, "OWNER");
    }
    for (const membership of memberships) {
      place(membership.userId, membership.boardId, membership.role);
    }

    const users = placements.size
      ? await User.findAll({
          where: { id: { [Op.in]: [...placements.keys()] } },
          attributes: ["id", "name", "email"],
        })
      : [];

    const boardById = new Map(boards.map((board) => [board.id, board]));

    const people = users
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        boards: [...placements.get(user.id)].map(([boardId, role]) => ({
          id: boardId,
          name: boardById.get(boardId).name,
          workspaceId: boardById.get(boardId).workspaceId,
          role: roleLabel(role),
        })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({ success: true, people });
  } catch (error) {
    return fail(res, error, "Get people error");
  }
};

module.exports = {
  getPeople,
  inviteToBoard,
  getBoardMembers,
  updateMemberRole,
  removeMember,
  revokeInvitation,
  getSharedBoards,
};
