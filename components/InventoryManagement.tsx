
import React, { useState } from 'react';
import { InventoryItem } from '../types';

interface InventoryManagementProps {
  inventory: InventoryItem[];
  onUpsertItem: (item: Partial<InventoryItem>) => void;
  onToggleStatus: (itemId: string) => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({ inventory, onUpsertItem, onToggleStatus }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Medical Supply',
    unit: '',
    minLevel: 0,
    maxLevel: 100,
    currentStock: 0,
  });

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: '', category: 'Medical Supply', unit: '', minLevel: 0, maxLevel: 100, currentStock: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({ 
      name: item.name, 
      category: item.category, 
      unit: item.unit, 
      minLevel: item.minLevel,
      maxLevel: item.maxLevel || 100,
      currentStock: item.currentStock
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpsertItem({
      id: editingItem?.id,
      ...formData,
      isActive: editingItem ? editingItem.isActive : true,
    });
    setIsModalOpen(false);
  };

  const quickAdjust = (item: InventoryItem, delta: number) => {
    onUpsertItem({
      id: item.id,
      currentStock: Math.max(0, item.currentStock + delta)
    });
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-gray-800 flex items-center tracking-tight">
          <div className="bg-indigo-600 text-white p-2 rounded-xl mr-3 shadow-lg shadow-indigo-100">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          จัดการรายการพัสดุ (Min-Max)
        </h2>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-indigo-100 flex items-center transition-all active:scale-95"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
          เพิ่มพัสดุใหม่
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <input 
              type="text"
              placeholder="ค้นหาชื่อพัสดุ..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="py-5 px-8">พัสดุ</th>
                <th className="py-5 px-8 text-center">ปรับแต่งสต็อก</th>
                <th className="py-5 px-8 text-center">จำนวนปัจจุบัน</th>
                <th className="py-5 px-8 text-center">Min / Max</th>
                <th className="py-5 px-8 text-center">สถานะ</th>
                <th className="py-5 px-8 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInventory.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors group ${!item.isActive ? 'opacity-50' : ''}`}>
                  <td className="py-5 px-8">
                    <div className="font-bold text-gray-800">{item.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.category} | {item.unit}</div>
                  </td>
                  <td className="py-5 px-8">
                    <div className="flex items-center justify-center space-x-3">
                      <button 
                        onClick={() => quickAdjust(item, -1)}
                        className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-all active:scale-90"
                        title="ลดสต็อก"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"/></svg>
                      </button>
                      <button 
                        onClick={() => quickAdjust(item, 1)}
                        className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-all active:scale-90"
                        title="เพิ่มสต็อก"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                      </button>
                    </div>
                  </td>
                  <td className="py-5 px-8 text-center">
                    <span className={`text-xl font-black ${item.currentStock <= item.minLevel ? 'text-rose-600' : 'text-indigo-600'}`}>
                      {item.currentStock}
                    </span>
                  </td>
                  <td className="py-5 px-8 text-center">
                    <div className="text-xs font-bold text-gray-600">Min: <span className="text-rose-500">{item.minLevel}</span></div>
                    <div className="text-xs font-bold text-gray-600">Max: <span className="text-emerald-500">{item.maxLevel || '-'}</span></div>
                  </td>
                  <td className="py-5 px-8 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {item.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <button 
                      onClick={() => openEditModal(item)}
                      className="p-3 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 animate-scaleIn border border-gray-100 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-2 bg-indigo-600"></div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black text-gray-800 tracking-tighter">
                {editingItem ? 'แก้ไขพัสดุ' : 'เพิ่มพัสดุใหม่'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">ชื่อรายการพัสดุ</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-gray-700 transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">หมวดหมู่</label>
                  <select 
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-gray-700 appearance-none"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option>Medical Supply</option>
                    <option>PPE</option>
                    <option>Sanitizer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">หน่วยนับ</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-gray-700"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-6 bg-indigo-50/30 rounded-[32px] border border-indigo-50">
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">สต็อกปัจจุบัน</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-3 bg-white border-none rounded-xl font-black text-center"
                    value={formData.currentStock}
                    onChange={e => setFormData({...formData, currentStock: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">จุดสั่งซื้อ (Min)</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-3 bg-white border-none rounded-xl font-black text-center"
                    value={formData.minLevel}
                    onChange={e => setFormData({...formData, minLevel: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">สูงสุด (Max)</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-3 bg-white border-none rounded-xl font-black text-center"
                    value={formData.maxLevel}
                    onChange={e => setFormData({...formData, maxLevel: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button 
                  type="submit"
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
