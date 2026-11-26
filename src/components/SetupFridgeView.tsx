import React, { useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import { initializeFridgeCatalog } from '../lib/fridgeService';
import { DEFAULT_ADMIN_NAME } from '../types/fridge';
import { ProductImage } from './ProductImage';

export function SetupFridgeView() {
  const { isAdmin } = useFridge();
  const [normalStock, setNormalStock] = useState(12);
  const [zeroStock, setZeroStock] = useState(12);
  const [miniStock, setMiniStock] = useState(12);
  const [unitPrice, setUnitPrice] = useState(25);
  const [unitCost, setUnitCost] = useState(17);
  const [miniUnitPrice, setMiniUnitPrice] = useState(15);
  const [miniUnitCost, setMiniUnitCost] = useState(10);
  const [currencySymbol, setCurrencySymbol] = useState('C$');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await initializeFridgeCatalog(
        normalStock,
        zeroStock,
        unitPrice,
        unitCost,
        currencySymbol,
        DEFAULT_ADMIN_NAME,
        miniStock,
        miniUnitPrice,
        miniUnitCost
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo inicializar el inventario.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Configurar inventario inicial de la refrigeradora
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            {isAdmin
              ? 'Define las existencias y precios iniciales de las latas de 355 ml y las Mini de 200 ml. Luego podrás agregar más productos o volúmenes en Configuración.'
              : 'El administrador de la oficina aún no ha inicializado los productos de la refrigeradora.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <ProductImage
              variant="normal"
              volumeMl={355}
              alt="Coca-Cola Clásica 355 ml"
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Coca-Cola Clásica</span>
              <span className="text-xs font-mono text-slate-500">355 ml</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <ProductImage
              variant="normal"
              volumeMl={200}
              alt="Coca-Cola Mini 200 ml"
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Coca-Cola Mini</span>
              <span className="text-xs font-mono text-slate-500">200 ml</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <ProductImage
              variant="zero"
              volumeMl={355}
              alt="Coca-Cola Zero 355 ml"
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Coca-Cola Zero</span>
              <span className="text-xs font-mono text-slate-500">355 ml</span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <form onSubmit={handleInit} className="space-y-5 pt-2 border-t border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="init-normal" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Latas Clásica (355 ml)
                </label>
                <input
                  id="init-normal"
                  type="number"
                  min={0}
                  max={5000}
                  required
                  value={normalStock}
                  onChange={(e) => setNormalStock(parseInt(e.target.value || '0', 10))}
                  className="w-full h-11 px-3.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="init-mini" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Latas Mini (200 ml)
                </label>
                <input
                  id="init-mini"
                  type="number"
                  min={0}
                  max={5000}
                  required
                  value={miniStock}
                  onChange={(e) => setMiniStock(parseInt(e.target.value || '0', 10))}
                  className="w-full h-11 px-3.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="init-zero" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Latas Zero (355 ml)
                </label>
                <input
                  id="init-zero"
                  type="number"
                  min={0}
                  max={5000}
                  required
                  value={zeroStock}
                  onChange={(e) => setZeroStock(parseInt(e.target.value || '0', 10))}
                  className="w-full h-11 px-3.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div>
                <label htmlFor="init-currency" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Moneda
                </label>
                <input
                  id="init-currency"
                  type="text"
                  maxLength={8}
                  required
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="init-price" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Precio 355 ml
                </label>
                <input
                  id="init-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value || '0'))}
                  className="w-full h-11 px-3.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="init-cost" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Costo 355 ml
                </label>
                <input
                  id="init-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value || '0'))}
                  className="w-full h-11 px-3.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="init-mini-price" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Precio Mini 200 ml
                </label>
                <input
                  id="init-mini-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={miniUnitPrice}
                  onChange={(e) => setMiniUnitPrice(parseFloat(e.target.value || '0'))}
                  className="w-full h-11 px-3.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="init-mini-cost" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Costo Mini 200 ml
                </label>
                <input
                  id="init-mini-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={miniUnitCost}
                  onChange={(e) => setMiniUnitCost(parseFloat(e.target.value || '0'))}
                  className="w-full h-11 px-3.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <PackagePlus className="w-4 h-4" />
              {saving ? 'Inicializando...' : 'Inicializar refrigeradora'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
