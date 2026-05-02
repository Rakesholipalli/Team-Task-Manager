import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderKanban, Users, CheckSquare, Loader2, Trash2, Settings, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

function CreateProjectModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '' });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/projects', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Project created!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create project'),
  });

  return (
    <Modal title="Create Project" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
        className="space-y-4"
      >
        <div>
          <label className="label">Project name *</label>
          <input
            className="input"
            placeholder="e.g. Website Redesign"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="What is this project about?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const ROLE_BADGE = {
  ADMIN: 'badge bg-blue-100 text-blue-700',
  MEMBER: 'badge bg-gray-100 text-gray-600',
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Project deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete'),
  });

  const handleDelete = (project) => {
    if (window.confirm(`Delete "${project.name}"? This will also delete all tasks.`)) {
      deleteMutation.mutate(project._id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your team projects</p>
        </div>
        {projects.length > 0 && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            New Project
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-6">Create your first project to get started.</p>
          <button className="btn-primary mx-auto" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project._id} className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                    <span className={ROLE_BADGE[project.myRole]}>{project.myRole}</span>
                  </div>
                  {project.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
                  )}
                </div>
                {project.myRole === 'ADMIN' && project.createdBy?.toString() === user.id && (
                  <button
                    onClick={() => handleDelete(project)}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" />
                  {project.taskCount || 0} task{(project.taskCount || 0) !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex gap-2 pt-1 border-t border-gray-100">
                <Link to={`/projects/${project._id}/tasks`} className="btn-primary flex-1 justify-center text-xs py-1.5">
                  View Tasks
                </Link>
                <Link to={`/projects/${project._id}`} className="btn-secondary flex-1 justify-center text-xs py-1.5">
                  {project.myRole === 'ADMIN' ? (
                    <><Settings className="w-3.5 h-3.5" />Manage Team</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5" />View Team</>
                  )}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
