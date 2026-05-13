import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PageLoader } from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';

const AdminJobs = () => {
  const { t } = useTranslation();
  const [jobRegistry, setJobRegistry] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [queryTerm, setQueryTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const pullRegistry = useCallback(async () => {
    setIsFetching(true);
    try {
      const qParams = new URLSearchParams({ page: currentPage, limit: 15 });
      if (queryTerm) qParams.set('search', queryTerm);
      if (activeFilter) qParams.set('status', activeFilter);
      const { data } = await api.get(`/admin/jobs?${qParams}`);
      setJobRegistry(data.jobs); setTotalPages(data.pages); setTotalCount(data.total);
    } catch (err) { console.error('Registry sync failed'); }
    setIsFetching(false);
  }, [currentPage, activeFilter, queryTerm]);

  useEffect(() => { pullRegistry(); }, [pullRegistry]);

  const modifyJobState = async (targetId, newState) => {
    try {
      await api.put(`/admin/jobs/${targetId}/status`, { status: newState });
      setJobRegistry(prev => prev.map(j => j._id === targetId ? { ...j, status: newState } : j));
      toast.success('Listing state synchronized');
    } catch (err) { toast.error('State sync failed'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
          {t('admin.jobs')} <span className="text-lg bg-primary-100 text-primary-700 px-3 py-1 rounded-full font-bold">{totalCount} items</span>
        </h1>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2 text-gray-500 font-bold text-sm"><AdjustmentsHorizontalIcon className="w-5 h-5" /> Filters:</div>
        <form onSubmit={e => { e.preventDefault(); setCurrentPage(1); pullRegistry(); }} className="flex flex-1 gap-2 min-w-[280px]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 font-bold" />
            <input type="text" value={queryTerm} onChange={e => setQueryTerm(e.target.value)} placeholder="Query database..." className="input-field pl-9 text-sm py-2 bg-white dark:bg-gray-900" />
          </div>
          <button type="submit" className="btn-primary text-sm px-5 py-2 font-bold shadow-sm">Execute</button>
        </form>
        <select value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setCurrentPage(1); }} className="input-field text-sm w-40 py-2 bg-white dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-200">
          <option value="">Any State</option><option value="active">Live (Active)</option><option value="closed">Halted (Closed)</option><option value="draft">Pending (Draft)</option>
        </select>
      </div>

      {isFetching ? <PageLoader /> : (
        <>
          <div className="card overflow-hidden border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {['Listing Context', 'Organization', 'Format', 'Pool Size', 'State', 'Override'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {jobRegistry.map((item) => (
                    <tr key={item._id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                      <td className="px-5 py-4">
                        <Link to={`/jobs/${item._id}`} className="font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 block mb-0.5">{item.title}</Link>
                        <p className="text-gray-400 text-xs font-medium flex items-center gap-1">{item.location}</p>
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-700 dark:text-gray-300">{item.company}</td>
                      <td className="px-5 py-4"><span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded border ${item.type === 'internship' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{item.type}</span></td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-400 font-bold">{item.applicationsCount || 0}</td>
                      <td className="px-5 py-4"><span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full ${item.status === 'active' ? 'bg-green-100 text-green-700' : item.status === 'closed' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>{item.status}</span></td>
                      <td className="px-5 py-4">
                        <select value={item.status} onChange={e => modifyJobState(item._id, e.target.value)} className="text-xs font-bold border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 cursor-pointer shadow-sm">
                          <option value="active">Set Active</option><option value="closed">Set Closed</option><option value="draft">Set Draft</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-6"><Pagination page={currentPage} pages={totalPages} onPageChange={setCurrentPage} /></div>
        </>
      )}
    </div>
  );
};
export default AdminJobs;
