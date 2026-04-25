import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, EnvelopeIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const MAX_ATTEMPTS = 3;

// ── Stages ──────────────────────────────────────────────
// 'sent'     → OTP was just sent, waiting for input
// 'success'  → OTP verified, language applied
// 'locked'   → too many wrong attempts

const FrenchOTPModal = ({ email, onSuccess, onClose }) => {
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [stage, setStage]       = useState('sent');   // 'sent' | 'success' | 'locked'
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [attempts, setAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRefs = useRef([]);

  // Show sent toast once on mount
  useEffect(() => {
    toast.success(`OTP sent to ${email}`, { id: 'otp-sent' });
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Auto-verify when all 6 digits filled
  useEffect(() => {
    if (otp.every((d) => d !== '') && stage === 'sent' && !verifying) {
      handleVerify(otp.join(''));
    }
  }, [otp]);

  // ── OTP input handlers ───────────────────────────────
  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setErrorMsg('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp]; next[index] = ''; setOtp(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    pasted.split('').forEach((char, i) => { if (i < 6) next[i] = char; });
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ── Verify ───────────────────────────────────────────
  const handleVerify = async (otpString) => {
    if (otpString.length !== 6 || stage !== 'sent') return;
    setVerifying(true);
    setErrorMsg('');

    try {
      const { data } = await api.post('/otp/verify', {
        otp: otpString,
        language: 'fr',
        purpose: 'language-change',
      });

      if (data.success) {
        setStage('success');
        // Give user a moment to see the success state, then close
        setTimeout(() => onSuccess(data.languagePreference), 1800);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Invalid OTP. Please try again.';
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      if (newAttempts >= MAX_ATTEMPTS) {
        setStage('locked');
        setErrorMsg(`Too many incorrect attempts. Please request a new OTP.`);
      } else {
        setErrorMsg(`${msg} (${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? '' : 's'} remaining)`);
      }
    } finally {
      setVerifying(false);
    }
  };

  // ── Resend ───────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setErrorMsg('');
    try {
      await api.post('/otp/send', { purpose: 'language-change' });
      toast.success('New OTP sent!');
      setOtp(['', '', '', '', '', '']);
      setAttempts(0);
      setStage('sent');
      setCountdown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  // ── Render ───────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={stage === 'success' ? undefined : onClose}
      />

      {/* Modal card */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">

        {/* Top colour bar */}
        <div className={`h-1.5 w-full transition-colors duration-500 ${
          stage === 'success' ? 'bg-green-500' :
          stage === 'locked'  ? 'bg-red-500'   :
          'bg-gradient-to-r from-primary-500 to-purple-500'
        }`} />

        <div className="p-6">
          {/* Close button — hidden on success */}
          {stage !== 'success' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}

          {/* ── SUCCESS state ── */}
          {stage === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full
                              flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-9 h-9 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Verified! 🇫🇷
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Language changed to <strong>Français</strong>. Applying now...
              </p>
              <div className="mt-4 flex justify-center">
                <svg className="animate-spin w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            </div>
          )}

          {/* ── SENT / LOCKED state ── */}
          {stage !== 'success' && (
            <>
              {/* Header */}
              <div className="text-center mb-5">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  stage === 'locked'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-primary-100 dark:bg-primary-900/30'
                }`}>
                  {stage === 'locked'
                    ? <ExclamationTriangleIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
                    : <EnvelopeIcon className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                  }
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {stage === 'locked' ? 'Too Many Attempts' : 'Verify to Switch to French 🇫🇷'}
                </h2>

                {stage === 'locked' ? (
                  <p className="text-red-500 text-sm">
                    Request a new OTP to try again.
                  </p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    For security, switching to French requires email verification.
                    <br />
                    A 6-digit OTP was sent to
                  </p>
                )}

                {stage !== 'locked' && (
                  <p className="text-primary-600 dark:text-primary-400 font-semibold text-sm mt-1">
                    {email}
                  </p>
                )}
              </div>

              {/* OTP boxes */}
              <div
                className={`flex justify-center gap-2 mb-4 ${stage === 'locked' ? 'opacity-40 pointer-events-none' : ''}`}
                onPaste={handlePaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={verifying || stage === 'locked'}
                    className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl
                                focus:outline-none dark:bg-gray-700 dark:text-white transition-all
                                ${errorMsg && !verifying
                                  ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                                  : digit
                                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                  : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
                                }
                                disabled:opacity-50`}
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200
                                dark:border-red-800 rounded-lg px-3 py-2.5 mb-4">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 dark:text-red-400 text-sm">{errorMsg}</p>
                </div>
              )}

              {/* Verify button — hidden when locked */}
              {stage !== 'locked' && (
                <button
                  onClick={() => handleVerify(otp.join(''))}
                  disabled={verifying || otp.join('').length !== 6}
                  className="btn-primary w-full py-3 font-semibold mb-3"
                >
                  {verifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Apply French'
                  )}
                </button>
              )}

              {/* Resend + cancel row */}
              <div className="flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700
                             dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={handleResend}
                  disabled={countdown > 0 || resending}
                  className="text-sm text-primary-600 dark:text-primary-400 font-medium
                             hover:underline disabled:text-gray-400 disabled:no-underline
                             disabled:cursor-not-allowed transition-colors"
                >
                  {resending
                    ? 'Sending...'
                    : countdown > 0
                    ? `Resend OTP (${countdown}s)`
                    : 'Resend OTP'}
                </button>
              </div>

              {/* Attempt dots */}
              {stage !== 'locked' && attempts > 0 && (
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i < attempts ? 'bg-red-400' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-400 ml-1">
                    {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} left
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FrenchOTPModal;
