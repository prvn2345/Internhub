import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

const RegistrationBreadcrumbs = ({ currentStep }) => {
  const progression = ['Details', 'Verify Email', 'Done'];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {progression.map((title, idx) => {
        const stepIndex = idx + 1; const isActive = currentStep === stepIndex; const isCompleted = currentStep > stepIndex;
        return (
          <React.Fragment key={title}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                {isCompleted ? '✓' : stepIndex}
              </div>
              <span className={`text-xs ${isActive ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-400'}`}>{title}</span>
            </div>
            {idx < progression.length - 1 && <div className={`w-12 h-0.5 mb-4 transition-colors ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const PasscodeFields = ({ codeSequence, setCodeSequence }) => {
  const domRefs = useRef([]);
  useEffect(() => { domRefs.current[0]?.focus(); }, []);
  const onCodeChange = (pos, val) => {
    if (!/^\d*$/.test(val)) return;
    const update = [...codeSequence]; update[pos] = val.slice(-1); setCodeSequence(update);
    if (val && pos < 5) domRefs.current[pos + 1]?.focus();
  };
  const onKeyAction = (pos, ev) => { if (ev.key === 'Backspace' && !codeSequence[pos] && pos > 0) domRefs.current[pos - 1]?.focus(); };
  const handleClipboard = (ev) => {
    ev.preventDefault();
    const rawData = ev.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const update = [...codeSequence]; rawData.split('').forEach((ch, i) => { if (i < 6) update[i] = ch; }); setCodeSequence(update);
    domRefs.current[Math.min(rawData.length, 5)]?.focus();
  };
  return (
    <div className="flex justify-center gap-2" onPaste={handleClipboard}>
      {codeSequence.map((digit, pos) => (
        <input key={pos} ref={(el) => (domRefs.current[pos] = el)} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(ev) => onCodeChange(pos, ev.target.value)} onKeyDown={(ev) => onKeyAction(pos, ev)}
          className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-lg focus:outline-none dark:bg-gray-700 dark:text-white transition-colors ${digit ? 'border-primary-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'}`} aria-label={`Code slot ${pos + 1}`} />
      ))}
    </div>
  );
};

const RegisterPage = () => {
  const { t } = useTranslation();
  const redirect = useNavigate();
  const { register, isBusy: registeringProfile } = useAuthStore();

  const [activeView, setActiveView] = useState(1);
  const [profileData, setProfileData] = useState({ name: '', email: '', password: '', role: 'student', companyName: '' });
  const [passwordReveal, setPasswordReveal] = useState(false);
  const [passcode, setPasscode] = useState(['', '', '', '', '', '']);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isCheckingOTP, setIsCheckingOTP] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (timer <= 0) return;
    const intervalId = setTimeout(() => setTimer((c) => c - 1), 1000);
    return () => clearTimeout(intervalId);
  }, [timer]);

  const initiateRegistration = async (ev) => {
    ev.preventDefault();
    if (profileData.password.length < 6) { toast.error('Minimum password length is 6 characters'); return; }
    setIsTransmitting(true);
    const loadId = setTimeout(() => toast.loading('Initializing database...', { id: 'db-init' }), 5000);
    try {
      await api.post('/auth/send-register-otp', { email: profileData.email });
      clearTimeout(loadId); toast.dismiss('db-init');
      toast.success(`Verification link dispatched to ${profileData.email}`);
      setActiveView(2); setTimer(60);
    } catch (err) {
      clearTimeout(loadId); toast.dismiss('db-init'); toast.error(err.response?.data?.message || 'Transmission failed. Try again.');
    } finally { setIsTransmitting(false); }
  };

  const finalizeRegistration = async () => {
    const enteredPasscode = passcode.join('');
    if (enteredPasscode.length !== 6) { toast.error('Passcode must be 6 digits'); return; }
    setIsCheckingOTP(true);
    try {
      await api.post('/auth/verify-register-otp', { email: profileData.email, otp: enteredPasscode });
      const creationResponse = await register(profileData);
      if (creationResponse.success) {
        setActiveView(3);
        setTimeout(() => { if (profileData.role === 'employer') redirect('/employer/dashboard'); else redirect('/dashboard'); }, 2000);
      } else { toast.error(creationResponse.message); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification rejected'); setPasscode(['', '', '', '', '', '']);
    } finally { setIsCheckingOTP(false); }
  };

  const triggerResend = async () => {
    if (timer > 0) return;
    setIsTransmitting(true);
    try {
      await api.post('/auth/send-register-otp', { email: profileData.email });
      toast.success('Passcode re-sent successfully'); setPasscode(['', '', '', '', '', '']); setTimer(60);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to resend'); } 
    finally { setIsTransmitting(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4"><span className="text-white font-bold text-lg">CB</span></div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.register')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('auth.hasAccount')} <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">{t('auth.loginBtn')}</Link></p>
        </div>
        <RegistrationBreadcrumbs currentStep={activeView} />
        <div className="card p-8">
          {activeView === 1 && (
            <>
              <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 p-1 mb-6">
                {['student', 'employer'].map((r) => (
                  <button key={r} type="button" onClick={() => setProfileData({ ...profileData, role: r })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${profileData.role === r ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{t(`auth.${r}`)}</button>
                ))}
              </div>
              <form onSubmit={initiateRegistration} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('auth.name')}</label><input type="text" required value={profileData.name} onChange={(ev) => setProfileData({ ...profileData, name: ev.target.value })} className="input-field" placeholder="Full Name" /></div>
                {profileData.role === 'employer' && (<div><label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('auth.companyName')}</label><input type="text" required value={profileData.companyName} onChange={(ev) => setProfileData({ ...profileData, companyName: ev.target.value })} className="input-field" placeholder="Your Organization" /></div>)}
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('auth.email')}</label><input type="email" required value={profileData.email} onChange={(ev) => setProfileData({ ...profileData, email: ev.target.value })} className="input-field" placeholder="contact@email.com" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('auth.password')}</label><div className="relative"><input type={passwordReveal ? 'text' : 'password'} required value={profileData.password} onChange={(ev) => setProfileData({ ...profileData, password: ev.target.value })} className="input-field pr-10" placeholder="Minimum 6 characters" /><button type="button" onClick={() => setPasswordReveal(!passwordReveal)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{passwordReveal ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}</button></div></div>
                <button type="submit" disabled={isTransmitting} className="btn-primary w-full py-3 font-semibold mt-2">{isTransmitting ? 'Transmitting Data...' : 'Proceed Next →'}</button>
              </form>
            </>
          )}
          {activeView === 2 && (
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><EnvelopeIcon className="w-7 h-7 text-primary-600 dark:text-primary-400" /></div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Check Your Inbox</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">A verification code was sent to</p>
              <p className="text-primary-600 dark:text-primary-400 font-semibold text-sm mb-6">{profileData.email}</p>
              <PasscodeFields codeSequence={passcode} setCodeSequence={setPasscode} />
              <button onClick={finalizeRegistration} disabled={isCheckingOTP || registeringProfile || passcode.join('').length !== 6} className="btn-primary w-full py-3 font-semibold mt-6">{isCheckingOTP || registeringProfile ? 'Processing...' : 'Confirm Account Creation'}</button>
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => { setActiveView(1); setPasscode(['', '', '', '', '', '']); }} className="text-sm text-gray-500 hover:text-gray-700">← Amend email</button>
                <button onClick={triggerResend} disabled={timer > 0 || isTransmitting} className="text-sm text-primary-600 hover:underline disabled:text-gray-400 disabled:no-underline">{timer > 0 ? `Await (${timer}s)` : 'Request New Code'}</button>
              </div>
            </div>
          )}
          {activeView === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircleIcon className="w-9 h-9 text-green-600 dark:text-green-400" /></div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Profile Activated!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Welcome aboard, {profileData.name.split(' ')[0]}! Loading dashboard...</p>
              <div className="mt-4 flex justify-center"><svg className="animate-spin w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default RegisterPage;
