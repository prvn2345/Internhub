import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPinIcon, ClockIcon, CurrencyDollarIcon, CalendarIcon,
  UserGroupIcon, BuildingOfficeIcon, GlobeAltIcon, BookmarkIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import { PageLoader } from '../components/common/LoadingSpinner';
import ApplyModal from '../components/jobs/ApplyModal';

const JobDetailPage = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser: user, updateUser, accessToken: token } = useAuthStore();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const isSaved = user?.savedJobs?.includes(id);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const { data } = await api.get(`/jobs/${id}`);
        setJob(data.job);
      } catch (_) {
        navigate('/jobs');
      }
      setLoading(false);
    };
    fetchJob();
  }, [id, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!token) { toast.error('Please login to save jobs'); return; }
    try {
      const { data } = await api.post(`/users/saved-jobs/${id}`);
      updateUser({ savedJobs: data.savedJobs });
      toast.success(data.message);
    } catch (_) { toast.error('Failed to save job'); }
  };

  const handleApplySuccess = () => {
    setHasApplied(true);
    setShowApplyModal(false);
    toast.success('Application submitted successfully!');
  };

  if (loading) return <PageLoader />;
  if (!job) return null;

  const deadlinePassed = new Date(job.applicationDeadline) < new Date();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="card p-6">
            <div className="flex items-start gap-4">
              {job.companyLogo ? (
                <img src={job.companyLogo} alt={job.company} className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <BuildingOfficeIcon className="w-8 h-8 text-primary-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
                <p className="text-gray-600 dark:text-gray-400 font-medium">{job.company}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`badge ${job.type === 'internship' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {job.type === 'internship' ? t('jobs.internship') : t('jobs.job')}
                  </span>
                  {job.isRemote && <span className="badge bg-purple-100 text-purple-700">Remote</span>}
                  <span className={`badge ${job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {job.status}
                  </span>
                </div>
              </div>
              <button onClick={handleSave} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Save job">
                {isSaved ? <BookmarkSolidIcon className="w-6 h-6 text-primary-600" /> : <BookmarkIcon className="w-6 h-6 text-gray-400" />}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              {[
                { icon: MapPinIcon, label: job.isRemote ? 'Remote' : job.location },
                { icon: ClockIcon, label: job.duration },
                { icon: CurrencyDollarIcon, label: job.stipend > 0 ? `₹${job.stipend.toLocaleString()}/mo` : 'Unpaid' },
                { icon: UserGroupIcon, label: `${job.openings} opening${job.openings > 1 ? 's' : ''}` },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Icon className="w-4 h-4 text-primary-500 flex-shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">About the Role</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{job.description}</p>
          </div>

          {/* Responsibilities */}
          {job.responsibilities?.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Responsibilities</h2>
              <ul className="space-y-2">
                {job.responsibilities.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {job.requirements?.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requirements</h2>
              <ul className="space-y-2">
                {job.requirements.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills & Match Score */}
          {job.skills?.length > 0 && (() => {
            const calculateMatchScore = () => {
              if (!user?.skills?.length) return 0;
              const userSkillsLower = user.skills.map(s => s.toLowerCase());
              let matches = 0;
              job.skills.forEach(skill => {
                if (userSkillsLower.includes(skill.toLowerCase())) matches++;
              });
              return Math.round((matches / job.skills.length) * 100);
            };
            const matchScore = calculateMatchScore();
            
            return (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Skills Required</h2>
                  {user?.role === 'student' && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${matchScore >= 70 ? 'bg-green-500' : matchScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${matchScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{matchScore}% Match</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => {
                    const hasSkill = user?.skills?.some(s => s.toLowerCase() === skill.toLowerCase());
                    return (
                      <span 
                        key={skill} 
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border
                          ${hasSkill 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' 
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                          }`}
                      >
                        {hasSkill ? '✓ ' : ''}{skill}
                      </span>
                    );
                  })}
                </div>
                {user?.role === 'student' && matchScore < 100 && (
                  <p className="text-xs text-gray-500 mt-4">
                    Update your <Link to="/profile" className="text-primary-600 hover:underline">profile skills</Link> to increase your match score.
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Apply Card */}
          <div className="card p-5 sticky top-20">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <CalendarIcon className="w-4 h-4" />
              <span className={deadlinePassed ? 'text-red-500' : ''}>
                {t('jobs.deadline')}: {new Date(job.applicationDeadline).toLocaleDateString()}
              </span>
            </div>

            {!token ? (
              <div className="space-y-2">
                <Link to="/login" className="btn-primary w-full text-center block py-3">
                  Login to Apply
                </Link>
                <Link to="/register" className="btn-secondary w-full text-center block py-3 text-sm">
                  Create Account
                </Link>
              </div>
            ) : user?.role === 'student' ? (
              hasApplied ? (
                <div className="text-center py-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-green-700 dark:text-green-400 font-medium text-sm">
                    ✓ {t('application.alreadyApplied')}
                  </p>
                </div>
              ) : deadlinePassed ? (
                <div className="text-center py-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-red-600 text-sm font-medium">Application deadline passed</p>
                </div>
              ) : job.status !== 'active' ? (
                <div className="text-center py-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-gray-500 text-sm">This position is closed</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="btn-primary w-full py-3 font-semibold"
                >
                  {t('jobs.apply')}
                </button>
              )
            ) : null}

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 space-y-1">
              <p>{job.applicationsCount} applications</p>
              <p>{job.views} views</p>
            </div>
          </div>

          {/* Company Info */}
          {job.employer && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">About the Company</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{job.employer.companyName}</p>
              {job.employer.industry && (
                <p className="text-xs text-gray-500">{job.employer.industry}</p>
              )}
              {job.employer.companyWebsite && (
                <a
                  href={job.employer.companyWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary-600 dark:text-primary-400 text-xs mt-2 hover:underline"
                >
                  <GlobeAltIcon className="w-3.5 h-3.5" />
                  Visit Website
                </a>
              )}
              {job.employer.companyDescription && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed line-clamp-4">
                  {job.employer.companyDescription}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {showApplyModal && (
        <ApplyModal
          job={job}
          onSuccess={handleApplySuccess}
          onClose={() => setShowApplyModal(false)}
        />
      )}
    </div>
  );
};

export default JobDetailPage;
