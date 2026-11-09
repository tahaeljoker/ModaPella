import React from 'react';

export default function ProductCardSkeleton() {
  return (
    <div
      dir="rtl"
      className="flex h-full flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-burgundy/10 bg-white p-2 sm:p-2.5 shadow-[0_2px_12px_rgba(75,15,26,0.03)] select-none animate-pulse"
    >
      {/* Framed Image Box Skeleton */}
      <div className="relative overflow-hidden aspect-[3/4] max-h-[220px] sm:max-h-[290px] rounded-xl sm:rounded-2xl bg-[#F6F2EF] flex items-center justify-center">
        {/* Shimmer effect */}
        <div className="w-12 h-12 rounded-full bg-burgundy/5 flex items-center justify-center">
          <svg className="w-6 h-6 text-burgundy/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Favorite heart placeholder */}
        <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/70" />
      </div>

      {/* Card Info Skeleton */}
      <div className="flex flex-col justify-between pt-2 px-1 space-y-2">
        {/* Category & Color Circles row */}
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-14 rounded-full bg-burgundy/10" />
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-burgundy/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-burgundy/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-burgundy/10" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1 pt-0.5">
          <div className="h-3.5 w-4/5 rounded bg-burgundy/15" />
          <div className="h-3 w-1/2 rounded bg-burgundy/10" />
        </div>

        {/* Price & Action row */}
        <div className="pt-2 border-t border-burgundy/5 flex items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="h-4 w-16 rounded bg-burgundy/20" />
            <div className="h-2.5 w-10 rounded bg-burgundy/10" />
          </div>
          <div className="h-7 w-20 rounded-full bg-burgundy/10" />
        </div>
      </div>
    </div>
  );
}

