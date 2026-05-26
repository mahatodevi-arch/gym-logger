import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-bgSecondary border border-borderColor rounded-2xl p-4 shadow-sm flex flex-col gap-3.5 transition-colors duration-200">
      
      {/* Title Placeholder */}
      <div className="flex items-center justify-between border-b border-borderColor/60 pb-2">
        <div className="h-4.5 w-1/3 skeleton" />
        <div className="h-7 w-7 skeleton rounded-xl" />
      </div>

      {/* Row Items Placeholders */}
      <div className="flex flex-col gap-2.5">
        <div className="h-10 w-full skeleton rounded-xl" />
        <div className="h-10 w-full skeleton rounded-xl" />
      </div>

      {/* Button Placeholder */}
      <div className="h-10 w-full skeleton rounded-xl mt-1" />

    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
