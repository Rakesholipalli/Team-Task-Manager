import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, UserPlus, UserMinus, Crown, User, Loader2, ShieldOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

function AddMemberModal({ projectId, onClose }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');

  const mutation = useMutation({
    mutationFn: (data) => api.post(`/projects/${projectId}/members`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member added!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add member'),
  });

  return (
    <Modal title="Add Member" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({ email, role });
        }}
        className="space-y-4"
      >
        <div>
          <label className="label">Email address *</label>
          <input
            type="email"
            className="input"
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">The user must already have an account.</p>
        </div>
        <div>
          <label className="label">Role</label>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Adding…' : 'Add Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showAddMember, setShowAddMember] = useState(false);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then((r) => r.data),
    retry: false,
    refetchInterval: 5000, // poll every 5 seconds to detect removal quickly
  });

  // Redirect to projects list if access denied or not found
  useEffect(() => {
    if (error) {
      const status = error.response?.status;
      if (status === 403) {
        toast.error('You no longer have access to this project');
        navigate('/projects', { replace: true });
      } else if (status === 404) {
        toast.error('Project not found');
        navigate('/projects', { replace: true });
      }
    }
  }, [error, navigate]);

  const removeMember = useMutation({
    mutationFn: (userId) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member removed');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove member'),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }) =>
      api.put(`/projects/${projectId}/members/${userId}/role`, { role }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Role updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update role'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) return null; // redirect handled by useEffect above

  const isAdmin = project.myRole === 'ADMIN';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/projects" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="text-gray-500 mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Team Members ({project.members.length})
          </h2>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowAddMember(true)}>
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          )}
        </div>

        <ul className="divide-y divide-gray-100">
          {project.members.map((member) => (
            <li key={member._id} className="flex items-center gap-4 py-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                {member.user.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  {member.user.name}
                  {member.user._id === user.id && (
                    <span className="text-xs text-gray-400">(you)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{member.user.email}</p>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && member.user._id !== user.id && member.user._id?.toString() !== project.createdBy?.toString() ? (
                  <>
                    <select
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={member.role}
                      onChange={(e) =>
                        changeRole.mutate({ userId: member.user._id, role: e.target.value })
                      }
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${member.user.name} from this project?`)) {
                          removeMember.mutate(member.user._id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <span
                    className={`badge ${
                      member.role === 'ADMIN'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {member.user._id?.toString() === project.createdBy?.toString() ? (
                      <Crown className="w-3 h-3 mr-1" />
                    ) : member.role === 'ADMIN' ? (
                      <Crown className="w-3 h-3 mr-1" />
                    ) : (
                      <User className="w-3 h-3 mr-1" />
                    )}
                    {member.role === 'ADMIN' ? 'Admin' : 'Member'}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <Link to={`/projects/${projectId}/tasks`} className="btn-primary">
          View Tasks
        </Link>
        <Link to="/projects" className="btn-secondary">
          Back to Projects
        </Link>
      </div>

      {showAddMember && (
        <AddMemberModal projectId={projectId} onClose={() => setShowAddMember(false)} />
      )}
    </div>
  );
}
