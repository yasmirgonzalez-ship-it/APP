import { useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import { formatMoney } from '../lib/fridgeService';
import { getProductVolumeMl } from '../types/fridge';

interface RestocksViewProps {
  onOpenRestockModal: () => void;
}

export function RestocksView({ onOpenRestockModal }: RestocksViewProps) {
  const { restocks, allProducts, settings } = useFridge();
  const [productFilter, setProductFilter] = useState<string>('all');

  const filtered = restocks.filter((r) =>
    productFilter === 'all' ? true : r.productId === productFilter
  );

  const totalCansAdded = filtered.reduce((sum, r) => sum + r.quantityAdded, 0);
  const totalInvested = filtered.reduce((sum, r) => sum + r.totalCost, 0);
  const avgCost = totalCansAdded > 0 ? totalInvested / totalCansAdded : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reposiciones de inventario</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Historial de ingresos de latas y costos de compra para la refrigeradora
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenRestockModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <PackagePlus className="w-4 h-4" />
          <span>Nueva reposición</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Latas ingresadas</div>
          <div className="mt-2 text-2xl font-mono font-semibold text-slate-900 tabular-nums">
            {totalCansAdded} latas
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Inversión acumulada</div>
          <div className="mt-2 text-2xl font-mono font-semibold text-slate-900 tabular-nums">
            {formatMoney(totalInvested, settings.currencySymbol)}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Costo promedio por lata</div>
          <div className="mt-2 text-2xl font-mono font-semibold text-slate-900 tabular-nums">
            {formatMoney(avgCost, settings.currencySymbol)}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between">
        <select
          aria-label="Filtrar reposiciones por producto"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="h-10 px-3 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15"
        >
          <option value="all">Todas las presentaciones</option>
          {allProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({getProductVolumeMl(p)} ml)
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-600">
              Aún no se han registrado reposiciones para este filtro.
            </p>
            <button
              type="button"
              onClick={onOpenRestockModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <PackagePlus className="w-4 h-4" />
              Registrar primera reposición
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Bebida</th>
                  <th className="py-3 px-4 text-right">Ingresadas</th>
                  <th className="py-3 px-4 text-right">Costo / lata</th>
                  <th className="py-3 px-4 text-right">Costo total</th>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">Registrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((item) => {
                  const dt = item.createdAt ? item.createdAt.toDate() : new Date();
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {dt.toLocaleDateString('es-NI', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {item.productName}{' '}
                        <span className="text-xs font-mono font-normal text-slate-500">
                          {getProductVolumeMl(item)} ml
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                        +{item.quantityAdded}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {formatMoney(item.unitCost, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatMoney(item.totalCost, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {item.supplier}
                        {item.note ? (
                          <span className="block text-xs text-slate-500">{item.note}</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {item.recordedByName}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
