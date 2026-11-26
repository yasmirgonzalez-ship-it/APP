import type { Timestamp } from 'firebase/firestore';

export type BeverageVariant = 'normal' | 'zero' | 'otro';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'credito';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'supervision.ambiental2@hemco.com.ni';
export const DEFAULT_ADMIN_NAME = 'Josué Rojas Pilarte';
export const SHARED_APP_URL =
  'https://ais-pre-hn4g2xr6lbiejabucttrsx-455801737905.us-west1.run.app';

// Synchronized boundary constants matching firebase-blueprint.json & firestore.rules
export const SCHEMA_LIMITS = {
  NAME_MAX: 80,
  NOTE_MAX: 160,
  SUPPLIER_MAX: 80,
  CURRENCY_MAX: 8,
  VOLUME_MIN: 50,
  VOLUME_MAX: 5000,
  SALE_QTY_MIN: 1,
  SALE_QTY_MAX: 24,
  RESTOCK_QTY_MIN: 1,
  RESTOCK_QTY_MAX: 500,
  STOCK_MAX: 5000,
  MIN_STOCK_MAX: 500,
  PRICE_MAX: 100000,
} as const;

export const PRODUCT_IMAGES = {
  normal: '/src/assets/images/coca_cola_normal_can_1795709003350.jpg',
  normalMini: '/src/assets/images/coca_cola_mini_can_1795710667566.jpg',
  zero: '/src/assets/images/coca_cola_zero_can_1795709003742.jpg',
} as const;

export interface Product {
  id: string;
  name: string;
  variant: BeverageVariant;
  volumeMl?: number;
  stock: number;
  minStock: number;
  unitPrice: number;
  unitCost: number;
  active: boolean;
  lastSaleId: string;
  updatedAt: Timestamp | null;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  variant: BeverageVariant;
  volumeMl?: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paid: boolean;
  buyerUid: string;
  buyerName: string;
  recordedByUid: string;
  note: string;
  createdAt: Timestamp | null;
  settledAt?: Timestamp | null;
}

export interface Restock {
  id: string;
  productId: string;
  productName: string;
  variant: BeverageVariant;
  volumeMl?: number;
  quantityAdded: number;
  unitCost: number;
  totalCost: number;
  supplier: string;
  note: string;
  recordedByUid: string;
  recordedByName: string;
  createdAt: Timestamp | null;
}

export interface FridgeSettings {
  officeName: string;
  currencySymbol: string;
  allowSelfService: boolean;
  adminName?: string;
  updatedAt: Timestamp | null;
}

export const DEFAULT_SETTINGS: FridgeSettings = {
  officeName: 'Refrigeradora Oficina',
  currencySymbol: 'C$',
  allowSelfService: true,
  adminName: DEFAULT_ADMIN_NAME,
  updatedAt: null,
};

export function getProductVolumeMl(item: { volumeMl?: number }): number {
  return typeof item.volumeMl === 'number' && item.volumeMl > 0
    ? item.volumeMl
    : 355;
}
