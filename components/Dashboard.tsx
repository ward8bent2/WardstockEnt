
import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { InventoryItem, Transaction } from '../types';
import { getStockInsights } from '../services/geminiService';

interface DashboardProps {
  inventory: InventoryItem[];
  transactions: Transaction[];
}

type Period = 'WEEK' | 'MONTH' | 'YEAR';

export const Dashboard: React.FC<DashboardProps> = ({ inventory, transactions }) => {
  const [aiInsight, setAiInsight] = useState<string>('กำลังวิเคราะห์ข้อมูลด้วย Gemini AI...');
  const [period, setPeriod] = useState<Period>('WEEK');
  
  const activeItems = inventory.filter(i => i.isActive);

  // Filter transactions based on selected period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const tDate = new Date(t.timestamp);
      if (period === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return tDate >= weekAgo;
      } else if (period === 'MONTH') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        return tDate >= monthAgo;
      } else {
        const yearAgo = new Date();
        yearAgo.setFullYear(now.getFullYear() - 1);
        return tDate >= yearAgo;
      }
    });
  }, [transactions, period]);

  useEffect(() => {
    const fetchInsight = async () => {
      if (activeItems.length > 0) {
        const insight = await getStockInsights(activeItems, filteredTransactions);
        setAiInsight(insight || '');
      }
    };
    fetchInsight();
  }, [inventory, filteredTransactions]);

  const lowStockItems = activeItems.filter(item => item.currentStock <= item.minLevel);
  const usageCount = filteredTransactions.filter(t => t.type === 'USAGE').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Dashboard สรุปภาพรวม</h2>
        
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {(['WEEK', 'MONTH', 'YEAR'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                period === p 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {p === 'WEEK' ? 'รายสัปดาห์' : p === 'MONTH' ? 'รายเดือน' : 'รายปี'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          </div>
          <div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">พัสดุใช้งาน</h3>
            <p className="text-2xl font-black text-gray-800">{activeItems.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">สต็อกต่ำกว่าเกณฑ์</h3>
            <p className="text-2xl font-black text-rose-600">{lowStockItems.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">การเบิกใช้ ({period})</h3>
            <p className="text-2xl font-black text-emerald-600">{usageCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center">
             ระดับสต็อกคงเหลือปัจจุบัน
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeItems}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-35} textAnchor="end" height={60} stroke="#94a3b8" />
                <YAxis fontSize={12} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="currentStock" name="สต็อกปัจจุบัน" radius={[4, 4, 0, 0]}>
                  {activeItems.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.currentStock <= entry.minLevel ? '#f43f5e' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center">
            <span className="mr-2">✨</span> AI Insights (Gemini)
          </h3>
          <div className="bg-blue-50/50 p-6 rounded-2xl text-sm text-blue-900 leading-relaxed overflow-y-auto max-h-72 whitespace-pre-line border border-blue-100">
            {aiInsight}
          </div>
        </div>
      </div>
    </div>
  );
};
