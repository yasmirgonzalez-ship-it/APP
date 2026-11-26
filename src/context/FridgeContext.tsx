import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutUser,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  DEFAULT_SETTINGS,
  FridgeSettings,
  getProductVolumeMl,
  Product,
  Restock,
  Sale,
} from '../types/fridge';

interface FridgeContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  products: Product[];
  allProducts: Product[];
  sales: Sale[];
  restocks: Restock[];
  settings: FridgeSettings;
  dataLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const FridgeContext = createContext<FridgeContextValue | null>(null);

function sortProducts(list: Product[]): Product[] {
  const variantOrder: Record<string, number> = { normal: 0, zero: 1, otro: 2 };
  return [...list].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    const va = variantOrder[a.variant] ?? 2;
    const vb = variantOrder[b.variant] ?? 2;
    if (va !== vb) return va - vb;
    return getProductVolumeMl(b) - getProductVolumeMl(a);
  });
}

export function FridgeProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [settings, setSettings] = useState<FridgeSettings>(DEFAULT_SETTINGS);
  const [dataLoading, setDataLoading] = useState(true);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  if (asyncError) {
    throw asyncError;
  }

  useEffect(() => {
    testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAdmin(false);
        setAllProducts([]);
        setSales([]);
        setRestocks([]);
        setSettings(DEFAULT_SETTINGS);
        setDataLoading(false);
        setAuthReady(true);
        return;
      }

      const isBootstrapped =
        Boolean(currentUser.emailVerified) &&
        currentUser.email === BOOTSTRAPPED_ADMIN_EMAIL;

      if (isBootstrapped) {
        setIsAdmin(true);
      } else {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
          setIsAdmin(adminSnap.exists());
        } catch {
          setIsAdmin(false);
        }
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    setDataLoading(true);

    // 1. Products listener (Admin sees all including archived; buyers see active only)
    const productsQuery = isAdmin
      ? collection(db, 'products')
      : query(collection(db, 'products'), where('active', '==', true));

    const unsubProducts = onSnapshot(
      productsQuery,
      (snap) => {
        const list = sortProducts(
          snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }))
        );
        setAllProducts(list);
        setDataLoading(false);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'products');
        } catch (wrapped) {
          setAsyncError(wrapped as Error);
        }
      }
    );

    // 2. Settings listener
    const settingsRef = doc(db, 'settings', 'fridge');
    const unsubSettings = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as FridgeSettings);
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, 'settings/fridge');
        } catch (wrapped) {
          setAsyncError(wrapped as Error);
        }
      }
    );

    // 3. Sales listener (Admin reads all; Collaborator reads own purchases)
    const salesQuery = isAdmin
      ? query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(200))
      : query(
          collection(db, 'sales'),
          where('buyerUid', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(100)
        );

    const unsubSales = onSnapshot(
      salesQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({
          ...(d.data() as Omit<Sale, 'id'>),
          id: d.id,
        }));
        setSales(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'sales');
        } catch (wrapped) {
          setAsyncError(wrapped as Error);
        }
      }
    );

    // 4. Restocks listener (Admin only)
    let unsubRestocks = () => {};
    if (isAdmin) {
      const restocksQuery = query(
        collection(db, 'restocks'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      unsubRestocks = onSnapshot(
        restocksQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<Restock, 'id'>),
            id: d.id,
          }));
          setRestocks(list);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.LIST, 'restocks');
          } catch (wrapped) {
            setAsyncError(wrapped as Error);
          }
        }
      );
    } else {
      setRestocks([]);
    }

    return () => {
      unsubProducts();
      unsubSettings();
      unsubSales();
      unsubRestocks();
    };
  }, [authReady, user, isAdmin]);

  const products = useMemo(
    () => allProducts.filter((p) => p.active),
    [allProducts]
  );

  const value = useMemo<FridgeContextValue>(
    () => ({
      user,
      authReady,
      isAdmin,
      products,
      allProducts,
      sales,
      restocks,
      settings,
      dataLoading,
      signIn: async () => {
        await signInWithGoogle();
      },
      signOut: async () => {
        await signOutUser();
      },
    }),
    [user, authReady, isAdmin, products, allProducts, sales, restocks, settings, dataLoading]
  );

  return <FridgeContext.Provider value={value}>{children}</FridgeContext.Provider>;
}

export function useFridge() {
  const ctx = useContext(FridgeContext);
  if (!ctx) {
    throw new Error('useFridge must be used inside FridgeProvider');
  }
  return ctx;
}
