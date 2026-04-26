import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon, PencilIcon, PaperClipIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { currentUser: user, updateUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  // Change password state
  const [pwForm, setPwForm]         = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw]         = useState({ current: false, next: false, confirm: false });
  const [savingPw, setSavingPw]     = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    bio: user?.bio || '',
    skills: user?.skills || [],
    education: user?.education || [],
    experience: user?.experience || [],
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile', form);
      updateUser(data.user);
      setEditing(false);
      toast.success(t('common.success'));
    } catch (_) {
      toast.error(t('common.error'));
    }
    setSaving(false);
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) return;
    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      const { data } = await api.post('/users/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ resumeUrl: data.resumeUrl });
      setResumeFile(null);
      toast.success('Resume uploaded!');
    } catch (_) {
      toast.error('Failed to upload resume');
    }
    setUploadingResume(false);
  };

  const addSkill = () => {
    if (newSkill.trim() && !form.skills.includes(newSkill.trim())) {
      setForm({ ...form, skills: [...form.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill) => {
    setForm({ ...form, skills: form.skills.filter((s) => s !== skill) });
  };

  const addEducation = () => {
    setForm({
      ...form,
      education: [...form.education, { degree: '', institution: '', year: '', percentage: '' }],
    });
  };

  const updateEducation = (index, field, value) => {
    const updated = [...form.education];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, education: updated });
  };

  const removeEducation = (index) => {
    setForm({ ...form, education: form.education.filter((_, i) => i !== index) });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      await api.put('/users/change-password', {
        currentPassword: pwForm.current,
        newPassword    : pwForm.next,
      });
      toast.success('Password changed successfully!');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
    setSavingPw(false);
  };

  const pwStrength = (pw) => {
    if (!pw) return null;
    if (pw.length < 6)  return { label: 'Too short', color: 'bg-red-500',    w: 'w-1/4' };
    if (pw.length < 8)  return { label: 'Weak',      color: 'bg-orange-400', w: 'w-2/4' };
    if (pw.length < 12) return { label: 'Good',      color: 'bg-yellow-400', w: 'w-3/4' };
    return               { label: 'Strong',    color: 'bg-green-500',  w: 'w-full' };
  };
  const strength = pwStrength(pwForm.next);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <PencilIcon className="w-4 h-4" />
            {t('profile.edit')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm">{t('profile.cancel')}</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving...' : t('profile.save')}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: t('auth.name'), key: 'name', type: 'text' },
              { label: t('profile.phone'), key: 'phone', type: 'tel' },
              { label: t('profile.location'), key: 'location', type: 'text' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                {editing ? (
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="input-field text-sm"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white text-sm">{user?.[key] || '—'}</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.bio')}</label>
            {editing ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                className="input-field text-sm resize-none"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-gray-900 dark:text-white text-sm">{user?.bio || '—'}</p>
            )}
          </div>
        </div>

        {/* Resume */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('profile.resume')}</h2>
          {user?.resumeUrl ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-3">
              <PaperClipIcon className="w-5 h-5 text-green-600" />
              <a href={user.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 dark:text-green-400 text-sm hover:underline">
                View Current Resume
              </a>
            </div>
          ) : (
            <p className="text-gray-400 text-sm mb-3">No resume uploaded</p>
          )}
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files[0])}
              className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {resumeFile && (
              <button onClick={handleResumeUpload} disabled={uploadingResume} className="btn-primary text-sm py-1.5">
                {uploadingResume ? 'Uploading...' : t('profile.uploadResume')}
              </button>
            )}
          </div>
        </div>

        {/* Skills */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('profile.skills')}</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {(editing ? form.skills : user?.skills || []).map((skill) => (
              <span key={skill} className="flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full text-sm">
                {skill}
                {editing && (
                  <button onClick={() => removeSkill(skill)} className="hover:text-red-500">
                    <TrashIcon className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {editing && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Add a skill..."
                className="input-field text-sm flex-1"
              />
              <button onClick={addSkill} className="btn-primary text-sm px-3">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Education */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('profile.education')}</h2>
            {editing && (
              <button onClick={addEducation} className="btn-secondary text-xs flex items-center gap-1">
                <PlusIcon className="w-3.5 h-3.5" />
                {t('profile.addEducation')}
              </button>
            )}
          </div>
          {(editing ? form.education : user?.education || []).length === 0 ? (
            <p className="text-gray-400 text-sm">No education added</p>
          ) : (
            <div className="space-y-4">
              {(editing ? form.education : user?.education || []).map((edu, i) => (
                <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {editing ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Degree', key: 'degree' },
                        { label: 'Institution', key: 'institution' },
                        { label: 'Year', key: 'year' },
                        { label: 'Percentage/CGPA', key: 'percentage' },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-500 mb-1">{label}</label>
                          <input
                            type="text"
                            value={edu[key]}
                            onChange={(e) => updateEducation(i, key, e.target.value)}
                            className="input-field text-sm"
                          />
                        </div>
                      ))}
                      <button onClick={() => removeEducation(i)} className="col-span-2 text-red-500 text-xs hover:underline text-left">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{edu.degree}</p>
                      <p className="text-gray-500 text-xs">{edu.institution} • {edu.year}</p>
                      {edu.percentage && <p className="text-gray-400 text-xs">{edu.percentage}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Change Password ── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <LockClosedIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Change Password</h2>
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-xs mb-5">
            Use this section to replace your auto-generated password with one of your own.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current password */}
            {[
              { label: 'Current Password',     key: 'current',  placeholder: 'Enter current password'  },
              { label: 'New Password',          key: 'next',     placeholder: 'Min. 6 characters'       },
              { label: 'Confirm New Password',  key: 'confirm',  placeholder: 'Re-enter new password'   },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {label}
                </label>
                <div className="relative">
                  <input
                    type={showPw[key] ? 'text' : 'password'}
                    value={pwForm[key]}
                    onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                    placeholder={placeholder}
                    className={`input-field text-sm pr-10 ${
                      key === 'confirm' && pwForm.confirm && pwForm.next !== pwForm.confirm
                        ? 'border-red-400 focus:ring-red-400'
                        : key === 'confirm' && pwForm.confirm && pwForm.next === pwForm.confirm
                        ? 'border-green-400 focus:ring-green-400'
                        : ''
                    }`}
                    autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw({ ...showPw, [key]: !showPw[key] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Toggle visibility"
                  >
                    {showPw[key]
                      ? <EyeSlashIcon className="w-4 h-4" />
                      : <EyeIcon      className="w-4 h-4" />
                    }
                  </button>
                </div>

                {/* Strength bar for new password */}
                {key === 'next' && pwForm.next && strength && (
                  <div className="mt-1.5">
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strength.color} ${strength.w}`} />
                    </div>
                    <p className={`text-xs mt-0.5 ${
                      strength.label === 'Strong' ? 'text-green-600' :
                      strength.label === 'Good'   ? 'text-yellow-600' : 'text-red-500'
                    }`}>{strength.label}</p>
                  </div>
                )}

                {/* Match indicator */}
                {key === 'confirm' && pwForm.confirm && (
                  <p className={`text-xs mt-0.5 ${pwForm.next === pwForm.confirm ? 'text-green-600' : 'text-red-500'}`}>
                    {pwForm.next === pwForm.confirm ? '✓ Passwords match' : 'Passwords do not match'}
                  </p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={
                savingPw ||
                !pwForm.current ||
                pwForm.next.length < 6 ||
                pwForm.next !== pwForm.confirm
              }
              className="btn-primary text-sm py-2.5 px-6"
            >
              {savingPw ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
