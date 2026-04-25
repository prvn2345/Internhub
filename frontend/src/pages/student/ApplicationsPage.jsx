import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BriefcaseIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { PageLoader } from '../../components/common/LoadingSpinner';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  shortlisted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  hired: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const ApplicationsPage = () => {
  const { t } = useTranslation();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter);

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {t('nav.applications')}
      </h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {['all', 'pending', 'reviewed', 'shortlisted', 'rejected', 'hired'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {s === 'all' ? 'All' : t(`application.status.${s}`)}
            {s === 'all' && ` (${applications.length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <BriefcaseIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('dashboard.noApplications')}</p>
          <Link to="/jobs" className="btn-primary mt-4 inline-block text-sm">Browse Jobs</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => (
            <div key={app._id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/jobs/${app.job?._id}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {app.job?.title}
                  </Link>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{app.job?.company}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                    {app.job?.location && (
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="w-3.5 h-3.5" />
                        {app.job.location}
                      </span>
                    )}
                    {app.job?.duration && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {app.job.duration}
                      </span>
                    )}
                    <span>{t('application.appliedOn')} {new Date(app.appliedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`badge text-xs flex-shrink-0 ${statusColors[app.status]}`}>
                  {t(`application.status.${app.status}`)}
                </span>
              </div>
              {app.employerNotes && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Employer note:</span> {app.employerNotes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;
