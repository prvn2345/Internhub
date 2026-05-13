import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon, ShieldCheckIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import apiClient from '../../api/axios';
import i18n from '../../i18n/i18n';

const OTPGrid = ({ otpData, setOtpData }) => {
  const inputRefs = useRef([]);
  const onValueChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const clonedOtp = [...otpData]; 
    clonedOtp[idx] = val.slice(-1); 
    setOtpData(clonedOtp);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };
  const onKeyPress = (idx, ev) => { if (ev.key === 'Backspace' && !otpData[idx] && idx > 0) inputRefs.current[idx - 1]?.focus(); };
  const onPasteData = (ev) => {
    ev.preventDefault();
    const clipText = ev.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const clonedOtp = [...otpData]; 
    clipText.split('').forEach((char, pos) => { if (pos < 6) clonedOtp[pos] = char; }); 
    setOtpData(clonedOtp);
    inputRefs.current[Math.min(clipText.length, 5)]?.focus();
  };
  return (
    <div className="flex justify-center gap-2" onPaste={onPasteData}>
      {otpData.map((digit, pos) => (
        <input key={pos} ref={el => inputRefs.current[pos] = el} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={ev => onValueChange(pos, ev.target.value)} onKeyDown={ev => onKeyPress(pos, ev)}
          className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl focus:outline-none dark:bg-gray-700 dark:text-white transition-all ${digit ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'}`} aria-label={`Digit ${pos + 1}`} />
      ))}
    </div>
  );
};

const LoginPage = () => {
  const { t } = useTranslation();
  const router = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [authStep, setAuthStep] = useState('login-form');
  const [verificationCode, setVerificationCode] = useState(['','','','','','']);
  const [targetEmail, setTargetEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [restrictionDetails, setRestrictionDetails] = useState(null);

  const routeUserByRole = (userObj) => {
    if (userObj?.languagePreference) i18n.changeLanguage(userObj.languagePreference);
    if (userObj?.role === 'admin') router('/admin');
    else if (userObj?.role === 'employer') router('/employer/dashboard');
    else router('/dashboard');
  };

  const processLogin = async (ev) => {
    ev.preventDefault();
    setIsProcessing(true);
    const coldStartAlert = setTimeout(() => toast.loading('Waking up backend servers...', { id: 'server-wakeup' }), 5000);
    try {
      const { data: serverResponse } = await apiClient.post('/auth/login', credentials);
      clearTimeout(coldStartAlert); toast.dismiss('server-wakeup');
      if (serverResponse.requiresOTP) {
        setTargetEmail(serverResponse.email); setAuthStep('chrome-verify'); toast.success(serverResponse.message);
      } else if (serverResponse.blocked && serverResponse.blockReason === 'mobile_time') {
        setRestrictionDetails(serverResponse); setAuthStep('mobile-restricted');
      } else if (serverResponse.success) {
        useAuthStore.setState({ currentUser: serverResponse.user, accessToken: serverResponse.token });
        toast.success('Successfully logged in!'); routeUserByRole(serverResponse.user);
      } else { toast.error(serverResponse.message || 'Authentication failed'); }
    } catch (error) {
      clearTimeout(coldStartAlert); toast.dismiss('server-wakeup');
      const errorData = error.response?.data;
      if (errorData?.blocked && errorData?.blockReason === 'mobile_time') {
        setRestrictionDetails(errorData); setAuthStep('mobile-restricted');
      } else { toast.error(errorData?.message || 'Incorrect email or password'); }
    } finally { setIsProcessing(false); }
  };

  const submitVerificationCode = async () => {
    const finalCode = verificationCode.join('');
    if (finalCode.length !== 6) { toast.error('OTP must be 6 digits'); return; }
    setIsVerifying(true);
    try {
      const { data } = await apiClient.post('/auth/verify-chrome-otp', { email: targetEmail, otp: finalCode });
      if (data.success) {
        useAuthStore.setState({ currentUser: data.user, accessToken: data.token });
        toast.success('Browser verified!'); routeUserByRole(data.user);
      }
    } catch (error) { toast.error(error.response?.data?.message || 'OTP verification failed'); setVerificationCode(['','','','','','']); } 
    finally { setIsVerifying(false); }
  };

  if (authStep === 'mobile-restricted') return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-5"><ClockIcon className="w-8 h-8 text-red-600 dark:text-red-400" /></div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-5"><div className="flex items-start gap-3"><ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /><p className="text-red-700 dark:text-red-300 text-sm text-left font-medium">{restrictionDetails?.message}</p></div></div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-5"><p className="text-sm text-gray-600 dark:text-gray-300"><span className="font-semibold">Permitted Time:</span> {restrictionDetails?.allowWindow}</p><p className="text-sm text-gray-600 dark:text-gray-300 mt-1"><span className="font-semibold">Local Time:</span> {restrictionDetails?.currentTime}</p></div>
          <p className="text-gray-400 text-xs mb-5">Mobile device access is strictly regulated. Please log in using a desktop browser or return during allowed hours.</p>
          <button onClick={() => setAuthStep('login-form')} className="btn-secondary w-full">← Switch Device</button>
        </div>
      </div>
    </div>
  );

  if (authStep === 'chrome-verify') return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheckIcon className="w-7 h-7 text-primary-600 dark:text-primary-400" /></div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">New Browser Detected</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">We require email confirmation for Chrome sessions.</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Passcode dispatched to</p>
          <p className="text-primary-600 dark:text-primary-400 font-semibold text-sm mb-6">{targetEmail}</p>
          <OTPGrid otpData={verificationCode} setOtpData={setVerificationCode} />
          <button onClick={submitVerificationCode} disabled={isVerifying || verificationCode.join('').length !== 6} className="btn-primary w-full py-3 font-semibold mt-6">{isVerifying ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"/></svg> Processing...</span> : 'Authenticate Session'}</button>
          <button onClick={() => { setAuthStep('login-form'); setVerificationCode(['','','','','','']); }} className="mt-3 text-sm text-gray-500 hover:text-primary-600 transition-colors block w-full">← Return to Login</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4"><span className="text-white font-bold text-lg">CB</span></div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.login')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('auth.noAccount')} <Link to="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">{t('auth.registerBtn')}</Link></p>
        </div>
        <div className="card p-8">
          <form onSubmit={processLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('auth.email')}</label>
              <input type="email" required value={credentials.email} onChange={ev => setCredentials({ ...credentials, email: ev.target.value })} className="input-field" placeholder="student@university.edu" autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('auth.password')}</label>
              <div className="relative">
                <input type={isPasswordVisible ? 'text' : 'password'} required value={credentials.password} onChange={ev => setCredentials({ ...credentials, password: ev.target.value })} className="input-field pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{isPasswordVisible ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}</button>
              </div>
            </div>
            <button type="submit" disabled={isProcessing} className="btn-primary w-full py-3 font-semibold mt-2">{isProcessing ? 'Authenticating...' : t('auth.loginBtn')}</button>
          </form>
          <div className="mt-4 text-center"><Link to="/forgot-password" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">{t('auth.forgotPassword')}</Link></div>
        </div>
        <div className="mt-4 flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
          <ShieldCheckIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">Note: Security policy requires Chrome browsers to verify via email. Mobile access is strictly 10 AM – 1 PM IST.</p>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
