import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  SparklesIcon, PlusIcon, TrashIcon, CheckCircleIcon,
  LockClosedIcon, EnvelopeIcon, CreditCardIcon,
  DocumentTextIcon, ArrowLeftIcon, ArrowRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import apiClient from '../../api/axios';
import useAuthStore from '../../store/authStore';

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const Spin = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const STEPS = ['Resume Details', 'Verify Email', 'Payment', 'Done'];
const StepBar = ({ current }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {STEPS.map((label, i) => {
      const n = i + 1;
      const done = current > n; const active = current === n;
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${done ? 'bg-green-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
              {done ? '✓' : n}
            </div>
            <span className={`text-xs hidden sm:block ${active ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-400'}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`w-10 h-0.5 mb-4 ${done ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
        </React.Fragment>
      );
    })}
  </div>
);

const OTPBoxes = ({ otp, setOtp }) => {
  const refs = React.useRef([]);
  const handleChange = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const n = [...otp]; n[i] = v.slice(-1); setOtp(n);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKey = (i, e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus(); };
  const handlePaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const n = [...otp]; p.split('').forEach((c, i) => { if (i < 6) n[i] = c; }); setOtp(n);
    refs.current[Math.min(p.length, 5)]?.focus();
  };
  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {otp.map((d, i) => (
        <input key={i} ref={el => refs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKey(i, e)}
          className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl focus:outline-none dark:bg-gray-700 dark:text-white transition-all ${d ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'}`}
          aria-label={`OTP digit ${i + 1}`} />
      ))}
    </div>
  );
};

const ResumeBuilderPage = () => {
  const { currentUser: user, updateUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: user?.name || '', email: user?.email || '',
    phone: user?.phone || '', location: user?.location || '',
    linkedin: '', portfolio: '', objective: '',
    skills: user?.skills?.join(', ') || '',
    languages: '', certifications: '',
    education: (user?.education || []).map(e => ({ degree: e.degree||'', institution: e.institution||'', year: e.year||'', grade: e.percentage||'' })),
    experience: (user?.experience || []).map(e => ({ title: e.designation||'', company: e.organisation||'', duration: e.tenure||'', description: e.summary||'' })),
    projects: [{ name: '', description: '', link: '' }],
  });
  const [otp, setOtp] = useState(['','','','','','']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resumeUrl, setResumeUrl] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const upd = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const addRow = (key, blank) => setForm(f => ({ ...f, [key]: [...f[key], blank] }));
  const updRow = (key, i, field, val) => { const arr = [...form[key]]; arr[i] = { ...arr[i], [field]: val }; upd(key, arr); };
  const delRow = (key, i) => upd(key, form[key].filter((_, idx) => idx !== i));

  const buildResumeData = () => ({
    ...form,
    skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
    languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
    certifications: form.certifications.split(',').map(s => s.trim()).filter(Boolean),
  });

  const handleSendOTP = async () => {
    if (!form.fullName || !form.email) { toast.error('Please fill in at least your name and email'); return; }
    setSending(true);
    try {
      await apiClient.post('/resume/send-otp');
      toast.success(`OTP sent to ${user?.email}`);
      setStep(2); setCountdown(60);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send OTP'); }
    setSending(false);
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Enter the complete 6-digit OTP'); return; }
    setVerifying(true);
    try {
      const resumeData = buildResumeData();
      const { data } = await apiClient.post('/resume/create-order', { otp: code, resumeData });
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error('Failed to load payment gateway'); return; }
      const options = {
        key: data.keyId, amount: data.amount, currency: data.currency,
        name: 'CareerBridge Premium', description: 'Professional Resume Generation (₹50)',
        order_id: data.orderId,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#4f46e5' },
        // Enable all payment methods including UPI
        config: {
          display: {
            blocks: {
              upi: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] },
              other: { name: 'Other Payment Methods', instruments: [{ method: 'card' }, { method: 'netbanking' }, { method: 'wallet' }] },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async (response) => {
          try {
            const res = await apiClient.post('/resume/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setResumeUrl(res.data.resumeUrl);
            updateUser({ resumeUrl: res.data.resumeUrl });
            setStep(4);
            toast.success('Resume generated and attached to your profile!');
          } catch (e) { toast.error(e.response?.data?.message || 'Payment verification failed'); }
        },
        modal: { ondismiss: () => toast.error('Payment cancelled') },
      };
      const rzp = new window.Razorpay(options);
      rzp.open(); setStep(3);
    } catch (err) { toast.error(err.response?.data?.message || 'OTP verification failed'); setOtp(['','','','','','']); }
    setVerifying(false);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setSending(true);
    try { await apiClient.post('/resume/send-otp'); toast.success('New OTP sent!'); setOtp(['','','','','','']); setCountdown(60); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to resend OTP'); }
    setSending(false);
  };

  if (step === 4) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Your Resume is Ready!</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
        Your professional resume has been generated and automatically attached to your profile for all future applications.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {resumeUrl && (
          <a
            href={resumeUrl}
            download="CareerBridge_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary px-6 py-3 font-semibold flex items-center justify-center gap-2"
          >
            <DocumentTextIcon className="w-5 h-5" /> Download Resume (PDF)
          </a>
        )}
        <Link to="/profile" className="btn-secondary px-6 py-3 font-semibold">Go to Profile</Link>
      </div>
      {resumeUrl && (
        <p className="text-gray-400 text-xs mt-4">
          Your resume is also saved in your profile and will be used for all future applications.
        </p>
      )}
    </div>
  );

  if (step === 3) return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <StepBar current={3} />
      <div className="card p-8">
        <CreditCardIcon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Complete Payment</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">The Razorpay payment window should have opened. Complete the ₹50 payment to generate your resume.</p>
        <button onClick={() => setStep(2)} className="btn-secondary mt-4 text-sm">← Go Back</button>
      </div>
    </div>
  );

  if (step === 2) return (
    <div className="max-w-md mx-auto px-4 py-8">
      <StepBar current={2} />
      <div className="card p-8 text-center">
        <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <EnvelopeIcon className="w-7 h-7 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Verify Your Email</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">A 6-digit OTP was sent to</p>
        <p className="text-primary-600 dark:text-primary-400 font-semibold text-sm mb-2">{user?.email}</p>
        <p className="text-gray-400 text-xs mb-6">This verifies your identity before the ₹50 payment is processed.</p>
        <OTPBoxes otp={otp} setOtp={setOtp} />
        <button onClick={handleVerifyOTP} disabled={verifying || otp.join('').length !== 6}
          className="btn-primary w-full py-3 font-semibold mt-6">
          {verifying ? <span className="flex items-center justify-center gap-2"><Spin /> Verifying...</span> : 'Verify & Proceed to Payment →'}
        </button>
        <div className="flex items-center justify-between mt-4 text-sm">
          <button onClick={() => setStep(1)} className="text-gray-500 hover:text-primary-600 transition-colors flex items-center gap-1">
            <ArrowLeftIcon className="w-3.5 h-3.5" /> Back
          </button>
          <button onClick={handleResend} disabled={countdown > 0 || sending}
            className="text-primary-600 dark:text-primary-400 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed">
            {countdown > 0 ? `Resend (${countdown}s)` : sending ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <StepBar current={1} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-amber-500" /> Resume Builder
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Fill in your details and we'll generate a professional PDF resume.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <LockClosedIcon className="w-3 h-3" /> PREMIUM
          </span>
          <span className="text-primary-600 dark:text-primary-400 font-bold text-lg">₹50</span>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
        <ExclamationTriangleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-0.5">How it works</p>
          <p>Fill the form → Verify email OTP → Pay ₹50 via Razorpay → Get your PDF resume automatically attached to your profile.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Full Name *', key: 'fullName', type: 'text', ph: 'John Doe' },
              { label: 'Email *', key: 'email', type: 'email', ph: 'you@example.com' },
              { label: 'Phone', key: 'phone', type: 'tel', ph: '+91 98765 43210' },
              { label: 'Location', key: 'location', type: 'text', ph: 'City, State' },
              { label: 'LinkedIn URL', key: 'linkedin', type: 'url', ph: 'linkedin.com/in/...' },
              { label: 'Portfolio URL', key: 'portfolio', type: 'url', ph: 'yoursite.com' },
            ].map(({ label, key, type, ph }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                <input type={type} value={form[key]} onChange={e => upd(key, e.target.value)} placeholder={ph} className="input-field text-sm" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Career Objective / Summary</label>
              <textarea value={form.objective} onChange={e => upd('objective', e.target.value)} rows={3}
                placeholder="A brief summary of your career goals and strengths..." className="input-field text-sm resize-none" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Education</h2>
            <button type="button" onClick={() => addRow('education', { degree:'', institution:'', year:'', grade:'' })}
              className="btn-secondary text-xs flex items-center gap-1"><PlusIcon className="w-3.5 h-3.5" /> Add</button>
          </div>
          {form.education.map((edu, i) => (
            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-3">
              <div className="grid grid-cols-2 gap-3">
                {[{ label:'Degree / Qualification', key:'degree', ph:'B.Tech Computer Science' },{ label:'Institution', key:'institution', ph:'University Name' },{ label:'Year', key:'year', ph:'2020 – 2024' },{ label:'Grade / CGPA', key:'grade', ph:'8.5 / 10' }].map(({ label, key, ph }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input type="text" value={edu[key]} onChange={e => updRow('education', i, key, e.target.value)} placeholder={ph} className="input-field text-sm" />
                  </div>
                ))}
              </div>
              <button onClick={() => delRow('education', i)} className="text-red-500 text-xs mt-2 hover:underline">Remove</button>
            </div>
          ))}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Work Experience</h2>
            <button type="button" onClick={() => addRow('experience', { title:'', company:'', duration:'', description:'' })}
              className="btn-secondary text-xs flex items-center gap-1"><PlusIcon className="w-3.5 h-3.5" /> Add</button>
          </div>
          {form.experience.map((exp, i) => (
            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-3">
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[{ label:'Job Title', key:'title', ph:'Frontend Developer Intern' },{ label:'Company', key:'company', ph:'Company Name' },{ label:'Duration', key:'duration', ph:'Jun 2023 – Aug 2023' }].map(({ label, key, ph }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input type="text" value={exp[key]} onChange={e => updRow('experience', i, key, e.target.value)} placeholder={ph} className="input-field text-sm" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea value={exp.description} onChange={e => updRow('experience', i, 'description', e.target.value)} rows={2}
                  placeholder="Key responsibilities and achievements..." className="input-field text-sm resize-none" />
              </div>
              <button onClick={() => delRow('experience', i)} className="text-red-500 text-xs mt-2 hover:underline">Remove</button>
            </div>
          ))}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Projects</h2>
            <button type="button" onClick={() => addRow('projects', { name:'', description:'', link:'' })}
              className="btn-secondary text-xs flex items-center gap-1"><PlusIcon className="w-3.5 h-3.5" /> Add</button>
          </div>
          {form.projects.map((proj, i) => (
            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-3">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Project Name</label>
                  <input type="text" value={proj.name} onChange={e => updRow('projects', i, 'name', e.target.value)} placeholder="My Awesome Project" className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Link (optional)</label>
                  <input type="url" value={proj.link} onChange={e => updRow('projects', i, 'link', e.target.value)} placeholder="github.com/..." className="input-field text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea value={proj.description} onChange={e => updRow('projects', i, 'description', e.target.value)} rows={2}
                  placeholder="What the project does and technologies used..." className="input-field text-sm resize-none" />
              </div>
              <button onClick={() => delRow('projects', i)} className="text-red-500 text-xs mt-2 hover:underline">Remove</button>
            </div>
          ))}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Skills & More</h2>
          <div className="space-y-4">
            {[
              { label: 'Skills (comma-separated)', key: 'skills', ph: 'React, Node.js, Python, SQL' },
              { label: 'Languages (comma-separated)', key: 'languages', ph: 'English, Hindi, Telugu' },
              { label: 'Certifications (comma-separated)', key: 'certifications', ph: 'AWS Cloud Practitioner, Google Analytics' },
            ].map(({ label, key, ph }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                <input type="text" value={form[key]} onChange={e => upd(key, e.target.value)} placeholder={ph} className="input-field text-sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Ready to generate your resume?</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">You'll verify your email and pay ₹50 in the next steps.</p>
            </div>
            <button onClick={handleSendOTP} disabled={sending || !form.fullName || !form.email}
              className="btn-primary flex items-center gap-2 px-6 py-3 font-semibold">
              {sending ? <><Spin /> Sending OTP...</> : <>Continue <ArrowRightIcon className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilderPage;
