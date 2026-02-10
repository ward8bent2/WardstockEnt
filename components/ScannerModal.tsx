
import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem } from '../types';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  defaultWard: string;
  onScanResult: (itemId: string, quantity: number, location: string) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, inventory, defaultWard, onScanResult }) => {
  const [step, setStep] = useState<'SCAN' | 'QUANTITY'>('SCAN');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [location, setLocation] = useState<string>(defaultWard);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && step === 'SCAN') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, step]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch (err) {
      console.error("Camera access error:", err);
      let errorMessage = "ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์การใช้งาน (แอปต้องการสิทธิ์กล้องเพื่อสแกนบาร์โค้ดบนซองพัสดุ)";
      
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
            errorMessage = "คุณได้ปฏิเสธการเข้าถึงกล้อง กรุณาเปิดใช้งานกล้องสำหรับเว็บไซต์นี้ในการตั้งค่าเบราว์เซอร์หรือระบบของคุณ";
        } else if (err.name === 'NotFoundError') {
            errorMessage = "ไม่พบกล้องในอุปกรณ์ของคุณ หรือกล้องถูกใช้โดยแอปพลิเคชันอื่น";
        } else if (err.name === 'NotReadableError') {
            errorMessage = "กล้องไม่สามารถใช้งานได้ อาจมีแอปอื่นกำลังใช้กล้องอยู่ หรือเกิดข้อผิดพลาดภายใน";
        } else if (err.name === 'OverconstrainedError') {
            errorMessage = "การตั้งค่ากล้องที่ร้องขอไม่สามารถใช้ได้บนอุปกรณ์ของคุณ";
        } else if (err.name === 'SecurityError') {
            errorMessage = "ไม่สามารถเข้าถึงกล้องได้เนื่องจากปัญหาด้านความปลอดภัย (เช่น ไม่ได้ใช้ HTTPS)";
        } else if (err.name === 'TypeError') {
            errorMessage = "เบราว์เซอร์ไม่รองรับการเข้าถึงกล้องในปัจจุบัน";
        }
      }
      setCameraError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleSimulateScan = (item: InventoryItem) => {
    setSelectedItem(item);
    setStep('QUANTITY');
    setQuantity(1);
    setLocation(defaultWard);
  };

  const handleConfirm = () => {
    if (selectedItem && quantity > 0) {
      onScanResult(selectedItem.id, quantity, location);
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setStep('SCAN');
    setSelectedItem(null);
    setQuantity(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-scaleIn border border-gray-100">
        {step === 'SCAN' ? (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">สแกนบาร์โค้ด</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Scan Supply Barcode</p>
              </div>
              <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="relative aspect-square bg-slate-900 rounded-[32px] overflow-hidden mb-6 border-4 border-blue-500 shadow-2xl shadow-blue-100">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center bg-slate-800">
                  <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  </div>
                  <p className="text-sm font-bold leading-relaxed">{cameraError}</p>
                </div>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 border-[50px] border-black/40 pointer-events-none"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-scanLine z-10"></div>
                  
                  {/* Focus Frame */}
                  <div className="absolute inset-[60px] border-2 border-white/30 rounded-2xl pointer-events-none">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                  </div>
                </>
              )}
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl mb-8 flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p className="text-xs text-blue-800 leading-relaxed">
                สแกนบาร์โค้ดจากซองหรือกล่องพัสดุโดยตรง ระบบรองรับบาร์โค้ดมาตรฐาน GS1/EAN ที่มากับผลิตภัณฑ์
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="h-px bg-gray-100 flex-1"></span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">โหมดทดสอบ (Simulate)</span>
                <span className="h-px bg-gray-100 flex-1"></span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {inventory.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => handleSimulateScan(item)}
                    className="group text-left p-3 bg-white hover:bg-blue-600 border border-gray-100 rounded-2xl transition-all shadow-sm hover:shadow-lg hover:shadow-blue-100 active:scale-95"
                  >
                    <div className="text-[10px] font-black text-blue-500 group-hover:text-blue-100 uppercase tracking-tight mb-0.5">กดเพื่อจำลองสแกน</div>
                    <div className="text-xs font-bold text-gray-700 group-hover:text-white truncate">{item.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-10">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-50">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">พบข้อมูลพัสดุ</h3>
              <p className="text-blue-600 font-black text-xl mt-2 px-4 py-2 bg-blue-50 rounded-xl inline-block">{selectedItem?.name}</p>
            </div>

            <div className="space-y-6 mb-10">
              <div className="bg-gray-50 p-8 rounded-[32px] border border-gray-100">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 text-center tracking-widest">ระบุจำนวนที่เบิกใช้ ({selectedItem?.unit})</label>
                <div className="flex items-center justify-center space-x-8">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-2xl font-black text-gray-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all active:scale-90"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-20 text-center text-4xl font-black bg-transparent border-none focus:ring-0 text-gray-800"
                  />
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-2xl font-black text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-100 transition-all active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">วอร์ด / เตียง / สถานที่เบิก</label>
                <input 
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="เช่น Bed 12, Ward 5A"
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-gray-700 shadow-sm"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button 
                onClick={() => setStep('SCAN')}
                className="flex-1 py-5 px-6 border-2 border-gray-100 text-gray-400 font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
              >
                สแกนใหม่
              </button>
              <button 
                onClick={handleConfirm}
                className="flex-[1.5] bg-blue-600 text-white font-black py-5 px-6 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest"
              >
                เพิ่มลงรายการ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
