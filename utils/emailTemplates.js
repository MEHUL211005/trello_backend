const APP_NAME = "TaskSphere";

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// User-supplied text (the name) goes into HTML, so escape it
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

const layout = (title, body) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
    <h2 style="color:#2563eb;margin:0 0 16px">${APP_NAME}</h2>
    <h3 style="margin:0 0 12px">${title}</h3>
    ${body}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
    <p style="font-size:12px;color:#6b7280">
      If you did not request this, you can safely ignore this email.
    </p>
  </div>
`;

const otpEmail = ({ name, otp, minutes }) => ({
  subject: `${otp} is your ${APP_NAME} verification code`,
  html: layout(
    "Verify your email",
    `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Use this code to finish creating your ${APP_NAME} account:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#eff6ff;
              padding:16px;text-align:center;border-radius:8px;margin:20px 0">${otp}</p>
    <p>This code expires in ${minutes} minutes.</p>
    `
  ),
});

const resetPasswordEmail = ({ name, link, minutes }) => ({
  subject: `Reset your ${APP_NAME} password`,
  html: layout(
    "Reset your password",
    `
    <p>Hi ${escapeHtml(name)},</p>
    <p>We received a request to reset your password. Click the button below to choose a new one:</p>
    <p style="margin:24px 0">
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;
         color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">Reset password</a>
    </p>
    <p>This link expires in ${minutes} minutes. If the button does not work, copy this link:</p>
    <p style="word-break:break-all;font-size:13px;color:#2563eb">${link}</p>
    `
  ),
});

const ROLE_TEXT = {
  EDITOR: "an Editor (you can add and change lists and cards)",
  VIEWER: "a Viewer (you can view the board but not change it)",
};

// Sent when a board is shared. `isNewUser` invitees need to sign up first.
const boardInviteEmail = ({
  inviterName,
  boardName,
  role,
  link,
  isNewUser,
}) => ({
  subject: `${inviterName} shared "${boardName}" with you on ${APP_NAME}`,
  html: layout(
    isNewUser ? "You've been invited to collaborate" : "A board was shared with you",
    `
    <p><b>${escapeHtml(inviterName)}</b> invited you to the board
       <b>${escapeHtml(boardName)}</b> as ${ROLE_TEXT[role] || "a member"}.</p>
    <p style="margin:24px 0">
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#6a47ea;
         color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">
        ${isNewUser ? "Create your account" : "Open the board"}
      </a>
    </p>
    ${
      isNewUser
        ? `<p>Sign up with this email address and the board will be waiting in your workspace.</p>`
        : `<p>You'll find it under <b>Shared with you</b> on your dashboard.</p>`
    }
    `
  ),
});

const CATEGORY_LABELS = {
  IDEA: "Idea / suggestion",
  BUG: "Something's broken",
  PRAISE: "Praise",
  OTHER: "Other",
};

// To the team: someone sent feedback. Replying answers the sender directly.
const feedbackTeamEmail = ({ name, email, category, message, id }) => ({
  subject: `[${CATEGORY_LABELS[category] || "Feedback"}] New feedback from ${name}`,
  html: layout(
    "New feedback",
    `
    <p><b>${escapeHtml(name)}</b> (${escapeHtml(email)}) sent feedback
       <span style="color:#6b7280">#${id}</span>.</p>
    <p style="display:inline-block;background:#eff6ff;color:#4338ca;padding:4px 10px;
              border-radius:999px;font-size:13px;font-weight:bold">
      ${escapeHtml(CATEGORY_LABELS[category] || "Feedback")}
    </p>
    <blockquote style="margin:16px 0;padding:12px 16px;background:#f9fafb;
                       border-left:4px solid #6a47ea;white-space:pre-wrap">${escapeHtml(message)}</blockquote>
    <p style="font-size:13px;color:#6b7280">Just reply to this email to answer ${escapeHtml(name)}.</p>
    `
  ),
});

// To the person who sent it: we got it
const feedbackThanksEmail = ({ name, message }) => ({
  subject: `Thanks for your feedback, ${name.split(" ")[0]}`,
  html: layout(
    "We got your message",
    `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Thank you for taking the time to tell us what you think. A real person
       reads every message, and it helps shape what we build next.</p>
    <p style="font-size:13px;color:#6b7280;margin-bottom:6px">What you sent:</p>
    <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f9fafb;
                       border-left:4px solid #6a47ea;white-space:pre-wrap">${escapeHtml(message)}</blockquote>
    <p>If we have questions we'll reply to this address.</p>
    `
  ),
});

module.exports = {
  otpEmail,
  resetPasswordEmail,
  boardInviteEmail,
  feedbackTeamEmail,
  feedbackThanksEmail,
};
