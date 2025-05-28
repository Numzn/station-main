// Types and interfaces for the Settings module
import { Timestamp } from 'firebase/firestore';

export interface FuelPrices {
  petrolPrice: number;
  dieselPrice: number;
  lastUpdated: string;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: 'staff' | 'admin';
}

export interface SystemProfile {
  name: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type SettingsTab = 'prices' | 'clear' | 'users' | 'profile';

export interface TabItem {
  key: SettingsTab;
  label: string;
  icon?: string;
}
