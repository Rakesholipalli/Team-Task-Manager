const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const membership = project.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!membership) return res.status(403).json({ error: 'You are not a member of this project' });

    req.project = project;
    req.membership = membership;
    next();
  } catch {
    next();
  }
};

const requireProjectAdmin = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const membership = project.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.project = project;
    req.membership = membership;
    next();
  } catch {
    next();
  }
};

module.exports = { authenticate, requireProjectMember, requireProjectAdmin };
