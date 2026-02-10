
import React, { useState, useEffect, useRef } from 'react';
import { processUserCommand } from '../services/geminiService';
import { User, InventoryItem, Transaction, FunctionCall } from '../types';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  inventory: InventoryItem[]; // Pass current inventory for context or new item creation
  onPerformFunctionCall: (functionCall: FunctionCall) => Promise<string>;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUser,
  inventory,
  onPerformFunctionCall
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ type: 'user' | 'ai' | 'system', text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([{ type: 'ai', text: `สวัสดี ${currentUser.name}! มีอะไรให้ฉันช่วยบันทึกหรือวิเคราะห์ข้อมูลสต็อกไหม? (ตัวอย่าง: "รับหน้ากาก N95 50 ชิ้น จากห้องยา", "เบิกถุงมือ M 5 กล่องไปเตียง 12")` }]);
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // Provide inventory names for better context to Gemini
      const itemNames = inventory.map(item => item.name);
      const response = await processUserCommand(userMessage, currentUser.name, itemNames);

      if (response.functionCall) {
        setMessages(prev => [...prev, { type: 'system', text: `AI ตรวจพบคำสั่ง: ${response.functionCall.name} (กำลังดำเนินการ...)` }]);
        const resultMessage = await onPerformFunctionCall(response.functionCall);
        setMessages(prev => [...prev, { type: 'ai', text: resultMessage }]);
      } else {
        setMessages(prev => [...prev, { type: 'ai', text: response.text }]);
      }
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, { type: 'ai', text: "เกิดข้อผิดพลาดในการประมวลผลคำสั่ง โปรดลองอีกครั้ง" }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-[90vh] rounded-[40px] shadow-2xl overflow-hidden animate-scaleIn border border-gray-100 flex flex-col">
        <div className="p-8 pb-4 flex justify-between items-center bg-gray-50/50 border-b border-gray-100">
          <div>
            <h3 className="text-2xl font-black text-gray-800 tracking-tight">AI Assistant</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Chat to manage stock (Supervisor only)</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white text-gray-400 hover:text-gray-600 rounded-full transition-colors shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 p-8 space-y-4 overflow-y-auto custom-scrollbar">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-5 py-3 rounded-3xl text-sm leading-relaxed shadow-sm 
                ${msg.type === 'user' ? 'bg-blue-600 text-white rounded-br-none' : ''}
                ${msg.type === 'ai' ? 'bg-gray-100 text-gray-800 rounded-bl-none' : ''}
                ${msg.type === 'system' ? 'bg-amber-50/50 text-amber-800 text-xs italic' : ''}
              `}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[75%] px-5 py-3 rounded-3xl text-sm leading-relaxed bg-gray-100 text-gray-800 rounded-bl-none shadow-sm flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span>AI กำลังคิด...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-4 border-t border-gray-100 bg-white">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์คำสั่งเพื่อจัดการสต็อก หรือสอบถาม..."
              className="flex-1 px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-medium text-gray-700 shadow-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !input.trim()}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
