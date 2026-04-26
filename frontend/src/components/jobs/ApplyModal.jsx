import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

const ApplyModal = ({ job, onSuccess, onClose }) => {
  const { t } = useTranslation();
  const { currentUser: user } = useAuthStore();
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('coverLetter', coverLetter);
      if (resumeFile) formData.append('resume', resumeFile);

      await api.post(`/applications/${job._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSuccess();
    } catch (error) {
      const res = error.response?.data;
      if (res?.subscriptionLimit) {
        toast.error(res.message, { duration: 6000 });
        // Show upgrade prompt
        if (window.confirm(`${res.message}\n\nWould you like to upgrade your plan?`)) {
          window.location.href = '/plans';
        }
      } else {
        toast.error(res?.message || 'Failed to submit application');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
          <XMarkIcon className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Apply for Position</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          {job.title} at {job.company}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Resume */}
          {user?.resumeUrl && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
              <PaperClipIcon className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">Profile resume will be used</span>
            </div>
          )}

          {/* Resume Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t('application.uploadResume')}
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-400"
            />
          </div>

          {/* Cover Letter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t('application.coverLetter')}
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder={t('application.coverLetterPlaceholder')}
              rows={5}
              maxLength={2000}
              className="input-field resize-none text-sm"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{coverLetter.length}/2000</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Submitting...' : t('application.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyModal;
