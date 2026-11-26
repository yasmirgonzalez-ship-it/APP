import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  PackagePlus,
  Plus,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import {
  formatMoney,
  getDisplayNameFromUser,
  recordSale,
  settlePendingSale,
} from '../lib/fridgeService';
import { getProductVolumeMl, Product, Sale } from '../types/fridge';
import { ProductImage } from './ProductImage';

interface OverviewViewProps {
  onOpenSaleModal: (productId?: string) => void;
  onOpenRestockModal: (productId?: string) => void;
  onOpenAddProduct: () => void;
  onViewAllSales: () => void;
  onNotify: (message: string) => void;
}

export function OverviewView({
  onOpenSaleModal,
  onOpenRestockModal,
  onOpenAddProduct,
  onViewAllSales,
  onNotify,
}: OverviewViewProps) {
  const { products, sales, settings, isAdmin, user } = useFridge();
  const [quickBusyId, setQuickBusyId] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settlePickerId, setSettlePickerId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  const todayStr = new Date().toDateString();
  const todaySales = sales.filter((s) => {
    const d = s.createdAt ? s.createdAt.toDate() : new Date();
    return d.toDateString() === todayStr;
  });

  const todayCans = todaySales.reduce((sum, s) => sum + s.quantity, 0);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);

  const totalPaidRevenue = sales
    .filter((s) => s.paid)
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const pendingSales = sales.filter((s) => !s.paid);
  const pendingAmount = pendingSales.reduce((sum, s) => sum + s.totalAmount, 0);

  const estimatedProfit = sales.reduce((sum, s) => {
    const prod = products.find((p) => p.id === s.productId);
    const cost = prod ? prod.unitCost : 0;
    return sum + (s.totalAmount - cost * s.quantity);
  }, 0);

  async function handleQuickCashSale(product: Product) {
    if (!user || product.stock < 1) return;
    setQuickBusyId(product.id);
    setErrorMsg(null);
    try {
      await recordSale({
        productId: product.id,
        quantity: 1,
        paymentMethod: 'efectivo',
        buyerName: getDisplayNameFromUser(user),
        note: 'Venta rápida',
        user,
      });
      onNotify(
        `Venta rápida: 1 × ${product.name} ${getProductVolumeMl(product)} ml (${formatMoney(
          product.unitPrice,
          settings.currencySymbol
        )})`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar venta.');
    } finally {
      setQuickBusyId(null);
    }
  }

  async function handleSettle(sale: Sale, method: 'efectivo' | 'transferencia') {
    setSettlingId(sale.id);
    setErrorMsg(null);
    try {
      await settlePendingSale(sale.id, method);
      setSettlePickerId(null);
      onNotify(
        `Cobro registrado: ${sale.buyerName} (${formatMoney(
          sale.totalAmount,
          settings.currencySymbol
        )})`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo marcar como pagado.');
    } finally {
      setSettlingId(null);
    }
  }

  function getStockStatus(product: Product) {
    if (product.stock === 0) {
      return { label: 'Sin existencias', colorClass: 'text-red-600' };
    }
    if (product.stock <= product.minStock) {
      return { label: 'Stock bajo', colorClass: 'text-amber-600' };
    }
    return { label: 'Stock óptimo', colorClass: 'text-emerald-600' };
  }

  const recentSales = sales.slice(0, 8);

  return (
    <div className="space-y-8">
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-4">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs font-semibold underline whitespace-nowrap shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <section aria-label="Indicadores principales">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">Stock en refrigeradora</div>
            <div className="mt-2 text-2xl font-mono font-semibold text-slate-900 tabular-nums">
              {totalStock} latas
            </div>
            <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {products.length} productos ·{' '}
              {lowStockCount > 0 ? `${lowStockCount} con stock bajo` : 'todo en orden'}
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">Ventas de hoy</div>
            <div className="mt-2 text-2xl font-mono font-semibold text-slate-900 tabular-nums">
              {formatMoney(todayRevenue, settings.currencySymbol)}
            </div>
            <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {todayCans} {todayCans === 1 ? 'lata vendida' : 'latas vendidas'} · {todaySales.length} registros
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">Ingresos cobrados</div>
            <div className="mt-2 text-2xl font-mono font-semibold text-slate-900 tabular-nums">
              {formatMoney(totalPaidRevenue, settings.currencySymbol)}
            </div>
            <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {isAdmin
                ? `Utilidad est. ${formatMoney(estimatedProfit, settings.currencySymbol)}`
                : `${sales.filter((s) => s.paid).length} compras liquidadas`}
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">Saldo por cobrar (Fiado)</div>
            <div
              className={`mt-2 text-2xl font-mono font-semibold tabular-nums ${
                pendingAmount > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {formatMoney(pendingAmount, settings.currencySymbol)}
            </div>
            <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {pendingSales.length}{' '}
              {pendingSales.length === 1 ? 'cuenta pendiente' : 'cuentas pendientes'}
            </div>
          </div>
        </div>
      </section>

      {/* Fridge Shelf Product Cards */}
      <section aria-label="Inventario actual por bebida" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Existencias en refrigeradora
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Descuento automático de stock en cada venta por presentación y volumen
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAddProduct}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar producto / volumen</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {products.map((product) => {
            const status = getStockStatus(product);
            const isZero = product.variant === 'zero';
            const vol = getProductVolumeMl(product);
            const capacityTarget = Math.max(24, product.minStock * 3);
            const fillPercent = Math.min(100, Math.round((product.stock / capacityTarget) * 100));
            const isBusy = quickBusyId === product.id;

            return (
              <article
                key={product.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 items-stretch flex-1">
                  <div className="sm:col-span-5 bg-slate-100">
                    <ProductImage
                      variant={product.variant}
                      volumeMl={vol}
                      alt={`${product.name} ${vol} ml`}
                      className="w-full h-48 sm:h-full object-cover"
                    />
                  </div>

                  <div className="sm:col-span-7 p-5 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {product.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                            {vol} ml · Precio{' '}
                            {formatMoney(product.unitPrice, settings.currencySymbol)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 ${status.colorClass}`}
                        >
                          {product.stock <= product.minStock ? (
                            <AlertCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-5 flex items-baseline justify-between gap-4">
                        <div>
                          <span className="text-3xl font-mono font-semibold text-slate-900 tabular-nums">
                            {product.stock}
                          </span>
                          <span className="ml-2 text-sm text-slate-500">
                            {product.stock === 1 ? 'lata disponible' : 'latas disponibles'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums">
                          Mín. {product.minStock}
                        </span>
                      </div>

                      <div className="mt-2.5 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-200 ${
                            product.stock === 0
                              ? 'bg-red-600'
                              : product.stock <= product.minStock
                                ? 'bg-amber-500'
                                : isZero
                                  ? 'bg-zinc-900'
                                  : 'bg-red-600'
                          }`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={product.stock < 1 || isBusy}
                        onClick={() => handleQuickCashSale(product)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                          isZero
                            ? 'bg-zinc-900 hover:bg-zinc-800'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{isBusy ? 'Registrando...' : 'Venta rápida (-1)'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={product.stock < 1}
                        onClick={() => onOpenSaleModal(product.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Detallar venta</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onOpenRestockModal(product.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          <span>Reponer</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Recent Sales Table */}
      <section aria-label="Movimientos recientes" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isAdmin ? 'Últimas ventas registradas' : 'Mis últimas compras'}
          </h2>
          <button
            type="button"
            onClick={onViewAllSales}
            className="text-sm font-medium text-red-600 hover:text-red-700 whitespace-nowrap shrink-0"
          >
            Ver historial completo
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {recentSales.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-slate-600">
                Todavía no hay ventas registradas en la refrigeradora.
              </p>
              <button
                type="button"
                onClick={() => onOpenSaleModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Registrar primera venta
              </button>
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
                    <th className="py-3 px-4">Pago</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {recentSales.map((sale) => {
                    const dt = sale.createdAt ? sale.createdAt.toDate() : new Date();
                    const dateText = dt.toLocaleDateString('es-NI', {
                      day: '2-digit',
                      month: 'short',
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
                            <span className="block text-xs font-normal text-slate-500 truncate max-w-[200px]">
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
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {methodLabel}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium tabular-nums text-slate-900 whitespace-nowrap">
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
                              Pendiente · Cobrar
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
      </section>
    </div>
  );
}
