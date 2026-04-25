import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PageLoader } from '../../components/common/LoadingSpinner';

const CATEGORIES = [
  'Technology', 'Marketing', 'Finance', 'Design', 'Sales',
  'HR', 'Operations', 'Content', 'Data Science', 'Engineering',
];

const EditJobPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/jobs/${id}`);
        const job = data.job;
        setForm({
          title: job.title, type: job.type, category: job.category,
          location: job.location, isRemote: job.isRemote, description: job.description,
          stipend: job.stipend, duration: job.duration, openings: job.openings,
          applicationDeadline: job.applicationDeadline?.split('T')[0] || '',
          skills: job.skills || [], responsibilities: job.responsibilities || [],
          requirements: job.requirements || [], status: job.status,
        });
      } catch (_) { navigate('/employer/dashboard'); }
      setLoading(false);
    };
    fetch();
  }, [id, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/jobs/${id}`, form);
      toast.success('Job updated!');
      navigate('/employer/dashboard');
    } catch (_) {
      toast.error('Failed to update job');
    }
    setSaving(false);
  };

  if (loading || !form) return <PageLoader />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Job</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Job Title</label>
              <input type="text" required value={form.title} onChange={(e) => update('title', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Status</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value)} className="input-field">
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category</label>
              <select value={form.category} onChange={(e) => update('category', e.target.value)} className="input-field">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Location</label>
              <input type="text" value={form.location} onChange={(e) => update('location', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Duration</label>
              <input type="text" value={form.duration} onChange={(e) => update('duration', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Stipend (₹/month)</label>
              <input type="number" min="0" value={form.stipend} onChange={(e) => update('stipend', Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Application Deadline</label>
              <input type="date" value={form.applicationDeadline} onChange={(e) => update('applicationDeadline', e.target.value)} className="input-field" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Description</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={6} className="input-field resize-none" />
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {form.skills.map((skill, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full text-sm">
                {skill}
                <button type="button" onClick={() => update('skills', form.skills.filter((_, idx) => idx !== i))}><TrashIcon className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newSkill.trim()) { update('skills', [...form.skills, newSkill.trim()]); setNewSkill(''); } } }} placeholder="Add skill..." className="input-field text-sm flex-1" />
            <button type="button" onClick={() => { if (newSkill.trim()) { update('skills', [...form.skills, newSkill.trim()]); setNewSkill(''); } }} className="btn-secondary text-sm px-3"><PlusIcon className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/employer/dashboard')} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 font-semibold">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditJobPage;
