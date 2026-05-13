import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UsersIcon, BriefcaseIcon, DocumentTextIcon, CheckCircleIcon, IdentificationIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { PageLoader } from '../../components/common/LoadingSpinner';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [telemetry, setTelemetry] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    const fetchPlatformStats = async () => {
      try {
        const { data: serverPayload } = await api.get('/admin/stats');
        setTelemetry(serverPayload);
      } catch (err) { console.error('Admin telemetry fetch failed'); }
      setIsDataLoading(false);
    };
    fetchPlatformStats();
  }, []);

  if (isDataLoading) return <PageLoader />;

  const { stats, recentUsers, recentJobs } = telemetry || {};

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 border-b border-gray-200 dark:border-gray-700 pb-3">{t('admin.dashboard')}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { title: t('admin.totalUsers'), val: stats?.totalUsers, Glyph: UsersIcon, shadeText: 'text-indigo-600', shadeBg: 'bg-indigo-50 dark:bg-indigo-900/30' },
          { title: t('admin.totalJobs'), val: stats?.totalJobs, Glyph: BriefcaseIcon, shadeText: 'text-sky-600', shadeBg: 'bg-sky-50 dark:bg-sky-900/30' },
          { title: t('admin.totalApplications'), val: stats?.totalApplications, Glyph: DocumentTextIcon, shadeText: 'text-fuchsia-600', shadeBg: 'bg-fuchsia-50 dark:bg-fuchsia-900/30' },
          { title: t('admin.activeJobs'), val: stats?.activeJobs, Glyph: CheckCircleIcon, shadeText: 'text-teal-600', shadeBg: 'bg-teal-50 dark:bg-teal-900/30' },
        ].map(({ title, val, Glyph, shadeText, shadeBg }) => (
          <div key={title} className={`card p-6 border-l-4 ${shadeBg} border-opacity-50 border-${shadeText.split('-')[1]}-500`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm ${shadeText}`}><Glyph className="w-7 h-7" /></div>
              <div>
                <p className={`text-3xl font-black ${shadeText}`}>{val ?? '0'}</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <Link to="/admin/users" className="card p-6 flex items-center justify-between hover:-translate-y-1 transition-transform bg-gradient-to-r from-gray-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center"><IdentificationIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /></div>
            <div><p className="text-xl font-bold text-gray-900 dark:text-white">Platform Roster</p><p className="text-gray-500 text-sm font-medium">Manage {stats?.totalUsers || 0} registered accounts</p></div>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300">→</div>
        </Link>
        <Link to="/admin/jobs" className="card p-6 flex items-center justify-between hover:-translate-y-1 transition-transform bg-gradient-to-r from-gray-50 to-sky-50 dark:from-gray-800 dark:to-sky-900/20 border border-sky-100 dark:border-sky-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-sky-100 dark:bg-sky-900/50 rounded-2xl flex items-center justify-center"><BuildingOfficeIcon className="w-7 h-7 text-sky-600 dark:text-sky-400" /></div>
            <div><p className="text-xl font-bold text-gray-900 dark:text-white">Opportunity Registry</p><p className="text-gray-500 text-sm font-medium">Oversee {stats?.totalJobs || 0} active listings</p></div>
          </div>
          <div className="w-8 h-8 rounded-full bg-sky-200 dark:bg-sky-800 flex items-center justify-center text-sky-700 dark:text-sky-300">→</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card border-0 shadow-sm">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Registrations</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 p-2">
            {recentUsers?.length ? recentUsers.map((u) => (
              <div key={u._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{u.name}</p>
                  <p className="text-gray-500 text-xs font-medium">{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${u.role === 'employer' ? 'bg-sky-100 text-sky-700' : u.role === 'admin' ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-gray-200 text-gray-700'}`}>{u.role}</span>
                  <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${u.isActive ? 'text-emerald-600' : 'text-red-500'}`}><span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />{u.isActive ? 'Authorized' : 'Suspended'}</span>
                </div>
              </div>
            )) : <p className="p-6 text-center text-gray-400 text-sm">No recent activity</p>}
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Listings</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 p-2">
            {recentJobs?.length ? recentJobs.map((j) => (
              <div key={j._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{j.title}</p>
                  <p className="text-gray-500 text-xs font-medium">{j.company} <span className="text-gray-300 mx-1">|</span> {j.employer?.name}</p>
                </div>
                <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full ${j.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                  {j.status}
                </span>
              </div>
            )) : <p className="p-6 text-center text-gray-400 text-sm">No recent activity</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminDashboard;
