import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const DOMAIN_CATEGORIES = ['Technology', 'Marketing', 'Finance', 'Design', 'Sales', 'HR', 'Operations', 'Content', 'Data Science', 'Engineering'];

const PostJobPage = () => {
  const { t } = useTranslation();
  const router = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDraft, setFormDraft] = useState({ title: '', type: 'internship', category: '', location: '', isRemote: false, description: '', stipend: 0, stipendType: 'fixed', duration: '', openings: 1, applicationDeadline: '', skills: [], responsibilities: [], requirements: [] });
  const [inputs, setInputs] = useState({ skill: '', resp: '', req: '' });

  const patchForm = (field, val) => setFormDraft(curr => ({ ...curr, [field]: val }));
  const modifyInputs = (field, val) => setInputs(curr => ({ ...curr, [field]: val }));

  const pushToArray = (field, inputKey) => {
    const val = inputs[inputKey].trim();
    if (val) {
      setFormDraft(curr => ({ ...curr, [field]: [...curr[field], val] }));
      modifyInputs(inputKey, '');
    }
  };

  const removeFromArray = (field, targetIdx) => {
    setFormDraft(curr => ({ ...curr, [field]: curr[field].filter((_, idx) => idx !== targetIdx) }));
  };

  const deployListing = async (ev) => {
    ev.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/jobs', formDraft);
      toast.success('Opportunity successfully broadcasted!');
      router('/employer/dashboard');
    } catch (err) { toast.error(err.response?.data?.message || 'Broadcast initialization failed'); }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('employer.postJob')}</h1>
        <p className="text-gray-500 mt-1">Configure your new opportunity and publish it to the talent pool.</p>
      </div>

      <form onSubmit={deployListing} className="space-y-8">
        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 border-l-4 border-primary-500 pl-3">Core Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Designation Title *</label>
              <input type="text" required value={formDraft.title} onChange={e => patchForm('title', e.target.value)} className="input-field py-2.5" placeholder="e.g. Senior Frontend Architect" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Employment Model *</label>
              <select value={formDraft.type} onChange={e => patchForm('type', e.target.value)} className="input-field py-2.5"><option value="internship">Internship</option><option value="job">Permanent Position</option></select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Industry Domain *</label>
              <select required value={formDraft.category} onChange={e => patchForm('category', e.target.value)} className="input-field py-2.5"><option value="">Assign domain...</option>{DOMAIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Geographic Base *</label>
              <input type="text" required value={formDraft.location} onChange={e => patchForm('location', e.target.value)} className="input-field py-2.5" placeholder="e.g. Bangalore, India" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Engagement Length *</label>
              <input type="text" required value={formDraft.duration} onChange={e => patchForm('duration', e.target.value)} className="input-field py-2.5" placeholder="e.g. 6 months / Permanent" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Compensation (₹/mo)</label>
              <input type="number" min="0" value={formDraft.stipend} onChange={e => patchForm('stipend', Number(e.target.value))} className="input-field py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Available Slots</label>
              <input type="number" min="1" value={formDraft.openings} onChange={e => patchForm('openings', Number(e.target.value))} className="input-field py-2.5" />
            </div>
            <div className="md:col-span-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex items-center justify-between border border-gray-200 dark:border-gray-700">
              <div><p className="font-semibold text-gray-900 dark:text-white text-sm">Closure Deadline *</p><p className="text-xs text-gray-500 mt-0.5">Automated listing expiration date.</p></div>
              <input type="date" required value={formDraft.applicationDeadline} onChange={e => patchForm('applicationDeadline', e.target.value)} className="input-field w-auto py-2" min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input type="checkbox" checked={formDraft.isRemote} onChange={e => patchForm('isRemote', e.target.checked)} className="w-5 h-5 text-primary-600 rounded" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">This is a fully remote / telecommute opportunity</span>
              </label>
            </div>
          </div>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 border-l-4 border-primary-500 pl-3">Detailed Brief *</h2>
          <textarea required value={formDraft.description} onChange={e => patchForm('description', e.target.value)} rows={7} className="input-field resize-none py-3" placeholder="Elaborate on the opportunity scope, company culture, and expectations..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 border-t-4 border-t-blue-500">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Competency Tokens</h2>
            <div className="flex flex-wrap gap-2 mb-4">{formDraft.skills.map((s, i) => (<span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-sm font-medium">{s}<button type="button" onClick={() => removeFromArray('skills', i)} className="hover:text-red-500"><TrashIcon className="w-3.5 h-3.5" /></button></span>))}</div>
            <div className="flex gap-2"><input type="text" value={inputs.skill} onChange={e => modifyInputs('skill', e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), pushToArray('skills', 'skill'))} placeholder="Define skill..." className="input-field text-sm" /><button type="button" onClick={() => pushToArray('skills', 'skill')} className="btn-secondary px-3"><PlusIcon className="w-5 h-5" /></button></div>
          </div>
          <div className="card p-6 border-t-4 border-t-purple-500">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Key Responsibilities</h2>
            <ul className="space-y-2 mb-4">{formDraft.responsibilities.map((r, i) => (<li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" /><span className="flex-1 leading-tight">{r}</span><button type="button" onClick={() => removeFromArray('responsibilities', i)} className="text-gray-400 hover:text-red-500 shrink-0"><TrashIcon className="w-4 h-4" /></button></li>))}</ul>
            <div className="flex gap-2"><input type="text" value={inputs.resp} onChange={e => modifyInputs('resp', e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), pushToArray('responsibilities', 'resp'))} placeholder="Add duty..." className="input-field text-sm" /><button type="button" onClick={() => pushToArray('responsibilities', 'resp')} className="btn-secondary px-3"><PlusIcon className="w-5 h-5" /></button></div>
          </div>
        </div>

        <div className="card p-6 border-t-4 border-t-amber-500">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">Candidate Prerequisites</h2>
          <ul className="space-y-2 mb-4">{formDraft.requirements.map((r, i) => (<li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" /><span className="flex-1 leading-tight">{r}</span><button type="button" onClick={() => removeFromArray('requirements', i)} className="text-gray-400 hover:text-red-500 shrink-0"><TrashIcon className="w-4 h-4" /></button></li>))}</ul>
          <div className="flex gap-2"><input type="text" value={inputs.req} onChange={e => modifyInputs('req', e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), pushToArray('requirements', 'req'))} placeholder="Add requirement..." className="input-field text-sm" /><button type="button" onClick={() => pushToArray('requirements', 'req')} className="btn-secondary px-3"><PlusIcon className="w-5 h-5" /></button></div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={() => router('/employer/dashboard')} className="btn-secondary px-8 py-3">Abort Draft</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary px-10 py-3 font-bold text-lg shadow-lg hover:shadow-xl transition-all">
            {isSubmitting ? 'Transmitting...' : 'Deploy Opportunity'}
          </button>
        </div>
      </form>
    </div>
  );
};
export default PostJobPage;
