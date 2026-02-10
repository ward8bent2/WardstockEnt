
export enum UserRole {
  NURSE = 'NURSE',
  SUPERVISOR = 'SUPERVISOR'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  ward: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minLevel: number;
  maxLevel: number;
  unit: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'USAGE' | 'INTAKE' | 'TRANSFER';
  quantity: number;
  bedNumber?: string;
  fromWard?: string; // For intake: Source/Supplier, For transfer: From Ward
  toWard?: string; // For transfer: To Ward
  performedBy: string;
  timestamp: Date;
}

export type ViewState = 'DASHBOARD' | 'USAGE' | 'INTAKE' | 'TRANSFER' | 'CONSUMPTION' | 'MANAGEMENT';

// Type definition for Gemini's FunctionCall
export interface FunctionCall {
  name: string;
  args: { [key: string]: any };
  id?: string;
}
