
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  QrCode, 
  PlusCircle, 
  Search,
  ArrowLeft, 
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  PackageCheck,
  ExternalLink,
  ChevronRight,
  Truck,
  User as UserIcon,
  Building2,
  Trash2,
  BedDouble,
  ClipboardList,
  Sparkles,
  Loader2,
  Printer,
  Mail,
  Calendar,
  Layers,
  BarChart3,
  Edit3,
  Lock,
  LogOut,
  X,
  Save,
  Plus,
  Camera,
  Maximize,
  RefreshCcw as RefreshIcon,
  Download,
  FileText,
  Share2,
  HelpCircle,
  ArrowRightLeft,
  MessageSquare,
  ArrowDownCircle,
  ArrowUpCircle,
  Filter,
  RotateCcw,
  Clock,
  ArrowDownToLine,
  ShieldAlert,
  Info,
  PieChart,
  Hash,
  UserCheck,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { InventoryItem, HistoryRecord, IntakeRecord, PendingRecord, ViewState, DashboardPeriod } from './types';
import { summarizeUsage } from './services/geminiService';

// Target URL for Google Apps Script - Updated as requested
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxgy6tpUu9UOSq1uyyVj4iPFDAUuyEonKVrr9FcKEb-24RoSPJHvrGvM62Ney9nzzzy_A/exec";
const SHEET_LINK = "https://docs.google.com/spreadsheets/d/1wZwjqv-ocUKRIVbT0fW244lJAy6WEUvJj8WWtQqhhbs/edit?gid=0#gid=0";

const STAFF_LIST = [
  "ยุพดี", "วชิราพร", "ภุมริน", "พัชราภรณ์", "สุภาพร", 
  "ศศิวิมล", "อภัสรา", "ณัฐวัฒน์", "อิสริยา", "นภัสสร", 
  "พรพนา(บุญ)", "พรพนา(ทับ)", "กชพรรณ", "หนึ่งฤทัย", 
  "ฐิติมา", "นฤพร", "CHL"
];

const DEPARTMENTS = [
  "ER (ห้องฉุกเฉิน)", "OR (ห้องผ่าตัด)", "ICU", "OPD", "LAB", "X-RAY", "Pharmacy (ห้องยา)", "Central Supply (จ่ายกลาง)", "Ward อื่นๆ"
];

const AUTH_USERS = [
  { username: 'yupadee', password: 'liver1234', displayName: 'ยุพดี' },
  { username: 'pornpana', password: 'weed1234', displayName: 'พรพนา(บุญ)' }
];

// --- Custom Chart Components ---

const DonutChart = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let cumulativePercent = 0;

  function getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg viewBox="-1 -1 2 2" width="128" height="128" className="w-full h-full -rotate-90">
        {total === 0 ? (
          <circle cx="0" cy="0" r="1" fill="#f1f5f9" />
        ) : (
          data.map((slice, i) => {
            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
            const slicePercent = slice.value / total;
            cumulativePercent += slicePercent;
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
            const pathData = [
              `M ${startX} ${startY}`,
              `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `L 0 0`,
            ].join(' ');
            return <path key={i} d={pathData} fill={slice.color} />;
          })
        )}
        <circle cx="0" cy="0" r="0.7" fill="white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-slate-800 leading-none">{total}</span>
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</span>
      </div>
    </div>
  );
};

const SimpleBarChart = ({ items }: { items: InventoryItem[] }) => {
  return (
    <div className="space-y-3 w-full">
      {items.slice(0, 5).map((item) => {
        const maxVal = item.max || 100;
        const percent = maxVal > 0 ? Math.min(100, (item.currentStock / maxVal) * 100) : 0;
        const minPercent = maxVal > 0 ? (item.min / maxVal) * 100 : 0;
        
        return (
          <div key={item.id} className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-600 truncate max-w-[120px]">{item.name}</span>
              <span className="text-slate-400">{item.currentStock} / {item.min} Min</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full relative overflow-hidden">
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-red-400/30 z-10" 
                style={{ left: `${minPercent}%` }}
              />
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${item.currentStock <= item.min ? 'bg-amber-400' : 'bg-blue-500'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('SCANNER');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [pendingRecords, setPendingRecords] = useState<PendingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dashboardSearch, setDashboardSearch] = useState('');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const [recipientDept, setRecipientDept] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  const [historyTab, setHistoryTab] = useState<'ALL' | 'DISBURSE' | 'INTAKE' | 'TRANSFER'>('ALL');
  const [historySearch, setHistorySearch] = useState('');

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [targetId, setTargetId] = useState('');
  const [actionQty, setActionQty] = useState<number>(1);
  const [staffName, setStaffName] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const getDateGroupTitle = (dateStr: string) => {
    if (!dateStr) return 'ไม่ระบุวันที่';
    const date = new Date(dateStr);
    const now = new Date();
    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = dNow.getTime() - dDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'วันนี้';
    if (diffDays === 1) return 'เมื่อวานนี้';
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const fetchInventory = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(`${SCRIPT_URL}?t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        redirect: 'follow', 
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(`Script Error: ${data.error}`);

      const invSource = data.inventory || (Array.isArray(data) ? data : []);
      const mappedInventory = invSource.map((item: any) => {
        const id = String(item.id || item.ID || item['รหัส'] || '').trim();
        const name = String(item.name || item.Name || item['ชื่อพัสดุ'] || item['รายการ'] || '').trim();
        if (id.toLowerCase() === 'id' || id === '') return null;
        return {
          id: id,
          name: name,
          unit: String(item.unit || item['หน่วย'] || 'หน่วย'),
          currentStock: Number(item.currentStock || item['คงเหลือ'] || 0),
          min: Number(item.min || item.Min || 0),
          max: Number(item.max || item.Max || 100),
          type: String(item.type || item['ประเภท'] || 'General')
        };
      }).filter((item: any): item is InventoryItem => item !== null);
      
      setInventory(mappedInventory);
      if (data.history) setHistory(data.history);
    } catch (error: any) {
      setFetchError(`ไม่สามารถโหลดข้อมูลได้: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getHistory&t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        redirect: 'follow',
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(`Script Error: ${data.error}`);
      
      const histSource = Array.isArray(data) ? data : (data.history || []);
      setHistory(histSource);
    } catch (error: any) {
      setFetchError(`ไม่สามารถโหลดประวัติได้: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendDataToSheet = async (payload: any) => {
    return fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
  };

  const exportToCSV = () => {
    const headers = ["ID", "พัสดุ", "คงเหลือ", "หน่วย", "Min", "Max"];
    const rows = inventory.map(item => [item.id, `"${item.name}"`, item.currentStock, `"${item.unit}"`, item.min, item.max]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSavePDF = () => {
    window.print();
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    if (view === 'HISTORY') {
      fetchHistoryData();
    } else if (view === 'DASHBOARD' || view === 'INVENTORY' || view === 'SCANNER') {
      fetchInventory();
    }
  }, [view]);

  const foundItem = useMemo(() => {
    const searchId = targetId.trim().toUpperCase();
    if (!searchId) return null;
    return inventory.find(item => item.id.trim().toUpperCase() === searchId);
  }, [targetId, inventory]);

  const stats = useMemo(() => {
    const total = inventory.length;
    const low = inventory.filter(i => i.currentStock <= i.min && i.currentStock > 0).length;
    const out = inventory.filter(i => i.currentStock === 0).length;
    const normal = total - low - out;
    return { total, low, out, normal };
  }, [inventory]);

  const criticalItems = useMemo(() => {
    return inventory
      .filter(i => i.currentStock <= i.min)
      .sort((a, b) => {
        if (a.currentStock === 0 && b.currentStock > 0) return -1;
        if (b.currentStock === 0 && a.currentStock > 0) return 1;
        return a.currentStock - b.currentStock;
      });
  }, [inventory]);

  const dashboardFilteredInventory = useMemo(() => {
    if (!dashboardSearch.trim()) return inventory;
    const term = dashboardSearch.toLowerCase();
    return inventory.filter(i => 
      i.name.toLowerCase().includes(term) || 
      i.id.toLowerCase().includes(term)
    );
  }, [inventory, dashboardSearch]);

  const filteredHistory = useMemo(() => {
    let result = [...history];
    if (historySearch.trim()) {
      const term = historySearch.toLowerCase();
      result = result.filter(h => JSON.stringify(h).toLowerCase().includes(term));
    }

    if (historyTab === 'DISBURSE') {
      result = result.filter(h => {
        const type = String(h.type || h.status || h.Status || h.action || h.Action || '').toUpperCase();
        return type === 'เบิกจ่าย' || type.includes('DISBURSE') || type.includes('เบิก');
      });
    } else if (historyTab === 'INTAKE') {
      result = result.filter(h => {
        const type = String(h.type || h.status || h.Status || h.action || h.Action || '').toUpperCase();
        return type === 'รับเข้า' || type.includes('INTAKE') || type.includes('รับ');
      });
    } else if (historyTab === 'TRANSFER') {
      result = result.filter(h => {
        const type = String(h.type || h.status || h.Status || h.action || h.Action || '').toUpperCase();
        return type.includes('TRANSFER') || type.includes('โอน');
      });
    }

    const grouped: { [key: string]: any[] } = {};
    result.forEach(item => {
      const timestamp = item.displayDate || item.Timestamp || item.date || item.Date || item[Object.keys(item)[0]] || '';
      const dateKey = getDateGroupTitle(timestamp);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });
    return grouped;
  }, [history, historyTab, historySearch]);

  const clearHistoryFilters = () => {
    setHistorySearch('');
    setHistoryTab('ALL');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = AUTH_USERS.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setIsLoggedIn(true);
      setCurrentUser(user.displayName);
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const startScanner = async () => {
    setScannerError(null);
    setIsScannerOpen(true);
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Scanner stop error", err);
      }
    }
    setIsScannerOpen(false);
  };

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    if (isScannerOpen) {
      html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const result = decodedText.trim().toUpperCase();
          setTargetId(result);
          setActionQty(1);
          stopScanner();
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
        },
        () => {}
      ).catch(err => {
        setScannerError("ไม่สามารถเข้าถึงกล้องได้: " + err.toString());
      });
    }
    return () => {
      if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(() => {});
    };
  }, [isScannerOpen]);

  const addToPending = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundItem || actionQty <= 0 || !staffName || !bedNumber) return;
    const newPending: PendingRecord = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: foundItem.id,
      itemName: foundItem.name,
      unit: foundItem.unit,
      quantity: actionQty,
      bedNumber: bedNumber,
      staffName: staffName,
      timestamp: new Date().toLocaleString('th-TH'),
    };
    setPendingRecords(prev => [...prev, newPending]);
    setShowSuccess(true);
    setTargetId('');
    setActionQty(1);
    setBedNumber('');
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleFinalSubmit = async () => {
    if (pendingRecords.length === 0) return;
    setIsSyncing(true);
    try {
      for (const p of pendingRecords) {
        await sendDataToSheet({
          action: 'disburse',
          id: p.itemId,
          name: p.itemName,
          amount: p.quantity,
          unit: p.unit,
          user: p.staffName,
          bed: p.bedNumber
        });
      }
      setPendingRecords([]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setView('SCANNER');
      fetchInventory();
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundItem || actionQty <= 0 || !staffName) return;
    setIsSyncing(true);
    try {
      await sendDataToSheet({ 
        action: 'intake',
        id: foundItem.id, 
        name: foundItem.name, 
        amount: actionQty, 
        unit: foundItem.unit,
        user: staffName 
      });
      setTargetId('');
      setActionQty(1);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setView('INVENTORY');
      fetchInventory();
    } catch (error) {
      alert("ไม่สามารถบันทึกข้อมูลรับเข้าได้");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSyncing(true);
    try {
      await sendDataToSheet({
        action: 'update',
        id: editingItem.id,
        name: editingItem.name,
        unit: editingItem.unit,
        min: editingItem.min,
        max: editingItem.max
      });
      setIsEditModalOpen(false);
      setEditingItem(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      fetchInventory();
    } catch (error) {
      alert("ไม่สามารถอัปเดตข้อมูลได้");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsSyncing(true);
    try {
      // Sending delete action to Apps Script
      await sendDataToSheet({
        action: 'delete',
        id: itemToDelete.id
      });
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      fetchInventory();
    } catch (error) {
      alert("ไม่สามารถลบข้อมูลได้");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundItem || actionQty <= 0 || !staffName || !recipientDept) return;
    setIsSyncing(true);
    try {
      await sendDataToSheet({
        action: 'transfer',
        id: foundItem.id,
        name: foundItem.name,
        amount: actionQty,
        unit: foundItem.unit,
        user: staffName,
        recipient: recipientDept,
        notes: transferNotes
      });
      setTargetId('');
      setActionQty(1);
      setRecipientDept('');
      setTransferNotes('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setView('INVENTORY');
      fetchInventory();
    } catch (error) {
      alert("ไม่สามารถบันทึกการโอนพัสดุได้");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading && inventory.length === 0 && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-10 text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-lg mb-2 tracking-tight">กำลังเชื่อมต่อข้อมูลคลังพัสดุ</p>
        <p className="text-slate-400 text-sm italic">โปรดรอสักครู่...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans shadow-2xl relative overflow-hidden pb-10">
      
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top duration-300 print:hidden">
          <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border-2 border-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-sm">บันทึกข้อมูลเรียบร้อย</span>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900 z-[150] flex flex-col print:hidden">
          <div className="flex items-center justify-between p-6 bg-slate-900">
            <h2 className="text-white font-bold flex items-center gap-2"><Camera className="w-5 h-5 text-blue-400" />Scan QR Code</h2>
            <button onClick={stopScanner} className="p-2 bg-white/10 text-white rounded-full transition-colors active:bg-white/20"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div id="reader" className="w-full max-w-[320px] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-blue-500/20"></div>
            {scannerError && <div className="text-white text-xs mt-4 text-center text-red-400 bg-red-900/50 px-4 py-2 rounded-full">{scannerError}</div>}
            <p className="text-white/40 text-[10px] mt-6 font-bold uppercase tracking-widest">เล็งกล้องไปที่ QR Code ของพัสดุ</p>
          </div>
        </div>
      )}

      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 bg-slate-50 border-b">
              <h3 className="font-bold text-blue-900 flex items-center gap-2"><Edit3 className="w-5 h-5" /> แก้ไขข้อมูลพัสดุ</h3>
              <button onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleUpdateItem} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ชื่อพัสดุ</label>
                <input type="text" required className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm shadow-inner" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">หน่วยนับ</label>
                  <input type="text" required className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm shadow-inner" value={editingItem.unit} onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ค่า Min</label>
                  <input type="number" required className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm shadow-inner" value={editingItem.min} onChange={(e) => setEditingItem({ ...editingItem, min: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ค่า Max</label>
                <input type="number" required className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm shadow-inner" value={editingItem.max} onChange={(e) => setEditingItem({ ...editingItem, max: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-3xl font-bold">ยกเลิก</button>
                 <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-3xl font-bold shadow-xl">
                   {isSyncing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "บันทึก"}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 print:hidden">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <Trash2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">ยืนยันการลบพัสดุ?</h3>
                <p className="text-slate-500 text-sm">คุณต้องการลบรายการ <span className="font-bold text-red-600">"{itemToDelete.name}"</span> ออกจากคลังพัสดุใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }} 
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-3xl font-bold active:scale-95 transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleDeleteItem} 
                  disabled={isSyncing} 
                  className="flex-1 py-4 bg-red-600 text-white rounded-3xl font-bold shadow-xl active:scale-95 transition-all flex items-center justify-center"
                >
                  {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : "ยืนยันลบ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-40 px-6 py-5 print:hidden">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <PackageCheck className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-900 tracking-tight leading-none mb-1">WardStockEnt</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic leading-none">Inventory System</p>
            </div>
          </div>
          <button onClick={() => view === 'HISTORY' ? fetchHistoryData() : fetchInventory()} className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl transition-all active:scale-95 hover:bg-blue-100">
             {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshIcon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32 print:p-0 print:overflow-visible">
        
        {view === 'SCANNER' && (
          <div className="p-6 animate-in fade-in duration-500 print:hidden space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black text-blue-900 tracking-tight">เบิกจ่ายพัสดุ</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disbursement System</p>
              </div>
              <div className="bg-blue-600/10 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border border-blue-100">
                Shift: {new Date().getHours() < 16 ? 'เช้า/บ่าย' : 'ดึก'}
              </div>
            </div>
            
            <div className="relative group overflow-hidden rounded-[32px] shadow-2xl border-4 border-white">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90 z-10" />
              <button 
                onClick={startScanner} 
                className="w-full aspect-[16/10] flex flex-col items-center justify-center relative z-20 transition-transform active:scale-95"
              >
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md animate-pulse">
                  <Camera className="w-10 h-10 text-white" />
                </div>
                <span className="font-black text-white uppercase tracking-[0.2em] text-[10px]">แตะเพื่อสแกน QR Code</span>
              </button>
            </div>

            <div className="bg-white p-7 rounded-[40px] shadow-xl border border-slate-100 space-y-7 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 z-0" />
              
              <div className="space-y-3 relative z-10">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-blue-500" /> รหัสพัสดุ
                </label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="รหัส หรือ ค้นหา..." 
                    className="flex-1 px-5 py-4.5 bg-slate-50 rounded-[24px] outline-none font-mono text-sm border-2 border-transparent focus:border-blue-200 shadow-inner transition-all" 
                    value={targetId} 
                    onChange={(e) => setTargetId(e.target.value)} 
                  />
                  <button onClick={startScanner} className="p-4.5 bg-blue-600 text-white rounded-[24px] shadow-lg shadow-blue-200 active:scale-90 transition-all">
                    <QrCode className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {foundItem ? (
                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-6 rounded-[32px] border-2 border-blue-100/50 animate-in zoom-in duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3">
                    <div className={`w-3 h-3 rounded-full ${foundItem.currentStock === 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                  </div>
                  <div className="flex flex-col gap-1 mb-4">
                     <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter opacity-70">Item Found</p>
                     <h3 className="font-black text-slate-800 text-lg leading-tight">{foundItem.name}</h3>
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-blue-200/30">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Available Stock</p>
                      <p className="text-2xl font-black text-blue-700 tracking-tighter">
                        {foundItem.currentStock} <span className="text-xs font-bold opacity-50 uppercase">{foundItem.unit}</span>
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 bg-white px-3 py-1 rounded-full border border-blue-100 shadow-sm uppercase tracking-widest">{foundItem.id}</span>
                  </div>
                </div>
              ) : targetId.trim() && (
                <div className="p-5 bg-red-50 text-red-500 rounded-[28px] text-[11px] font-bold flex items-center gap-4 animate-pulse border-2 border-red-100">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <span>รหัสพัสดุ "{targetId.trim()}" ไม่พบข้อมูลในระบบ</span>
                </div>
              )}

              <form onSubmit={addToPending} className="space-y-5 pt-4 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> จำนวน
                    </label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-4 bg-slate-50 rounded-[24px] outline-none font-black text-blue-700 text-center text-2xl shadow-inner border-2 border-transparent focus:border-blue-100" 
                      value={actionQty} 
                      min={1} 
                      onChange={(e) => setActionQty(parseInt(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <BedDouble className="w-3.5 h-3.5 text-blue-500" /> เลขเตียง
                    </label>
                    <input 
                      type="text" 
                      placeholder="Bed No." 
                      required 
                      className="w-full px-4 py-4 bg-slate-50 rounded-[24px] outline-none text-sm font-black text-slate-700 shadow-inner border-2 border-transparent focus:border-blue-100" 
                      value={bedNumber} 
                      onChange={(e) => setBedNumber(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" /> เจ้าหน้าที่ผู้เบิก
                  </label>
                  <div className="relative">
                    <select 
                      required 
                      className="w-full appearance-none px-6 py-4.5 bg-slate-50 rounded-[24px] outline-none text-sm font-black text-slate-700 shadow-inner border-2 border-transparent focus:border-blue-100" 
                      value={staffName} 
                      onChange={(e) => setStaffName(e.target.value)} 
                    >
                      <option value="">เลือกชื่อเจ้าหน้าที่...</option>
                      {STAFF_LIST.map(name => (<option key={name} value={name}>{name}</option>))}
                    </select>
                    <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 rotate-90" />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={!foundItem || actionQty <= 0 || !staffName || !bedNumber || isSyncing} 
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[28px] font-black shadow-2xl active:scale-95 disabled:grayscale transition-all mt-4 uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3"
                >
                   {isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Plus className="w-6 h-6" /> เพิ่มรายการเบิก</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {view === 'PENDING_LIST' && (
          <div className="p-6 pb-20 space-y-7 animate-in slide-in-from-right duration-500 print:hidden">
            <div className="flex items-center gap-5">
              <button onClick={() => setView('SCANNER')} className="p-4 bg-white rounded-[24px] shadow-lg border border-slate-100 active:scale-90 transition-all text-slate-500"><ArrowLeft className="w-6 h-6"/></button>
              <div>
                <h2 className="text-2xl font-black text-blue-900 tracking-tight">รายการรอตัดสต็อก</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">สะสมไว้ {pendingRecords.length} รายการ</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {pendingRecords.map((p, idx) => (
                <div key={p.id} className="group bg-white p-5 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/30 flex justify-between items-center relative overflow-hidden animate-in slide-in-from-bottom duration-300" style={{ animationDelay: `${idx * 80}ms` }}>
                  <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-orange-400 to-amber-500 group-hover:w-3 transition-all" />
                  <div className="flex-1 pr-4 pl-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg flex items-center gap-1.5 border border-blue-100/50">
                        <Hash className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase leading-none">{p.itemId}</span>
                      </div>
                      <div className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg flex items-center gap-1.5 border border-orange-100/50">
                        <BedDouble className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase leading-none">เตียง {p.bedNumber}</span>
                      </div>
                    </div>
                    <h4 className="text-[15px] font-black text-slate-800 leading-tight mb-3">{p.itemName}</h4>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                          <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <UserIcon className="w-2.5 h-2.5" />
                          </div>
                          <span className="text-[10px] text-slate-600 font-black uppercase">{p.staffName}</span>
                       </div>
                       <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3 h-3 opacity-60" />
                          <span className="text-[9px] font-bold tracking-tight">{p.timestamp.split(' ')[1]}</span>
                       </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-3 min-w-[70px]">
                    <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-2xl border border-orange-100 flex flex-col items-center">
                        <p className="text-xs font-black opacity-60 leading-none mb-1">qty</p>
                        <p className="text-2xl font-black tracking-tighter leading-none">{p.quantity}</p>
                    </div>
                    <button 
                      onClick={() => { if(window.confirm(`ลบรายการ ${p.itemName} ออกหรือไม่?`)) setPendingRecords(prev => prev.filter(x => x.id !== p.id)) }} 
                      className="p-3 bg-red-50 text-red-500 rounded-2xl active:scale-90 transition-all hover:bg-red-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              
              {pendingRecords.length === 0 && (
                <div className="py-32 text-center space-y-6">
                   <div className="relative mx-auto w-32 h-32">
                      <div className="absolute inset-0 bg-blue-100/50 rounded-full animate-ping" />
                      <div className="relative w-32 h-32 bg-white rounded-full border-4 border-slate-50 flex items-center justify-center shadow-inner">
                        <ShoppingBag className="w-12 h-12 text-slate-200" />
                      </div>
                   </div>
                   <div className="space-y-2">
                     <p className="text-sm font-black text-slate-300 uppercase tracking-[0.4em]">ยังไม่มีรายการเบิก</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase">เพิ่มรายการเพื่อเริ่มตัดสต็อกที่นี่</p>
                   </div>
                   <button onClick={() => setView('SCANNER')} className="px-8 py-3 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all">เริ่มสแกนตอนนี้</button>
                </div>
              )}

              {pendingRecords.length > 0 && (
                <div className="pt-10 pb-24 animate-in fade-in duration-700">
                  <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-8 rounded-[48px] shadow-2xl relative overflow-hidden text-center space-y-6 border-b-[6px] border-indigo-950">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <CheckCircle2 className="w-32 h-32 text-white" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-white text-xl font-black tracking-tight flex items-center justify-center gap-2">
                           <Sparkles className="w-5 h-5 text-amber-400" /> สรุปรายการทั้งหมด
                        </h3>
                        <p className="text-blue-300 text-[10px] font-bold uppercase tracking-[0.3em]">Ready to save for this shift</p>
                    </div>
                    
                    <button 
                      onClick={handleFinalSubmit} 
                      disabled={isSyncing} 
                      className="w-full py-6 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-[32px] font-black shadow-[0_20px_50px_rgba(245,158,11,0.3)] active:scale-95 transition-all flex items-center justify-center gap-4 relative"
                    >
                      {isSyncing ? (
                        <div className="flex items-center gap-3">
                           <Loader2 className="w-6 h-6 animate-spin" />
                           <span className="uppercase tracking-widest text-xs font-black">กำลังบันทึกข้อมูล...</span>
                        </div>
                      ) : (
                        <>
                          <Save className="w-6 h-6" /> 
                          <span className="uppercase tracking-[0.2em] text-xs font-black">ยืนยันบันทึกจบเวร</span>
                        </>
                      )}
                    </button>
                    
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest px-4">
                        ตรวจสอบข้อมูลความถูกต้องทุกครั้งก่อนกดยืนยันบันทึก
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'DASHBOARD' && (
          <div className="p-6 space-y-8 animate-in slide-in-from-bottom duration-300 print:p-0">
            <div className="flex justify-between items-start print:mb-10">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-blue-900 tracking-tight">รายงานสรุปคลัง</h2>
                <p className="text-[10px] text-slate-400 flex items-center gap-1.5 font-bold uppercase tracking-widest italic">
                  <Calendar className="w-3.5 h-3.5" /> ข้อมูล ณ วันที่: {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="hidden print:block text-right">
                <h3 className="font-bold text-slate-800 text-sm">Ward Inventory Hub</h3>
                <p className="text-[8px] text-slate-400">ระบบจัดการพัสดุส่วนกลาง</p>
              </div>
            </div>

            {/* Visual Graphs Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <PieChart className="w-3.5 h-3.5" /> สัดส่วนสถานะสต็อก
                </h3>
                <div className="flex items-center gap-8 w-full justify-center">
                  <DonutChart data={[
                    { label: 'ปกติ', value: stats.normal, color: '#10b981' }, 
                    { label: 'ใกล้หมด', value: stats.low, color: '#fbbf24' },  
                    { label: 'หมด', value: stats.out, color: '#ef4444' }      
                  ]} />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-bold text-slate-600">ปกติ ({stats.normal})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                      <span className="text-[10px] font-bold text-slate-600">ใกล้หมด ({stats.low})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <span className="text-[10px] font-bold text-slate-600">หมด ({stats.out})</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <BarChart3 className="w-3.5 h-3.5" /> รายการที่วิกฤตที่สุด
                </h3>
                <SimpleBarChart items={criticalItems} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 print:mb-12 print:gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center print:border-slate-200">
                <div className="bg-blue-50 p-2 rounded-2xl mb-2 print:bg-slate-50"><Layers className="w-5 h-5 text-blue-500 print:text-slate-600" /></div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">พัสดุรวม</span>
                <span className="text-2xl font-black text-blue-900">{stats.total}</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center print:border-slate-200">
                <div className="bg-amber-50 p-2 rounded-2xl mb-2 print:bg-slate-50"><TrendingDown className="w-5 h-5 text-amber-500 print:text-slate-600" /></div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">ใกล้หมด</span>
                <span className="text-2xl font-black text-amber-600">{stats.low}</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center print:border-slate-200">
                <div className="bg-red-50 p-2 rounded-2xl mb-2 print:bg-slate-50"><AlertCircle className="w-5 h-5 text-red-500 print:text-slate-600" /></div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">ของหมด</span>
                <span className="text-2xl font-black text-red-600">{stats.out}</span>
              </div>
            </div>

            {criticalItems.length > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-[32px] border border-red-100 shadow-sm space-y-4 print:break-inside-avoid print:bg-white print:border-slate-300">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-[14px] text-red-900 uppercase tracking-tight">รายการต้องสั่งเพิ่มด่วน (Critical)</h3>
                </div>
                <div className="space-y-3">
                  {criticalItems.slice(0, 8).map(item => (
                    <div key={item.id} className="bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl flex justify-between items-center border border-white/50 shadow-sm print:bg-white print:border-slate-100">
                      <div className="flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${item.currentStock === 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`}></div>
                          <p className="text-[12px] font-bold text-slate-800 leading-tight">{item.name}</p>
                        </div>
                        <p className="text-[8px] font-mono text-slate-400 mt-0.5 uppercase tracking-tighter pl-3.5">{item.id}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${item.currentStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.currentStock} <span className="text-[9px] font-bold opacity-60 uppercase">{item.unit}</span>
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Min: {item.min}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-[14px] flex items-center gap-2.5 text-blue-900"><Search className="w-5 h-5 text-blue-600" /> ค้นหาพัสดุ</h3>
                  <span className="text-[9px] font-bold text-slate-400 px-3 py-1 bg-slate-50 rounded-full border border-slate-100 uppercase tracking-widest">{inventory.length} รายการ</span>
                </div>
                
                <div className="relative print:hidden">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อหรือรหัสพัสดุ..." 
                    className="w-full pl-11 pr-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-100 outline-none font-bold text-sm shadow-inner transition-all"
                    value={dashboardSearch}
                    onChange={(e) => setDashboardSearch(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                {dashboardFilteredInventory.map(item => {
                  const isLow = item.currentStock <= item.min && item.currentStock > 0;
                  const isOut = item.currentStock === 0;
                  return (
                    <div key={item.id} className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-2xl px-3 -mx-3 transition-colors print:break-inside-avoid">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${isOut ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-green-500'}`}></div>
                          <span className="text-[13px] font-bold text-slate-800 leading-tight">{item.name}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter pl-3.5">{item.id}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-[16px] font-black ${isOut ? 'text-red-600' : isLow ? 'text-amber-500' : 'text-green-600'}`}>
                          {item.currentStock} <span className="text-[11px] font-bold opacity-60 uppercase">{item.unit}</span>
                        </span>
                        <div className={`mt-2 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden flex shadow-inner`}>
                            <div 
                                className={`h-full transition-all duration-700 ${isOut ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-green-500'}`} 
                                style={{width: `${item.max > 0 ? Math.min(100, (item.currentStock/item.max)*100) : 0}%`}} 
                            />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-4 print:hidden pb-12">
              <div className="grid grid-cols-2 gap-4">
                <button onClick={handleSavePDF} className="flex items-center justify-center gap-2.5 py-4.5 bg-slate-800 text-white rounded-3xl font-bold shadow-xl active:scale-95 transition-all text-[11px] uppercase tracking-widest">
                  <Printer className="w-4.5 h-4.5" /> พิมพ์ / PDF
                </button>
                <button onClick={exportToCSV} className="flex items-center justify-center gap-2.5 py-4.5 bg-blue-600 text-white rounded-3xl font-bold shadow-xl active:scale-95 transition-all text-[11px] uppercase tracking-widest">
                  <FileText className="w-4.5 h-4.5" /> Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'HISTORY' && (
          <div className="p-6 animate-in slide-in-from-right duration-300 print:hidden">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-3 text-blue-900"><HistoryIcon className="w-7 h-7 text-blue-600" /> ประวัติการทำรายการ</h2>
                <button onClick={fetchHistoryData} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} /></button>
             </div>
             
             {/* Filter Tabs Header */}
             <div className="space-y-4 mb-8 sticky top-[-24px] z-20 bg-slate-50 py-4 border-b">
               <div className="flex gap-2">
                 <div className="relative flex-1">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input type="text" placeholder="ค้นหาประวัติ..." className="w-full pl-11 pr-5 py-4 bg-white border rounded-2xl outline-none text-sm font-bold shadow-sm" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} />
                 </div>
                 {(historySearch || historyTab !== 'ALL') && (
                   <button onClick={clearHistoryFilters} className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 active:scale-95 transition-all">
                     <RotateCcw className="w-5 h-5" />
                   </button>
                 )}
               </div>
               
               {/* Updated Filter Tabs */}
               <div className="flex bg-white p-1 rounded-2xl border shadow-sm gap-1 overflow-x-auto scrollbar-hide">
                 {(['ALL', 'DISBURSE', 'INTAKE', 'TRANSFER'] as const).map((tab) => (
                   <button 
                     key={tab} 
                     onClick={() => setHistoryTab(tab)} 
                     className={`flex-none px-4 py-2.5 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest ${historyTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                   >
                    {tab === 'ALL' ? 'ทั้งหมด' : tab === 'DISBURSE' ? 'เบิกจ่าย' : tab === 'INTAKE' ? 'รับเข้า' : 'โอน'}
                   </button>
                 ))}
               </div>
             </div>

             <div className="space-y-10">
               {Object.keys(filteredHistory).length > 0 ? Object.entries(filteredHistory).map(([dateGroup, items]) => (
                 <div key={dateGroup} className="space-y-4">
                   <div className="flex items-center gap-4 mb-2">
                      <span className="h-px flex-1 bg-slate-200"></span>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> {dateGroup}</h3>
                      <span className="h-px flex-1 bg-slate-200"></span>
                   </div>
                   <div className="space-y-4">
                     {(items as any[]).map((h, i) => {
                       // Use API Keys: Name, ID, Amount, User, displayDate, type
                       const timestamp = h.displayDate || h.Date || h.date || h.Timestamp || '';
                       const id = h.ID || h.id || '';
                       const name = h.Name || h.name || 'ไม่ระบุรายการ';
                       const amount = Number(h.Amount || h.amount || 0);
                       const user = h.User || h.user || '-';
                       const typeStr = String(h.type || h.status || h.Status || h.action || h.Action || '');
                       
                       const isIntake = typeStr === 'รับเข้า' || typeStr.toUpperCase().includes('INTAKE');
                       const isDisburse = typeStr === 'เบิกจ่าย' || typeStr.toUpperCase().includes('DISBURSE');
                       const isTransfer = typeStr.toUpperCase().includes('TRANSFER') || typeStr.includes('โอน');
                       
                       const typeLabel = isIntake ? 'รับพัสดุเข้า' : isTransfer ? 'โอนพัสดุ' : 'เบิกจ่ายพัสดุ';
                       const TypeIcon = isIntake ? ArrowDownCircle : isTransfer ? ArrowRightLeft : ArrowUpCircle;
                       
                       return (
                         <div key={i} className="bg-white p-5 rounded-[28px] border shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${isIntake ? 'bg-green-500' : isTransfer ? 'bg-orange-500' : 'bg-red-500'}`} />
                            <div className="flex justify-between items-start mb-3">
                               <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${isIntake ? 'bg-green-50' : isTransfer ? 'bg-orange-50' : 'bg-red-50'}`}>
                                    <TypeIcon className={`w-3.5 h-3.5 ${isIntake ? 'text-green-500' : isTransfer ? 'text-orange-500' : 'text-red-500'}`} />
                                  </div>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{typeLabel}</span>
                               </div>
                               <div className="flex items-center gap-1.5 text-slate-400">
                                 <Clock className="w-3 h-3" />
                                 <span className="text-[9px] font-bold">
                                   {timestamp ? new Date(timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}
                                 </span>
                               </div>
                            </div>
                            <div className="mb-3">
                                <h4 className="text-[13px] font-bold text-slate-800 leading-snug pr-2">{name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                                    <UserIcon className="w-3 h-3" /> {user}
                                </p>
                            </div>
                            <div className="flex justify-between items-end pt-3 border-t border-slate-50">
                               <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <Layers className="w-3 h-3 text-slate-300"/>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">ID: {id}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  {/* Updated Logic: Green for 'รับเข้า' with (+), Red for 'เบิกจ่าย' with (-) */}
                                  <p className={`text-2xl font-black ${isIntake ? 'text-green-600' : isDisburse ? 'text-red-600' : 'text-slate-600'}`}>
                                    {isIntake ? '+' : isDisburse ? '-' : ''}{amount}
                                  </p>
                               </div>
                            </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )) : (
                 <div className="py-28 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[32px]">
                    <Filter className="w-16 h-16 opacity-10 mx-auto mb-4" />
                    <p className="text-sm font-bold opacity-40 uppercase tracking-widest leading-relaxed">ยังไม่มีประวัติการทำรายการ</p>
                 </div>
               )}
             </div>
          </div>
        )}
        
        {view === 'INVENTORY' && (
          <div className="p-6 space-y-6">
            {!isLoggedIn ? (
              <div className="flex flex-col items-center justify-center py-24 px-8 print:hidden">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8">
                  <Lock className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">จัดการสต็อกพัสดุ</h2>
                <p className="text-slate-400 text-sm text-center mb-8">โปรดเข้าสู่ระบบเพื่อจัดการข้อมูลคลัง</p>
                <form onSubmit={handleLogin} className="w-full space-y-4">
                  <input type="text" placeholder="Username" className="w-full px-5 py-4 bg-white border rounded-3xl outline-none font-bold" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} />
                  <input type="password" placeholder="Password" className="w-full px-5 py-4 bg-white border rounded-3xl outline-none font-bold" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
                  {loginError && <p className="text-red-500 text-[10px] text-center font-bold uppercase tracking-widest">{loginError}</p>}
                  <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-3xl font-bold shadow-2xl active:scale-95 transition-all">ยืนยันตัวตน</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300 print:p-0">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-bold text-blue-900">คลังพัสดุ Ward</h2>
                  <button onClick={() => setIsLoggedIn(false)} className="flex items-center gap-2 p-2 px-3 bg-red-50 text-red-600 rounded-xl font-bold text-[10px] uppercase active:scale-90 transition-all print:hidden">
                    <LogOut className="w-4 h-4" /> ออกจากระบบ
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 print:hidden">
                  <button onClick={() => setView('INTAKE')} className="bg-green-600 text-white p-5 rounded-[24px] font-bold flex flex-col items-center shadow-lg active:scale-95 transition-all">
                    <PlusCircle className="mb-2 w-7 h-7" />
                    <span className="uppercase tracking-widest text-[8px]">รับพัสดุเข้า</span>
                  </button>
                  <button onClick={() => setView('TRANSFER')} className="bg-orange-600 text-white p-5 rounded-[24px] font-bold flex flex-col items-center shadow-lg active:scale-95 transition-all">
                    <ArrowRightLeft className="mb-2 w-7 h-7" />
                    <span className="uppercase tracking-widest text-[8px]">โอนพัสดุ</span>
                  </button>
                </div>

                <div className="print:hidden">
                   <button onClick={handleSavePDF} className="w-full flex items-center justify-center gap-2.5 py-4 bg-slate-800 text-white rounded-3xl font-bold shadow-xl active:scale-95 transition-all text-[11px] uppercase tracking-widest mb-4">
                     <Printer className="w-4 h-4" /> พิมพ์รายการคลัง (PDF)
                   </button>
                </div>

                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden p-2 print:border-none print:shadow-none print:p-0">
                   {/* Table Header for print only */}
                   <div className="hidden print:grid grid-cols-6 gap-2 p-4 border-b-2 border-slate-300 font-black text-[10px] uppercase tracking-widest bg-slate-50">
                      <div>รหัส (ID)</div>
                      <div className="col-span-2">ชื่อรายการ (Item Name)</div>
                      <div className="text-center">คงเหลือ</div>
                      <div className="text-center">Min / Max</div>
                      <div className="text-right">หน่วย</div>
                   </div>
                   
                   {inventory.map(item => (
                     <div key={item.id} className="p-5 border-b border-slate-50 last:border-0 flex justify-between items-center hover:bg-slate-50 transition-colors print:grid print:grid-cols-6 print:gap-2 print:border-slate-200 print:py-3">
                        <div className="flex-1 pr-4 print:col-span-1 print:p-0">
                           <p className="text-[13px] font-bold text-slate-800 leading-tight print:text-[10pt]">{item.name}</p>
                           <p className="text-[9px] text-slate-400 font-mono mt-0.5 print:text-[8pt]">{item.id}</p>
                        </div>
                        {/* Hidden in normal UI, visible in print col structure */}
                        <div className="hidden print:block print:col-span-2"></div>
                        
                        <div className="text-right print:col-span-3 print:flex print:justify-between print:items-center print:text-right">
                           <div className="hidden print:block text-center flex-1 font-black text-[10pt]">{item.currentStock}</div>
                           <div className="hidden print:block text-center flex-1 text-[8pt]">{item.min} / {item.max}</div>
                           <div className="hidden print:block text-right flex-1 text-[8pt] uppercase font-bold">{item.unit}</div>

                           <div className="flex flex-col items-end print:hidden">
                              <p className="text-lg font-black">{item.currentStock} <span className="text-[9px] font-bold text-slate-400 uppercase">{item.unit}</span></p>
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 hover:bg-blue-100 transition-colors">
                                  <Edit3 className="w-3 h-3" /> แก้ไข
                                </button>
                                <button onClick={() => { setItemToDelete(item); setIsDeleteModalOpen(true); }} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 hover:bg-red-100 transition-colors">
                                  <Trash2 className="w-3 h-3" /> ลบ
                                </button>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'INTAKE' && (
          <div className="p-6 animate-in slide-in-from-right duration-300 print:hidden">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setView('INVENTORY')} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100"><ArrowLeft className="w-5 h-5"/></button>
              <h2 className="text-xl font-bold text-blue-900">รับพัสดุเข้าคลัง</h2>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-tight">รหัสพัสดุ / ค้นหา</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="ป้อนรหัสพัสดุ..." 
                    className="flex-1 px-4 py-4 bg-slate-50 rounded-2xl outline-none font-mono text-sm border-2 border-transparent focus:border-blue-200 shadow-inner" 
                    value={targetId} 
                    onChange={(e) => setTargetId(e.target.value)} 
                  />
                  <button onClick={startScanner} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors">
                    <QrCode className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {foundItem ? (
                <div className="bg-green-50/50 p-5 rounded-3xl border border-green-100 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-start mb-2">
                     <h3 className="font-bold text-green-900 text-sm leading-tight flex-1 pr-4">{foundItem.name}</h3>
                     <span className="text-[8px] bg-green-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{foundItem.id}</span>
                  </div>
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-green-100/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">สต็อกปัจจุบัน:</p>
                    <p className="text-lg font-black text-green-700">{foundItem.currentStock} <span className="text-[10px] font-bold text-green-400">{foundItem.unit}</span></p>
                  </div>
                </div>
              ) : targetId.trim() && (
                <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-bold flex items-center gap-3 animate-pulse border border-red-100">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>ไม่พบพัสดุนี้ในคลัง</span>
                </div>
              )}

              <form onSubmit={handleIntake} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">จำนวนที่รับเข้า</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-green-700 text-center text-2xl shadow-inner border-2 border-transparent focus:border-green-100" 
                    value={actionQty} 
                    min={1} 
                    onChange={(e) => setActionQty(parseInt(e.target.value) || 0)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">เจ้าหน้าที่ผู้รับ</label>
                  <select 
                    required 
                    className="w-full px-4 py-4 bg-slate-50 rounded-2xl outline-none text-sm font-bold shadow-inner border-2 border-transparent focus:border-blue-100" 
                    value={staffName} 
                    onChange={(e) => setStaffName(e.target.value)}
                  >
                    <option value="">-- เลือกเจ้าหน้าที่ --</option>
                    {STAFF_LIST.map(name => (<option key={name} value={name}>{name}</option>))}
                  </select>
                </div>
                <button 
                  type="submit" 
                  disabled={!foundItem || actionQty <= 0 || !staffName || isSyncing} 
                  className="w-full py-5 bg-green-600 text-white rounded-3xl font-bold shadow-xl active:scale-95 disabled:bg-slate-200 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-2"
                >
                   {isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ArrowDownCircle className="w-5 h-5"/> บันทึกรับเข้าคลัง</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {view === 'TRANSFER' && (
          <div className="p-6 animate-in slide-in-from-right duration-300 print:hidden">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setView('INVENTORY')} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100"><ArrowLeft className="w-5 h-5"/></button>
              <h2 className="text-xl font-bold text-blue-900">โอนย้ายพัสดุ</h2>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-tight">รหัสพัสดุ / ค้นหา</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="ป้อนรหัสพัสดุ..." 
                    className="flex-1 px-4 py-4 bg-slate-50 rounded-2xl outline-none font-mono text-sm border-2 border-transparent focus:border-blue-200 shadow-inner" 
                    value={targetId} 
                    onChange={(e) => setTargetId(e.target.value)} 
                  />
                  <button onClick={startScanner} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors">
                    <QrCode className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {foundItem ? (
                <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-start mb-2">
                     <h3 className="font-bold text-orange-900 text-sm leading-tight flex-1 pr-4">{foundItem.name}</h3>
                     <span className="text-[8px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{foundItem.id}</span>
                  </div>
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-orange-100/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">สต็อกปัจจุบัน:</p>
                    <p className="text-lg font-black text-orange-700">{foundItem.currentStock} <span className="text-[10px] font-bold text-orange-400">{foundItem.unit}</span></p>
                  </div>
                </div>
              ) : targetId.trim() && (
                <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-bold flex items-center gap-3 animate-pulse border border-red-100">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>ไม่พบพัสดุนี้ในคลัง</span>
                </div>
              )}

              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">จำนวนที่โอน</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-orange-700 text-center text-2xl shadow-inner border-2 border-transparent focus:border-orange-100" 
                      value={actionQty} 
                      min={1} 
                      onChange={(e) => setActionQty(parseInt(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">โอนไปยังแผนก</label>
                    <select 
                      required 
                      className="w-full px-4 py-4 bg-slate-50 rounded-2xl outline-none text-[12px] font-bold shadow-inner border-2 border-transparent focus:border-blue-100" 
                      value={recipientDept} 
                      onChange={(e) => setRecipientDept(e.target.value)}
                    >
                      <option value="">-- เลือกหน่วยงาน --</option>
                      {DEPARTMENTS.map(dept => (<option key={dept} value={dept}>{dept}</option>))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">เจ้าหน้าที่ผู้โอน</label>
                  <select 
                    required 
                    className="w-full px-4 py-4 bg-slate-50 rounded-2xl outline-none text-sm font-bold shadow-inner border-2 border-transparent focus:border-blue-100" 
                    value={staffName} 
                    onChange={(e) => setStaffName(e.target.value)}
                  >
                    <option value="">-- เลือกเจ้าหน้าที่ --</option>
                    {STAFF_LIST.map(name => (<option key={name} value={name}>{name}</option>))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">หมายเหตุ (ถ้ามี)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-4 bg-slate-50 rounded-2xl outline-none text-sm font-bold shadow-inner border-2 border-transparent focus:border-blue-100" 
                    value={transferNotes} 
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="ระบุรายละเอียดการโอน..."
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={!foundItem || actionQty <= 0 || !staffName || !recipientDept || isSyncing} 
                  className="w-full py-5 bg-orange-600 text-white rounded-3xl font-bold shadow-xl active:scale-95 disabled:bg-slate-200 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 mt-4"
                >
                   {isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ArrowRightLeft className="w-5 h-5"/> ยืนยันการโอนย้าย</>}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      <nav className="fixed bottom-7 left-1/2 -translate-x-1/2 w-[94%] max-w-[380px] bg-white/95 backdrop-blur-2xl border border-white/50 p-3 rounded-[40px] shadow-2xl flex items-center justify-between z-50 print:hidden">
        <button onClick={() => setView('SCANNER')} className={`flex-1 flex flex-col items-center justify-center py-2.5 transition-all ${view === 'SCANNER' ? 'text-blue-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <QrCode className="w-5.5 h-5.5" /><span className="text-[8px] font-black mt-1.5 uppercase tracking-widest">เบิกจ่าย</span>
        </button>
        <button onClick={() => setView('INVENTORY')} className={`flex-1 flex flex-col items-center justify-center py-2.5 transition-all ${['INVENTORY', 'INTAKE', 'TRANSFER'].includes(view) ? 'text-blue-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <PlusCircle className="w-5.5 h-5.5" /><span className="text-[8px] font-black mt-1.5 uppercase tracking-widest">คลัง</span>
        </button>
        <button onClick={() => setView('PENDING_LIST')} className={`w-16 h-16 -mt-14 rounded-full flex items-center justify-center transition-all bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-2xl active:scale-90 relative group ${view === 'PENDING_LIST' ? 'ring-4 ring-blue-100 ring-offset-2' : ''}`}>
          <ClipboardList className="w-8 h-8 relative z-10" />
          {pendingRecords.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-orange-500 text-white text-[11px] font-black flex items-center justify-center rounded-full border-3 border-white shadow-lg animate-bounce">{pendingRecords.length}</span>}
        </button>
        <button onClick={() => setView('HISTORY')} className={`flex-1 flex flex-col items-center justify-center py-2.5 transition-all ${view === 'HISTORY' ? 'text-blue-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <HistoryIcon className="w-5.5 h-5.5" /><span className="text-[8px] font-black mt-1.5 uppercase tracking-widest">ประวัติ</span>
        </button>
        <button onClick={() => setView('DASHBOARD')} className={`flex-1 flex flex-col items-center justify-center py-2.5 transition-all ${view === 'DASHBOARD' ? 'text-blue-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <LayoutDashboard className="w-5.5 h-5.5" /><span className="text-[8px] font-black mt-1.5 uppercase tracking-widest">รายงาน</span>
        </button>
      </nav>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { size: A4; margin: 15mm; }
          body { font-size: 11pt; color: black !important; padding: 0 !important; margin: 0 !important; }
          #root { width: 100% !important; margin: 0 !important; padding: 0 !important; display: block !important; overflow: visible !important; }
          .max-w-md { 
            max-width: none !important; 
            width: 100% !important; 
            box-shadow: none !important; 
            margin: 0 !important; 
            border: none !important; 
            overflow: visible !important; 
            height: auto !important; 
            min-height: 0 !important;
            display: block !important;
          }
          main { 
            overflow: visible !important; 
            height: auto !important; 
            padding: 0 !important; 
            margin: 0 !important; 
            display: block !important;
          }
          nav, header, button, .print-hidden, [role="button"], input, select { display: none !important; }
          .bg-slate-50, .bg-white, .bg-blue-50, .bg-red-50, .bg-amber-50, .bg-gradient-to-br { background: white !important; background-image: none !important; }
          .shadow-sm, .shadow-2xl, .shadow-xl, .shadow-md, .shadow-inner { box-shadow: none !important; }
          .border { border: 1px solid #eee !important; }
          .p-6, .p-7 { padding: 0 !important; }
          h2 { font-size: 18pt !important; margin-bottom: 20pt !important; color: black !important; font-weight: bold !important; display: block !important; }
          
          /* Dashboard Layout in Print */
          .grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 15pt !important; }
          .bg-white.p-6.rounded-[32px] { border: 1px solid #ddd !important; border-radius: 12pt !important; padding: 15pt !important; margin-bottom: 10pt !important; }
          .bg-white.p-4.rounded-3xl { border: 1px solid #ddd !important; border-radius: 12pt !important; padding: 10pt !important; }
          .bg-gradient-to-br.from-red-50 { border: 2px solid #ff4d4d !important; padding: 15pt !important; border-radius: 15pt !important; margin-top: 20pt !important; background: #fff8f8 !important; }
          
          /* General Print Styles */
          .space-y-3 > div { border-bottom: 1px solid #eee !important; padding: 8pt 0 !important; page-break-inside: avoid; }
          .w-1.5.h-1.5 { border: 1px solid black !important; }
          span[class*="text-red-600"], span[class*="text-amber-500"], span[class*="text-green-600"] { font-weight: bold !important; color: black !important; }
          svg { width: 100pt !important; height: 100pt !important; }
          
          /* Specific Inventory Table styles for Print */
          .print\\:grid { display: grid !important; }
          .print\\:grid-cols-6 { grid-template-columns: 1fr 2fr 1fr 1fr 1fr !important; }
          .print\\:border-slate-300 { border-color: #cbd5e1 !important; }
          .print\\:font-black { font-weight: 900 !important; }
          .print\\:text-\\[10pt\\] { font-size: 10pt !important; }
          .print\\:py-3 { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
        }
        ::-webkit-scrollbar { width: 0px; display: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
