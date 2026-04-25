import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import JobCard from '../../components/common/JobCard';
import { PageLoader } from '../../components/common/LoadingSpinner';

const SavedJobsPage = () => {
  const { t } = useTranslation();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = async () => {
    try {
      const { data } = await api.get('/users/saved-jobs');
      setSavedJobs(data.savedJobs);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchSaved(); }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {t('nav.savedJobs')}
      </h1>

      {savedJobs.length === 0 ? (
        <div className="card p-12 text-center">
          <BookmarkIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('dashboard.noSavedJobs')}</p>
          <Link to="/jobs" className="btn-primary mt-4 inline-block text-sm">Browse Jobs</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedJobs.map((job) => (
            <JobCard key={job._id} job={job} onSaveToggle={fetchSaved} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedJobsPage;
