import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  EyeIcon, EyeSlashIcon, ShieldCheckIcon,
  ClockIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import apiClient from '../../api/axios';
import i18n from '../../i18n/i18n';

/* ── OTP boxes ── */
const OTPBoxes = ({ otp, setOtp }) => {
  const refs = useRef([]);
  const handleChange = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const n = [...otp]; n[i] = v.slice(-1); setOtp(n);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const n = [...otp]; p.split('').forEach((c, idx) => { if (idx < 6) n[idx] = c; }); setOtp(n);
    refs.current[Math.min(p.length, 5)]?.focus();
  };
  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {otp.map((d, i) => (
        <input key={i} ref={el => refs.current[i] = el} type="text" inputMode="numeric"
          maxLength={1} value={d} onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl
                      focus:outline-none dark:bg-gray-700 dark:text-white transition-all
                      ${d ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'}`}
          aria-label={`OTP digit ${i + 1}`} />
      ))}
    </div>
  );
};

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm]             = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Chrome OTP state
  const [stage, setStage]           = useState('form'); // 'form' | 'chrome-otp' | 'mobile-blocked'
  const [otp, setOtp]               = useState(['','','','','','']);
  const [otpEmail, setOtpEmail]     = useState('');
  const [verifying, setVerifying]   = useState(false);
  const [blockInfo, setBlockInfo]   = useState(null);

  const redirectAfterLogin = (user) => {
    if (user?.languagePreference) i18n.changeLanguage(user.languagePreference);
    if (user?.role === 'admin') navigate('/admin');
    else if (user?.role === 'employer') navigate('/employer/dashboard');
    else navigate('/dashboard');
  };

  /* ── Login submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Show wakeup message after 5s if server is sleeping
    const wakeupTimer = setTimeout(() => {
      toast.loading('Server is waking up, please wait...', { id: 'wakeup-login' });
    }, 5000);

    try {
      const { data } = await apiClient.post('/auth/login', form);
      clearTimeout(wakeupTimer);
      toast.dismiss('wakeup-login');

      if (data.requiresOTP) {
        setOtpEmail(data.email);
        setStage('chrome-otp');
        toast.success(data.message);
      } else if (data.blocked && data.blockReason === 'mobile_time') {
        setBlockInfo(data);
        setStage('mobile-blocked');
      } else if (data.success) {
        useAuthStore.setState({ currentUser: data.user, accessToken: data.token });
        toast.success('Welcome back!');
        redirectAfterLogin(data.user);
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (err) {
      clearTimeout(wakeupTimer);
      toast.dismiss('wakeup-login');
      const res = err.response?.data;
      if (res?.blocked && res?.blockReason === 'mobile_time') {
        setBlockInfo(res);
        setStage('mobile-blocked');
      } else {
        toast.error(res?.message || 'Invalid credentials');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Chrome OTP verify ── */
  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Enter the complete 6-digit OTP'); return; }
    setVerifying(true);
    try {
      const { data } = await apiClient.post('/auth/verify-chrome-otp', { email: otpEmail, otp: code });
      if (data.success) {
        useAuthStore.setState({ currentUser: data.user, accessToken: data.token });
        toast.success('Chrome login verified!');
        redirectAfterLogin(data.user);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['','','','','','']);
    } finally {
      setVerifying(false);
    }
  };

  /* ── Mobile time blocked screen ── */
  if (stage === 'mobile-blocked') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <ClockIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Mobile Access Restricted
            </h2>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-5">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 dark:text-red-300 text-sm text-left font-medium">
                  {blockInfo?.message}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-5">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold">Allowed window:</span> {blockInfo?.allowWindow}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                <span className="font-semibold">Current time:</span> {blockInfo?.currentTime}
              </p>
            </div>
            <p className="text-gray-400 text-xs mb-5">
              Mobile logins are restricted to business hours. Please try again during the allowed window or use a desktop browser.
            </p>
            <button onClick={() => setStage('form')} className="btn-secondary w-full">
              ← Try Different Device
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Chrome OTP screen ── */
  if (stage === 'chrome-otp') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Chrome Login Verification
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
              For security, Chrome logins require email verification.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">OTP sent to</p>
            <p className="text-primary-600 dark:text-primary-400 font-semibold text-sm mb-6">
              {otpEmail}
            </p>

            <OTPBoxes otp={otp} setOtp={setOtp} />

            <button onClick={handleVerifyOTP} disabled={verifying || otp.join('').length !== 6}
              className="btn-primary w-full py-3 font-semibold mt-6">
              {verifying ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Verifying...
                </span>
              ) : 'Verify & Sign In'}
            </button>

            <button onClick={() => { setStage('form'); setOtp(['','','','','','']); }}
              className="mt-3 text-sm text-gray-500 hover:text-primary-600 transition-colors block w-full">
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Normal login form ── */
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">CB</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.login')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              {t('auth.registerBtn')}
            </Link>
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {t('auth.email')}
              </label>
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-field" placeholder="you@example.com" autoComplete="email" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-field pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility">
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="btn-primary w-full py-3 font-semibold mt-2">
              {submitting ? 'Signing in...' : t('auth.loginBtn')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-password"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </div>

        {/* Security info */}
        <div className="mt-4 flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
          <ShieldCheckIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
            Chrome users require email OTP verification. Mobile logins are restricted to 10 AM – 1 PM IST.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
