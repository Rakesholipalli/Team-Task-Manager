import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Loader2, Calendar, Flag, User, Pencil, Trash2,
  CheckCircle2, Clock, Circle, ChevronDown,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const PRIORITY_CONFIG = {
  LOW: { label: 'Low', class: 'bg-green-100 text-green-700' },
  MEDIUM: { label: 'Medium', class: 'bg-yellow-100 text-yellow-700' },
  HIGH: { label: 'High', class: 'bg-red-100 text-red-700' },
};

const STATUS_CONFIG = {
  TODO: { label: 'To Do', icon: Circle, class: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, class: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
  DONE: { label: 'Done', icon: CheckCircle2, class: 'text-green-500', bg: 'bg-green-50 border-green-200' },
};

function TaskForm({ projectId, members, task, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!task;

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
    priority: task?.priority || 'MEDIUM',
    assignedToId: task?.assignedTo?._id || '',
    status: task?.status || 'TODO',
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? api.put(`/tasks/${task._id}`, data).then((r) => r.data)
        : api.post('/tasks', { ...data, projectId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(isEdit ? 'Task updated!' : 'Task created!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save task'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      dueDate: form.dueDate || null,
      assignedToId: form.assignedToId || null,
    });
  };

  return (
    <Modal title={isEdit ? 'Edit Task' : 'Create Task'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <input
            className="input"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Task details…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              className="input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Assign To</label>
            <select
              className="input"
              value={form.assignedToId}
              onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
          {isEdit && (
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StatusDropdown({ task, isAssignee, isAdmin, projectId }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (status) => api.put(`/tasks/${task._id}`, { status }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update status'),
  });

  const canChange = isAdmin || isAssignee;
  const cfg = STATUS_CONFIG[task.status];
  const Icon = cfg.icon;

  if (!canChange) {
    return (
      <span className={`badge ${cfg.bg} border ${cfg.class} text-xs`}>
        <Icon className="w-3 h-3 mr-1" />
        {cfg.label}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`badge ${cfg.bg} border ${cfg.class} text-xs flex items-center gap-1 cursor-pointer hover:opacity-80`}
      >
        <Icon className="w-3 h-3" />
        {cfg.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
            {Object.entries(STATUS_CONFIG).map(([key, val]) => {
              const SIcon = val.icon;
              return (
                <button
                  key={key}
                  onClick={() => mutation.mutate(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${
                    task.status === key ? 'font-semibold' : ''
                  }`}
                >
                  <SIcon className={`w-3.5 h-3.5 ${val.class}`} />
                  {val.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TaskCard({ task, isAdmin, currentUserId, projectId, members, onEdit }) {
  const qc = useQueryClient();
  // MongoDB: assignedTo is a populated object with _id
  const isAssignee = task.assignedTo?._id === currentUserId || task.assignedTo?._id?.toString() === currentUserId;

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${task._id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete'),
  });

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'DONE';

  return (
    <div className={`card p-4 space-y-3 ${task.status === 'DONE' ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`text-sm font-medium text-gray-900 flex-1 ${
            task.status === 'DONE' ? 'line-through text-gray-400' : ''
          }`}
        >
          {task.title}
        </h3>
        {isAdmin && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(task)}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Edit task"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { if (window.confirm('Delete this task?')) deleteMutation.mutate(); }}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <StatusDropdown task={task} isAssignee={isAssignee} isAdmin={isAdmin} projectId={projectId} />
        <span className={`badge ${PRIORITY_CONFIG[task.priority].class} text-xs`}>
          <Flag className="w-3 h-3 mr-1" />
          {PRIORITY_CONFIG[task.priority].label}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        {task.assignedTo ? (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {task.assignedTo.name}
          </span>
        ) : (
          <span className="text-gray-300">Unassigned</span>
        )}
        {task.dueDate && (
          <span
            className={`flex items-center gap-1 ${
              isOverdue ? 'text-red-500 font-medium' : isToday(new Date(task.dueDate)) ? 'text-orange-500' : ''
            }`}
          >
            <Calendar className="w-3 h-3" />
            {format(new Date(task.dueDate), 'MMM d')}
            {isOverdue && ' (overdue)'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const { data: project, error: projectError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then((r) => r.data),
    retry: false,
    refetchInterval: 5000, // poll every 5 seconds to detect removal quickly
  });

  // Redirect if removed from project
  useEffect(() => {
    if (projectError) {
      const status = projectError.response?.status;
      if (status === 403) {
        toast.error('You no longer have access to this project');
        navigate('/projects', { replace: true });
      } else if (status === 404) {
        toast.error('Project not found');
        navigate('/projects', { replace: true });
      }
    }
  }, [projectError, navigate]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId, filterStatus, filterPriority],
    queryFn: () => {
      const params = new URLSearchParams({ projectId });
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      return api.get(`/tasks?${params}`).then((r) => r.data);
    },
  });

  const isAdmin = project?.myRole === 'ADMIN';
  const members = project?.members || [];

  const grouped = {
    TODO: tasks.filter((t) => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS'),
    DONE: tasks.filter((t) => t.status === 'DONE'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/projects" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{project?.name || 'Tasks'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            {project && (
              <Link to={`/projects/${projectId}`} className="ml-2 text-blue-600 hover:underline">
                {isAdmin ? 'Manage team →' : 'View team →'}
              </Link>
            )}
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            New Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="input w-auto text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
        <select className="input w-auto text-sm" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        {(filterStatus || filterPriority) && (
          <button className="btn-ghost text-sm" onClick={() => { setFilterStatus(''); setFilterPriority(''); }}>
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          {isAdmin ? (
            <>
              <p className="text-gray-500 mb-6">Create your first task to get started.</p>
              <button className="btn-primary mx-auto" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                Create Task
              </button>
            </>
          ) : (
            <p className="text-gray-500">No tasks have been assigned yet.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Object.entries(grouped).map(([status, statusTasks]) => {
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${cfg.class}`} />
                  <h2 className="text-sm font-semibold text-gray-700">{cfg.label}</h2>
                  <span className="ml-auto badge bg-gray-100 text-gray-600 text-xs">{statusTasks.length}</span>
                </div>
                {statusTasks.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
                    No tasks
                  </div>
                ) : (
                  statusTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      isAdmin={isAdmin}
                      currentUserId={user.id}
                      projectId={projectId}
                      members={members}
                      onEdit={setEditTask}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <TaskForm projectId={projectId} members={members} onClose={() => setShowCreate(false)} />}
      {editTask && <TaskForm projectId={projectId} members={members} task={editTask} onClose={() => setEditTask(null)} />}
    </div>
  );
}
