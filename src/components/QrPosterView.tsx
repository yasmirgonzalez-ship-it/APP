import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Download, Printer, Smartphone } from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import { formatMoney } from '../lib/fridgeService';
import {
  DEFAULT_ADMIN_NAME,
  getProductVolumeMl,
  SHARED_APP_URL,
} from '../types/fridge';

interface QrPosterViewProps {
  onPreviewBuyerQr: () => void;
}

export function QrPosterView({ onPreviewBuyerQr }: QrPosterViewProps) {
  const { products, settings } = useFridge();
  const currentOriginQr = `${window.location.origin}/?modo=qr`;
  const sharedQrUrl = `${SHARED_APP_URL}/?modo=qr`;

  const [qrUrl, setQrUrl] = useState<string>(sharedQrUrl);
  const [copied, setCopied] = useState(false);
  const svgWrapperRef = useRef<HTMLDivElement>(null);

  const adminDisplayName = settings.adminName || DEFAULT_ADMIN_NAME;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  }

  function handleDownloadPng() {
    const svgEl = svgWrapperRef.current?.querySelector('svg');
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const size = 900;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 60, 60, size - 120, size - 120);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = 'qr-refrigeradora-oficina.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Código QR para la refrigeradora
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Imprime este afiche y pégalo en la puerta del refrigerador para que el equipo registre su consumo desde el celular.
          </p>
        </div>

        <button
          type="button"
          onClick={onPreviewBuyerQr}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Smartphone className="w-4 h-4" />
          <span>Probar vista móvil QR</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column (Hidden on print) */}
        <div className="no-print lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">Enlace del código QR</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Al escanear este enlace, los compradores acceden directo al selector móvil con todas las presentaciones y volúmenes activos sin permisos de edición.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="qr-url-input" className="block text-xs font-medium text-slate-700">
              URL destino
            </label>
            <input
              id="qr-url-input"
              type="url"
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              className="w-full h-10 px-3 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setQrUrl(sharedQrUrl)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  qrUrl === sharedQrUrl
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                URL compartida (Oficina)
              </button>
              <button
                type="button"
                onClick={() => setQrUrl(currentOriginQr)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  qrUrl === currentOriginQr
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                URL actual del navegador
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir afiche para refrigerador</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar PNG</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Enlace copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar enlace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Printable Fridge Door Poster */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="print-only-sheet w-full max-w-md bg-white border-2 border-slate-900 rounded-2xl p-8 text-center space-y-6">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-red-600 tracking-wide">
                {settings.officeName}
              </p>
              <h2 className="text-2xl font-bold text-slate-900 text-balance">
                ¿Vas a tomar una bebida fría?
              </h2>
              <p className="text-sm text-slate-600">
                Escanea el código QR con tu celular y registra tu consumo al instante.
              </p>
            </div>

            <div
              ref={svgWrapperRef}
              className="inline-flex p-5 bg-white border border-slate-200 rounded-xl"
            >
              <QRCodeSVG
                value={qrUrl || sharedQrUrl}
                size={220}
                level="M"
                includeMargin={false}
                fgColor="#0f172a"
                bgColor="#ffffff"
              />
            </div>

            {/* Current Prices for all active products & volumes */}
            <div className="text-left border-t border-b border-slate-200 py-3.5 divide-y divide-slate-100">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="py-2 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-sm font-semibold text-slate-900">
                      {product.name}
                    </span>
                    <span className="ml-2 text-xs font-mono text-slate-500">
                      {getProductVolumeMl(product)} ml
                    </span>
                  </div>
                  <span className="text-base font-mono font-bold text-slate-900 tabular-nums">
                    {formatMoney(product.unitPrice, settings.currencySymbol)}
                  </span>
                </div>
              ))}
            </div>

            {/* 3 Simple Steps */}
            <ol className="text-left text-xs text-slate-600 space-y-2">
              <li>
                <strong className="text-slate-900">1. Escanea</strong> el código con la cámara de tu teléfono.
              </li>
              <li>
                <strong className="text-slate-900">2. Selecciona</strong> la presentación (355 ml, 200 ml mini) y cantidad.
              </li>
              <li>
                <strong className="text-slate-900">3. Elige</strong> pago en Efectivo, Transferencia o Fiado.
              </li>
            </ol>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
              Administración y cobros:{' '}
              <strong className="text-slate-800">{adminDisplayName}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
