import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import api from '../../api/axios';
import FrenchOTPModal from './FrenchOTPModal';

const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇺🇸' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'hi', label: 'हिंदी',      flag: '🇮🇳' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
  { code: 'zh', label: '中文',        flag: '🇨🇳' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
];

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const { currentUser: user, updateUser, accessToken: token } = useAuthStore();
  const [open, setOpen]               = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [sendingOTP, setSendingOTP]   = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLanguageSelect = async (lang) => {
    setOpen(false);

    // Already on this language — do nothing
    if (lang.code === i18n.language) return;

    // ── French: requires OTP verification ──
    if (lang.code === 'fr') {
      if (!token) {
        toast.error('Please log in first to switch to French 🔒');
        return;
      }

      setSendingOTP(true);
      try {
        await api.post('/otp/send', { purpose: 'language-change' });
        setShowOTPModal(true);
        // toast shown inside modal after it opens
      } catch (error) {
        const msg = error.response?.data?.message || 'Failed to send OTP. Please try again.';
        toast.error(msg);
      } finally {
        setSendingOTP(false);
      }
      return;
    }

    // ── All other languages: switch immediately ──
    i18n.changeLanguage(lang.code);
    if (token) {
      try {
        await api.put('/users/language', { language: lang.code });
        updateUser({ languagePreference: lang.code });
      } catch (_) {}
    }
  };

  const handleOTPSuccess = (languagePreference) => {
    i18n.changeLanguage(languagePreference);
    updateUser({ languagePreference });
    setShowOTPModal(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger button */}
        <button
          onClick={() => setOpen(!open)}
          disabled={sendingOTP}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium
                     disabled:opacity-50 disabled:cursor-wait"
          aria-label="Select language"
          aria-expanded={open}
        >
          {sendingOTP ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <GlobeAltIcon className="w-4 h-4" />
          )}
          <span>{currentLang.flag}</span>
          <span className="hidden sm:inline">{currentLang.label}</span>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl
                          border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in">
            <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('language.select')}
            </p>

            {LANGUAGES.map((lang) => {
              const isActive = i18n.language === lang.code;
              const isFrench = lang.code === 'fr';
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors
                    ${isActive
                      ? 'text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/20'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  <span className="text-base w-5 text-center">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.label}</span>

                  {/* Active checkmark */}
                  {isActive && (
                    <span className="text-primary-600 dark:text-primary-400 text-xs font-bold">✓</span>
                  )}

                  {/* French lock badge */}
                  {isFrench && !isActive && (
                    <span className="flex items-center gap-0.5 text-xs bg-amber-100 dark:bg-amber-900/30
                                     text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                      🔒 OTP
                    </span>
                  )}
                </button>
              );
            })}

            {/* Info note about French */}
            <div className="mx-3 mt-1 mb-1 pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                🔒 French requires email OTP verification
              </p>
            </div>
          </div>
        )}
      </div>

      {/* French OTP Modal */}
      {showOTPModal && (
        <FrenchOTPModal
          email={user?.email}
          onSuccess={handleOTPSuccess}
          onClose={() => setShowOTPModal(false)}
        />
      )}
    </>
  );
};

export default LanguageSwitcher;
