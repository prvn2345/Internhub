import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon, PencilIcon, PaperClipIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ComputerDesktopIcon, DevicePhoneMobileIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { currentUser: studentData, updateUser: syncUser } = useAuthStore();
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [isCommiting, setIsCommiting] = useState(false);
  const [tempSkill, setTempSkill] = useState('');
  const [cvDocument, setCvDocument] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [fetchingLogs, setFetchingLogs] = useState(false);

  const [securityForm, setSecurityForm] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [passwordReveal, setPasswordReveal] = useState({ old: false, new: false, confirm: false });
  const [isSecuring, setIsSecuring] = useState(false);

  const [profileDraft, setProfileDraft] = useState({
    name: studentData?.name || '', phone: studentData?.phone || '', location: studentData?.location || '', bio: studentData?.bio || '',
    skills: studentData?.skills || [], education: studentData?.education || [], experience: studentData?.experience || [],
  });

  useEffect(() => {
    const fetchTelemetry = async () => {
      setFetchingLogs(true);
      try { const { data } = await api.get('/auth/login-history'); setSessionLogs(data.history || []); } 
      catch (err) { console.error('Telemetry error'); } 
      finally { setFetchingLogs(false); }
    };
    fetchTelemetry();
  }, []);

  const commitProfileChanges = async () => {
    setIsCommiting(true);
    try {
      const response = await api.put('/users/profile', profileDraft);
      syncUser(response.data.user); setIsUpdateMode(false); toast.success('Profile successfully refreshed');
    } catch (err) { toast.error('Profile synchronization failed'); } 
    finally { setIsCommiting(false); }
  };

  const uploadResumeDocument = async () => {
    if (!cvDocument) return;
    setIsUploading(true);
    try {
      const payload = new FormData(); payload.append('resume', cvDocument);
      const req = await api.post('/users/resume', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      syncUser({ resumeUrl: req.data.resumeUrl }); setCvDocument(null); toast.success('Document uploaded to cloud');
    } catch (err) { toast.error('Document transfer failed'); } 
    finally { setIsUploading(false); }
  };

  const insertSkill = () => {
    const trimmed = tempSkill.trim();
    if (trimmed && !profileDraft.skills.includes(trimmed)) {
      setProfileDraft({ ...profileDraft, skills: [...profileDraft.skills, trimmed] }); setTempSkill('');
    }
  };
  const deleteSkill = (target) => { setProfileDraft({ ...profileDraft, skills: profileDraft.skills.filter((s) => s !== target) }); };

  const insertEducation = () => { setProfileDraft({ ...profileDraft, education: [...profileDraft.education, { degree: '', institution: '', year: '', percentage: '' }] }); };
  const modifyEducation = (idx, key, val) => { const block = [...profileDraft.education]; block[idx] = { ...block[idx], [key]: val }; setProfileDraft({ ...profileDraft, education: block }); };
  const deleteEducation = (idx) => { setProfileDraft({ ...profileDraft, education: profileDraft.education.filter((_, i) => i !== idx) }); };

  const commitPasswordChange = async (ev) => {
    ev.preventDefault();
    if (securityForm.newPass.length < 6) { toast.error('Security standard requires 6+ chars'); return; }
    if (securityForm.newPass !== securityForm.confirmPass) { toast.error('Confirmation mismatch'); return; }
    setIsSecuring(true);
    try {
      await api.put('/users/change-password', { currentPassword: securityForm.oldPass, newPassword: securityForm.newPass });
      toast.success('Security credentials updated'); setSecurityForm({ oldPass: '', newPass: '', confirmPass: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Security update rejected'); } 
    finally { setIsSecuring(false); }
  };

  const evaluateStrength = (key) => {
    if (!key) return null;
    if (key.length < 6) return { msg: 'Vulnerable', class: 'bg-red-500', width: 'w-1/4' };
    if (key.length < 8) return { msg: 'Basic', class: 'bg-orange-400', width: 'w-2/4' };
    if (key.length < 12) return { msg: 'Optimal', class: 'bg-yellow-400', width: 'w-3/4' };
    return { msg: 'Fortified', class: 'bg-green-500', width: 'w-full' };
  };
  const pwRating = evaluateStrength(securityForm.newPass);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Configuration</h1>
        {!isUpdateMode ? (
          <button onClick={() => setIsUpdateMode(true)} className="btn-secondary flex items-center gap-2 text-sm"><PencilIcon className="w-4 h-4" /> Edit Configuration</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setIsUpdateMode(false)} className="btn-secondary text-sm">Discard</button>
            <button onClick={commitProfileChanges} disabled={isCommiting} className="btn-primary text-sm">{isCommiting ? 'Syncing...' : 'Commit Changes'}</button>
          </div>
        )}
      </div>
      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Core Identifiers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[{ title: 'Legal Name', ref: 'name', format: 'text' }, { title: 'Contact Number', ref: 'phone', format: 'tel' }, { title: 'Geographic Area', ref: 'location', format: 'text' }].map(({ title, ref, format }) => (
              <div key={ref}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</label>
                {isUpdateMode ? <input type={format} value={profileDraft[ref]} onChange={(ev) => setProfileDraft({ ...profileDraft, [ref]: ev.target.value })} className="input-field text-sm" /> : <p className="text-gray-900 dark:text-white text-sm">{studentData?.[ref] || '—'}</p>}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Professional Abstract</label>
            {isUpdateMode ? <textarea value={profileDraft.bio} onChange={(ev) => setProfileDraft({ ...profileDraft, bio: ev.target.value })} rows={3} className="input-field text-sm resize-none" placeholder="Provide a summary of your professional journey..." /> : <p className="text-gray-900 dark:text-white text-sm">{studentData?.bio || '—'}</p>}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Document Storage</h2>
          {studentData?.resumeUrl ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-3">
              <PaperClipIcon className="w-5 h-5 text-green-600" />
              <a href={studentData.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 dark:text-green-400 text-sm hover:underline">Access Attached Resume</a>
            </div>
          ) : (<p className="text-gray-400 text-sm mb-3">Cloud storage empty</p>)}
          <div className="flex items-center gap-3">
            <input type="file" accept=".pdf,.doc,.docx" onChange={(ev) => setCvDocument(ev.target.files[0])} className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
            {cvDocument && <button onClick={uploadResumeDocument} disabled={isUploading} className="btn-primary text-sm py-1.5">{isUploading ? 'Transmitting...' : 'Upload Document'}</button>}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Technical Competencies</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {(isUpdateMode ? profileDraft.skills : studentData?.skills || []).map((term) => (
              <span key={term} className="flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full text-sm">
                {term}
                {isUpdateMode && <button onClick={() => deleteSkill(term)} className="hover:text-red-500"><TrashIcon className="w-3 h-3" /></button>}
              </span>
            ))}
          </div>
          {isUpdateMode && (
            <div className="flex gap-2">
              <input type="text" value={tempSkill} onChange={(ev) => setTempSkill(ev.target.value)} onKeyDown={(ev) => ev.key === 'Enter' && (ev.preventDefault(), insertSkill())} placeholder="Declare competency..." className="input-field text-sm flex-1" />
              <button onClick={insertSkill} className="btn-primary text-sm px-3"><PlusIcon className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Academic History</h2>
            {isUpdateMode && <button onClick={insertEducation} className="btn-secondary text-xs flex items-center gap-1"><PlusIcon className="w-3.5 h-3.5" /> Append Record</button>}
          </div>
          {(isUpdateMode ? profileDraft.education : studentData?.education || []).length === 0 ? (
            <p className="text-gray-400 text-sm">No academic data declared</p>
          ) : (
            <div className="space-y-4">
              {(isUpdateMode ? profileDraft.education : studentData?.education || []).map((eduItem, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {isUpdateMode ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[{ tag: 'Certification/Degree', id: 'degree' }, { tag: 'Academic Body', id: 'institution' }, { tag: 'Graduation Year', id: 'year' }, { tag: 'Metric (CGPA/%)', id: 'percentage' }].map(({ tag, id }) => (
                        <div key={id}>
                          <label className="block text-xs text-gray-500 mb-1">{tag}</label>
                          <input type="text" value={eduItem[id]} onChange={(ev) => modifyEducation(idx, id, ev.target.value)} className="input-field text-sm" />
                        </div>
                      ))}
                      <button onClick={() => deleteEducation(idx)} className="col-span-2 text-red-500 text-xs hover:underline text-left">Purge Record</button>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{eduItem.degree}</p>
                      <p className="text-gray-500 text-xs">{eduItem.institution} • {eduItem.year}</p>
                      {eduItem.percentage && <p className="text-gray-400 text-xs">{eduItem.percentage}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <LockClosedIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Security Credentials</h2>
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-xs mb-5">Deploy new authentication tokens to secure your account.</p>
          <form onSubmit={commitPasswordChange} className="space-y-4">
            {[
              { txt: 'Legacy Password', key: 'oldPass', placeholder: 'Current token' },
              { txt: 'Future Password', key: 'newPass', placeholder: 'String > 6 chars' },
              { txt: 'Validate Future Password', key: 'confirmPass', placeholder: 'Re-type string' },
            ].map(({ txt, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{txt}</label>
                <div className="relative">
                  <input type={passwordReveal[key] ? 'text' : 'password'} value={securityForm[key]} onChange={(ev) => setSecurityForm({ ...securityForm, [key]: ev.target.value })}
                    placeholder={placeholder}
                    className={`input-field text-sm pr-10 ${key === 'confirmPass' && securityForm.confirmPass && securityForm.newPass !== securityForm.confirmPass ? 'border-red-400 focus:ring-red-400' : key === 'confirmPass' && securityForm.confirmPass && securityForm.newPass === securityForm.confirmPass ? 'border-green-400 focus:ring-green-400' : ''}`}
                  />
                  <button type="button" onClick={() => setPasswordReveal({ ...passwordReveal, [key]: !passwordReveal[key] })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {passwordReveal[key] ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {key === 'newPass' && securityForm.newPass && pwRating && (
                  <div className="mt-1.5">
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pwRating.class} ${pwRating.width}`} />
                    </div>
                    <p className={`text-xs mt-0.5 ${pwRating.msg === 'Fortified' ? 'text-green-600' : pwRating.msg === 'Optimal' ? 'text-yellow-600' : 'text-red-500'}`}>{pwRating.msg}</p>
                  </div>
                )}
              </div>
            ))}
            <button type="submit" disabled={isSecuring || !securityForm.oldPass || securityForm.newPass.length < 6 || securityForm.newPass !== securityForm.confirmPass} className="btn-primary text-sm py-2.5 px-6">
              {isSecuring ? 'Deploying...' : 'Override Key'}
            </button>
          </form>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Authentication Telemetry</h2>
          </div>
          {fetchingLogs ? <p className="text-gray-400 text-sm">Extracting logs...</p> : sessionLogs.length === 0 ? <p className="text-gray-400 text-sm">No telemetry records located.</p> : (
            <div className="space-y-3">
              {sessionLogs.map((log) => (
                <div key={log._id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${log.deviceType === 'mobile' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    {log.deviceType === 'mobile' ? <DevicePhoneMobileIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <ComputerDesktopIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.browser} {log.browserVersion && `(v${log.browserVersion.split('.')[0]})`} · {log.os}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.status === 'success' || log.status === 'otp_verified' ? 'bg-green-100 text-green-700' : log.status === 'blocked_time' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {log.status === 'success' ? 'Authorized' : log.status === 'otp_verified' ? 'OTP Passed' : log.status === 'blocked_time' ? 'Curfew Block' : 'OTP Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{log.deviceType} | Node: {log.ipAddress}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(log.loginAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
