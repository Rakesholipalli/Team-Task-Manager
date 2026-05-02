const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const projects = await Project.find({ 'members.user': userId });
    const projectIds = projects.map((p) => p._id);

    if (projectIds.length === 0) {
      return res.json({
        totalTasks: 0,
        tasksByStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
        tasksByPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 },
        overdueTasks: 0,
        tasksPerUser: [],
        recentTasks: [],
        projectCount: 0,
      });
    }

    const [totalTasks, statusGroups, priorityGroups, overdueTasks, tasksPerUserRaw, recentTasks] =
      await Promise.all([
        Task.countDocuments({ project: { $in: projectIds } }),

        Task.aggregate([
          { $match: { project: { $in: projectIds } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        Task.aggregate([
          { $match: { project: { $in: projectIds } } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),

        Task.countDocuments({
          project: { $in: projectIds },
          dueDate: { $lt: now },
          status: { $ne: 'DONE' },
        }),

        Task.aggregate([
          { $match: { project: { $in: projectIds }, assignedTo: { $ne: null } } },
          { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        ]),

        Task.find({ project: { $in: projectIds } })
          .populate('assignedTo', 'name email')
          .populate('project', 'name')
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

    const tasksByStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    statusGroups.forEach((g) => { tasksByStatus[g._id] = g.count; });

    const tasksByPriority = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    priorityGroups.forEach((g) => { tasksByPriority[g._id] = g.count; });

    // Populate user info for tasksPerUser
    const userIds = tasksPerUserRaw.map((t) => t._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    const tasksPerUser = tasksPerUserRaw
      .map((t) => ({ user: userMap[t._id.toString()] || null, count: t.count }))
      .filter((t) => t.user);

    res.json({
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      overdueTasks,
      tasksPerUser,
      recentTasks,
      projectCount: projectIds.length,
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/project/:projectId
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const now = new Date();

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const membership = project.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const [totalTasks, statusGroups, overdueTasks, tasksPerUserRaw] = await Promise.all([
      Task.countDocuments({ project: projectId }),
      Task.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.countDocuments({ project: projectId, dueDate: { $lt: now }, status: { $ne: 'DONE' } }),
      Task.aggregate([
        { $match: { project: project._id, assignedTo: { $ne: null } } },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      ]),
    ]);

    const tasksByStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    statusGroups.forEach((g) => { tasksByStatus[g._id] = g.count; });

    const userIds = tasksPerUserRaw.map((t) => t._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
    const tasksPerUser = tasksPerUserRaw
      .map((t) => ({ user: userMap[t._id.toString()] || null, count: t.count }))
      .filter((t) => t.user);

    res.json({ totalTasks, tasksByStatus, overdueTasks, tasksPerUser });
  } catch (err) { next(err); }
});

module.exports = router;
