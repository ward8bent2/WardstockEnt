
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, User } from '../types';
import { ScannerModal } from './ScannerModal';

interface StockUsageProps {
  inventory: InventoryItem[];
  currentUser: User | null;
  onRecordUsage: (usageItems: { itemId: string, quantity: number, bedNumber: string }[]) => void;
}

interface PendingItem {
  tempId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  location: string;
  unit: string;
}

export const StockUsage: React.FC<StockUsageProps> = ({ inventory, currentUser, onRecordUsage }) => {
  const [bedNumber, setBedNumber] = useState('');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // ตรวจสอบ URL parameter 'item' เพื่อใส่ข้อมูลลงในตารางอัตโนมัติ
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const itemNameParam = params.get('item');
    if (itemNameParam && inventory.length > 0) {
      const item = inventory.find(i => i.name === itemNameParam);
      if (item) {
        // ตรวจสอบว่ามีในรายการแล้วหรือยัง (ป้องกันการเพิ่มซ้ำหาก state re-render)
        setPendingItems(prev => {
          if (prev.some(p => p.itemId === item.id)) return prev;
          return [...prev, {
            tempId: Math.random().toString(36).substr(2, 9),
            itemId: item.id,
            itemName: item.name,
            quantity: 1,
            location: currentUser?.ward || '',
            unit: item.unit
          }];
        });
        
        // หากยังไม่ได้ระบุวอร์ด/เตียง ให้ใส่ค่าเริ่มต้นจาก currentUser
        if (!bedNumber) {
          setBedNumber(currentUser?.ward || '');
        }
      }
    }
  }, [inventory, currentUser]);

  const handleScanResult = (itemId: string, quantity: number, location: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const newItem: PendingItem = {
      tempId: Math.random().toString(36).substr(2, 9),
      itemId,
      itemName: item.name,
      quantity,
      location,
      unit: item.unit
    };

    setPendingItems(prev => [...prev, newItem]);
    if (!bedNumber) setBedNumber(location);
  };

  const removePendingItem = (tempId: string) => {
    setPendingItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const updatePendingQty = (tempId: string, delta: number) => {
    setPendingItems(prev => prev.map(item => {
      if (item.tempId === tempId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedNumber && pendingItems.length > 0) {
      alert('กรุณาระบุเลขเตียงหรือวอร์ดหลัก');
      return;
    }

    if (pendingItems.length === 0) {
      alert('กรุณาสแกนพัสดุที่เบิกใช้อย่างน้อย 1 รายการ');
      return;
    }

    const usageList = pendingItems.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      bedNumber: item.location || bedNumber
    }));

    onRecordUsage(usageList);
    setBedNumber('');
    setPendingItems([]);
    
    // เคลียร์ URL parameter หลังจากการบันทึก เพื่อป้องกันการโหลดซ้ำในครั้งถัดไป
    const url = new URL(window.location.href);
    url.searchParams.delete('item');
    window.history.replaceState({}, '', url);
  };

  const totalQty = useMemo(() => pendingItems.reduce((acc, curr) => acc + curr.quantity, 0), [pendingItems]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        inventory={inventory}
        defaultWard={currentUser?.ward || ''}
        onScanResult={handleScanResult}
      />

      <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-800 flex items-center tracking-tight">
              <div className="bg-blue-600 text-white p-2 rounded-xl mr-3 shadow-lg shadow-blue-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              รายการเตรียมตัดสต็อกจบเวร
            </h2>
            <p className="text-gray-400 text-sm mt-1 font-medium italic">สแกนพัสดุที่ใช้งานแล้วระบบจะรวมรายการให้ด้านล่าง</p>
          </div>
          
          <button 
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center transition-all active:scale-95 space-x-3 group"
          >
            <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
            </div>
            <span className="text-lg">เริ่มสแกนพัสดุ</span>
          </button>
        </div>

        {pendingItems.length > 0 ? (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <div className="flex items-center mb-4">
                <div className="w-2 h-8 bg-blue-600 rounded-full mr-3"></div>
                <label className="block text-sm font-black text-blue-800 uppercase tracking-widest">ข้อมูลอ้างอิงหลัก</label>
              </div>
              <input 
                type="text" 
                placeholder="ระบุเลขเตียง หรือ วอร์ด (หากต้องการใช้ค่าเริ่มต้น)"
                className="w-full px-5 py-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none shadow-sm transition-all font-bold text-gray-700"
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
              />
            </div>

            <div className="border rounded-3xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="py-4 px-6 font-black text-gray-400 text-[10px] uppercase tracking-widest">รายการที่สแกน</th>
                    <th className="py-4 px-6 font-black text-gray-400 text-[10px] uppercase tracking-widest text-center">วอร์ด/เตียง</th>
                    <th className="py-4 px-6 font-black text-gray-400 text-[10px] uppercase tracking-widest text-center">จำนวน</th>
                    <th className="py-4 px-6 font-black text-gray-400 text-[10px] uppercase tracking-widest text-right">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingItems.map(item => (
                    <tr key={item.tempId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-5 px-6">
                        <div className="font-bold text-gray-800">{item.itemName}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{item.unit}</div>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-black tracking-tight">{item.location}</span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center justify-center space-x-3">
                          <button 
                            type="button"
                            onClick={() => updatePendingQty(item.tempId, -1)}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"/></svg>
                          </button>
                          <span className="w-6 text-center font-black text-lg text-blue-600">{item.quantity}</span>
                          <button 
                            type="button"
                            onClick={() => updatePendingQty(item.tempId, 1)}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                          </button>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <button 
                          type="button"
                          onClick={() => removePendingItem(item.tempId)}
                          className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 bg-blue-600 rounded-3xl text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <div className="z-10">
                <div className="text-blue-100 text-xs font-black uppercase tracking-[0.2em] mb-1">สรุปการเบิกใช้</div>
                <div className="text-3xl font-black">ทั้งหมด {pendingItems.length} รายการ</div>
                <div className="text-blue-200 text-sm font-medium mt-1">รวมจำนวนพัสดุ {totalQty} หน่วย</div>
              </div>
              <button 
                type="submit"
                className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 font-black py-5 px-12 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-3 text-xl z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                <span>ยืนยันบันทึกจบเวร</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
            </div>
            <p className="text-gray-400 font-bold text-lg">ยังไม่มีรายการที่สแกน</p>
            <p className="text-gray-400 text-sm mt-1">กรุณากดปุ่ม "เริ่มสแกนพัสดุ" ด้านบน</p>
          </div>
        )}
      </div>

      {/* Manual lookup section at the bottom */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-700">ตรวจสอบสต็อกปัจจุบัน</h3>
          <div className="relative max-w-xs">
            <input 
              type="text" 
              placeholder="ค้นหาชื่อพัสดุ..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {inventory
            .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 6)
            .map(item => (
              <div key={item.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between group hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => handleScanResult(item.id, 1, currentUser?.ward || '')}>
                <div>
                  <div className="font-bold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{item.name}</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.currentStock} {item.unit} คงเหลือ</div>
                </div>
                <div className="text-blue-400 group-hover:text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};
