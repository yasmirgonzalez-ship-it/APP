import { useEffect, useState } from 'react';
import { CheckCircle2, LogOut, Plus, QrCode } from 'lucide-react';
import { AddProductModal } from './components/AddProductModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OverviewView } from './components/OverviewView';
import { QrCheckoutView } from './components/QrCheckoutView';
import { QrPosterView } from './components/QrPosterView';
import { RestockModal } from './components/RestockModal';
import { RestocksView } from './components/RestocksView';
import { SaleModal } from './components/SaleModal';
import { SalesLedgerView } from './components/SalesLedgerView';
import { SettingsView } from './components/SettingsView';
import { SetupFridgeView } from './components/SetupFridgeView';
import { SignInView } from './components/SignInView';
import { FridgeProvider, useFridge } from './context/FridgeContext';
import { getDisplayNameFromUser } from './lib/fridgeService';
import { DEFAULT_ADMIN_NAME } from './types/fridge';

type AdminTab = 'resumen' | 'ventas' | 'reposiciones' | 'qr' | 'configuracion';
type BuyerTab = 'tomar' | 'mis-compras';

function DashboardShell() {
  const {
    user,
    authReady,
    isAdmin,
    products,
    allProducts,
    settings,
    dataLoading,
    signOut,
  } = useFridge();

  const initialQrParam =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('modo') === 'qr';

  const [adminTab, setAdminTab] = useState<AdminTab>('resumen');
  const [buyerTab, setBuyerTab] = useState<BuyerTab>('tomar');
  const [qrPreviewMode, setQrPreviewMode] = useState<boolean>(initialQrParam);

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleInitialProductId, setSaleInitialProductId] = useState<string | undefined>(
    undefined
  );
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockInitialProductId, setRestockInitialProductId] = useState<
    string | undefined
  >(undefined);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
          <div className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignInView />;
  }

  const adminDisplayName = settings.adminName || DEFAULT_ADMIN_NAME;
  const showBuyerExperience = !isAdmin || qrPreviewMode;

  const adminNavItems: { id: AdminTab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'ventas', label: 'Ventas' },
    { id: 'reposiciones', label: 'Reposiciones' },
    { id: 'qr', label: 'Código QR' },
    { id: 'configuracion', label: 'Configuración' },
  ];

  const buyerNavItems: { id: BuyerTab; label: string }[] = [
    { id: 'tomar', label: 'Tomar bebida' },
    { id: 'mis-compras', label: 'Mis compras' },
  ];

  function openSaleModal(productId?: string) {
    setSaleInitialProductId(productId);
    setSaleModalOpen(true);
  }

  function openRestockModal(productId?: string) {
    setRestockInitialProductId(productId);
    setRestockModalOpen(true);
  }

  const canSell = products.some((p) => p.stock > 0);
  const catalogEmpty = isAdmin ? allProducts.length === 0 : products.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar Contract: 3 clean zones (Hidden on print) */}
      <header className="no-print bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <button
            type="button"
            onClick={() => {
              if (isAdmin && !qrPreviewMode) setAdminTab('resumen');
              else setBuyerTab('tomar');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left"
          >
            RefriControl
          </button>

          {/* Zone 2: Single-line nav links */}
          {!showBuyerExperience ? (
            <nav
              aria-label="Navegación de administrador"
              className="hidden md:flex items-center gap-6 text-sm font-medium"
            >
              {adminNavItems.map((item) => {
                const active = adminTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAdminTab(item.id)}
                    className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'border-red-600 text-slate-900 font-semibold'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          ) : (
            <nav
              aria-label="Navegación de comprador"
              className="hidden md:flex items-center gap-6 text-sm font-medium"
            >
              {buyerNavItems.map((item) => {
                const active = buyerTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setBuyerTab(item.id)}
                    className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'border-red-600 text-slate-900 font-semibold'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Zone 3: 1 Primary CTA */}
          <div className="shrink-0">
            {!showBuyerExperience ? (
              <button
                type="button"
                disabled={!canSell}
                onClick={() => openSaleModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar venta</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setBuyerTab(buyerTab === 'tomar' ? 'mis-compras' : 'tomar')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <QrCode className="w-4 h-4" />
                <span>{buyerTab === 'tomar' ? 'Mis compras' : 'Elegir bebida'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation (Hidden on print) */}
      <nav
        aria-label="Navegación móvil"
        className="no-print md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto"
      >
        {(!showBuyerExperience ? adminNavItems : buyerNavItems).map((item) => {
          const active = !showBuyerExperience
            ? adminTab === item.id
            : buyerTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (!showBuyerExperience) setAdminTab(item.id as AdminTab);
                else setBuyerTab(item.id as BuyerTab);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Workspace Context & Session Bar (Hidden on print) */}
          <div className="no-print flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-800">{settings.officeName}</span>
              <span aria-hidden="true">·</span>
              <span>
                {isAdmin
                  ? `Administrador: ${adminDisplayName}`
                  : `Comprador: ${getDisplayNameFromUser(user)}`}
              </span>
              {!isAdmin && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Vendedor: {adminDisplayName}</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>

          {toastMessage && (
            <div
              role="status"
              className="no-print flex items-center justify-between gap-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-sm"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-xs font-semibold text-emerald-800 hover:underline whitespace-nowrap shrink-0"
              >
                Cerrar
              </button>
            </div>
          )}

          {dataLoading ? (
            <div className="space-y-6">
              <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
                <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
              </div>
            </div>
          ) : catalogEmpty ? (
            <SetupFridgeView />
          ) : showBuyerExperience ? (
            buyerTab === 'tomar' ? (
              <QrCheckoutView
                onExitQrPreview={
                  isAdmin
                    ? () => {
                        setQrPreviewMode(false);
                        setAdminTab('qr');
                      }
                    : undefined
                }
              />
            ) : (
              <SalesLedgerView
                onOpenSaleModal={() => setBuyerTab('tomar')}
                onNotify={setToastMessage}
              />
            )
          ) : (
            <>
              {adminTab === 'resumen' && (
                <OverviewView
                  onOpenSaleModal={openSaleModal}
                  onOpenRestockModal={openRestockModal}
                  onOpenAddProduct={() => setAddProductModalOpen(true)}
                  onViewAllSales={() => setAdminTab('ventas')}
                  onNotify={setToastMessage}
                />
              )}
              {adminTab === 'ventas' && (
                <SalesLedgerView
                  onOpenSaleModal={() => openSaleModal()}
                  onNotify={setToastMessage}
                />
              )}
              {adminTab === 'reposiciones' && (
                <RestocksView onOpenRestockModal={() => openRestockModal()} />
              )}
              {adminTab === 'qr' && (
                <QrPosterView
                  onPreviewBuyerQr={() => {
                    setBuyerTab('tomar');
                    setQrPreviewMode(true);
                  }}
                />
              )}
              {adminTab === 'configuracion' && (
                <SettingsView
                  onOpenAddProduct={() => setAddProductModalOpen(true)}
                  onNotify={setToastMessage}
                />
              )}
            </>
          )}
        </div>
      </main>

      {isAdmin && !showBuyerExperience && (
        <>
          <SaleModal
            open={saleModalOpen}
            initialProductId={saleInitialProductId}
            onClose={() => setSaleModalOpen(false)}
            onSuccess={setToastMessage}
          />
          <RestockModal
            open={restockModalOpen}
            initialProductId={restockInitialProductId}
            onClose={() => setRestockModalOpen(false)}
            onSuccess={setToastMessage}
          />
          <AddProductModal
            open={addProductModalOpen}
            onClose={() => setAddProductModalOpen(false)}
            onSuccess={setToastMessage}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <FridgeProvider>
        <DashboardShell />
      </FridgeProvider>
    </ErrorBoundary>
  );
}
