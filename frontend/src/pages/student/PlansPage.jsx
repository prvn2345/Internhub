import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import apiClient from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { PageLoader } from '../../components/common/LoadingSpinner';

const injectRazorpaySDK = () => new Promise((resolve) => {
  if (window.Razorpay) { resolve(true); return; }
  const scriptElement = document.createElement('script');
  scriptElement.src = 'https://checkout.razorpay.com/v1/checkout.js';
  scriptElement.onload = () => resolve(true); 
  scriptElement.onerror = () => resolve(false);
  document.body.appendChild(scriptElement);
});

const TIER_THEMES = {
  free: { background: 'bg-gray-50 dark:bg-gray-800', borderColor: 'border-gray-200 dark:border-gray-700', pill: 'bg-gray-100 text-gray-600', button: 'btn-secondary' },
  bronze: { background: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800', pill: 'bg-amber-100 text-amber-700', button: 'bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg transition-colors' },
  silver: { background: 'bg-slate-50 dark:bg-slate-800/50', borderColor: 'border-slate-300 dark:border-slate-600', pill: 'bg-slate-200 text-slate-700', button: 'bg-slate-500 hover:bg-slate-600 text-white font-medium px-4 py-2 rounded-lg transition-colors' },
  gold: { background: 'bg-yellow-50 dark:bg-yellow-900/20', borderColor: 'border-yellow-300 dark:border-yellow-700 border-2', pill: 'bg-yellow-100 text-yellow-700', button: 'bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-4 py-2 rounded-lg transition-colors' },
};

const PlansPage = () => {
  const { currentUser: activeUser } = useAuthStore();
  const [billingDetails, setBillingDetails] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activePaymentTier, setActivePaymentTier] = useState('');
  const [securityBlockInfo, setSecurityBlockInfo] = useState(null);

  useEffect(() => {
    apiClient.get('/subscription/plan')
      .then(response => setBillingDetails(response.data))
      .catch(() => toast.error('Failed to sync billing details'))
      .finally(() => setIsInitializing(false));
  }, []);

  const triggerCheckout = async (targetPlanKey) => {
    if (targetPlanKey === 'free') return;
    setActivePaymentTier(targetPlanKey);
    try {
      const { data: orderData } = await apiClient.post('/subscription/create-order', { planKey: targetPlanKey });
      const sdkReady = await injectRazorpaySDK();
      if (!sdkReady) { toast.error('Gateway dependency error'); return; }

      const paymentConfig = {
        key: orderData.keyId, amount: orderData.amount, currency: orderData.currency,
        name: 'CareerBridge', description: `${orderData.planName} Plan — Monthly Subscription`,
        order_id: orderData.orderId, prefill: { name: activeUser?.name, email: activeUser?.email },
        theme: { color: '#4f46e5' },
        handler: async (transactionResponse) => {
          try {
            const verificationPayload = await apiClient.post('/subscription/verify-payment', {
              razorpay_order_id: transactionResponse.razorpay_order_id,
              razorpay_payment_id: transactionResponse.razorpay_payment_id,
              razorpay_signature: transactionResponse.razorpay_signature,
              planKey: targetPlanKey,
            });
            toast.success(verificationPayload.data.message);
            const refreshPayload = await apiClient.get('/subscription/plan');
            setBillingDetails(refreshPayload.data);
          } catch (verificationError) {
            toast.error(verificationError.response?.data?.message || 'Payment signature mismatch');
          }
        },
        modal: { ondismiss: () => toast.error('Payment cancelled') },
      };
      new window.Razorpay(paymentConfig).open();
    } catch (networkError) {
      const errorBody = networkError.response?.data;
      if (errorBody?.blocked) setSecurityBlockInfo(errorBody);
      else toast.error(errorBody?.message || 'Checkout session failed to start');
    }
    setActivePaymentTier('');
  };

  if (isInitializing) return <PageLoader />;
  const { subscription, plans } = billingDetails || {};

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Subscription Plans</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Choose a plan that fits your job search needs. Upgrade anytime to apply for more internships.</p>
      </div>

      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-8">
        <ClockIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-800 dark:text-amber-300 font-semibold text-sm">Payment Window</p>
          <p className="text-amber-700 dark:text-amber-400 text-sm mt-0.5">Payments are only processed between <strong>10:00 AM – 11:00 AM IST</strong> daily for security.</p>
        </div>
      </div>

      {securityBlockInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><ClockIcon className="w-7 h-7 text-red-600 dark:text-red-400" /></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Blocked</h2>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4"><p className="text-red-700 dark:text-red-300 text-sm">{securityBlockInfo.message}</p></div>
            <p className="text-gray-500 text-sm mb-2">Allowed window: <strong>{securityBlockInfo.allowWindow}</strong></p>
            <p className="text-gray-500 text-sm mb-5">Current time: <strong>{securityBlockInfo.currentTime}</strong></p>
            <button onClick={() => setSecurityBlockInfo(null)} className="btn-primary w-full">Got it</button>
          </div>
        </div>
      )}

      {subscription && (
        <div className="card p-5 mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{subscription.planName} Plan</p>
            {subscription.expiresAt && <p className="text-xs text-gray-400 mt-0.5">Expires: {new Date(subscription.expiresAt).toLocaleDateString('en-IN')}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Applications this month</p>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{subscription.appsUsed}<span className="text-gray-400 text-base font-normal">/{subscription.appsPerMonth === -1 ? '∞' : subscription.appsPerMonth}</span></p>
            {subscription.appsPerMonth !== -1 && (
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 ml-auto">
                <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${Math.min(100, (subscription.appsUsed / subscription.appsPerMonth) * 100)}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {(plans || []).map((tierData) => {
          const styleConfig = TIER_THEMES[tierData.key];
          const isCurrentlyActive = tierData.isCurrent;
          const isPremiumGold = tierData.key === 'gold';
          return (
            <div key={tierData.key} className={`relative rounded-2xl border p-6 flex flex-col ${styleConfig.background} ${styleConfig.borderColor} ${isPremiumGold ? 'shadow-lg' : ''}`}>
              {isPremiumGold && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><SparklesIcon className="w-3 h-3" /> BEST VALUE</span></div>}
              <div className="mb-4"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styleConfig.pill}`}>{tierData.name}</span></div>
              <div className="mb-4">{tierData.price === 0 ? <p className="text-3xl font-bold text-gray-900 dark:text-white">Free</p> : <div><span className="text-3xl font-bold text-gray-900 dark:text-white">₹{tierData.price}</span><span className="text-gray-400 text-sm">/month</span></div>}</div>
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />{tierData.appsPerMonth === -1 ? 'Unlimited applications' : `${tierData.appsPerMonth} application${tierData.appsPerMonth > 1 ? 's' : ''}/month`}</li>
                <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />Browse all listings</li>
                <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />Track application status</li>
                {tierData.key !== 'free' && <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />Invoice via email</li>}
              </ul>
              {isCurrentlyActive ? <div className="w-full text-center py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold">✓ Current Plan</div> : tierData.key === 'free' ? <div className="w-full text-center py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-sm">Default Plan</div> : (
                <button onClick={() => triggerCheckout(tierData.key)} disabled={!!activePaymentTier} className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${styleConfig.button}`}>
                  {activePaymentTier === tierData.key ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Processing...</span> : `Upgrade to ${tierData.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-gray-400 text-xs mt-6">All plans renew monthly. Payments processed via Razorpay. Secure & encrypted.</p>
    </div>
  );
};
export default PlansPage;
