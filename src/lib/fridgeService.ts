import type { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  BeverageVariant,
  DEFAULT_ADMIN_NAME,
  FridgeSettings,
  getProductVolumeMl,
  PaymentMethod,
  Product,
  Sale,
  SCHEMA_LIMITS,
} from '../types/fridge';

function sanitizeText(value: string, maxLength: number, fallback = ''): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function generateDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function clampVolumeMl(volumeMl: number): number {
  return Math.max(
    SCHEMA_LIMITS.VOLUME_MIN,
    Math.min(SCHEMA_LIMITS.VOLUME_MAX, Math.floor(volumeMl || 355))
  );
}

export function getDisplayNameFromUser(user: User): string {
  if (user.displayName && user.displayName.trim()) {
    return sanitizeText(user.displayName, SCHEMA_LIMITS.NAME_MAX, 'Colaborador');
  }
  if (user.email) {
    const localPart = user.email.split('@')[0] || 'Colaborador';
    return sanitizeText(localPart.replace(/[._-]+/g, ' '), SCHEMA_LIMITS.NAME_MAX, 'Colaborador');
  }
  return 'Colaborador';
}

export async function initializeFridgeCatalog(
  initialNormalStock = 12,
  initialZeroStock = 12,
  unitPrice = 25,
  unitCost = 17,
  currencySymbol = 'C$',
  adminName = DEFAULT_ADMIN_NAME,
  initialMiniStock = 12,
  miniUnitPrice = 15,
  miniUnitCost = 10
): Promise<void> {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  const normalRef = doc(db, 'products', 'coca-normal');
  const zeroRef = doc(db, 'products', 'coca-zero');
  const miniRef = doc(db, 'products', 'coca-mini-200ml');
  const settingsRef = doc(db, 'settings', 'fridge');

  batch.set(normalRef, {
    id: 'coca-normal',
    name: 'Coca-Cola Clásica',
    variant: 'normal',
    volumeMl: 355,
    stock: Math.max(0, Math.min(SCHEMA_LIMITS.STOCK_MAX, Math.floor(initialNormalStock))),
    minStock: 6,
    unitPrice: Number(unitPrice.toFixed(2)),
    unitCost: Number(unitCost.toFixed(2)),
    active: true,
    lastSaleId: '',
    updatedAt: now,
  });

  batch.set(zeroRef, {
    id: 'coca-zero',
    name: 'Coca-Cola Zero',
    variant: 'zero',
    volumeMl: 355,
    stock: Math.max(0, Math.min(SCHEMA_LIMITS.STOCK_MAX, Math.floor(initialZeroStock))),
    minStock: 6,
    unitPrice: Number(unitPrice.toFixed(2)),
    unitCost: Number(unitCost.toFixed(2)),
    active: true,
    lastSaleId: '',
    updatedAt: now,
  });

  if (initialMiniStock >= 0) {
    batch.set(miniRef, {
      id: 'coca-mini-200ml',
      name: 'Coca-Cola Mini',
      variant: 'normal',
      volumeMl: 200,
      stock: Math.max(0, Math.min(SCHEMA_LIMITS.STOCK_MAX, Math.floor(initialMiniStock))),
      minStock: 6,
      unitPrice: Number(miniUnitPrice.toFixed(2)),
      unitCost: Number(miniUnitCost.toFixed(2)),
      active: true,
      lastSaleId: '',
      updatedAt: now,
    });
  }

  batch.set(settingsRef, {
    officeName: 'Refrigeradora Oficina',
    currencySymbol: sanitizeText(currencySymbol, SCHEMA_LIMITS.CURRENCY_MAX, 'C$'),
    allowSelfService: true,
    adminName: sanitizeText(adminName, SCHEMA_LIMITS.NAME_MAX, DEFAULT_ADMIN_NAME),
    updatedAt: now,
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'products/settings');
  }
}

export interface CreateProductInput {
  name: string;
  variant: BeverageVariant;
  volumeMl: number;
  stock: number;
  minStock: number;
  unitPrice: number;
  unitCost: number;
}

export async function createProduct(input: CreateProductInput): Promise<string> {
  const cleanName = sanitizeText(input.name, SCHEMA_LIMITS.NAME_MAX, 'Bebida');
  const cleanVolume = clampVolumeMl(input.volumeMl);
  const slug = cleanName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  const rand = Math.random().toString(36).slice(2, 6);
  const productId = `${slug || 'prod'}-${cleanVolume}ml-${rand}`.replace(
    /[^a-zA-Z0-9_-]/g,
    ''
  );

  const productRef = doc(db, 'products', productId);
  const cleanPrice = Math.max(
    0.01,
    Math.min(SCHEMA_LIMITS.PRICE_MAX, Number(input.unitPrice.toFixed(2)))
  );
  const cleanCost = Math.max(
    0,
    Math.min(SCHEMA_LIMITS.PRICE_MAX, Number(input.unitCost.toFixed(2)))
  );

  try {
    await setDoc(productRef, {
      id: productId,
      name: cleanName,
      variant: input.variant,
      volumeMl: cleanVolume,
      stock: Math.max(0, Math.min(SCHEMA_LIMITS.STOCK_MAX, Math.floor(input.stock))),
      minStock: Math.max(0, Math.min(SCHEMA_LIMITS.MIN_STOCK_MAX, Math.floor(input.minStock))),
      unitPrice: cleanPrice,
      unitCost: cleanCost,
      active: true,
      lastSaleId: '',
      updatedAt: serverTimestamp(),
    });
    return productId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `products/${productId}`);
  }
}

export interface RecordSaleInput {
  productId: string;
  quantity: number;
  paymentMethod: PaymentMethod;
  buyerName: string;
  note?: string;
  user: User;
}

export async function recordSale(input: RecordSaleInput): Promise<string> {
  const ids = await recordMultiItemSale({
    items: [{ productId: input.productId, quantity: input.quantity }],
    paymentMethod: input.paymentMethod,
    buyerName: input.buyerName,
    note: input.note,
    user: input.user,
  });
  return ids[0];
}

export interface MultiSaleItemInput {
  productId: string;
  quantity: number;
}

export interface RecordMultiItemSaleInput {
  items: MultiSaleItemInput[];
  paymentMethod: PaymentMethod;
  buyerName: string;
  note?: string;
  user: User;
}

export async function recordMultiItemSale(
  input: RecordMultiItemSaleInput
): Promise<string[]> {
  const validItems = input.items
    .map((item) => ({
      productId: item.productId,
      quantity: Math.floor(item.quantity),
    }))
    .filter((item) => item.quantity > 0);

  if (validItems.length === 0) {
    throw new Error('Selecciona al menos una lata para registrar.');
  }

  for (const item of validItems) {
    if (
      item.quantity < SCHEMA_LIMITS.SALE_QTY_MIN ||
      item.quantity > SCHEMA_LIMITS.SALE_QTY_MAX
    ) {
      throw new Error(
        `La cantidad por bebida debe estar entre ${SCHEMA_LIMITS.SALE_QTY_MIN} y ${SCHEMA_LIMITS.SALE_QTY_MAX} unidades.`
      );
    }
  }

  const buyerName = sanitizeText(
    input.buyerName,
    SCHEMA_LIMITS.NAME_MAX,
    getDisplayNameFromUser(input.user)
  );
  const note = sanitizeText(input.note || '', SCHEMA_LIMITS.NOTE_MAX, '');
  const paid = input.paymentMethod !== 'credito';
  const saleIds = validItems.map((_, idx) => generateDocId(`sale${idx}`));

  try {
    await runTransaction(db, async (tx) => {
      const snaps = await Promise.all(
        validItems.map((item) => tx.get(doc(db, 'products', item.productId)))
      );

      const now = serverTimestamp();

      validItems.forEach((item, index) => {
        const productSnap = snaps[index];
        if (!productSnap.exists()) {
          throw new Error('El producto seleccionado no existe en el inventario.');
        }
        const product = productSnap.data() as Product;
        if (product.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente de ${product.name}. Disponible: ${product.stock}.`
          );
        }

        const saleId = saleIds[index];
        const saleRef = doc(db, 'sales', saleId);
        const productRef = doc(db, 'products', item.productId);
        const totalAmount = Number((item.quantity * product.unitPrice).toFixed(2));
        const salePayload: Record<string, unknown> = {
          productId: product.id,
          productName: product.name,
          variant: product.variant,
          quantity: item.quantity,
          unitPrice: product.unitPrice,
          totalAmount,
          paymentMethod: input.paymentMethod,
          paid,
          buyerUid: input.user.uid,
          buyerName,
          recordedByUid: input.user.uid,
          note,
          createdAt: now,
        };

        if (typeof product.volumeMl === 'number') {
          salePayload.volumeMl = product.volumeMl;
        }

        tx.set(saleRef, salePayload);

        tx.update(productRef, {
          stock: product.stock - item.quantity,
          lastSaleId: saleId,
          updatedAt: now,
        });
      });
    });

    return saleIds;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Stock insuficiente') ||
        error.message.includes('no existe en el inventario') ||
        error.message.includes('Selecciona al menos') ||
        error.message.includes('La cantidad'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'sales');
  }
}

export async function settlePendingSale(
  saleId: string,
  method: 'efectivo' | 'transferencia',
  note?: string
): Promise<void> {
  const saleRef = doc(db, 'sales', saleId);
  const payload: Record<string, unknown> = {
    paid: true,
    paymentMethod: method,
    settledAt: serverTimestamp(),
  };
  if (typeof note === 'string') {
    payload.note = sanitizeText(note, SCHEMA_LIMITS.NOTE_MAX, '');
  }

  try {
    await updateDoc(saleRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sales/${saleId}`);
  }
}

export interface RecordRestockInput {
  productId: string;
  quantityAdded: number;
  totalCost: number;
  supplier: string;
  note?: string;
  updateProductUnitCost?: boolean;
  user: User;
}

export async function recordRestock(input: RecordRestockInput): Promise<string> {
  const qty = Math.floor(input.quantityAdded);
  if (qty < SCHEMA_LIMITS.RESTOCK_QTY_MIN || qty > SCHEMA_LIMITS.RESTOCK_QTY_MAX) {
    throw new Error(
      `La reposición debe estar entre ${SCHEMA_LIMITS.RESTOCK_QTY_MIN} y ${SCHEMA_LIMITS.RESTOCK_QTY_MAX} unidades.`
    );
  }

  const totalCost = Math.max(0, Number(input.totalCost.toFixed(2)));
  const unitCost = Number((totalCost / qty).toFixed(2));
  const restockId = generateDocId('restock');

  const productRef = doc(db, 'products', input.productId);
  const restockRef = doc(db, 'restocks', restockId);

  try {
    await runTransaction(db, async (tx) => {
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists()) {
        throw new Error('Producto no encontrado.');
      }
      const product = productSnap.data() as Product;
      const nextStock = product.stock + qty;
      if (nextStock > SCHEMA_LIMITS.STOCK_MAX) {
        throw new Error(`El inventario total no puede superar ${SCHEMA_LIMITS.STOCK_MAX} unidades.`);
      }

      const now = serverTimestamp();

      tx.set(restockRef, {
        productId: product.id,
        productName: product.name,
        variant: product.variant,
        volumeMl: getProductVolumeMl(product),
        quantityAdded: qty,
        unitCost,
        totalCost,
        supplier: sanitizeText(input.supplier, SCHEMA_LIMITS.SUPPLIER_MAX, 'Compra directa'),
        note: sanitizeText(input.note || '', SCHEMA_LIMITS.NOTE_MAX, ''),
        recordedByUid: input.user.uid,
        recordedByName: getDisplayNameFromUser(input.user),
        createdAt: now,
      });

      const productUpdate: Record<string, unknown> = {
        stock: nextStock,
        updatedAt: now,
      };
      if (input.updateProductUnitCost && unitCost >= 0 && unitCost <= SCHEMA_LIMITS.PRICE_MAX) {
        productUpdate.unitCost = unitCost;
      }
      tx.update(productRef, productUpdate);
    });

    return restockId;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Producto no encontrado') ||
        error.message.includes('inventario total') ||
        error.message.includes('La reposición debe'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `restocks/${restockId}`);
  }
}

export interface UpdateProductConfigInput {
  productId: string;
  name: string;
  variant: BeverageVariant;
  volumeMl: number;
  unitPrice: number;
  unitCost: number;
  minStock: number;
  stock: number;
  active: boolean;
}

export async function updateProductConfig(input: UpdateProductConfigInput): Promise<void> {
  const productRef = doc(db, 'products', input.productId);
  const cleanPrice = Math.max(0.01, Math.min(SCHEMA_LIMITS.PRICE_MAX, Number(input.unitPrice.toFixed(2))));
  const cleanCost = Math.max(0, Math.min(SCHEMA_LIMITS.PRICE_MAX, Number(input.unitCost.toFixed(2))));
  const cleanMin = Math.max(0, Math.min(SCHEMA_LIMITS.MIN_STOCK_MAX, Math.floor(input.minStock)));
  const cleanStock = Math.max(0, Math.min(SCHEMA_LIMITS.STOCK_MAX, Math.floor(input.stock)));
  const cleanVolume = clampVolumeMl(input.volumeMl);

  try {
    await updateDoc(productRef, {
      name: sanitizeText(input.name, SCHEMA_LIMITS.NAME_MAX, 'Coca-Cola'),
      variant: input.variant,
      volumeMl: cleanVolume,
      unitPrice: cleanPrice,
      unitCost: cleanCost,
      minStock: cleanMin,
      stock: cleanStock,
      active: Boolean(input.active),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${input.productId}`);
  }
}

export async function updateFridgeSettings(settings: Omit<FridgeSettings, 'updatedAt'>): Promise<void> {
  const settingsRef = doc(db, 'settings', 'fridge');
  const payload = {
    officeName: sanitizeText(settings.officeName, SCHEMA_LIMITS.NAME_MAX, 'Refrigeradora Oficina'),
    currencySymbol: sanitizeText(settings.currencySymbol, SCHEMA_LIMITS.CURRENCY_MAX, 'C$'),
    allowSelfService: Boolean(settings.allowSelfService),
    adminName: sanitizeText(settings.adminName || DEFAULT_ADMIN_NAME, SCHEMA_LIMITS.NAME_MAX, DEFAULT_ADMIN_NAME),
    updatedAt: serverTimestamp(),
  };

  try {
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      await updateDoc(settingsRef, payload);
    } else {
      await setDoc(settingsRef, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/fridge');
  }
}

export function formatMoney(amount: number, currencySymbol: string): string {
  return `${currencySymbol} ${amount.toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function exportSalesCsv(sales: Sale[], currencySymbol: string): void {
  const headers = [
    'Fecha',
    'Hora',
    'Producto',
    'Volumen (ml)',
    'Cantidad',
    'Precio Unitario',
    'Total',
    'Moneda',
    'Método de Pago',
    'Estado',
    'Comprador',
    'Nota',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = sales.map((s) => {
    const dateObj = s.createdAt ? s.createdAt.toDate() : new Date();
    const fecha = dateObj.toLocaleDateString('es-NI');
    const hora = dateObj.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });
    const metodo =
      s.paymentMethod === 'efectivo'
        ? 'Efectivo'
        : s.paymentMethod === 'transferencia'
          ? 'Transferencia'
          : 'Crédito / Fiado';
    const estado = s.paid ? 'Pagado' : 'Pendiente';

    return [
      fecha,
      hora,
      s.productName,
      getProductVolumeMl(s),
      s.quantity,
      s.unitPrice.toFixed(2),
      s.totalAmount.toFixed(2),
      currencySymbol,
      metodo,
      estado,
      s.buyerName,
      s.note || '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ventas_refrigeradora_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
