
import { InventoryItem, User, UserRole } from './types';

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'หน้ากากอนามัย N95', category: 'PPE', currentStock: 50, minLevel: 20, maxLevel: 200, unit: 'ชิ้น', isActive: true },
  { id: '2', name: 'ถุงมือยาง Size M', category: 'PPE', currentStock: 120, minLevel: 50, maxLevel: 500, unit: 'กล่อง', isActive: true },
  { id: '3', name: 'สายให้น้ำเกลือ (IV Set)', category: 'Medical Supply', currentStock: 200, minLevel: 100, maxLevel: 1000, unit: 'ชุด', isActive: true },
  { id: '4', name: 'กระบอกฉีดยา 5ml', category: 'Medical Supply', currentStock: 500, minLevel: 100, maxLevel: 2000, unit: 'ชิ้น', isActive: true },
  { id: '5', name: 'แอลกอฮอล์ 70% 450ml', category: 'Sanitizer', currentStock: 15, minLevel: 10, maxLevel: 50, unit: 'ขวด', isActive: true },
  { id: '6', name: 'พลาสเตอร์ปิดแผล', category: 'Medical Supply', currentStock: 80, minLevel: 30, maxLevel: 300, unit: 'ม้วน', isActive: true },
];

export const MOCK_USERS: User[] = [
  { id: 'N001', name: 'พยาบาลสมหญิง', role: UserRole.NURSE, ward: 'Ward 5A' },
  { id: 'S001', name: 'หัวหน้าสมศรี', role: UserRole.SUPERVISOR, ward: 'Ward 5A' },
];

export const APP_THEME = {
  primary: 'blue-600',
  secondary: 'emerald-600',
  danger: 'rose-600',
  warning: 'amber-500',
};
