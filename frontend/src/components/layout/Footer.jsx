import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CB</span>
              </div>
              <span className="font-bold text-xl text-white">CareerBridge</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Connecting students and professionals with top companies worldwide. Find your dream internship or job today.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">For Students</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/jobs" className="hover:text-white transition-colors">Browse Internships</Link></li>
              <li><Link to="/jobs?type=job" className="hover:text-white transition-colors">Browse Jobs</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Create Profile</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">For Employers</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/register?role=employer" className="hover:text-white transition-colors">Post a Job</Link></li>
              <li><Link to="/employer/dashboard" className="hover:text-white transition-colors">Employer Dashboard</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} CareerBridge. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
