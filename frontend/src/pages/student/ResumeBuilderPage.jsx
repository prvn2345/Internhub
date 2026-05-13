import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon, PlusIcon, TrashIcon, CheckCircleIcon, LockClosedIcon, EnvelopeIcon, CreditCardIcon, DocumentTextIcon, ArrowLeftIcon, ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import apiClient from '../../api/axios';
import useAuthStore from '../../store/authStore';

const embedRazorpay = () => new Promise((res) => {
  if (window.Razorpay) { res(true); return; }
  const gatewayScript = document.createElement('script');
  gatewayScript.src = 'https://checkout.razorpay.com/v1/checkout.js';
  gatewayScript.onload  = () => res(true);
  gatewayScript.onerror = () => res(false);
  document.body.appendChild(gatewayScript);
});

const SpinnerFx = () => (<svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>);

const BUILDER_STAGES = ['Payload Details', 'Security Auth', 'Checkout', 'Deployment'];
const ProgressTracker = ({ phase }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {BUILDER_STAGES.map((desc, idx) => {
      const stageIdx = idx + 1; const isPast = phase > stageIdx; const isNow = phase === stageIdx;
      return (
        <React.Fragment key={desc}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isPast ? 'bg-green-500 text-white' : isNow ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
              {isPast ? '✓' : stageIdx}
            </div>
            <span className={`text-xs hidden sm:block ${isNow ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-400'}`}>{desc}</span>
          </div>
          {idx < BUILDER_STAGES.length - 1 && <div className={`w-10 h-0.5 mb-4 ${isPast ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
        </React.Fragment>
      );
    })}
  </div>
);

const ResumeBuilderPage = () => {
  const { currentUser: student, updateUser: syncState } = useAuthStore();
  const [currentPhase, setCurrentPhase] = useState(1);
  const [resumeData, setResumeData] = useState({
    fullName: student?.name || '', email: student?.email || '', phone: student?.phone || '', location: student?.location || '',
    linkedin: '', portfolio: '', objective: '', skills: student?.skills?.join(', ') || '', languages: '', certifications: '',
    education: (student?.education || []).map(e => ({ degree: e.degree||'', institution: e.institution||'', year: e.year||'', grade: e.percentage||'' })),
    experience: (student?.experience || []).map(e => ({ title: e.designation||'', company: e.organisation||'', duration: e.tenure||'', description: e.summary||'' })),
    projects: [{ name: '', description: '', link: '' }],
  });
  
  const [securityCode, setSecurityCode] = useState(['','','','','','']);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [generatedPdf, setGeneratedPdf] = useState('');

  useEffect(() => {
    if (resendTimer <= 0) return;
    const ticker = setTimeout(() => setResendTimer(val => val - 1), 1000);
    return () => clearTimeout(ticker);
  }, [resendTimer]);

  const patchData = (ref, val) => setResumeData(prev => ({ ...prev, [ref]: val }));
  const appendBlock = (ref, template) => setResumeData(prev => ({ ...prev, [ref]: [...prev[ref], template] }));
  const modifyBlock = (ref, idx, field, val) => { const clone = [...resumeData[ref]]; clone[idx] = { ...clone[idx], [field]: val }; patchData(ref, clone); };
  const spliceBlock = (ref, idx) => patchData(ref, resumeData[ref].filter((_, i) => i !== idx));

  const serializePayload = () => ({
    ...resumeData,
    skills: resumeData.skills.split(',').map(str => str.trim()).filter(Boolean),
    languages: resumeData.languages.split(',').map(str => str.trim()).filter(Boolean),
    certifications: resumeData.certifications.split(',').map(str => str.trim()).filter(Boolean),
  });

  const triggerSecurityCheck = async () => {
    if (!resumeData.fullName || !resumeData.email) { toast.error('Mandatory fields missing'); return; }
    setIsTransmitting(true);
    try {
      await apiClient.post('/resume/send-otp');
      toast.success('Security code dispatched'); setCurrentPhase(2); setResendTimer(60);
    } catch (error) { toast.error(error.response?.data?.message || 'Transmission failed'); }
    setIsTransmitting(false);
  };

  const processPaymentGateway = async () => {
    const rawCode = securityCode.join('');
    if (rawCode.length !== 6) { toast.error('Incomplete security code'); return; }
    setIsValidating(true);
    try {
      const payload = serializePayload();
      const { data: orderSession } = await apiClient.post('/resume/create-order', { otp: rawCode, resumeData: payload });
      const isGatewayReady = await embedRazorpay();
      if (!isGatewayReady) { toast.error('Checkout engine unavailable'); return; }
      
      const sessionConfig = {
        key: orderSession.keyId, amount: orderSession.amount, currency: orderSession.currency,
        name: 'CareerBridge Builder', description: 'Professional Architecture Engine', order_id: orderSession.orderId,
        prefill: { name: student?.name, email: student?.email, contact: student?.phone }, theme: { color: '#4f46e5' },
        handler: async (paymentReceipt) => {
          try {
            const { data: finalReceipt } = await apiClient.post('/resume/verify-payment', {
              razorpay_order_id: paymentReceipt.razorpay_order_id, razorpay_payment_id: paymentReceipt.razorpay_payment_id, razorpay_signature: paymentReceipt.razorpay_signature,
            });
            setGeneratedPdf(finalReceipt.resumeUrl); syncState({ resumeUrl: finalReceipt.resumeUrl });
            setCurrentPhase(4); toast.success('Architecture compiled successfully');
          } catch (e) { toast.error(e.response?.data?.message || 'Transaction validation failed'); }
        },
        modal: { ondismiss: () => toast.error('Transaction interrupted') },
      };
      new window.Razorpay(sessionConfig).open(); setCurrentPhase(3);
    } catch (error) { toast.error(error.response?.data?.message || 'Security validation rejected'); setSecurityCode(['','','','','','']); }
    setIsValidating(false);
  };

  if (currentPhase === 4) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" /></div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Deployment Successful</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Your CV has been dynamically compiled and mapped directly to your account profile database.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {generatedPdf && <a href={generatedPdf} download="Compiled_Resume.pdf" className="btn-primary px-6 py-3 font-semibold flex items-center justify-center gap-2"><DocumentTextIcon className="w-5 h-5" /> Download Asset</a>}
        <Link to="/profile" className="btn-secondary px-6 py-3 font-semibold">Dashboard Return</Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ProgressTracker phase={currentPhase} />
      {currentPhase === 1 && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><SparklesIcon className="w-6 h-6 text-amber-500" /> Professional Architecture Builder</h1><p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Provide your nodes and we'll compile the optimal structure.</p></div>
            <div className="flex flex-col items-end gap-1"><span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><LockClosedIcon className="w-3 h-3" /> PREMIUM TIER</span><span className="text-primary-600 dark:text-primary-400 font-bold text-lg">₹50</span></div>
          </div>
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Core Telemetry</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" value={resumeData.fullName} onChange={ev => patchData('fullName', ev.target.value)} placeholder="Full Name" className="input-field text-sm" />
                <input type="email" value={resumeData.email} onChange={ev => patchData('email', ev.target.value)} placeholder="Email Array" className="input-field text-sm" />
              </div>
            </div>
            <div className="card p-6 bg-gradient-to-r from-primary-50 to-teal-50 dark:from-primary-900/20 dark:to-teal-900/20">
              <div className="flex items-center justify-between">
                <div><p className="font-semibold text-gray-900 dark:text-white">Initialize Compilation?</p><p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Proceeding requires security verification and ₹50 transaction.</p></div>
                <button onClick={triggerSecurityCheck} disabled={isTransmitting} className="btn-primary flex items-center gap-2 px-6 py-3 font-semibold">{isTransmitting ? <><SpinnerFx /> Booting...</> : <>Engage <ArrowRightIcon className="w-4 h-4" /></>}</button>
              </div>
            </div>
          </div>
        </>
      )}
      {currentPhase === 2 && (
        <div className="card p-8 text-center max-w-md mx-auto">
          <EnvelopeIcon className="w-10 h-10 mx-auto text-primary-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Auth Required</h2>
          <input type="text" placeholder="Enter 6-digit code" className="input-field text-center text-xl tracking-widest font-bold mb-4" onChange={ev => setSecurityCode(ev.target.value.split(''))} />
          <button onClick={processPaymentGateway} disabled={isValidating} className="btn-primary w-full py-3">Validate & Open Checkout</button>
        </div>
      )}
    </div>
  );
};
export default ResumeBuilderPage;
