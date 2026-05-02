import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { CheckCircle2, Clock, AlertTriangle, FolderKanban, ListTodo, Loader2 } from 'lucide-react';
import { format, isPast } from 'date-fns';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = { TODO: '#94a3b8', IN_PROGRESS: '#3b82f6', DONE: '#22c55e' };
const PRIORITY_COLORS = { LOW: '#86efac', MEDIUM: '#fbbf24', HIGH: '#f87171' };

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

const STATUS_LABEL = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
const PRIORITY_LABEL = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Failed to load dashboard data.</div>;
  }

  const statusData = Object.entries(data.tasksByStatus).map(([k, v]) => ({
    name: STATUS_LABEL[k],
    value: v,
    fill: STATUS_COLORS[k],
  }));

  const priorityData = Object.entries(data.tasksByPriority).map(([k, v]) => ({
    name: PRIORITY_LABEL[k],
    value: v,
    fill: PRIORITY_COLORS[k],
  }));

  const userBarData = data.tasksPerUser.map((t) => ({
    name: t.user.name,
    tasks: t.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name}!</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ListTodo} label="Total Tasks" value={data.totalTasks} color="bg-blue-500" />
        <StatCard icon={FolderKanban} label="Projects" value={data.projectCount} color="bg-indigo-500" />
        <StatCard icon={CheckCircle2} label="Completed" value={data.tasksByStatus.DONE} color="bg-green-500" />
        <StatCard icon={AlertTriangle} label="Overdue" value={data.overdueTasks} color="bg-red-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status pie */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Tasks by Status</h2>
          {data.totalTasks === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No tasks yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Priority bar */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Tasks by Priority</h2>
          {data.totalTasks === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No tasks yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Tasks">
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tasks per user */}
        {userBarData.length > 0 && (
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Tasks per Team Member</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={userBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tasks" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent tasks */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Tasks</h2>
          {data.recentTasks.length === 0 ? (
            <p className="text-gray-400 text-sm">No tasks yet. Create a project and add tasks!</p>
          ) : (
            <ul className="space-y-3">
              {data.recentTasks.map((task) => (
                <li key={task._id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      task.status === 'DONE'
                        ? 'bg-green-500'
                        : task.status === 'IN_PROGRESS'
                        ? 'bg-blue-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500">
                      {task.project?.name}
                      {task.dueDate && (
                        <span className={isPast(new Date(task.dueDate)) && task.status !== 'DONE' ? ' text-red-500' : ''}>
                          {' · Due '}{format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </p>
                  </div>
                  <Link
                    to={`/projects/${task.project?._id}/tasks`}
                    className="text-xs text-blue-600 hover:underline flex-shrink-0"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
