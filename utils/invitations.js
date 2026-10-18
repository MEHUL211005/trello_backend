const BoardMember = require("../models/BoardMember");
const BoardInvitation = require("../models/BoardInvitation");
const Workspace = require("../models/Workspace");

// Every user needs a workspace of their own to see shared boards in. If the
// user owns none, create the default one.
const ensureDefaultWorkspace = async (userId) => {
  const existing = await Workspace.findOne({
    where: { userId },
    attributes: ["id"],
  });

  if (existing) return existing;

  return Workspace.create({
    name: "My Workspace",
    description: "Your personal workspace",
    userId,
  });
};

// Turn the pending invitations for a (now verified) user's email into real
// board memberships. Returns how many boards were shared with them.
const acceptPendingInvitations = async (user) => {
  const invitations = await BoardInvitation.findAll({
    where: { email: user.email, status: "PENDING" },
  });

  if (invitations.length === 0) return 0;

  for (const invitation of invitations) {
    const [membership, created] = await BoardMember.findOrCreate({
      where: { boardId: invitation.boardId, userId: user.id },
      defaults: { role: invitation.role },
    });

    // Never downgrade access that already exists (e.g. the board owner)
    if (!created && membership.role === "VIEWER" && invitation.role === "MEMBER") {
      membership.role = "MEMBER";
      await membership.save();
    }

    invitation.status = "ACCEPTED";
    await invitation.save();
  }

  await ensureDefaultWorkspace(user.id);

  return invitations.length;
};

module.exports = { ensureDefaultWorkspace, acceptPendingInvitations };
