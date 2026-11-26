import React, { useEffect, useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import { updateFridgeSettings, updateProductConfig } from '../lib/fridgeService';
import {
  BeverageVariant,
  DEFAULT_ADMIN_NAME,
  getProductVolumeMl,
  Product,
  SCHEMA_LIMITS,
} from '../types/fridge';

interface SettingsViewProps {
  onOpenAddProduct: () => void;
  onNotify: (message: string) => void;
}

function ProductConfigCard({
  product,
  currencySymbol,
  onNotify,
}: {
  product: Product;
  currencySymbol: string;
  onNotify: (msg: string) => void;
}) {
  const [name, setName] = useState(product.name);
  const [variant, setVariant] = useState<BeverageVariant>(product.variant);
  const [volumeMl, setVolumeMl] = useState(String(getProductVolumeMl(product)));
  const [unitPrice, setUnitPrice] = useState(String(product.unitPrice));
  const [unitCost, setUnitCost] = useState(String(product.unitCost));
  const [minStock, setMinStock] = useState(String(product.minStock));
  const [stock, setStock] = useState(String(product.stock));
  const [active, setActive] = useState(product.active);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(product.name);
    setVariant(product.variant);
    setVolumeMl(String(getProductVolumeMl(product)));
    setUnitPrice(String(product.unitPrice));
    setUnitCost(String(product.unitCost));
    setMinStock(String(product.minStock));
    setStock(String(product.stock));
    setActive(product.active);
  }, [product]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProductConfig({
        productId: product.id,
        name,
        variant,
        volumeMl: parseInt(volumeMl || '355', 10),
        unitPrice: parseFloat(unitPrice) || 1,
        unitCost: parseFloat(unitCost) || 0,
        minStock: parseInt(minStock || '0', 10),
        stock: parseInt(stock || '0', 10),
        active,
      });
      onNotify(`Configuración actualizada para ${name} (${volumeMl} ml)`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {product.name} · {getProductVolumeMl(product)} ml
          </h3>
          <p className="text-xs text-slate-500">
            {product.active ? 'Visible en refrigeradora' : 'Oculto / archivado'}
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
          />
          <span>Activo</span>
        </label>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nombre visible
            </label>
            <input
              type="text"
              required
              maxLength={SCHEMA_LIMITS.NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Volumen (ml)
            </label>
            <input
              type="number"
              min={SCHEMA_LIMITS.VOLUME_MIN}
              max={SCHEMA_LIMITS.VOLUME_MAX}
              required
              value={volumeMl}
              onChange={(e) => setVolumeMl(e.target.value)}
              className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Línea / estilo de imagen
          </label>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as BeverageVariant)}
            className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="normal">Coca-Cola Clásica</option>
            <option value="zero">Coca-Cola Zero</option>
            <option value="otro">Otra bebida</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Precio de venta ({currencySymbol})
            </label>
            <input
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Costo unitario ({currencySymbol})
            </label>
            <input
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Stock físico actual (ajuste directo)
            </label>
            <input
              type="number"
              min={0}
              max={SCHEMA_LIMITS.STOCK_MAX}
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Alerta de stock mínimo
            </label>
            <input
              type="number"
              min={0}
              max={SCHEMA_LIMITS.MIN_STOCK_MAX}
              required
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Guardando...' : 'Guardar cambios'}</span>
        </button>
      </div>
    </form>
  );
}

export function SettingsView({ onOpenAddProduct, onNotify }: SettingsViewProps) {
  const { settings, allProducts } = useFridge();
  const [officeName, setOfficeName] = useState(settings.officeName);
  const [adminName, setAdminName] = useState(settings.adminName || DEFAULT_ADMIN_NAME);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [allowSelfService, setAllowSelfService] = useState(settings.allowSelfService);
  const [savingGeneral, setSavingGeneral] = useState(false);

  useEffect(() => {
    setOfficeName(settings.officeName);
    setAdminName(settings.adminName || DEFAULT_ADMIN_NAME);
    setCurrencySymbol(settings.currencySymbol);
    setAllowSelfService(settings.allowSelfService);
  }, [settings]);

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setSavingGeneral(true);
    try {
      await updateFridgeSettings({
        officeName,
        adminName,
        currencySymbol,
        allowSelfService,
      });
      onNotify('Configuración de la refrigeradora guardada');
    } finally {
      setSavingGeneral(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Agrega bebidas con distintos volúmenes (355 ml, 200 ml mini) y ajusta precios o inventario físico
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddProduct}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar producto</span>
        </button>
      </div>

      <form
        onSubmit={handleSaveGeneral}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Preferencias generales
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="office-name" className="block text-xs font-medium text-slate-600 mb-1">
              Nombre de la refrigeradora / área
            </label>
            <input
              id="office-name"
              type="text"
              required
              maxLength={SCHEMA_LIMITS.NAME_MAX}
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="admin-name" className="block text-xs font-medium text-slate-600 mb-1">
              Administrador / vendedor
            </label>
            <input
              id="admin-name"
              type="text"
              required
              maxLength={SCHEMA_LIMITS.NAME_MAX}
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="currency-symbol" className="block text-xs font-medium text-slate-600 mb-1">
              Símbolo de moneda
            </label>
            <input
              id="currency-symbol"
              type="text"
              required
              maxLength={SCHEMA_LIMITS.CURRENCY_MAX}
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              placeholder="C$, $, MXN..."
              className="w-full h-10 px-3 text-sm font-mono border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={allowSelfService}
            onChange={(e) => setAllowSelfService(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
          />
          <div>
            <div className="text-sm font-medium text-slate-900">
              Autoservicio para colaboradores
            </div>
            <div className="text-xs text-slate-500">
              Permite que otros miembros de la oficina inicien sesión con Google y registren su propio consumo de latas.
            </div>
          </div>
        </label>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingGeneral}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingGeneral ? 'Guardando...' : 'Guardar preferencias'}</span>
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Catálogo de productos ({allProducts.length})
          </h2>
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo producto / volumen</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {allProducts.map((product) => (
            <ProductConfigCard
              key={product.id}
              product={product}
              currencySymbol={settings.currencySymbol}
              onNotify={onNotify}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
