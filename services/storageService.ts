
import { InventoryItem, Transaction } from '../types';
import { INITIAL_INVENTORY } from '../constants';

// URL ล่าสุดตามที่ระบุในคำสั่ง (Final URL from prompt)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygNSd3p7EAgEyozjsmPKWvhg0hinh27liBJ6mZqOYNJmmMtcMzLUOBmQbn_jXK2FTW/exec';

// จำลองความหน่วงของเครือข่าย (Network Latency)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const storageService = {
  // ดึงข้อมูลสต็อกทั้งหมดจาก "Cloud" (LocalStorage)
  async getInventory(): Promise<InventoryItem[]> {
    await delay(500); 
    const data = localStorage.getItem('ward_inventory');
    return data ? JSON.parse(data) : INITIAL_INVENTORY;
  },

  // ดึงประวัติธุรกรรมจาก "Cloud" (LocalStorage)
  async getTransactions(): Promise<Transaction[]> {
    await delay(300);
    const data = localStorage.getItem('ward_transactions');
    if (!data) return [];
    return JSON.parse(data).map((t: any) => ({
      ...t,
      timestamp: new Date(t.timestamp)
    }));
  },

  // บันทึกข้อมูลกลับไปยัง "Cloud" (LocalStorage)
  async saveData(inventory: InventoryItem[], transactions: Transaction[]): Promise<boolean> {
    await delay(800); 
    try {
      localStorage.setItem('ward_inventory', JSON.stringify(inventory));
      localStorage.setItem('ward_transactions', JSON.stringify(transactions));
      return true;
    } catch (e) {
      console.error("Cloud Save Error:", e);
      return false;
    }
  },

  /**
   * ส่งข้อมูลรับเข้าพัสดุไปยัง Google Apps Script
   */
  async recordIntakeToSheets(
    itemName: string,
    quantity: number,
    unit: string,
    deliveryNote: string,
    receiver: string,
    remark: string = '',
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const payload = {
        action: 'income',
        timestamp: new Date().toISOString(),
        itemName: itemName,
        amount: Number(quantity), // แปลงเป็น Number ตามที่ได้รับมอบหมาย
        unit: unit || 'ชิ้น',
        receiver: receiver,
        deliveryNote: deliveryNote,
        remark: remark,
      };

      console.log(`[Google Sheets] Sending Income:`, payload);
      
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify(payload),
      });

      return { success: true, message: `(Google Sheets: บันทึกรับเข้าเรียบร้อย)` };
    } catch (error) {
      console.error("[Sheets Error]:", error);
      return { success: false };
    }
  },

  /**
   * ส่งข้อมูลการเบิกใช้พัสดุไปยัง Google Apps Script
   */
  async recordUsageToSheets(
    itemName: string,
    quantity: number,
    unit: string,
    requester: string,
    status: string = 'completed',
    remark: string = '',
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // ใช้ Key ตรงตามที่กำหนด: itemName, amount, unit, requester, remark
      const payload = {
        action: 'outcome',
        timestamp: new Date().toISOString(),
        itemName: itemName,
        amount: Number(quantity), // แปลงเป็น Number เพื่อความแม่นยำของข้อมูล
        unit: unit || 'ชิ้น',
        requester: requester,
        remark: remark,
        status: status
      };

      console.log(`[Google Sheets] Sending Outcome:`, payload);
      
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });

      return { success: true, message: `(Google Sheets: บันทึกการตัดสต็อกเรียบร้อย)` };
    } catch (error) {
      console.error("[Sheets Error]:", error);
      return { success: false };
    }
  },
};
