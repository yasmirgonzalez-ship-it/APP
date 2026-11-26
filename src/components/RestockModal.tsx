import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import { formatMoney, recordRestock } from '../lib/fridgeService';
import { getProductVolumeMl, SCHEMA_LIMITS } from '../types/fridge';

interface RestockModalProps {
  open: boolean;
  initialProductId?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function RestockModal({
  open,
  initialProductId,
  onClose,
  onSuccess,
}: RestockModalProps) {
  const { products, settings, user } = useFridge();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantityAdded, setQuantityAdded] = useState<number>(12);
  const [totalCost, setTotalCost] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('Supermercado / Distribuidor');
  const [note, setNote] = useState<string>('');
  const [updateUnitCost, setUpdateUnitCost] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prod =
      products.find((p) => p.id === initialProductId) || products[0];
    setSelectedProductId(prod?.id || '');
    const defaultQty = 12;
    setQuantityAdded(defaultQty);
    setTotalCost(prod ? (prod.unitCost * defaultQty).toFixed(2) : '0.00');
    setSupplier('Supermercado / Distribuidor');
    setNote('');
    setUpdateUnitCost(true);
    setError(null);
  }, [open, initialProductId, products]);

  if (!open) return null;

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const numericTotal = parseFloat(totalCost) || 0;
  const unitCostPreview = quantityAdded > 0 ? numericTotal / quantityAdded : 0;

  function applyQuickPreset(qty: number) {
    setQuantityAdded(qty);
    if (selectedProduct) {
      setTotalCost((selectedProduct.unitCost * qty).toFixed(2));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedProduct) return;

    setSubmitting(true);
    setError(null);
    try {
      await recordRestock({
        productId: selectedProduct.id,
        quantityAdded,
        totalCost: numericTotal,
        supplier,
        note,
        updateProductUnitCost: updateUnitCost,
        user,
      });
      onSuccess(
        `Reposición guardada: +${quantityAdded} latas de ${selectedProduct.name}`
      );
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar la reposición.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restock-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="restock-modal-title" className="text-lg font-semibold text-slate-900">
            Reponer inventario
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Producto a reponer
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {products.map((product) => {
                const active = product.id === selectedProductId;
                const vol = getProductVolumeMl(product);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setTotalCost((product.unitCost * quantityAdded).toFixed(2));
                    }}
                    className={`text-left p-3.5 rounded-lg border transition-colors min-h-[44px] ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{product.name}</span>
                      <span
                        className={`text-xs font-mono shrink-0 ${
                          active ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {vol} ml
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-xs tabular-nums ${
                        active ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      Actual: {product.stock} unidades
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="restock-qty" className="text-sm font-medium text-slate-700">
                Latas ingresadas
              </label>
              <div className="flex items-center gap-1.5">
                {[6, 12, 24, 48].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyQuickPreset(preset)}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                      quantityAdded === preset
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
            <input
              id="restock-qty"
              type="number"
              min={SCHEMA_LIMITS.RESTOCK_QTY_MIN}
              max={SCHEMA_LIMITS.RESTOCK_QTY_MAX}
              required
              value={quantityAdded}
              onChange={(e) => {
                const next = Math.max(
                  1,
                  Math.min(SCHEMA_LIMITS.RESTOCK_QTY_MAX, parseInt(e.target.value || '1', 10))
                );
                setQuantityAdded(next);
              }}
              className="w-full h-11 px-3.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="restock-cost" className="block text-sm font-medium text-slate-700 mb-1.5">
                Costo total de compra ({settings.currencySymbol})
              </label>
              <input
                id="restock-cost"
                type="number"
                step="0.01"
                min="0"
                required
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
              />
            </div>

            <div className="border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50">
              <div className="text-xs text-slate-500">Costo por lata</div>
              <div className="text-base font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                {formatMoney(unitCostPreview, settings.currencySymbol)}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={updateUnitCost}
              onChange={(e) => setUpdateUnitCost(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span>Actualizar costo unitario del producto con esta compra</span>
          </label>

          <div>
            <label htmlFor="restock-supplier" className="block text-sm font-medium text-slate-700 mb-1.5">
              Proveedor o tienda
            </label>
            <input
              id="restock-supplier"
              type="text"
              maxLength={SCHEMA_LIMITS.SUPPLIER_MAX}
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full h-11 px-3.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
            />
          </div>

          <div>
            <label htmlFor="restock-note" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nota (opcional)
            </label>
            <input
              id="restock-note"
              type="text"
              maxLength={SCHEMA_LIMITS.NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Paquete de 24 latas"
              className="w-full h-11 px-3.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
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
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              {submitting ? 'Guardando...' : 'Agregar al inventario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
