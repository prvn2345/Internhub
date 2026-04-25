import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BookmarkIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import useAuthStore from '../../store/authStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-blue-100 text-blue-700',
  shortlisted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  hired: 'bg-purple-100 text-purple-700',
};

const JobCard = ({ job, showStatus, applicationStatus, onSaveToggle }) => {
  const { t } = useTranslation();
  const { currentUser: user, updateUser } = useAuthStore();
  const isSaved = user?.savedJobs?.includes(job._id);

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to save jobs');
      return;
    }
    try {
      const { data } = await api.post(`/users/saved-jobs/${job._id}`);
      updateUser({ savedJobs: data.savedJobs });
      toast.success(data.message);
      if (onSaveToggle) onSaveToggle();
    } catch (_) {
      toast.error('Failed to save job');
    }
  };

  const deadlinePassed = new Date(job.applicationDeadline) < new Date();

  return (
    <Link to={`/jobs/${job._id}`} className="block group">
      <div className="card p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.company}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <BuildingOfficeIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {job.title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{job.company}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className={`badge text-xs ${
                job.type === 'internship'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}
            >
              {job.type === 'internship' ? t('jobs.internship') : t('jobs.job')}
            </span>
            {user?.role === 'student' && (
              <button
                onClick={handleSave}
                className="p-1 rounded text-gray-400 hover:text-primary-600 transition-colors"
                aria-label={isSaved ? 'Unsave job' : 'Save job'}
              >
                {isSaved ? (
                  <BookmarkSolidIcon className="w-4 h-4 text-primary-600" />
                ) : (
                  <BookmarkIcon className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span className="flex items-center gap-1">
            <MapPinIcon className="w-3.5 h-3.5" />
            {job.isRemote ? 'Remote' : job.location}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            {job.duration}
          </span>
          <span className="flex items-center gap-1">
            <CurrencyDollarIcon className="w-3.5 h-3.5" />
            {job.stipend > 0
              ? `₹${job.stipend.toLocaleString()}${t('jobs.perMonth')}`
              : t('jobs.unpaid')}
          </span>
        </div>

        {/* Skills */}
        {job.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded text-xs">
                +{job.skills.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <span className={`text-xs ${deadlinePassed ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
            {t('jobs.deadline')}: {new Date(job.applicationDeadline).toLocaleDateString()}
          </span>
          {showStatus && applicationStatus && (
            <span className={`badge text-xs ${statusColors[applicationStatus] || 'bg-gray-100 text-gray-600'}`}>
              {t(`application.status.${applicationStatus}`)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default JobCard;
