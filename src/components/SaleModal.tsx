import React, { useEffect, useState } from 'react';
import { Banknote, Building2, Clock, Minus, Plus, X } from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import { formatMoney, getDisplayNameFromUser, recordSale } from '../lib/fridgeService';
import { getProductVolumeMl, PaymentMethod, Product, SCHEMA_LIMITS } from '../types/fridge';

interface SaleModalProps {
  open: boolean;
  initialProductId?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function SaleModal({
  open,
  initialProductId,
  onClose,
  onSuccess,
}: SaleModalProps) {
  const { products, settings, user } = useFridge();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [buyerName, setBuyerName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const defaultProd =
      products.find((p) => p.id === initialProductId && p.stock > 0) ||
      products.find((p) => p.stock > 0) ||
      products[0];
    setSelectedProductId(defaultProd?.id || '');
    setQuantity(1);
    setPaymentMethod('efectivo');
    setBuyerName(user ? getDisplayNameFromUser(user) : '');
    setNote('');
    setError(null);
  }, [open, initialProductId, products, user]);

  if (!open) return null;

  const selectedProduct: Product | undefined = products.find(
    (p) => p.id === selectedProductId
  );
  const maxQty = Math.min(
    SCHEMA_LIMITS.SALE_QTY_MAX,
    Math.max(1, selectedProduct?.stock ?? 0)
  );
  const totalAmount = selectedProduct ? quantity * selectedProduct.unitPrice : 0;
  const outOfStock = !selectedProduct || selectedProduct.stock <= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedProduct) return;
    if (selectedProduct.stock < quantity) {
      setError(`Solo quedan ${selectedProduct.stock} latas disponibles.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await recordSale({
        productId: selectedProduct.id,
        quantity,
        paymentMethod,
        buyerName,
        note,
        user,
      });
      onSuccess(
        `Venta registrada: ${quantity} × ${selectedProduct.name} (${formatMoney(
          totalAmount,
          settings.currencySymbol
        )})`
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la venta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="sale-modal-title" className="text-lg font-semibold text-slate-900">
            Registrar venta
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Product Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Bebida
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {products.map((product) => {
                const active = product.id === selectedProductId;
                const isZero = product.variant === 'zero';
                const vol = getProductVolumeMl(product);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setQuantity(1);
                      setError(null);
                    }}
                    className={`text-left p-3.5 rounded-lg border transition-colors min-h-[44px] ${
                      active
                        ? isZero
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-red-600 bg-red-50/70 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{product.name}</span>
                      <span
                        className={`text-xs font-mono shrink-0 ${
                          active && isZero ? 'text-zinc-300' : 'text-slate-500'
                        }`}
                      >
                        {vol} ml
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-xs tabular-nums ${
                        active && isZero ? 'text-zinc-300' : 'text-slate-500'
                      }`}
                    >
                      {formatMoney(product.unitPrice, settings.currencySymbol)} · {product.stock} disp.
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity & Total Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cantidad (latas)
              </label>
              <div className="inline-flex items-center border border-slate-200 rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || outOfStock}
                  className="w-11 h-11 inline-flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  aria-label="Disminuir cantidad"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-14 text-center font-mono text-base font-semibold tabular-nums text-slate-900">
                  {outOfStock ? 0 : quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty || outOfStock}
                  className="w-11 h-11 inline-flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="sm:text-right border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50">
              <div className="text-xs text-slate-500">Total a cobrar</div>
              <div className="text-xl font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                {formatMoney(outOfStock ? 0 : totalAmount, settings.currencySymbol)}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Método de pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'efectivo', label: 'Efectivo', Icon: Banknote },
                  { id: 'transferencia', label: 'Transferencia', Icon: Building2 },
                  { id: 'credito', label: 'Fiado / Crédito', Icon: Clock },
                ] as const
              ).map(({ id, label, Icon }) => {
                const selected = paymentMethod === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[42px] ${
                      selected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buyer Name */}
          <div>
            <label htmlFor="buyer-name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nombre del colaborador
            </label>
            <input
              id="buyer-name"
              type="text"
              required
              maxLength={SCHEMA_LIMITS.NAME_MAX}
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Ej. Ana López"
              className="w-full h-11 px-3.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
            />
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor="sale-note" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nota (opcional)
            </label>
            <input
              id="sale-note"
              type="text"
              maxLength={SCHEMA_LIMITS.NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Pagado en caja de gerencia"
              className="w-full h-11 px-3.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || outOfStock}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              {submitting ? 'Registrando...' : 'Confirmar venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
