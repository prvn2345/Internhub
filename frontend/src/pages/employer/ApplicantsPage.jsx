import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCircleIcon, PaperClipIcon, ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PageLoader } from '../../components/common/LoadingSpinner';

const THEME_MAP = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800',
  reviewed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800',
  shortlisted: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800',
  rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800',
  hired: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800',
};

const ApplicantsPage = () => {
  const { jobId } = useParams();
  const { t } = useTranslation();
  const [candidateList, setCandidateList] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [listingName, setListingName] = useState('');

  useEffect(() => {
    const pullData = async () => {
      try {
        const [candidatesReq, listingReq] = await Promise.all([
          api.get(`/applications/job/${jobId}`),
          api.get(`/jobs/${jobId}`)
        ]);
        setCandidateList(candidatesReq.data.applications);
        setListingName(listingReq.data.job.title);
      } catch (err) { console.error('Failed to load candidate roster'); }
      setIsInitializing(false);
    };
    pullData();
  }, [jobId]);

  const updateCandidateState = async (candidateId, newState, notes) => {
    try {
      const { data } = await api.put(`/applications/${candidateId}/status`, { status: newState, employerNotes: notes });
      setCandidateList(candidateList.map(c => c._id === candidateId ? { ...c, status: data.application.status } : c));
      toast.success('Candidate progression updated');
    } catch (err) { toast.error('State update failed'); }
  };

  if (isInitializing) return <PageLoader />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <Link to="/employer/dashboard" className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"><ArrowLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" /></Link>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">{t('employer.applicants')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-0.5">{listingName} <span className="mx-1">•</span> <span className="text-primary-600">{candidateList.length} Active Candidates</span></p>
        </div>
      </div>

      {candidateList.length === 0 ? (
        <div className="card p-16 text-center border-dashed border-2">
          <UserCircleIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">The candidate pool is currently empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {candidateList.map((record) => (
            <div key={record._id} className="card p-6 flex flex-col hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                {record.applicant?.profilePicture ? (
                  <img src={record.applicant.profilePicture} alt="Avatar" className="w-14 h-14 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <UserCircleIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{record.applicant?.name || 'Unknown Candidate'}</h3>
                      <p className="text-primary-600 dark:text-primary-400 text-sm font-medium">{record.applicant?.email}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${THEME_MAP[record.status]}`}>{t(`application.status.${record.status}`).toUpperCase()}</span>
                  </div>
                  {record.applicant?.location && <p className="text-gray-500 text-xs mt-1 font-medium">{record.applicant.location}</p>}
                </div>
              </div>

              {record.applicant?.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {record.applicant.skills.slice(0, 6).map((sk) => (
                    <span key={sk} className="px-2 py-1 bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-md text-xs font-semibold">{sk}</span>
                  ))}
                  {record.applicant.skills.length > 6 && <span className="px-2 py-1 text-gray-400 text-xs">+{record.applicant.skills.length - 6} more</span>}
                </div>
              )}

              {record.coverLetter && (
                <div className="mb-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex-1">
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-400 mb-1.5">Abstract / Motivation</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic line-clamp-4 leading-relaxed">"{record.coverLetter}"</p>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  {record.resumeUrl ? (
                    <a href={record.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 text-sm font-bold bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg transition-colors"><PaperClipIcon className="w-4 h-4" /> Inspect CV</a>
                  ) : <span className="text-gray-400 text-xs italic">No document attached</span>}
                  <span className="flex items-center gap-1 text-gray-400 text-xs font-medium"><ClockIcon className="w-3.5 h-3.5" /> Subm: {new Date(record.appliedAt).toLocaleDateString('en-GB')}</span>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 pl-2">State:</span>
                  <select value={record.status} onChange={(e) => updateCandidateState(record._id, e.target.value)} className="text-sm font-semibold border-none bg-transparent focus:ring-0 text-gray-900 dark:text-white cursor-pointer py-1 pr-6">
                    {['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'].map(s => <option key={s} value={s}>{t(`application.status.${s}`)}</option>)}
                  </select>
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
