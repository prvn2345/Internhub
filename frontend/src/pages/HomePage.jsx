import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';
import JobCard from '../components/common/JobCard';
import { PageLoader } from '../components/common/LoadingSpinner';

const CATEGORIES = [
  'Technology', 'Marketing', 'Finance', 'Design', 'Sales',
  'HR', 'Operations', 'Content', 'Data Science', 'Engineering',
];

const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await api.get('/jobs/featured');
        setFeaturedJobs(data.jobs);
      } catch (_) {}
      setLoading(false);
    };
    fetchFeatured();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (location) params.set('location', location);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {t('home.hero.title')}
          </h1>
          <p className="text-primary-100 text-lg mb-10 max-w-2xl mx-auto">
            {t('home.hero.subtitle')}
          </p>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-2 flex-1 px-3">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('home.hero.searchPlaceholder')}
                className="flex-1 outline-none text-gray-700 text-sm py-2 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 px-3 border-t sm:border-t-0 sm:border-l border-gray-200">
              <MapPinIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('home.hero.locationPlaceholder')}
                className="w-full sm:w-32 outline-none text-gray-700 text-sm py-2 bg-transparent"
              />
            </div>
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              {t('home.hero.searchBtn')}
            </button>
          </form>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: t('home.stats.jobs'), value: '10,000+' },
              { label: t('home.stats.companies'), value: '2,500+' },
              { label: t('home.stats.students'), value: '50,000+' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl md:text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {stat.value}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Browse by Category
        </h2>
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => navigate(`/jobs?category=${cat}`)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-400 transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('home.featured')}
          </h2>
          <button
            onClick={() => navigate('/jobs')}
            className="text-primary-600 dark:text-primary-400 font-medium text-sm hover:underline"
          >
            {t('home.viewAll')} →
          </button>
        </div>

        {loading ? (
          <PageLoader />
        ) : featuredJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('common.noData')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {featuredJobs.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
