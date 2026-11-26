import { useState } from 'react';
import { LogIn, QrCode } from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import { DEFAULT_ADMIN_NAME } from '../types/fridge';
import { ProductImage } from './ProductImage';

export function SignInView() {
  const { signIn } = useFridge();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isQrFlow =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('modo') === 'qr';

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signIn();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesión con Google.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            RefriControl
          </span>
          <button
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Conectando...' : 'Iniciar sesión'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                {isQrFlow && <QrCode className="w-4 h-4 shrink-0" />}
                <span>
                  {isQrFlow
                    ? 'Registro rápido por código QR'
                    : 'Control de refrigeradora de oficina'}
                </span>
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight text-balance">
                {isQrFlow
                  ? 'Inicia sesión y registra cuántas latas vas a tomar'
                  : 'Inventario y ventas de Coca-Cola Normal y Zero en tiempo real'}
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                {isQrFlow
                  ? `Escaneaste el QR de la refrigeradora. Inicia sesión con tu cuenta de Google para seleccionar tu Coca-Cola Normal o Zero y registrar el pago a ${DEFAULT_ADMIN_NAME}.`
                  : `Registra cada lata vendida al instante, genera el código QR para la puerta del refrigerador y lleva el control de pagos bajo la administración de ${DEFAULT_ADMIN_NAME}.`}
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={loading}
                className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 min-h-[46px]"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Iniciando sesión...' : 'Iniciar sesión con Google'}</span>
              </button>
              <span className="text-xs text-slate-500">
                Sincronización en tiempo real para toda la oficina
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 gap-4 items-stretch">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <ProductImage
                variant="normal"
                alt="Lata fría de Coca-Cola Clásica"
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="p-4 space-y-1">
                <div className="text-sm font-semibold text-slate-900">Coca-Cola Normal</div>
                <div className="text-xs text-slate-500">Lata 355 ml · Clásica</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <ProductImage
                variant="zero"
                alt="Lata fría de Coca-Cola Zero"
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="p-4 space-y-1">
                <div className="text-sm font-semibold text-slate-900">Coca-Cola Zero</div>
                <div className="text-xs text-slate-500">Lata 355 ml · Sin azúcar</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
