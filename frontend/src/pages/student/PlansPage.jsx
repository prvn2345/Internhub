
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckIcon, SparklesIcon, LockClosedIcon,
  ClockIcon, ExclamationTriangleIcon, CreditCardIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import apiClient from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { PageLoader } from '../../components/common/LoadingSpinner';

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const PLAN_STYLES = {
  free  : { bg: 'bg-gray-50 dark:bg-gray-800',   border: 'border-gray-200 dark:border-gray-700', badge: 'bg-gray-100 text-gray-600',   btn: 'btn-secondary' },
  bronze: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700', btn: 'bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg transition-colors' },
  silver: { bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-200 text-slate-700', btn: 'bg-slate-500 hover:bg-slate-600 text-white font-medium px-4 py-2 rounded-lg transition-colors' },
  gold  : { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700 border-2', badge: 'bg-yellow-100 text-yellow-700', btn: 'bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-4 py-2 rounded-lg transition-colors' },
};

const PlansPage = () => {
  const { currentUser: user } = useAuthStore();
  const [planInfo, setPlanInfo]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [paying, setPaying]       = useState('');
  const [timeBlocked, setTimeBlocked] = useState(null);

  useEffect(() => {
    apiClient.get('/subscription/plan')
      .then(r => setPlanInfo(r.data))
      .catch(() => toast.error('Failed to load plan info'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (planKey) => {
    if (planKey === 'free') return;
    setPaying(planKey);
    try {
      const { data } = await apiClient.post('/subscription/create-order', { planKey });

      const loaded = await loadRazorpay();
      if (!loaded) { toast.error('Failed to load payment gateway'); return; }

      const options = {
        key        : data.keyId,
        amount     : data.amount,
        currency   : data.currency,
        name       : 'CareerBridge',
        description: `${data.planName} Plan — Monthly Subscription`,
        order_id   : data.orderId,
        prefill    : { name: user?.name, email: user?.email },
        theme      : { color: '#4f46e5' },
        handler    : async (response) => {
          try {
            const res = await apiClient.post('/subscription/verify-payment', {
              razorpay_order_id  : response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature : response.razorpay_signature,
              planKey,
            });
            toast.success(res.data.message);
            // Refresh plan info
            const updated = await apiClient.get('/subscription/plan');
            setPlanInfo(updated.data);
          } catch (e) {
            toast.error(e.response?.data?.message || 'Payment verification failed');
          }
        },
        modal: { ondismiss: () => toast.error('Payment cancelled') },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      const res = err.response?.data;
      if (res?.blocked) {
        setTimeBlocked(res);
      } else {
        toast.error(res?.message || 'Failed to initiate payment');
      }
    }
    setPaying('');
  };

  if (loading) return <PageLoader />;

  const { subscription, plans } = planInfo || {};

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Subscription Plans
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          Choose a plan that fits your job search needs. Upgrade anytime to apply for more internships.
        </p>
      </div>

      {/* Time restriction notice */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-8">
        <ClockIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-800 dark:text-amber-300 font-semibold text-sm">Payment Window</p>
          <p className="text-amber-700 dark:text-amber-400 text-sm mt-0.5">
            Payments are only processed between <strong>10:00 AM – 11:00 AM IST</strong> daily for security.
          </p>
        </div>
      </div>

      {/* Time blocked modal */}
      {timeBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClockIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Blocked</h2>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
              <p className="text-red-700 dark:text-red-300 text-sm">{timeBlocked.message}</p>
            </div>
            <p className="text-gray-500 text-sm mb-2">Allowed window: <strong>{timeBlocked.allowWindow}</strong></p>
            <p className="text-gray-500 text-sm mb-5">Current time: <strong>{timeBlocked.currentTime}</strong></p>
            <button onClick={() => setTimeBlocked(null)} className="btn-primary w-full">Got it</button>
          </div>
        </div>
      )}

      {/* Current plan banner */}
      {subscription && (
        <div className="card p-5 mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{subscription.planName} Plan</p>
            {subscription.expiresAt && (
              <p className="text-xs text-gray-400 mt-0.5">
                Expires: {new Date(subscription.expiresAt).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Applications this month</p>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {subscription.appsUsed}
              <span className="text-gray-400 text-base font-normal">
                /{subscription.appsPerMonth === -1 ? '∞' : subscription.appsPerMonth}
              </span>
            </p>
            {subscription.appsPerMonth !== -1 && (
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 ml-auto">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (subscription.appsUsed / subscription.appsPerMonth) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {(plans || []).map((plan) => {
          const style = PLAN_STYLES[plan.key];
          const isCurrent = plan.isCurrent;
          const isGold = plan.key === 'gold';

          return (
            <div key={plan.key}
              className={`relative rounded-2xl border p-6 flex flex-col ${style.bg} ${style.border} ${isGold ? 'shadow-lg' : ''}`}>
              {isGold && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <SparklesIcon className="w-3 h-3" /> BEST VALUE
                  </span>
                </div>
              )}

              <div className="mb-4">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${style.badge}`}>
                  {plan.name}
                </span>
              </div>

              <div className="mb-4">
                {plan.price === 0 ? (
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">Free</p>
                ) : (
                  <div>
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{plan.price}</span>
                    <span className="text-gray-400 text-sm">/month</span>
                  </div>
                )}
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {plan.appsPerMonth === -1 ? 'Unlimited applications' : `${plan.appsPerMonth} application${plan.appsPerMonth > 1 ? 's' : ''}/month`}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  Browse all listings
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  Track application status
                </li>
                {plan.key !== 'free' && (
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Invoice via email
                  </li>
                )}
              </ul>

              {isCurrent ? (
                <div className="w-full text-center py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold">
                  ✓ Current Plan
                </div>
              ) : plan.key === 'free' ? (
                <div className="w-full text-center py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-sm">
                  Default Plan
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={!!paying}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${style.btn}`}
                >
                  {paying === plan.key ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Processing...
                    </span>
                  ) : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-gray-400 text-xs mt-6">
        All plans renew monthly. Payments processed via Razorpay. Secure & encrypted.
      </p>
    </div>
  );
};

export default PlansPage;
