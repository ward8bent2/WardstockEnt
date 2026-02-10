
import React, { useState, useMemo } from 'react';
import { InventoryItem, Transaction, User } from '../types';

interface StockIntakeProps {
  inventory: InventoryItem[];
  transactions: Transaction[];
  currentUser: User | null;
  onAddStock: (itemId: string, quantity: number) => void;
  onTransfer: (itemId: string, quantity: number, toWard: string) => void;
}

export const StockIntake: React.FC<StockIntakeProps> = ({ inventory, transactions, currentUser, onAddStock, onTransfer }) => {
  const [activeTab, setActiveTab] = useState<'INTAKE' | 'TRANSFER'>('INTAKE');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [toWard, setToWard] = useState('');

  const logisticHistory = useMemo(() => 
    transactions.filter(t => t.type === 'INTAKE' || t.type === 'TRANSFER').reverse().slice(0, 10), 
    [transactions]
  );

  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || quantity <= 0) return;
    onAddStock(selectedItem, quantity);
    resetForm();
    alert('บันทึกรับเข้าคลังเรียบร้อยแล้ว');
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || quantity <= 0 || !toWard) return;
    
    const item = inventory.find(i => i.id === selectedItem);
    if (item && item.currentStock < quantity) {
      alert('จำนวนพัสดุในคลังไม่เพียงพอสำหรับการโอน');
      return;
    }
    
    onTransfer(selectedItem, quantity, toWard);
    resetForm();
    alert(`โอนพัสดุไปยัง ${toWard} เรียบร้อยแล้ว`);
  };

  const resetForm = () => {
    setSelectedItem('');
    setQuantity(0);
    setToWard('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Tab Switcher */}
      <div className="flex bg-white p-1.5 rounded-[24px] shadow-sm border border-gray-100 max-w-md mx-auto">
        <button 
          onClick={() => { setActiveTab('INTAKE'); resetForm(); }}
          className={`flex-1 flex items-center justify-center py-3 rounded-[18px] text-sm font-black transition-all ${activeTab === 'INTAKE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          รับพัสดุเข้า
        </button>
        <button 
          onClick={() => { setActiveTab('TRANSFER'); resetForm(); }}
          className={`flex-1 flex items-center justify-center py-3 rounded-[18px] text-sm font-black transition-all ${activeTab === 'TRANSFER' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          โอนย้ายพัสดุ
        </button>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-xl border border-gray-100 relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-2 ${activeTab === 'INTAKE' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
        
        <h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center tracking-tight">
          <div className={`${activeTab === 'INTAKE' ? 'bg-emerald-500' : 'bg-indigo-500'} text-white p-2 rounded-xl mr-3 shadow-lg`}>
            {activeTab === 'INTAKE' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            )}
          </div>
          {activeTab === 'INTAKE' ? 'บันทึกรับพัสดุเข้าคลัง' : 'โอนพัสดุไปหน่วยงานอื่น'}
        </h2>

        <form onSubmit={activeTab === 'INTAKE' ? handleIntakeSubmit : handleTransferSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">เลือกรายการพัสดุ</label>
              <select 
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className={`w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-${activeTab === 'INTAKE' ? 'emerald' : 'indigo'}-500 rounded-2xl outline-none appearance-none transition-all font-bold text-gray-700`}
                required
              >
                <option value="">-- เลือกรายการ --</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.unit}) - คงเหลือ: {item.currentStock}</option>
                ))}
              </select>
            </div>

            {activeTab === 'TRANSFER' && (
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">โอนไปที่หน่วยงาน (To)</label>
                <input 
                  type="text"
                  value={toWard}
                  onChange={(e) => setToWard(e.target.value)}
                  placeholder="เช่น Ward 4B, ER, OR"
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-gray-700 shadow-sm"
                  required
                />
              </div>
            )}

            <div className={activeTab === 'INTAKE' ? 'md:col-span-2' : ''}>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">จำนวนที่{activeTab === 'INTAKE' ? 'รับเข้า' : 'ต้องการโอน'}</label>
              <input 
                type="number"
                min="1"
                value={quantity || ''}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                placeholder="0"
                className={`w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-${activeTab === 'INTAKE' ? 'emerald' : 'indigo'}-500 rounded-2xl outline-none shadow-sm transition-all font-bold text-gray-700`}
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className={`w-full ${activeTab === 'INTAKE' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'} text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 text-lg flex items-center justify-center`}
          >
            {activeTab === 'INTAKE' ? 'ยืนยันการรับเข้าคลัง' : 'ยืนยันการโอนพัสดุ'}
          </button>
        </form>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-black text-gray-800 text-lg">ประวัติการเคลื่อนย้ายล่าสุด</h3>
          <span className="text-[10px] bg-white border border-gray-100 text-gray-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">In & Out History</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/30 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="py-4 px-8">วันเวลา</th>
                <th className="py-4 px-8">ประเภท</th>
                <th className="py-4 px-8">รายการ</th>
                <th className="py-4 px-8 text-center">จำนวน</th>
                <th className="py-4 px-8">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logisticHistory.length > 0 ? logisticHistory.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-8 text-xs text-gray-400 font-medium">
                    {new Date(t.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-4 px-8">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.type === 'INTAKE' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {t.type === 'INTAKE' ? 'รับเข้า' : 'โอนออก'}
                    </span>
                  </td>
                  <td className="py-4 px-8 font-bold text-gray-800">{t.itemName}</td>
                  <td className="py-4 px-8 text-center font-black">
                    <span className={t.type === 'INTAKE' ? 'text-emerald-600' : 'text-rose-500'}>
                      {t.type === 'INTAKE' ? '+' : '-'}{t.quantity}
                    </span>
                  </td>
                  <td className="py-4 px-8 text-xs text-gray-500 font-medium">
                    {t.type === 'TRANSFER' ? `ไปยัง ${t.toWard}` : `โดย ${t.performedBy || 'Unknown'}`}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 font-medium italic">ไม่พบประวัติการเคลื่อนย้าย</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
