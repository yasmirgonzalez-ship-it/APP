import { useState } from 'react';
import { BeverageVariant, PRODUCT_IMAGES } from '../types/fridge';

interface ProductImageProps {
  variant: BeverageVariant;
  volumeMl?: number;
  alt: string;
  className?: string;
}

export function ProductImage({
  variant,
  volumeMl = 355,
  alt,
  className = '',
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  const src =
    variant === 'normal' && volumeMl <= 250
      ? PRODUCT_IMAGES.normalMini
      : variant === 'normal'
        ? PRODUCT_IMAGES.normal
        : variant === 'zero'
          ? PRODUCT_IMAGES.zero
          : null;

  if (failed || !src) {
    const isZero = variant === 'zero';
    const isOther = variant === 'otro';
    return (
      <div
        className={`flex flex-col items-center justify-center select-none ${
          isZero
            ? 'bg-zinc-900 text-zinc-100'
            : isOther
              ? 'bg-slate-800 text-slate-100'
              : 'bg-red-600 text-white'
        } ${className}`}
        role="img"
        aria-label={alt}
      >
        <div
          className={`rounded-md border border-white/25 flex flex-col items-center justify-center px-2.5 ${
            volumeMl <= 250 ? 'w-14 h-20' : 'w-16 h-24'
          }`}
        >
          <span className="text-[11px] font-display font-bold tracking-tight text-center leading-tight line-clamp-2">
            {alt}
          </span>
          <span className="text-[10px] font-mono opacity-80 mt-1 tabular-nums">
            {volumeMl} ml
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
