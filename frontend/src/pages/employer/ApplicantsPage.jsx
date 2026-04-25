import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCircleIcon, PaperClipIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PageLoader } from '../../components/common/LoadingSpinner';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-blue-100 text-blue-700',
  shortlisted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  hired: 'bg-purple-100 text-purple-700',
};

const ApplicantsPage = () => {
  const { jobId } = useParams();
  const { t } = useTranslation();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [appRes, jobRes] = await Promise.all([
          api.get(`/applications/job/${jobId}`),
          api.get(`/jobs/${jobId}`),
        ]);
        setApplications(appRes.data.applications);
        setJobTitle(jobRes.data.job.title);
      } catch (_) {}
      setLoading(false);
    };
    fetch();
  }, [jobId]);

  const handleStatusChange = async (appId, status, notes) => {
    try {
      const { data } = await api.put(`/applications/${appId}/status`, { status, employerNotes: notes });
      setApplications(applications.map((a) => a._id === appId ? { ...a, status: data.application.status } : a));
      toast.success('Status updated');
    } catch (_) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/employer/dashboard" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('employer.applicants')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{jobTitle} • {applications.length} applicants</p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="card p-12 text-center">
          <UserCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No applications yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app._id} className="card p-5">
              <div className="flex items-start gap-4">
                {app.applicant?.profilePicture ? (
                  <img src={app.applicant.profilePicture} alt={app.applicant.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <UserCircleIcon className="w-12 h-12 text-gray-300 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{app.applicant?.name}</h3>
                      <p className="text-gray-500 text-sm">{app.applicant?.email}</p>
                      {app.applicant?.location && (
                        <p className="text-gray-400 text-xs">{app.applicant.location}</p>
                      )}
                    </div>
                    <span className={`badge text-xs flex-shrink-0 ${statusColors[app.status]}`}>
                      {t(`application.status.${app.status}`)}
                    </span>
                  </div>

                  {/* Skills */}
                  {app.applicant?.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {app.applicant.skills.slice(0, 5).map((skill) => (
                        <span key={skill} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Cover Letter */}
                  {app.coverLetter && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 mb-1">Cover Letter</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{app.coverLetter}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-3">
                    {app.resumeUrl && (
                      <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary-600 dark:text-primary-400 text-xs hover:underline">
                        <PaperClipIcon className="w-3.5 h-3.5" />
                        View Resume
                      </a>
                    )}
                    <span className="text-gray-400 text-xs">
                      Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Status Update */}
                  <div className="flex items-center gap-2 mt-3">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app._id, e.target.value)}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'].map((s) => (
                        <option key={s} value={s}>{t(`application.status.${s}`)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplicantsPage;
