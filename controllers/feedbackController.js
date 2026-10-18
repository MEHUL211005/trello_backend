const Feedback = require("../models/Feedback");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const {
  feedbackTeamEmail,
  feedbackThanksEmail,
} = require("../utils/emailTemplates");

const CATEGORIES = ["IDEA", "BUG", "PRAISE", "OTHER"];
const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

// Feedback is saved first, then sent on by email so a person actually reads
// it: to the team (reply goes straight to the sender) and a thank-you to the
// sender. An email problem is logged but never loses or fails the feedback.
const createFeedback = async (req, res) => {
  try {
    const message =
      typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const category = String(req.body?.category || "OTHER").toUpperCase();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Please write your feedback",
      });
    }

    if (message.length < MIN_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Please write at least ${MIN_LENGTH} characters so we can understand`,
      });
    }

    if (message.length > MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Feedback must be ${MAX_LENGTH} characters or fewer`,
      });
    }

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Choose what kind of feedback this is",
      });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email"],
    });

    const feedback = await Feedback.create({
      userId: req.user.id,
      category,
      message,
    });

    const teamAddress =
      process.env.FEEDBACK_TO_EMAIL || process.env.BREVO_SENDER_EMAIL;

    const [team, thanks] = await Promise.allSettled([
      teamAddress
        ? sendEmail({
            to: teamAddress,
            replyTo: { email: user.email, name: user.name },
            ...feedbackTeamEmail({
              name: user.name,
              email: user.email,
              category,
              message,
              id: feedback.id,
            }),
          })
        : Promise.reject(new Error("No feedback address configured")),
      sendEmail({
        to: user.email,
        ...feedbackThanksEmail({ name: user.name, message }),
      }),
    ]);

    [team, thanks].forEach((result) => {
      if (result.status === "rejected") {
        console.error("Feedback email failed:", result.reason?.message);
      }
    });

    return res.status(201).json({
      success: true,
      message: "Thanks! Your feedback was sent",
      delivered: team.status === "fulfilled",
      feedback: {
        id: feedback.id,
        category: feedback.category,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error) {
    console.log("Create Feedback Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createFeedback,
};
