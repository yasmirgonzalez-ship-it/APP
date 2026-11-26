import { useMemo, useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import { exportSalesCsv, formatMoney, settlePendingSale } from '../lib/fridgeService';
import { getProductVolumeMl, Sale } from '../types/fridge';

interface SalesLedgerViewProps {
  onOpenSaleModal: () => void;
  onNotify: (message: string) => void;
}

export function SalesLedgerView({ onOpenSaleModal, onNotify }: SalesLedgerViewProps) {
  const { sales, allProducts, settings, isAdmin } = useFridge();
  const [productFilter, setProductFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [settlePickerId, setSettlePickerId] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const filteredSales = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sales.filter((s) => {
      if (productFilter !== 'all' && s.productId !== productFilter) return false;
      if (statusFilter === 'paid' && !s.paid) return false;
      if (statusFilter === 'pending' && s.paid) return false;
      if (term) {
        const hay = `${s.buyerName} ${s.productName} ${s.note}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [sales, productFilter, statusFilter, searchTerm]);

  const totalCans = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
  const totalCollected = filteredSales
    .filter((s) => s.paid)
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPending = filteredSales
    .filter((s) => !s.paid)
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const pendingByBuyer = useMemo(() => {
    const map = new Map<string, { buyerName: string; total: number; count: number }>();
    for (const s of sales) {
      if (s.paid) continue;
      const key = s.buyerName.trim().toLowerCase();
      const current = map.get(key) || { buyerName: s.buyerName, total: 0, count: 0 };
      current.total += s.totalAmount;
      current.count += s.quantity;
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [sales]);

  async function handleSettle(sale: Sale, method: 'efectivo' | 'transferencia') {
    setSettlingId(sale.id);
    try {
      await settlePendingSale(sale.id, method);
      setSettlePickerId(null);
      onNotify(
        `Cuenta saldada: ${sale.buyerName} (${formatMoney(
          sale.totalAmount,
          settings.currencySymbol
        )})`
      );
    } finally {
      setSettlingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de ventas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro detallado de entregas, métodos de pago y cuentas por cobrar
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={filteredSales.length === 0}
            onClick={() => exportSalesCsv(filteredSales, settings.currencySymbol)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenSaleModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar venta</span>
          </button>
        </div>
      </div>

      {/* Pending Balances Summary by Person */}
      {pendingByBuyer.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Cuentas pendientes por colaborador
            </h2>
            <span className="text-xs text-amber-700 font-medium tabular-nums">
              {pendingByBuyer.length}{' '}
              {pendingByBuyer.length === 1 ? 'persona con saldo' : 'personas con saldo'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pendingByBuyer.map((entry) => (
              <button
                key={entry.buyerName}
                type="button"
                onClick={() => {
                  setSearchTerm(entry.buyerName);
                  setStatusFilter('pending');
                }}
                className="text-left p-3.5 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition-colors"
              >
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {entry.buyerName}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500 tabular-nums">
                    {entry.count} {entry.count === 1 ? 'lata' : 'latas'}
                  </span>
                  <span className="font-mono font-semibold text-amber-700 tabular-nums">
                    {formatMoney(entry.total, settings.currencySymbol)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Product & Volume Filter */}
          <select
            aria-label="Filtrar por producto y volumen"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="h-9 px-3 text-xs font-medium text-slate-800 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20"
          >
            <option value="all">Todas las bebidas</option>
            {allProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({getProductVolumeMl(p)} ml)
              </option>
            ))}
          </select>

          {/* Segmented Status Filter */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'Todos los pagos' },
                { id: 'paid', label: 'Pagadas' },
                { id: 'pending', label: 'Por cobrar' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar colaborador o nota..."
            className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          />
        </div>
      </div>

      {/* Filtered Totals */}
      <div className="flex flex-wrap items-center gap-6 px-1 text-sm text-slate-600 tabular-nums">
        <span>
          <strong className="font-mono text-slate-900">{filteredSales.length}</strong>{' '}
          registros
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong className="font-mono text-slate-900">{totalCans}</strong> latas vendidas
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Cobrado:{' '}
          <strong className="font-mono text-emerald-700">
            {formatMoney(totalCollected, settings.currencySymbol)}
          </strong>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Por cobrar:{' '}
          <strong className="font-mono text-amber-700">
            {formatMoney(totalPending, settings.currencySymbol)}
          </strong>
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-600">
              No hay ventas que coincidan con los filtros seleccionados.
            </p>
            {(productFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setProductFilter('all');
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Fecha y hora</th>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Bebida</th>
                  <th className="py-3 px-4 text-right">Cant.</th>
                  <th className="py-3 px-4 text-right">P. Unit.</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Estado / Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSales.map((sale) => {
                  const dt = sale.createdAt ? sale.createdAt.toDate() : new Date();
                  const dateText = dt.toLocaleDateString('es-NI', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const timeText = dt.toLocaleTimeString('es-NI', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const methodLabel =
                    sale.paymentMethod === 'efectivo'
                      ? 'Efectivo'
                      : sale.paymentMethod === 'transferencia'
                        ? 'Transferencia'
                        : 'Fiado';

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {dateText} · {timeText}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {sale.buyerName}
                        {sale.note ? (
                          <span className="block text-xs font-normal text-slate-500">
                            {sale.note}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {sale.productName}{' '}
                        <span className="text-xs font-mono text-slate-500">
                          {getProductVolumeMl(sale)} ml
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                        {sale.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {formatMoney(sale.unitPrice, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {methodLabel}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                        {formatMoney(sale.totalAmount, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {sale.paid ? (
                          <span className="text-xs font-medium text-emerald-700">
                            Pagado
                          </span>
                        ) : !isAdmin ? (
                          <span className="text-xs font-medium text-amber-700">
                            Pendiente
                          </span>
                        ) : settlePickerId === sale.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={settlingId === sale.id}
                              onClick={() => handleSettle(sale, 'efectivo')}
                              className="px-2.5 py-1 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 whitespace-nowrap shrink-0"
                            >
                              Efectivo
                            </button>
                            <button
                              type="button"
                              disabled={settlingId === sale.id}
                              onClick={() => handleSettle(sale, 'transferencia')}
                              className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 whitespace-nowrap shrink-0"
                            >
                              Transf.
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSettlePickerId(sale.id)}
                            className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2 whitespace-nowrap shrink-0"
                          >
                            Marcar pagado
                          </button>
                        )}
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
