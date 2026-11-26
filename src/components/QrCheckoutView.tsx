import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  Minus,
  Plus,
} from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import {
  formatMoney,
  getDisplayNameFromUser,
  recordMultiItemSale,
} from '../lib/fridgeService';
import {
  DEFAULT_ADMIN_NAME,
  getProductVolumeMl,
  PaymentMethod,
  SCHEMA_LIMITS,
} from '../types/fridge';
import { ProductImage } from './ProductImage';

interface QrCheckoutViewProps {
  onExitQrPreview?: () => void;
}

export function QrCheckoutView({ onExitQrPreview }: QrCheckoutViewProps) {
  const { products, sales, settings, user, isAdmin } = useFridge();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [buyerName, setBuyerName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    cans: number;
    total: number;
    method: PaymentMethod;
  } | null>(null);

  useEffect(() => {
    if (user && !buyerName) {
      setBuyerName(getDisplayNameFromUser(user));
    }
  }, [user, buyerName]);

  const adminDisplayName = settings.adminName || DEFAULT_ADMIN_NAME;
  const selfServicePaused = !settings.allowSelfService && !isAdmin;

  const totalCans = products.reduce(
    (sum, p) => sum + (quantities[p.id] || 0),
    0
  );
  const totalAmount = products.reduce(
    (sum, p) => sum + (quantities[p.id] || 0) * p.unitPrice,
    0
  );

  const myPendingSales = sales.filter(
    (s) => s.buyerUid === user?.uid && !s.paid
  );
  const myPendingTotal = myPendingSales.reduce(
    (sum, s) => sum + s.totalAmount,
    0
  );
  const myRecentSales = sales
    .filter((s) => s.buyerUid === user?.uid)
    .slice(0, 6);

  function updateQty(productId: string, delta: number, maxStock: number) {
    setReceipt(null);
    setError(null);
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const limit = Math.min(SCHEMA_LIMITS.SALE_QTY_MAX, maxStock);
      const next = Math.max(0, Math.min(limit, current + delta));
      return { ...prev, [productId]: next };
    });
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!user || totalCans === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const items = products
        .map((p) => ({ productId: p.id, quantity: quantities[p.id] || 0 }))
        .filter((item) => item.quantity > 0);

      await recordMultiItemSale({
        items,
        paymentMethod,
        buyerName,
        note,
        user,
      });

      setReceipt({
        cans: totalCans,
        total: totalAmount,
        method: paymentMethod,
      });
      setQuantities({});
      setNote('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo registrar tu consumo.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {isAdmin && onExitQrPreview && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs">
          <span className="text-slate-600">
            Vista móvil de comprador (como se ve al escanear el QR)
          </span>
          <button
            type="button"
            onClick={onExitQrPreview}
            className="inline-flex items-center gap-1.5 font-semibold text-red-600 hover:text-red-700 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al panel admin</span>
          </button>
        </div>
      )}

      {/* Header Intro */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">
          ¿Qué vas a tomar de la refrigeradora?
        </h1>
        <p className="text-sm text-slate-500">
          Elige la presentación, cantidad de latas y tu forma de pago · Administrador:{' '}
          <span className="font-medium text-slate-700">{adminDisplayName}</span>
        </p>
      </div>

      {selfServicePaused ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-700">
          El autoservicio está pausado temporalmente por el administrador ({adminDisplayName}).
        </div>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-6">
          {/* Receipt Confirmation */}
          {receipt && (
            <div
              role="status"
              className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-1.5"
            >
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Consumo registrado correctamente</span>
              </div>
              <p className="text-sm text-emerald-900 tabular-nums">
                {receipt.cans} {receipt.cans === 1 ? 'lata' : 'latas'} por{' '}
                <strong className="font-mono">
                  {formatMoney(receipt.total, settings.currencySymbol)}
                </strong>{' '}
                ({receipt.method === 'efectivo'
                  ? 'Efectivo'
                  : receipt.method === 'transferencia'
                    ? 'Transferencia'
                    : `Fiado a ${adminDisplayName}`}
                ). ¡Disfruta tu bebida!
              </p>
            </div>
          )}

          {/* Beverage Selection Cards (Read-only Price & Stock, Touch Steppers) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => {
              const qty = quantities[product.id] || 0;
              const isZero = product.variant === 'zero';
              const vol = getProductVolumeMl(product);
              const outOfStock = product.stock <= 0;

              return (
                <div
                  key={product.id}
                  className={`bg-white border rounded-xl overflow-hidden flex flex-col transition-colors ${
                    qty > 0
                      ? isZero
                        ? 'border-zinc-900'
                        : 'border-red-600'
                      : 'border-slate-200'
                  }`}
                >
                  <ProductImage
                    variant={product.variant}
                    volumeMl={vol}
                    alt={`${product.name} ${vol} ml`}
                    className="w-full aspect-[4/3] object-cover"
                  />

                  <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          {product.name}
                        </h2>
                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          {vol} ml ·{' '}
                          {outOfStock
                            ? 'Sin existencias'
                            : `${product.stock} disp.`}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-mono font-bold text-slate-900 tabular-nums">
                          {formatMoney(product.unitPrice, settings.currencySymbol)}
                        </div>
                        <div className="text-[11px] text-slate-500">c/u</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-xs font-medium text-slate-600">
                        Cantidad
                      </span>

                      <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50">
                        <button
                          type="button"
                          disabled={qty <= 0}
                          onClick={() => updateQty(product.id, -1, product.stock)}
                          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-700 hover:bg-white disabled:opacity-35 rounded-l-lg transition-colors"
                          aria-label={`Quitar ${product.name}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <span className="w-10 text-center font-mono text-base font-bold tabular-nums text-slate-900">
                          {qty}
                        </span>

                        <button
                          type="button"
                          disabled={outOfStock || qty >= Math.min(SCHEMA_LIMITS.SALE_QTY_MAX, product.stock)}
                          onClick={() => updateQty(product.id, 1, product.stock)}
                          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-700 hover:bg-white disabled:opacity-35 rounded-r-lg transition-colors"
                          aria-label={`Agregar ${product.name}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ¿Cómo vas a pagar?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(
                  [
                    { id: 'efectivo', label: 'Efectivo', Icon: Banknote },
                    { id: 'transferencia', label: 'Transferencia', Icon: Building2 },
                    { id: 'credito', label: 'Fiado / Anotar', Icon: Clock },
                  ] as const
                ).map(({ id, label, Icon }) => {
                  const selected = paymentMethod === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id)}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[46px] ${
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
              {paymentMethod === 'credito' && (
                <p className="mt-2 text-xs text-amber-700">
                  Se registrará como cuenta pendiente. Solo {adminDisplayName} podrá marcarla como pagada al recibir el pago.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="qr-buyer-name" className="block text-xs font-medium text-slate-600 mb-1">
                  Tu nombre
                </label>
                <input
                  id="qr-buyer-name"
                  type="text"
                  required
                  maxLength={SCHEMA_LIMITS.NAME_MAX}
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                />
              </div>

              <div>
                <label htmlFor="qr-note" className="block text-xs font-medium text-slate-600 mb-1">
                  Nota (opcional)
                </label>
                <input
                  id="qr-note"
                  type="text"
                  maxLength={SCHEMA_LIMITS.NOTE_MAX}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej. Pago el viernes"
                  className="w-full h-11 px-3.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">Total a registrar</div>
                <div className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {formatMoney(totalAmount, settings.currencySymbol)}
                  <span className="ml-2 text-xs font-sans font-normal text-slate-500">
                    ({totalCans} {totalCans === 1 ? 'lata' : 'latas'})
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || totalCans === 0}
                className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 min-h-[48px]"
              >
                {submitting
                  ? 'Registrando...'
                  : totalCans === 0
                    ? 'Selecciona una lata'
                    : `Registrar consumo · ${formatMoney(totalAmount, settings.currencySymbol)}`}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Buyer Personal History & Pending Debt Summary */}
      <section aria-label="Mis consumos" className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            Mis últimos consumos
          </h2>
          {myPendingTotal > 0 && (
            <span className="text-xs font-medium text-amber-700 tabular-nums">
              Saldo pendiente con {adminDisplayName}:{' '}
              <strong className="font-mono">
                {formatMoney(myPendingTotal, settings.currencySymbol)}
              </strong>
            </span>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {myRecentSales.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Aún no tienes consumos registrados con tu cuenta.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myRecentSales.map((sale) => {
                const dt = sale.createdAt ? sale.createdAt.toDate() : new Date();
                return (
                  <div
                    key={sale.id}
                    className="px-4 py-3 flex items-center justify-between gap-4 text-sm"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {sale.quantity} × {sale.productName}{' '}
                        <span className="text-xs font-mono text-slate-500">
                          {getProductVolumeMl(sale)} ml
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {dt.toLocaleDateString('es-NI', {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        ·{' '}
                        {dt.toLocaleTimeString('es-NI', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ·{' '}
                        {sale.paymentMethod === 'efectivo'
                          ? 'Efectivo'
                          : sale.paymentMethod === 'transferencia'
                            ? 'Transferencia'
                            : 'Fiado'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatMoney(sale.totalAmount, settings.currencySymbol)}
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          sale.paid ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {sale.paid ? 'Pagado' : 'Pendiente'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
