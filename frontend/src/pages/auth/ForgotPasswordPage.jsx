/**
 * ForgotPasswordPage
 * User enters email or phone → backend generates a letters-only password
 * and emails it to their registered address.
 * Rate-limited to once per day.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowLeftIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import apiClient from '../../api/axios';

const MODE_EMAIL = 'email';
const MODE_PHONE = 'phone';

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const ForgotPasswordPage = () => {
  const [mode,         setMode]         = useState(MODE_EMAIL);
  const [identifier,   setIdentifier]   = useState('');
  const [loading,      setLoading]      = useState(false);
  const [stage,        setStage]        = useState('form'); // 'form' | 'success' | 'rate-limited'
  const [rateLimitMsg, setRateLimitMsg] = useState('');
  const [sentTo,       setSentTo]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error(mode === MODE_EMAIL ? 'Please enter your email address' : 'Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/forgot-password', {
        identifier: identifier.trim(),
      });

      if (data.success) {
        setSentTo(data.message);
        setStage('success');
      }
    } catch (err) {
      const res = err.response?.data;
      if (res?.rateLimited) {
        setRateLimitMsg(res.message);
        setStage('rate-limited');
        return;
      }
      toast.error(res?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Success ─────────────────────────────────────────── */
  if (stage === 'success') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full
                          flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Check Your Email
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">{sentTo}</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-8">
            A new auto-generated password (letters only) has been sent to your registered
            email address. Use it to sign in, then change it from your profile.
          </p>
          <Link to="/login" className="btn-primary inline-block px-8 py-3 font-semibold">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  /* ── Rate-limited ────────────────────────────────────── */
  if (stage === 'rate-limited') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full
                            flex items-center justify-center mx-auto mb-5">
              <ClockIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Daily Limit Reached
            </h2>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200
                            dark:border-amber-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-800 dark:text-amber-300 text-sm font-medium text-left">
                  {rateLimitMsg || 'You can use this option only once per day.'}
                </p>
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Password resets are limited to once every 24 hours for security.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setStage('form'); setIdentifier(''); }}
                className="btn-secondary w-full"
              >
                Try a Different Account
              </button>
              <Link to="/login" className="btn-primary w-full text-center py-2">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main form ───────────────────────────────────────── */
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl
                          flex items-center justify-center mx-auto mb-4">
            <LockClosedIcon className="w-7 h-7 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password?</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">
            Enter your registered email or phone number. We'll generate a new
            password and send it straight to your email inbox.
          </p>
        </div>

        <div className="card p-8">
          {/* Email / Phone toggle */}
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 p-1 mb-6">
            {[
              { id: MODE_EMAIL, label: 'Email Address', icon: EnvelopeIcon },
              { id: MODE_PHONE, label: 'Phone Number',  icon: PhoneIcon    },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setMode(id); setIdentifier(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg
                            text-sm font-medium transition-colors ${
                  mode === id
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20
                          border border-blue-200 dark:border-blue-800 rounded-lg
                          px-3 py-2.5 mb-5">
            <EnvelopeIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
              A new auto-generated password (letters only, no numbers or symbols) will be
              emailed to your registered address. Available <strong>once per day</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {mode === MODE_EMAIL ? 'Registered Email Address' : 'Registered Phone Number'}
              </label>
              <div className="relative">
                {mode === MODE_EMAIL
                  ? <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  : <PhoneIcon    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                }
                <input
                  type={mode === MODE_EMAIL ? 'email' : 'tel'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={mode === MODE_EMAIL ? 'you@example.com' : '+91 98765 43210'}
                  className="input-field pl-9"
                  autoComplete={mode === MODE_EMAIL ? 'email' : 'tel'}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Sending new password...
                </span>
              ) : (
                '✉️ Email Me a New Password'
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500
                         dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400
                         transition-colors"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
