const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Helper: get membership
const getMembership = (project, userId) =>
  project.members.find((m) => m.user.toString() === userId.toString());

// GET /api/tasks?projectId=...
router.get('/', async (req, res, next) => {
  try {
    const { projectId, status, priority, assignedToId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const membership = getMembership(project, req.user._id);
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const filter = { project: projectId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedToId) filter.assignedTo = assignedToId === 'null' ? null : assignedToId;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json(tasks);
  } catch (err) { next(err); }
});

// POST /api/tasks
router.post('/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('projectId').notEmpty().withMessage('projectId is required'),
    body('dueDate').optional({ nullable: true }).isISO8601().withMessage('Invalid date'),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { title, description, projectId, dueDate, priority, assignedToId } = req.body;

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const membership = getMembership(project, req.user._id);
      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can create tasks' });
      }

      if (assignedToId) {
        const isProjectMember = project.members.some((m) => m.user.toString() === assignedToId);
        if (!isProjectMember) return res.status(400).json({ error: 'Assignee is not a project member' });
      }

      const task = await Task.create({
        title,
        description,
        project: projectId,
        dueDate: dueDate || null,
        priority: priority || 'MEDIUM',
        assignedTo: assignedToId || null,
        createdBy: req.user._id,
      });

      await task.populate('assignedTo', 'name email');
      await task.populate('createdBy', 'name email');
      res.status(201).json(task);
    } catch (err) { next(err); }
  }
);

// GET /api/tasks/:taskId
router.get('/:taskId', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name');

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const project = await Project.findById(task.project._id || task.project);
    const membership = getMembership(project, req.user._id);
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    res.json(task);
  } catch (err) { next(err); }
});

// PUT /api/tasks/:taskId
router.put('/:taskId',
  [
    body('title').optional().trim().notEmpty(),
    body('dueDate').optional({ nullable: true }),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']),
  ],
  async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      const project = await Project.findById(task.project);
      const membership = getMembership(project, req.user._id);
      if (!membership) return res.status(403).json({ error: 'Access denied' });

      const isAdmin = membership.role === 'ADMIN';
      const isAssignee = task.assignedTo?.toString() === req.user._id.toString();

      if (!isAdmin) {
        if (!isAssignee) return res.status(403).json({ error: 'You can only update tasks assigned to you' });
        const allowedFields = ['status'];
        const forbidden = Object.keys(req.body).filter((f) => !allowedFields.includes(f));
        if (forbidden.length > 0) return res.status(403).json({ error: 'Members can only update task status' });
      }

      const { title, description, dueDate, priority, status, assignedToId } = req.body;

      if (assignedToId !== undefined) {
        if (assignedToId) {
          const isProjectMember = project.members.some((m) => m.user.toString() === assignedToId);
          if (!isProjectMember) return res.status(400).json({ error: 'Assignee is not a project member' });
        }
        task.assignedTo = assignedToId || null;
      }

      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
      if (priority !== undefined) task.priority = priority;
      if (status !== undefined) task.status = status;

      await task.save();
      await task.populate('assignedTo', 'name email');
      await task.populate('createdBy', 'name email');
      await task.populate('project', 'name');
      res.json(task);
    } catch (err) { next(err); }
  }
);

// DELETE /api/tasks/:taskId
router.delete('/:taskId', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const project = await Project.findById(task.project);
    const membership = getMembership(project, req.user._id);
    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete tasks' });
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
