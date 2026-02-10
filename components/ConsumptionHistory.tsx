
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';

interface ConsumptionHistoryProps {
  transactions: Transaction[];
}

type Period = 'WEEK' | 'MONTH' | 'ALL';

export const ConsumptionHistory: React.FC<ConsumptionHistoryProps> = ({ transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<Period>('WEEK');
  
  const consumptionData = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(t => t.type === 'USAGE')
      .filter(t => {
        // Search filter
        const matchesSearch = t.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (t.bedNumber && t.bedNumber.includes(searchTerm));
        if (!matchesSearch) return false;

        // Period filter
        const tDate = new Date(t.timestamp);
        if (period === 'WEEK') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return tDate >= weekAgo;
        } else if (period === 'MONTH') {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          return tDate >= monthAgo;
        }
        return true; // 'ALL'
      })
      .reverse();
  }, [transactions, searchTerm, period]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-gray-800 flex items-center tracking-tight">
          <div className="bg-amber-500 text-white p-2 rounded-xl mr-3 shadow-lg shadow-amber-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          ประวัติการตัดสต็อกพัสดุ
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {(['WEEK', 'MONTH', 'ALL'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  period === p 
                  ? 'bg-white text-amber-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {p === 'WEEK' ? 'สัปดาห์นี้' : p === 'MONTH' ? 'เดือนนี้' : 'ทั้งหมด'}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <input 
              type="text"
              placeholder="ค้นหาชื่อพัสดุ หรือ เลขเตียง..."
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64 font-medium text-sm transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-4 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="py-5 px-8">วันเวลา</th>
                <th className="py-5 px-8">รายการพัสดุ</th>
                <th className="py-5 px-8 text-center">เตียง/วอร์ด</th>
                <th className="py-5 px-8 text-center">จำนวนที่ใช้</th>
                <th className="py-5 px-8">ผู้บันทึก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {consumptionData.length > 0 ? consumptionData.map((t) => (
                <tr key={t.id} className="hover:bg-amber-50/10 transition-colors group">
                  <td className="py-4 px-8 text-xs text-gray-400 font-medium">{new Date(t.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="py-4 px-8 font-bold text-gray-800">{t.itemName}</td>
                  <td className="py-4 px-8 text-center">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black tracking-tight">{t.bedNumber || '-'}</span>
                  </td>
                  <td className="py-4 px-8 text-center">
                    <span className="font-black text-gray-900 text-lg">{t.quantity}</span>
                  </td>
                  <td className="py-4 px-8 text-xs text-gray-500 font-bold group-hover:text-amber-600 transition-colors">{t.performedBy}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-gray-400 font-medium italic bg-gray-50/20">
                    ไม่พบรายการบันทึกในช่วงเวลาที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
