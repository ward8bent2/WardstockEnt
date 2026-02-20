
export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  min: number;
  max: number;
  type: string;
  status?: 'OUT' | 'LOW' | 'NORMAL' | 'OVER';
}

export interface PendingRecord {
  id: string; 
  itemId: string;
  itemName: string;
  unit: string; // เพิ่มฟิลด์ unit
  quantity: number;
  bedNumber: string;
  staffName: string;
  timestamp: string;
}

export interface HistoryRecord {
  timestamp: string;
  itemId: string;
  itemName: string;
  quantityUsed: number;
  staffName: string;
  bedNumber?: string;
  type: 'DISBURSEMENT' | 'TRANSFER_OUT' | 'SHIFT_TOTAL';
  transferTo?: string;
  notes?: string;
}

export interface IntakeRecord {
  date: string;
  id: string;
  name: string;
  quantityReceived: number;
  receivedBy: string;
  source?: string;
}

export type ViewState = 'SCANNER' | 'PENDING_LIST' | 'HISTORY' | 'INTAKE' | 'TRANSFER' | 'DASHBOARD' | 'INVENTORY';
export type DashboardPeriod = 'MONTH' | 'QUARTER' | 'YEAR';
