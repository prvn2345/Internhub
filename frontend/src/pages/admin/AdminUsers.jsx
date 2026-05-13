import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircleIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon, LockClosedIcon, LockOpenIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PageLoader } from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';

const AdminUsers = () => {
  const { t } = useTranslation();
  const [userPool, setUserPool] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleSelect, setRoleSelect] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRoster = useCallback(async () => {
    setIsInitializing(true);
    try {
      const qParams = new URLSearchParams({ page: currentPage, limit: 15 });
      if (searchTerm) qParams.set('search', searchTerm);
      if (roleSelect) qParams.set('role', roleSelect);
      const { data } = await api.get(`/admin/users?${qParams}`);
      setUserPool(data.users); setTotalPages(data.pages); setTotalCount(data.total);
    } catch (err) { console.error('Roster pull failed'); }
    setIsInitializing(false);
  }, [currentPage, roleSelect, searchTerm]);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  const executeSearch = (e) => { e.preventDefault(); setCurrentPage(1); fetchRoster(); };

  const switchAccountState = async (uid) => {
    try {
      const { data } = await api.put(`/admin/users/${uid}/toggle-status`);
      setUserPool(userPool.map(u => u._id === uid ? { ...u, isActive: data.isActive } : u));
      toast.success(data.message);
    } catch (err) { toast.error('Account state mutation failed'); }
  };

  const purgeAccount = async (uid) => {
    if (!window.confirm('WARNING: Irreversible data purge. Proceed?')) return;
    try {
      await api.delete(`/admin/users/${uid}`);
      setUserPool(userPool.filter(u => u._id !== uid));
      toast.success('Account permanently purged');
    } catch (err) { toast.error('Purge sequence aborted'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
          {t('admin.users')} <span className="text-lg bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">{totalCount} accounts</span>
        </h1>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2 text-gray-500 font-bold text-sm"><AdjustmentsHorizontalIcon className="w-5 h-5" /> Filter Matrix:</div>
        <form onSubmit={executeSearch} className="flex flex-1 gap-2 min-w-[280px]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 font-bold" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Email or identity hash..." className="input-field pl-9 text-sm py-2 bg-white dark:bg-gray-900" />
          </div>
          <button type="submit" className="btn-primary text-sm px-5 py-2 font-bold shadow-sm">Query</button>
        </form>
        <select value={roleSelect} onChange={e => { setRoleSelect(e.target.value); setCurrentPage(1); }} className="input-field text-sm w-40 py-2 bg-white dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-200">
          <option value="">Any Clearance</option><option value="student">Student Class</option><option value="employer">Employer Class</option><option value="admin">System Admin</option>
        </select>
      </div>

      {isInitializing ? <PageLoader /> : (
        <>
          <div className="card overflow-hidden border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {['Identity', 'Clearance', 'Locale', 'Account State', 'Creation Stamp', 'Admin Overrides'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {userPool.map(node => (
                    <tr key={node._id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {node.profilePicture ? <img src={node.profilePicture} alt="Avatar" className="w-10 h-10 rounded-xl object-cover shadow-sm border border-gray-200 dark:border-gray-700" /> : <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0"><UserCircleIcon className="w-6 h-6 text-gray-400" /></div>}
                          <div><p className="font-bold text-gray-900 dark:text-white text-sm">{node.name}</p><p className="text-gray-500 text-xs font-medium mt-0.5">{node.email}</p></div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded border ${node.role === 'employer' ? 'bg-sky-50 text-sky-700 border-sky-200' : node.role === 'admin' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>{node.role}</span></td>
                      <td className="px-5 py-4 text-gray-500 font-bold uppercase text-xs">{node.languagePreference}</td>
                      <td className="px-5 py-4"><span className={`flex items-center gap-1.5 text-xs font-bold ${node.isActive ? 'text-emerald-600' : 'text-red-500'}`}><span className={`w-2 h-2 rounded-full ${node.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />{node.isActive ? 'AUTHORIZED' : 'SUSPENDED'}</span></td>
                      <td className="px-5 py-4 text-gray-500 font-semibold text-xs">{new Date(node.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-5 py-4">
                        {node.role !== 'admin' ? (
                          <div className="flex gap-2">
                            <button onClick={() => switchAccountState(node._id)} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${node.isActive ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>
                              {node.isActive ? <><LockClosedIcon className="w-3.5 h-3.5"/> Suspend</> : <><LockOpenIcon className="w-3.5 h-3.5"/> Unban</>}
                            </button>
                            <button onClick={() => purgeAccount(node._id)} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"><TrashIcon className="w-3.5 h-3.5" /> Purge</button>
                          </div>
                        ) : <span className="text-gray-400 text-xs italic font-medium px-2">Root Immunity</span>}
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
export default AdminUsers;
