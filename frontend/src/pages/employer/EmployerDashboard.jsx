import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BriefcaseIcon, UserGroupIcon, PlusIcon, PencilIcon, TrashIcon, EyeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { PageLoader } from '../../components/common/LoadingSpinner';

const EmployerDashboard = () => {
  const { t } = useTranslation();
  const { currentUser: activeManager } = useAuthStore();
  const [activeListings, setActiveListings] = useState([]);
  const [isFetchingData, setIsFetchingData] = useState(true);

  const retrieveEmployerListings = async () => {
    try {
      const response = await api.get('/jobs/employer/my-jobs');
      setActiveListings(response.data.jobs);
    } catch (err) { console.error('Error fetching listings'); }
    setIsFetchingData(false);
  };

  useEffect(() => { retrieveEmployerListings(); }, []);

  const triggerDelete = async (recordId) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await api.delete(`/jobs/${recordId}`);
      setActiveListings(activeListings.filter((jobNode) => jobNode._id !== recordId));
      toast.success('Listing permanently removed');
    } catch (err) { toast.error('Removal sequence failed'); }
  };

  const toggleListingState = async (jobNode) => {
    const desiredState = jobNode.status === 'active' ? 'closed' : 'active';
    try {
      await api.put(`/jobs/${jobNode._id}`, { status: desiredState });
      setActiveListings(activeListings.map((j) => j._id === jobNode._id ? { ...j, status: desiredState } : j));
      toast.success(`Listing is now ${desiredState}`);
    } catch (err) { toast.error('Status modification failed'); }
  };

  const metrics = {
    aggregate: activeListings.length,
    live: activeListings.filter((j) => j.status === 'active').length,
    candidates: activeListings.reduce((total, j) => total + (j.applicationsCount || 0), 0),
  };

  if (isFetchingData) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('employer.dashboard')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{activeManager?.companyName}</p>
        </div>
        <Link to="/employer/post-job" className="btn-primary flex items-center gap-2 text-sm">
          <PlusIcon className="w-4 h-4" /> {t('employer.postJob')}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { text: t('employer.totalListings'), num: metrics.aggregate, Glyph: BriefcaseIcon, themeText: 'text-primary-600', themeBg: 'bg-primary-50 dark:bg-primary-900/20' },
          { text: t('employer.activeListings'), num: metrics.live, Glyph: CheckCircleIcon, themeText: 'text-green-600', themeBg: 'bg-green-50 dark:bg-green-900/20' },
          { text: t('employer.totalApplicants'), num: metrics.candidates, Glyph: UserGroupIcon, themeText: 'text-blue-600', themeBg: 'bg-blue-50 dark:bg-blue-900/20' },
        ].map(({ text, num, Glyph, themeText, themeBg }) => (
          <div key={text} className={`card p-6 ${themeBg}`}>
            <div className="flex items-center gap-4">
              <Glyph className={`w-9 h-9 ${themeText}`} />
              <div>
                <p className={`text-3xl font-bold ${themeText}`}>{num}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">{text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">{t('employer.myListings')}</h2>

      {activeListings.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2">
          <BriefcaseIcon className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-5">{t('employer.noListings')}</p>
          <Link to="/employer/post-job" className="btn-primary inline-flex text-sm py-2.5 px-6">
            {t('employer.postJob')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {activeListings.map((jobData) => (
            <div key={jobData._id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{jobData.title}</h3>
                    <span className={`badge text-xs font-semibold ${jobData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{jobData.status.toUpperCase()}</span>
                    <span className="badge text-xs font-semibold bg-blue-100 text-blue-700">{jobData.type.toUpperCase()}</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{jobData.location}</span> • {jobData.duration} • <span className="text-primary-600 font-semibold">{jobData.applicationsCount || 0} applicants</span>
                  </p>
                  <p className="text-gray-400 text-xs">
                    Closure Date: {new Date(jobData.applicationDeadline).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700">
                  <Link to={`/employer/applicants/${jobData._id}`} className="p-2 rounded-lg text-blue-600 hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all" title="Inspect Candidates"><EyeIcon className="w-5 h-5" /></Link>
                  <Link to={`/employer/edit-job/${jobData._id}`} className="p-2 rounded-lg text-gray-600 hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all" title="Modify Details"><PencilIcon className="w-5 h-5" /></Link>
                  <button onClick={() => toggleListingState(jobData)} className={`p-2 rounded-lg shadow-sm transition-all ${jobData.status === 'active' ? 'text-amber-600 hover:bg-white dark:hover:bg-gray-700' : 'text-green-600 hover:bg-white dark:hover:bg-gray-700'}`} title={jobData.status === 'active' ? 'Halt Listing' : 'Publish Listing'}><CheckCircleIcon className="w-5 h-5" /></button>
                  <button onClick={() => triggerDelete(jobData._id)} className="p-2 rounded-lg text-red-500 hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all" title="Purge Record"><TrashIcon className="w-5 h-5" /></button>
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
