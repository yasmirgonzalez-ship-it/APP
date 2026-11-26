import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import { createProduct } from '../lib/fridgeService';
import { BeverageVariant, SCHEMA_LIMITS } from '../types/fridge';

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const PRESETS = [
  {
    label: 'Coca-Cola Mini (200 ml)',
    name: 'Coca-Cola Mini',
    variant: 'normal' as BeverageVariant,
    volumeMl: 200,
    unitPrice: 15,
    unitCost: 10,
  },
  {
    label: 'Coca-Cola Zero Mini (200 ml)',
    name: 'Coca-Cola Zero Mini',
    variant: 'zero' as BeverageVariant,
    volumeMl: 200,
    unitPrice: 15,
    unitCost: 10,
  },
  {
    label: 'Coca-Cola Clásica (355 ml)',
    name: 'Coca-Cola Clásica',
    variant: 'normal' as BeverageVariant,
    volumeMl: 355,
    unitPrice: 25,
    unitCost: 17,
  },
  {
    label: 'Otra bebida',
    name: 'Sprite',
    variant: 'otro' as BeverageVariant,
    volumeMl: 355,
    unitPrice: 25,
    unitCost: 17,
  },
];

export function AddProductModal({
  open,
  onClose,
  onSuccess,
}: AddProductModalProps) {
  const { settings } = useFridge();
  const [name, setName] = useState('Coca-Cola Mini');
  const [variant, setVariant] = useState<BeverageVariant>('normal');
  const [volumeMl, setVolumeMl] = useState<number>(200);
  const [stock, setStock] = useState<number>(12);
  const [minStock, setMinStock] = useState<number>(6);
  const [unitPrice, setUnitPrice] = useState<string>('15');
  const [unitCost, setUnitCost] = useState<string>('10');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('Coca-Cola Mini');
    setVariant('normal');
    setVolumeMl(200);
    setStock(12);
    setMinStock(6);
    setUnitPrice('15');
    setUnitCost('10');
    setError(null);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedPrice = parseFloat(unitPrice);
    const parsedCost = parseFloat(unitCost);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('El precio de venta debe ser mayor a 0.');
      return;
    }
    if (volumeMl < SCHEMA_LIMITS.VOLUME_MIN || volumeMl > SCHEMA_LIMITS.VOLUME_MAX) {
      setError(
        `El volumen debe estar entre ${SCHEMA_LIMITS.VOLUME_MIN} ml y ${SCHEMA_LIMITS.VOLUME_MAX} ml.`
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createProduct({
        name,
        variant,
        volumeMl,
        stock,
        minStock,
        unitPrice: parsedPrice,
        unitCost: Number.isFinite(parsedCost) ? parsedCost : 0,
      });
      onSuccess(`Producto agregado: ${name} (${volumeMl} ml)`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el producto.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="add-product-title" className="text-lg font-semibold text-slate-900">
            Agregar producto al refrigerador
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
          {/* Quick Presets */}
          <div>
            <span className="block text-xs font-medium text-slate-600 mb-2">
              Plantillas rápidas
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setName(preset.name);
                    setVariant(preset.variant);
                    setVolumeMl(preset.volumeMl);
                    setUnitPrice(String(preset.unitPrice));
                    setUnitCost(String(preset.unitCost));
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-prod-name" className="block text-xs font-medium text-slate-600 mb-1">
                Nombre del producto
              </label>
              <input
                id="new-prod-name"
                type="text"
                required
                maxLength={SCHEMA_LIMITS.NAME_MAX}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Coca-Cola Mini"
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="new-prod-variant" className="block text-xs font-medium text-slate-600 mb-1">
                Tipo / línea
              </label>
              <select
                id="new-prod-variant"
                value={variant}
                onChange={(e) => setVariant(e.target.value as BeverageVariant)}
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="normal">Coca-Cola Clásica</option>
                <option value="zero">Coca-Cola Zero</option>
                <option value="otro">Otra bebida</option>
              </select>
            </div>
          </div>

          {/* Volume in ml */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="new-prod-volume" className="text-xs font-medium text-slate-600">
                Volumen del envase (ml)
              </label>
              <div className="flex items-center gap-1.5">
                {[200, 237, 355, 500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVolumeMl(v)}
                    className={`px-2 py-1 text-xs font-mono rounded border transition-colors whitespace-nowrap shrink-0 ${
                      volumeMl === v
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {v} ml
                  </button>
                ))}
              </div>
            </div>
            <input
              id="new-prod-volume"
              type="number"
              min={SCHEMA_LIMITS.VOLUME_MIN}
              max={SCHEMA_LIMITS.VOLUME_MAX}
              required
              value={volumeMl}
              onChange={(e) => setVolumeMl(parseInt(e.target.value || '200', 10))}
              className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-prod-price" className="block text-xs font-medium text-slate-600 mb-1">
                Precio de venta ({settings.currencySymbol})
              </label>
              <input
                id="new-prod-price"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="new-prod-cost" className="block text-xs font-medium text-slate-600 mb-1">
                Costo unitario ({settings.currencySymbol})
              </label>
              <input
                id="new-prod-cost"
                type="number"
                step="0.01"
                min="0"
                required
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-prod-stock" className="block text-xs font-medium text-slate-600 mb-1">
                Existencias iniciales
              </label>
              <input
                id="new-prod-stock"
                type="number"
                min={0}
                max={SCHEMA_LIMITS.STOCK_MAX}
                required
                value={stock}
                onChange={(e) => setStock(parseInt(e.target.value || '0', 10))}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="new-prod-min" className="block text-xs font-medium text-slate-600 mb-1">
                Alerta stock mínimo
              </label>
              <input
                id="new-prod-min"
                type="number"
                min={0}
                max={SCHEMA_LIMITS.MIN_STOCK_MAX}
                required
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value || '0', 10))}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
              />
            </div>
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
              className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              {submitting ? 'Agregando...' : 'Agregar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
