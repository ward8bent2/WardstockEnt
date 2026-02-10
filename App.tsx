
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, InventoryItem, Transaction, ViewState, FunctionCall } from './types';
import { MOCK_USERS } from './constants';
import { Dashboard } from './components/Dashboard';
import { StockUsage } from './components/StockUsage';
import { StockIntake } from './components/StockIntake';
import { InventoryManagement } from './components/InventoryManagement';
import { ConsumptionHistory } from './components/ConsumptionHistory';
import { AiAssistantModal } from './components/AiAssistantModal';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const cloudInventory = await storageService.getInventory();
      const cloudTransactions = await storageService.getTransactions();
      setInventory(cloudInventory);
      setTransactions(cloudTransactions);
      setIsLoaded(true);
      setLastSync(new Date());
    };
    initData();
  }, []);

  // รองรับ Deep Link (?item=ชื่อพัสดุ)
  useEffect(() => {
    if (isLoaded && currentUser) {
      const params = new URLSearchParams(window.location.search);
      const itemParam = params.get('item');
      if (itemParam) {
        setCurrentView('USAGE');
      }
    }
  }, [isLoaded, currentUser]);

  const syncWithCloud = async (newInventory: InventoryItem[], newTransactions: Transaction[]) => {
    setIsSyncing(true);
    const success = await storageService.saveData(newInventory, newTransactions);
    if (success) setLastSync(new Date());
    setIsSyncing(false);
    return success;
  };

  const login = (role: UserRole) => {
    const user = MOCK_USERS.find(u => u.role === role);
    if (user) {
      setCurrentUser(user);
      const params = new URLSearchParams(window.location.search);
      if (params.get('item')) {
        setCurrentView('USAGE');
      } else {
        setCurrentView(role === UserRole.NURSE ? 'USAGE' : 'DASHBOARD');
      }
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentView('DASHBOARD');
  };

  const handleRecordUsage = async (usageItems: { itemId: string, quantity: number, bedNumber: string }[], suppressAlert: boolean = false) => {
    if (!currentUser) return;
    const newTransactions: Transaction[] = [];
    let updatedInventory = [...inventory];
    let sheetMessages: string[] = [];

    for (const usage of usageItems) {
      const itemIndex = updatedInventory.findIndex(i => i.id === usage.itemId);
      if (itemIndex !== -1) {
        const item = updatedInventory[itemIndex];
        if (item.currentStock < usage.quantity) {
          if (!suppressAlert) alert(`สต็อก "${item.name}" ไม่เพียงพอ`);
          return false;
        }
        updatedInventory[itemIndex] = { ...item, currentStock: item.currentStock - usage.quantity };
        
        newTransactions.push({
          id: Math.random().toString(36).substr(2, 9),
          itemId: usage.itemId,
          itemName: item.name,
          type: 'USAGE',
          quantity: usage.quantity,
          bedNumber: usage.bedNumber,
          performedBy: currentUser.name,
          timestamp: new Date()
        });

        const sheetResult = await storageService.recordUsageToSheets(
          item.name, 
          usage.quantity, 
          item.unit, 
          currentUser.name, 
          'completed', 
          `เตียง/วอร์ด: ${usage.bedNumber}`
        );
        if (sheetResult.message) sheetMessages.push(sheetResult.message);
      }
    }

    setInventory(updatedInventory);
    const finalTransactions = [...transactions, ...newTransactions];
    setTransactions(finalTransactions);
    const syncSuccess = await syncWithCloud(updatedInventory, finalTransactions);
    
    if (syncSuccess && !suppressAlert) {
      alert('บันทึกข้อมูลเรียบร้อยแล้ว ' + (sheetMessages.length > 0 ? '\n' + sheetMessages.join('\n') : ''));
    }
    return syncSuccess;
  };

  const handleAddStock = async (itemId: string, quantity: number, suppressAlert: boolean = false) => {
    if (!currentUser) return;
    const itemToUpdate = inventory.find(i => i.id === itemId);
    if (!itemToUpdate) return false;

    const updatedInventory = inventory.map(item => 
      item.id === itemId ? { ...item, currentStock: item.currentStock + quantity } : item
    );
    
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      itemId,
      itemName: itemToUpdate.name,
      type: 'INTAKE',
      quantity,
      performedBy: currentUser.name,
      timestamp: new Date()
    };

    await storageService.recordIntakeToSheets(itemToUpdate.name, quantity, itemToUpdate.unit, 'บันทึกรับเข้าจากเมนูโลจิสติกส์', currentUser.name, 'รับเข้าคลัง');

    setInventory(updatedInventory);
    setTransactions([...transactions, newTransaction]);
    const syncSuccess = await syncWithCloud(updatedInventory, [...transactions, newTransaction]);
    if (syncSuccess && !suppressAlert) alert('บันทึกรับเข้าคลังเรียบร้อยแล้ว');
    return syncSuccess;
  };

  const handleTransferStock = async (itemId: string, quantity: number, toWard: string, suppressAlert: boolean = false) => {
    if (!currentUser) return false;
    const itemToTransfer = inventory.find(i => i.id === itemId);
    if (!itemToTransfer || itemToTransfer.currentStock < quantity) return false;

    const updatedInventory = inventory.map(item => 
      item.id === itemId ? { ...item, currentStock: item.currentStock - quantity } : item
    );

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      itemId,
      itemName: itemToTransfer.name,
      type: 'TRANSFER',
      quantity,
      fromWard: currentUser.ward,
      toWard,
      performedBy: currentUser.name,
      timestamp: new Date()
    };

    await storageService.recordUsageToSheets(itemToTransfer.name, quantity, itemToTransfer.unit, currentUser.name, 'transfer', `โอนย้ายไป: ${toWard}`);

    setInventory(updatedInventory);
    setTransactions([...transactions, newTransaction]);
    const syncSuccess = await syncWithCloud(updatedInventory, [...transactions, newTransaction]);
    if (syncSuccess && !suppressAlert) alert(`โอนย้ายไป ${toWard} เรียบร้อยแล้ว`);
    return syncSuccess;
  };

  const handleUpsertInventoryItem = async (itemData: Partial<InventoryItem>, suppressAlert: boolean = false) => {
    let newInventory: InventoryItem[];
    if (itemData.id) {
      newInventory = inventory.map(item => item.id === itemData.id ? { ...item, ...itemData } as InventoryItem : item);
    } else {
      const newItem: InventoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: itemData.name || 'New Item',
        category: itemData.category || 'Medical Supply',
        currentStock: itemData.currentStock ?? 0,
        minLevel: itemData.minLevel || 0,
        maxLevel: itemData.maxLevel || 100,
        unit: itemData.unit || 'ชิ้น',
        isActive: true
      };
      newInventory = [...inventory, newItem];
      if (newItem.currentStock > 0 && currentUser) {
        await storageService.recordIntakeToSheets(newItem.name, newItem.currentStock, newItem.unit, 'สร้างรายการใหม่', currentUser.name, 'Inventory Setup');
      }
    }
    setInventory(newInventory);
    return await syncWithCloud(newInventory, transactions);
  };

  const handleToggleItemStatus = async (itemId: string) => {
    const newInventory = inventory.map(item => item.id === itemId ? { ...item, isActive: !item.isActive } : item);
    setInventory(newInventory);
    return await syncWithCloud(newInventory, transactions);
  };

  const handleAiFunctionCall = async (functionCall: FunctionCall): Promise<string> => {
    if (!currentUser) return "โปรดเข้าสู่ระบบ";
    const { name, args } = functionCall;
    try {
      if (name === 'recordIntake') {
        const item = inventory.find(i => i.name.toLowerCase() === args.itemName.toLowerCase());
        const result = item 
          ? await handleAddStock(item.id, args.quantity, true) 
          : await handleUpsertInventoryItem({ name: args.itemName, currentStock: args.quantity, unit: args.unit }, true);
        return result ? `ดำเนินการรับเข้า ${args.itemName} เรียบร้อยแล้ว` : "ไม่สามารถดำเนินการได้";
      } else if (name === 'recordUsage') {
        const item = inventory.find(i => i.name.toLowerCase() === args.itemName.toLowerCase());
        if (!item) return `ไม่พบพัสดุชื่อ ${args.itemName}`;
        const result = await handleRecordUsage([{ itemId: item.id, quantity: args.quantity, bedNumber: args.wardBed }], true);
        return result ? `ดำเนินการเบิกใช้ ${args.itemName} เรียบร้อยแล้ว` : "สต็อกไม่เพียงพอ";
      }
      return "คำสั่งไม่รองรับ";
    } catch (e) {
      return "เกิดข้อผิดพลาดในการประมวลผลคำสั่ง";
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-bold">กำลังโหลด...</div>;

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 border border-gray-100">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-blue-600 text-white rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-200">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">WardStock</h1>
          <p className="text-gray-400 mt-3 font-bold uppercase text-xs tracking-widest">Medical Supply Manager</p>
        </div>
        <div className="space-y-4">
          <button onClick={() => login(UserRole.NURSE)} className="w-full flex items-center justify-between px-8 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl transition-all shadow-xl shadow-blue-100 group">
            <div className="text-left font-black text-lg">สแกนเบิกใช้พัสดุ</div>
            <svg className="w-6 h-6 text-blue-200 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button onClick={() => login(UserRole.SUPERVISOR)} className="w-full flex items-center justify-between px-8 py-5 bg-white border-2 border-gray-100 hover:border-blue-600 rounded-3xl transition-all group">
            <div className="text-left font-black text-lg text-gray-800 group-hover:text-blue-600">หัวหน้างาน</div>
            <svg className="w-6 h-6 text-gray-300 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => currentUser.role === UserRole.SUPERVISOR ? setCurrentView('DASHBOARD') : setCurrentView('USAGE')}>
            <div className="bg-blue-600 text-white p-2 rounded-2xl group-hover:rotate-6 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2" strokeWidth="2"/></svg>
            </div>
            <div>
              <span className="text-2xl font-black text-gray-800 tracking-tighter block leading-none">WardStock</span>
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">
                {isSyncing ? 'Syncing...' : `Cloud Synced: ${lastSync.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right mr-2">
              <p className="text-xs font-black text-gray-800">{currentUser.name}</p>
              <p className="text-[8px] text-gray-400 uppercase tracking-widest">{currentUser.ward}</p>
            </div>
            <button onClick={logout} className="p-3 text-gray-400 hover:text-rose-600 bg-gray-50 rounded-2xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m4 4H7m6 4v1a3 3 0 01-3 3H6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 pb-32">
        {currentView === 'DASHBOARD' && currentUser.role === UserRole.SUPERVISOR && <Dashboard inventory={inventory} transactions={transactions} />}
        {currentView === 'USAGE' && <StockUsage inventory={inventory.filter(i => i.isActive)} currentUser={currentUser} onRecordUsage={handleRecordUsage} />}
        {currentView === 'INTAKE' && currentUser.role === UserRole.SUPERVISOR && <StockIntake inventory={inventory} transactions={transactions} currentUser={currentUser} onAddStock={handleAddStock} onTransfer={handleTransferStock} />}
        {currentView === 'CONSUMPTION' && <ConsumptionHistory transactions={transactions} />}
        {currentView === 'MANAGEMENT' && currentUser.role === UserRole.SUPERVISOR && <InventoryManagement inventory={inventory} onUpsertItem={handleUpsertInventoryItem} onToggleStatus={handleToggleItemStatus} />}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-around items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-40 lg:max-w-4xl lg:mx-auto lg:rounded-t-[32px]">
        {currentUser.role === UserRole.SUPERVISOR && (
          <NavBtn view="DASHBOARD" label="หน้าหลัก" current={currentView} onClick={setCurrentView} icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          } />
        )}
        
        <NavBtn view="USAGE" label="ตัดสต็อก" current={currentView} onClick={setCurrentView} icon={
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        } />

        {currentUser.role === UserRole.SUPERVISOR && (
          <NavBtn view="INTAKE" label="โลจิสติกส์" current={currentView} onClick={setCurrentView} icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2m16 0h-2m-8 0H6m4-3l2 2m0 0l2-2m-2 2V3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          } />
        )}

        <NavBtn view="CONSUMPTION" label="ประวัติ" current={currentView} onClick={setCurrentView} icon={
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        } />

        {currentUser.role === UserRole.SUPERVISOR && (
          <button onClick={() => setIsAiAssistantOpen(true)} className="flex flex-col items-center text-gray-300 hover:text-blue-600 transition-all">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-[10px] mt-1 font-black uppercase tracking-tighter">AI CHAT</span>
          </button>
        )}

        {currentUser.role === UserRole.SUPERVISOR && (
          <NavBtn view="MANAGEMENT" label="ตั้งค่า" current={currentView} onClick={setCurrentView} icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" strokeWidth="2"/></svg>
          } />
        )}
      </div>

      {isAiAssistantOpen && currentUser && (
        <AiAssistantModal
          isOpen={isAiAssistantOpen}
          onClose={() => setIsAiAssistantOpen(false)}
          currentUser={currentUser}
          inventory={inventory}
          onPerformFunctionCall={handleAiFunctionCall}
        />
      )}
    </div>
  );
};

const NavBtn = ({ view, label, current, onClick, icon }: any) => (
  <button onClick={() => onClick(view)} className={`flex flex-col items-center transition-all ${current === view ? 'text-blue-600 scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
    {icon}
    <span className="text-[10px] mt-1 font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default App;
