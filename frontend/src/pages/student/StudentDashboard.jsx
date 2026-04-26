import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BriefcaseIcon, ClockIcon, CheckCircleIcon, XCircleIcon,
  StarIcon, UserCircleIcon, ArrowRightIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { PageLoader } from '../../components/common/LoadingSpinner';

const statusColors = {
  pending: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', icon: ClockIcon },
  reviewed: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', icon: BriefcaseIcon },
  shortlisted: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', icon: CheckCircleIcon },
  rejected: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', icon: XCircleIcon },
  hired: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', icon: StarIcon },
};

const StudentDashboard = () => {
  const { t } = useTranslation();
  const { currentUser: user } = useAuthStore();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/applications/my-applications');
        setApplications(data.applications);
      } catch (_) {}
      setLoading(false);
    };
    fetch();
  }, []);

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
    hired: applications.filter((a) => a.status === 'hired').length,
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.welcome')}, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track your applications and manage your profile
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('dashboard.totalApplications'), value: stats.total, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
          { label: t('dashboard.pending'), value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { label: t('dashboard.shortlisted'), value: stats.shortlisted, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: t('dashboard.hired'), value: stats.hired, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map((stat) => (
          <div key={stat.label} className={`card p-5 ${stat.bg}`}>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('dashboard.recentApplications')}
            </h2>
            <Link to="/applications" className="text-primary-600 dark:text-primary-400 text-sm hover:underline flex items-center gap-1">
              View all <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {applications.length === 0 ? (
            <div className="card p-8 text-center">
              <BriefcaseIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('dashboard.noApplications')}</p>
              <Link to="/jobs" className="btn-primary mt-4 inline-block text-sm">
                Browse Jobs
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 5).map((app) => {
                const statusStyle = statusColors[app.status] || statusColors.pending;
                const StatusIcon = statusStyle.icon;
                return (
                  <div key={app._id} className="card p-4 flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${statusStyle.bg}`}>
                      <StatusIcon className={`w-5 h-5 ${statusStyle.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {app.job?.title}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{app.job?.company}</p>
                    </div>
                    <span className={`badge text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                      {t(`application.status.${app.status}`)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Profile Completion */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <UserCircleIcon className="w-12 h-12 text-gray-300" />
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-gray-500 text-xs">{user?.email}</p>
              </div>
            </div>

            {/* Completion checklist */}
            <div className="space-y-2 mb-4">
              {[
                { label: 'Profile picture', done: !!user?.profilePicture },
                { label: 'Bio added', done: !!user?.bio },
                { label: 'Skills added', done: user?.skills?.length > 0 },
                { label: 'Resume uploaded', done: !!user?.resumeUrl },
                { label: 'Education added', done: user?.education?.length > 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${item.done ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    {item.done ? '✓' : ''}
                  </span>
                  <span className={item.done ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <Link to="/profile" className="btn-primary w-full text-center block text-sm py-2">
              {t('profile.edit')}
            </Link>
          </div>
        </div>

        {/* Premium Resume Builder CTA */}
        <div className="mt-4">
          <Link to="/resume-builder"
            className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow
                       bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20
                       border-amber-200 dark:border-amber-800 block">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Premium Resume Builder</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Generate a professional PDF resume for ₹50</p>
            </div>
            <span className="text-amber-600 dark:text-amber-400 text-xs font-bold bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
              ₹50
            </span>
          </Link>
          <Link to="/plans"
            className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow
                       bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20
                       border-primary-200 dark:border-primary-800 block mt-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <BriefcaseIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Subscription Plans</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Upgrade to apply for more internships</p>
            </div>
            <span className="text-primary-600 dark:text-primary-400 text-xs font-bold bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 rounded-full">
              From ₹100
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
