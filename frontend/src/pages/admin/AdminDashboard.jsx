import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  UsersIcon, BriefcaseIcon, DocumentTextIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { PageLoader } from '../../components/common/LoadingSpinner';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: res } = await api.get('/admin/stats');
        setData(res);
      } catch (_) {}
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <PageLoader />;

  const { stats, recentUsers, recentJobs } = data || {};

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{t('admin.dashboard')}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('admin.totalUsers'), value: stats?.totalUsers, icon: UsersIcon, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
          { label: t('admin.totalJobs'), value: stats?.totalJobs, icon: BriefcaseIcon, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: t('admin.totalApplications'), value: stats?.totalApplications, icon: DocumentTextIcon, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: t('admin.activeJobs'), value: stats?.activeJobs, icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card p-5 ${bg}`}>
            <div className="flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color}`} />
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link to="/admin/users" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Manage Users</p>
            <p className="text-gray-500 text-sm">{stats?.totalUsers} total users</p>
          </div>
        </Link>
        <Link to="/admin/jobs" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <BriefcaseIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Manage Jobs</p>
            <p className="text-gray-500 text-sm">{stats?.totalJobs} total jobs</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Users</h2>
          <div className="card divide-y divide-gray-200 dark:divide-gray-700">
            {recentUsers?.map((user) => (
              <div key={user._id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{user.name}</p>
                  <p className="text-gray-500 text-xs">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge text-xs ${user.role === 'employer' ? 'bg-blue-100 text-blue-700' : user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {user.role}
                  </span>
                  <span className={`badge text-xs ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Jobs */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Jobs</h2>
          <div className="card divide-y divide-gray-200 dark:divide-gray-700">
            {recentJobs?.map((job) => (
              <div key={job._id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{job.title}</p>
                  <p className="text-gray-500 text-xs">{job.company} • {job.employer?.name}</p>
                </div>
                <span className={`badge text-xs ${job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
