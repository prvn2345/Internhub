import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const CATEGORIES = [
  'Technology', 'Marketing', 'Finance', 'Design', 'Sales',
  'HR', 'Operations', 'Content', 'Data Science', 'Engineering',
];

const defaultForm = {
  title: '', type: 'internship', category: '', location: '',
  isRemote: false, description: '', stipend: 0, stipendType: 'fixed',
  duration: '', openings: 1, applicationDeadline: '',
  skills: [], responsibilities: [], requirements: [],
};

const PostJobPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newResp, setNewResp] = useState('');
  const [newReq, setNewReq] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addToList = (key, value, setter) => {
    if (value.trim()) {
      setForm((prev) => ({ ...prev, [key]: [...prev[key], value.trim()] }));
      setter('');
    }
  };

  const removeFromList = (key, index) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/jobs', form);
      toast.success('Job posted successfully!');
      navigate('/employer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post job');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('employer.postJob')}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Basic Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Job Title *</label>
              <input type="text" required value={form.title} onChange={(e) => update('title', e.target.value)} className="input-field" placeholder="e.g. Frontend Developer Intern" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Type *</label>
              <select value={form.type} onChange={(e) => update('type', e.target.value)} className="input-field">
                <option value="internship">Internship</option>
                <option value="job">Full-time Job</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category *</label>
              <select required value={form.category} onChange={(e) => update('category', e.target.value)} className="input-field">
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Location *</label>
              <input type="text" required value={form.location} onChange={(e) => update('location', e.target.value)} className="input-field" placeholder="e.g. Mumbai, India" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Duration *</label>
              <input type="text" required value={form.duration} onChange={(e) => update('duration', e.target.value)} className="input-field" placeholder="e.g. 3 months" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Stipend (₹/month)</label>
              <input type="number" min="0" value={form.stipend} onChange={(e) => update('stipend', Number(e.target.value))} className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Openings</label>
              <input type="number" min="1" value={form.openings} onChange={(e) => update('openings', Number(e.target.value))} className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Application Deadline *</label>
              <input type="date" required value={form.applicationDeadline} onChange={(e) => update('applicationDeadline', e.target.value)} className="input-field" min={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remote" checked={form.isRemote} onChange={(e) => update('isRemote', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
              <label htmlFor="remote" className="text-sm text-gray-700 dark:text-gray-200">Remote Position</label>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Description *</h2>
          <textarea
            required
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={6}
            className="input-field resize-none"
            placeholder="Describe the role, company culture, and what the candidate will be doing..."
          />
        </div>

        {/* Skills */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Required Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {form.skills.map((skill, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full text-sm">
                {skill}
                <button type="button" onClick={() => removeFromList('skills', i)}><TrashIcon className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList('skills', newSkill, setNewSkill))} placeholder="Add skill..." className="input-field text-sm flex-1" />
            <button type="button" onClick={() => addToList('skills', newSkill, setNewSkill)} className="btn-secondary text-sm px-3"><PlusIcon className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Responsibilities */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Responsibilities</h2>
          <ul className="space-y-2 mb-3">
            {form.responsibilities.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                <span className="flex-1">{item}</span>
                <button type="button" onClick={() => removeFromList('responsibilities', i)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input type="text" value={newResp} onChange={(e) => setNewResp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList('responsibilities', newResp, setNewResp))} placeholder="Add responsibility..." className="input-field text-sm flex-1" />
            <button type="button" onClick={() => addToList('responsibilities', newResp, setNewResp)} className="btn-secondary text-sm px-3"><PlusIcon className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Requirements */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Requirements</h2>
          <ul className="space-y-2 mb-3">
            {form.requirements.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                <span className="flex-1">{item}</span>
                <button type="button" onClick={() => removeFromList('requirements', i)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input type="text" value={newReq} onChange={(e) => setNewReq(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList('requirements', newReq, setNewReq))} placeholder="Add requirement..." className="input-field text-sm flex-1" />
            <button type="button" onClick={() => addToList('requirements', newReq, setNewReq)} className="btn-secondary text-sm px-3"><PlusIcon className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/employer/dashboard')} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 font-semibold">
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostJobPage;
