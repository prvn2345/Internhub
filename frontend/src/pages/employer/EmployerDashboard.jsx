import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BriefcaseIcon, UserGroupIcon, PlusIcon, PencilIcon,
  TrashIcon, EyeIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { PageLoader } from '../../components/common/LoadingSpinner';

const EmployerDashboard = () => {
  const { t } = useTranslation();
  const { currentUser: user } = useAuthStore();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const { data } = await api.get('/jobs/employer/my-jobs');
      setJobs(data.jobs);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleDelete = async (jobId) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      setJobs(jobs.filter((j) => j._id !== jobId));
      toast.success('Job deleted');
    } catch (_) {
      toast.error('Failed to delete job');
    }
  };

  const handleToggleStatus = async (job) => {
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    try {
      await api.put(`/jobs/${job._id}`, { status: newStatus });
      setJobs(jobs.map((j) => j._id === job._id ? { ...j, status: newStatus } : j));
      toast.success(`Job ${newStatus}`);
    } catch (_) {
      toast.error('Failed to update status');
    }
  };

  const stats = {
    total: jobs.length,
    active: jobs.filter((j) => j.status === 'active').length,
    applicants: jobs.reduce((sum, j) => sum + (j.applicationsCount || 0), 0),
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('employer.dashboard')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{user?.companyName}</p>
        </div>
        <Link to="/employer/post-job" className="btn-primary flex items-center gap-2 text-sm">
          <PlusIcon className="w-4 h-4" />
          {t('employer.postJob')}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: t('employer.totalListings'), value: stats.total, icon: BriefcaseIcon, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
          { label: t('employer.activeListings'), value: stats.active, icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: t('employer.totalApplicants'), value: stats.applicants, icon: UserGroupIcon, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card p-5 ${bg}`}>
            <div className="flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color}`} />
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Job Listings */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('employer.myListings')}</h2>

      {jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <BriefcaseIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">{t('employer.noListings')}</p>
          <Link to="/employer/post-job" className="btn-primary inline-block text-sm">
            {t('employer.postJob')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job._id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                    <span className={`badge text-xs ${job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {job.status}
                    </span>
                    <span className="badge text-xs bg-blue-100 text-blue-700">
                      {job.type}
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {job.location} • {job.duration} • {job.applicationsCount || 0} applicants
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    to={`/employer/applicants/${job._id}`}
                    className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="View Applicants"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/employer/edit-job/${job._id}`}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleToggleStatus(job)}
                    className={`p-2 rounded-lg transition-colors ${
                      job.status === 'active'
                        ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                    title={job.status === 'active' ? 'Close' : 'Activate'}
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(job._id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployerDashboard;
