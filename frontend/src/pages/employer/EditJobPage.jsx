import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PageLoader } from '../../components/common/LoadingSpinner';

const VALID_DOMAINS = ['Technology', 'Marketing', 'Finance', 'Design', 'Sales', 'HR', 'Operations', 'Content', 'Data Science', 'Engineering'];

const EditJobPage = () => {
  const { id: jobId } = useParams();
  const router = useNavigate();
  const [jobData, setJobData] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    const fetchExistingJob = async () => {
      try {
        const { data } = await api.get(`/jobs/${jobId}`);
        const sourceJob = data.job;
        setJobData({
          title: sourceJob.title, type: sourceJob.type, category: sourceJob.category, location: sourceJob.location, isRemote: sourceJob.isRemote,
          description: sourceJob.description, stipend: sourceJob.stipend, duration: sourceJob.duration, openings: sourceJob.openings,
          applicationDeadline: sourceJob.applicationDeadline?.split('T')[0] || '', skills: sourceJob.skills || [], responsibilities: sourceJob.responsibilities || [],
          requirements: sourceJob.requirements || [], status: sourceJob.status,
        });
      } catch (err) { router('/employer/dashboard'); }
      setIsInitializing(false);
    };
    fetchExistingJob();
  }, [jobId, router]);

  const modifyField = (field, val) => setJobData(prev => ({ ...prev, [field]: val }));

  const pushModifications = async (ev) => {
    ev.preventDefault();
    setIsCommitting(true);
    try {
      await api.put(`/jobs/${jobId}`, jobData);
      toast.success('Opportunity configuration updated');
      router('/employer/dashboard');
    } catch (err) { toast.error('Failed to sync updates'); }
    setIsCommitting(false);
  };

  if (isInitializing || !jobData) return <PageLoader />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">Modify Opportunity</h1>

      <form onSubmit={pushModifications} className="space-y-8">
        <div className="card p-8 space-y-5 border-t-4 border-t-primary-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Designation Title</label>
              <input type="text" required value={jobData.title} onChange={e => modifyField('title', e.target.value)} className="input-field py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Current State</label>
              <select value={jobData.status} onChange={e => modifyField('status', e.target.value)} className="input-field py-2.5 bg-gray-50 dark:bg-gray-800">
                <option value="active">Live & Accepting</option><option value="closed">Halted / Closed</option><option value="draft">Draft Mode</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Industry Domain</label>
              <select value={jobData.category} onChange={e => modifyField('category', e.target.value)} className="input-field py-2.5">
                {VALID_DOMAINS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Geographic Base</label>
              <input type="text" value={jobData.location} onChange={e => modifyField('location', e.target.value)} className="input-field py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Engagement Length</label>
              <input type="text" value={jobData.duration} onChange={e => modifyField('duration', e.target.value)} className="input-field py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Compensation (₹/mo)</label>
              <input type="number" min="0" value={jobData.stipend} onChange={e => modifyField('stipend', Number(e.target.value))} className="input-field py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Closure Deadline</label>
              <input type="date" value={jobData.applicationDeadline} onChange={e => modifyField('applicationDeadline', e.target.value)} className="input-field py-2.5" />
            </div>
          </div>
        </div>

        <div className="card p-8 border-t-4 border-t-blue-500">
          <label className="block text-base font-bold text-gray-900 dark:text-white mb-3">Detailed Brief</label>
          <textarea value={jobData.description} onChange={e => modifyField('description', e.target.value)} rows={7} className="input-field resize-none py-3" />
        </div>

        <div className="card p-8 border-t-4 border-t-purple-500">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">Competency Tokens</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {jobData.skills.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg text-sm font-medium">
                {s} <button type="button" onClick={() => modifyField('skills', jobData.skills.filter((_, idx) => idx !== i))} className="hover:text-red-500"><TrashIcon className="w-3.5 h-3.5" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (skillInput.trim()) { modifyField('skills', [...jobData.skills, skillInput.trim()]); setSkillInput(''); } } }} placeholder="Define skill..." className="input-field text-sm flex-1" />
            <button type="button" onClick={() => { if (skillInput.trim()) { modifyField('skills', [...jobData.skills, skillInput.trim()]); setSkillInput(''); } }} className="btn-secondary px-4"><PlusIcon className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={() => router('/employer/dashboard')} className="btn-secondary px-8 py-3 font-semibold">Discard Modifications</button>
          <button type="submit" disabled={isCommitting} className="btn-primary px-10 py-3 font-bold text-lg shadow-md hover:shadow-lg transition-all">
            {isCommitting ? 'Syncing Nodes...' : 'Commit Updates'}
          </button>
        </div>
      </form>
    </div>
  );
};
export default EditJobPage;
