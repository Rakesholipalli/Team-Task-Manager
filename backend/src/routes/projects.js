const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const { authenticate, requireProjectMember, requireProjectAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Helper: format project for response
const formatProject = (project, userId) => {
  const obj = project.toObject({ virtuals: true });
  const myMembership = project.members.find((m) => m.user._id?.toString() === userId.toString() || m.user?.toString() === userId.toString());
  return { ...obj, myRole: myMembership?.role };
};

// GET /api/projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email')
      .sort({ createdAt: -1 });

    const taskCounts = await Task.aggregate([
      { $match: { project: { $in: projects.map((p) => p._id) } } },
      { $group: { _id: '$project', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(taskCounts.map((t) => [t._id.toString(), t.count]));

    const result = projects.map((p) => {
      const myMembership = p.members.find((m) => m.user._id.toString() === req.user._id.toString());
      return { ...p.toObject(), myRole: myMembership?.role, taskCount: countMap[p._id.toString()] || 0 };
    });

    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/projects
router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Project name is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, description } = req.body;
      const project = await Project.create({
        name,
        description,
        createdBy: req.user._id,
        members: [{ user: req.user._id, role: 'ADMIN' }],
      });
      await project.populate('members.user', 'name email');

      res.status(201).json({ ...project.toObject(), myRole: 'ADMIN', taskCount: 0 });
    } catch (err) { next(err); }
  }
);

// GET /api/projects/:projectId
router.get('/:projectId', requireProjectMember, async (req, res, next) => {
  try {
    await req.project.populate('members.user', 'name email');
    const taskCount = await Task.countDocuments({ project: req.project._id });
    res.json({ ...req.project.toObject(), myRole: req.membership.role, taskCount });
  } catch (err) { next(err); }
});

// PUT /api/projects/:projectId
router.put('/:projectId', requireProjectAdmin,
  [body('name').optional().trim().notEmpty()],
  async (req, res, next) => {
    try {
      const { name, description } = req.body;
      if (name) req.project.name = name;
      if (description !== undefined) req.project.description = description;
      await req.project.save();
      await req.project.populate('members.user', 'name email');
      const taskCount = await Task.countDocuments({ project: req.project._id });
      res.json({ ...req.project.toObject(), myRole: 'ADMIN', taskCount });
    } catch (err) { next(err); }
  }
);

// DELETE /api/projects/:projectId
router.delete('/:projectId', requireProjectAdmin, async (req, res, next) => {
  try {
    // Only the original creator can delete the project
    if (req.project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the project creator can delete this project' });
    }
    await Task.deleteMany({ project: req.project._id });
    await req.project.deleteOne();
    res.json({ message: 'Project deleted successfully' });
  } catch (err) { next(err); }
});

// POST /api/projects/:projectId/members
router.post('/:projectId/members', requireProjectAdmin,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, role = 'MEMBER' } = req.body;
      const userToAdd = await User.findOne({ email });
      if (!userToAdd) return res.status(404).json({ error: 'User with this email not found' });

      const alreadyMember = req.project.members.some(
        (m) => m.user.toString() === userToAdd._id.toString()
      );
      if (alreadyMember) return res.status(409).json({ error: 'User is already a member' });

      req.project.members.push({ user: userToAdd._id, role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER' });
      await req.project.save();
      await req.project.populate('members.user', 'name email');

      const newMember = req.project.members.find(
        (m) => m.user._id.toString() === userToAdd._id.toString()
      );
      res.status(201).json(newMember);
    } catch (err) { next(err); }
  }
);

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', requireProjectAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Cannot remove the project creator
    if (req.project.createdBy.toString() === userId) {
      return res.status(403).json({ error: 'Cannot remove the project creator' });
    }

    if (userId === req.user._id.toString()) {
      const adminCount = req.project.members.filter((m) => m.role === 'ADMIN').length;
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot remove the only admin' });
    }

    req.project.members = req.project.members.filter((m) => m.user.toString() !== userId);
    await req.project.save();
    res.json({ message: 'Member removed successfully' });
  } catch (err) { next(err); }
});

// PUT /api/projects/:projectId/members/:userId/role
router.put('/:projectId/members/:userId/role', requireProjectAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!['ADMIN', 'MEMBER'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const member = req.project.members.find((m) => m.user.toString() === userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    member.role = role;
    await req.project.save();
    await req.project.populate('members.user', 'name email');

    const updated = req.project.members.find((m) => m.user._id.toString() === userId);
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
