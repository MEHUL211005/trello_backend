const { Op } = require("sequelize");
const sequelize = require("../config/database");
const PlannerTask = require("../models/PlannerTask");

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 2000;
const MAX_RANGE_DAYS = 100;
const MAX_AGENDA_DAYS = 90;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// A real calendar day written as YYYY-MM-DD (rejects 2026-02-31 and the like)
const isValidDate = (value) => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const addDays = (value, days) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
};

const daysBetween = (from, to) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

// Earliest first; tasks without a time go after the timed ones of that day
const ORDER = [
  ["date", "ASC"],
  [sequelize.literal("`time` IS NULL"), "ASC"],
  ["time", "ASC"],
  ["id", "ASC"],
];

const bad = (res, message) =>
  res.status(400).json({ success: false, message });

// Checks the fields a task is made of. Returns { error } or { values } with
// the cleaned-up values for just the fields that were sent.
const readTaskFields = (body, { requireAll }) => {
  const values = {};
  const has = (key) => body?.[key] !== undefined;

  if (requireAll || has("title")) {
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title) return { error: "Give the task a title" };
    if (title.length > MAX_TITLE) {
      return { error: `The title must be ${MAX_TITLE} characters or fewer` };
    }
    values.title = title;
  }

  if (requireAll || has("date")) {
    if (!isValidDate(body?.date)) {
      return { error: "Choose a valid date" };
    }
    values.date = body.date;
  }

  if (has("time")) {
    const time = body.time === null || body.time === "" ? null : body.time;
    if (time !== null && !(typeof time === "string" && TIME_PATTERN.test(time))) {
      return { error: "Choose a valid time" };
    }
    values.time = time;
  }

  if (has("description")) {
    const description =
      body.description === null ? "" : String(body.description).trim();
    if (description.length > MAX_DESCRIPTION) {
      return {
        error: `The description must be ${MAX_DESCRIPTION} characters or fewer`,
      };
    }
    values.description = description || null;
  }

  return { values };
};

// GET /planner?from=YYYY-MM-DD&to=YYYY-MM-DD
const getTasks = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!isValidDate(from) || !isValidDate(to)) {
      return bad(res, "Send a valid from and to date (YYYY-MM-DD)");
    }

    const span = daysBetween(from, to);
    if (span < 0) return bad(res, "The end date is before the start date");
    if (span > MAX_RANGE_DAYS) {
      return bad(res, `Ask for ${MAX_RANGE_DAYS} days or fewer at a time`);
    }

    const tasks = await PlannerTask.findAll({
      where: { userId: req.user.id, date: { [Op.between]: [from, to] } },
      order: ORDER,
    });

    return res.status(200).json({ success: true, tasks });
  } catch (error) {
    console.log("Get Planner Tasks Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// GET /planner/agenda?today=YYYY-MM-DD&days=30
// Unfinished tasks from before today, plus everything coming up.
const getAgenda = async (req, res) => {
  try {
    const { today } = req.query;
    const days = Math.min(
      Math.max(parseInt(req.query.days, 10) || 30, 1),
      MAX_AGENDA_DAYS
    );

    if (!isValidDate(today)) {
      return bad(res, "Send today's date (YYYY-MM-DD)");
    }

    const [overdue, upcoming] = await Promise.all([
      PlannerTask.findAll({
        where: { userId: req.user.id, isDone: false, date: { [Op.lt]: today } },
        order: ORDER,
        limit: 100,
      }),
      PlannerTask.findAll({
        where: {
          userId: req.user.id,
          date: { [Op.between]: [today, addDays(today, days)] },
        },
        order: ORDER,
        limit: 300,
      }),
    ]);

    return res.status(200).json({ success: true, overdue, upcoming });
  } catch (error) {
    console.log("Get Planner Agenda Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// POST /planner
const createTask = async (req, res) => {
  try {
    const { error, values } = readTaskFields(req.body, { requireAll: true });
    if (error) return bad(res, error);

    const task = await PlannerTask.create({
      time: null,
      description: null,
      ...values,
      userId: req.user.id,
    });

    return res.status(201).json({ success: true, message: "Task added", task });
  } catch (error) {
    console.log("Create Planner Task Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// The task, but only when it belongs to the signed-in user
const findOwnTask = (req) =>
  PlannerTask.findOne({
    where: { id: Number(req.params.id) || 0, userId: req.user.id },
  });

// PUT /planner/:id  (edit and reschedule)
const updateTask = async (req, res) => {
  try {
    const task = await findOwnTask(req);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const { error, values } = readTaskFields(req.body, { requireAll: false });
    if (error) return bad(res, error);

    if (typeof req.body?.isDone === "boolean") {
      values.isDone = req.body.isDone;
    }

    await task.update(values);

    return res.status(200).json({ success: true, message: "Task updated", task });
  } catch (error) {
    console.log("Update Planner Task Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// PATCH /planner/:id/done   body: { isDone: true | false }
const setTaskDone = async (req, res) => {
  try {
    const task = await findOwnTask(req);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (typeof req.body?.isDone !== "boolean") {
      return bad(res, "isDone must be true or false");
    }

    await task.update({ isDone: req.body.isDone });

    return res.status(200).json({ success: true, task });
  } catch (error) {
    console.log("Mark Planner Task Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// DELETE /planner/:id
const deleteTask = async (req, res) => {
  try {
    const task = await findOwnTask(req);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await task.destroy();

    return res.status(200).json({ success: true, message: "Task deleted" });
  } catch (error) {
    console.log("Delete Planner Task Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  getTasks,
  getAgenda,
  createTask,
  updateTask,
  setTaskDone,
  deleteTask,
};
