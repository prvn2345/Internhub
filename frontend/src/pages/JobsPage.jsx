import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';
import JobCard from '../components/common/JobCard';
import Pagination from '../components/common/Pagination';
import { PageLoader } from '../components/common/LoadingSpinner';

const CATEGORIES = [
  'Technology', 'Marketing', 'Finance', 'Design', 'Sales',
  'HR', 'Operations', 'Content', 'Data Science', 'Engineering',
];

const JobsPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    location: searchParams.get('location') || '',
    category: searchParams.get('category') || '',
    type: searchParams.get('type') || '',
    minStipend: '',
    maxStipend: '',
    isRemote: false,
    page: 1,
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== '' && val !== false) params.set(key, val);
      });
      const { data } = await api.get(`/jobs?${params.toString()}`);
      setJobs(data.jobs);
      setTotal(data.total);
      setPages(data.pages);
    } catch (_) {}
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '', location: '', category: '', type: '',
      minStipend: '', maxStipend: '', isRemote: false, page: 1,
    });
    setSearchParams({});
  };

  const hasActiveFilters = filters.search || filters.location || filters.category ||
    filters.type || filters.minStipend || filters.maxStipend || filters.isRemote;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('jobs.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {total} opportunities found
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 btn-secondary text-sm md:hidden"
        >
          <AdjustmentsHorizontalIcon className="w-4 h-4" />
          {t('jobs.filters')}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <aside
          className={`${
            showFilters ? 'block' : 'hidden'
          } md:block w-full md:w-64 flex-shrink-0`}
        >
          <div className="card p-4 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">{t('jobs.filters')}</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-red-500 hover:underline flex items-center gap-1"
                >
                  <XMarkIcon className="w-3 h-3" />
                  {t('common.clear')}
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Search */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('common.search')}
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  placeholder="Job title, skills..."
                  className="input-field text-sm"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('jobs.location')}
                </label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => updateFilter('location', e.target.value)}
                  placeholder="City, state..."
                  className="input-field text-sm"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('jobs.type')}
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => updateFilter('type', e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">All Types</option>
                  <option value="internship">{t('jobs.internship')}</option>
                  <option value="job">{t('jobs.job')}</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('jobs.category')}
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Stipend Range */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('jobs.stipend')} (₹/month)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.minStipend}
                    onChange={(e) => updateFilter('minStipend', e.target.value)}
                    placeholder="Min"
                    className="input-field text-sm w-1/2"
                  />
                  <input
                    type="number"
                    value={filters.maxStipend}
                    onChange={(e) => updateFilter('maxStipend', e.target.value)}
                    placeholder="Max"
                    className="input-field text-sm w-1/2"
                  />
                </div>
              </div>

              {/* Remote */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isRemote}
                  onChange={(e) => updateFilter('isRemote', e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">{t('jobs.remote')}</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Job Listings */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <PageLoader />
          ) : jobs.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">{t('jobs.noJobs')}</p>
              <button onClick={clearFilters} className="btn-primary mt-4 text-sm">
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))}
              </div>
              <Pagination
                page={filters.page}
                pages={pages}
                onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobsPage;
