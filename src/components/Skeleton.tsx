import type { FC } from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-white/5 rounded ${className}`}
        />
      ))}
    </>
  );
};

export const SongSkeleton: FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
        <div className="w-8 text-center">
          <Skeleton className="h-3 w-3 mx-auto" />
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
        <Skeleton className="h-2 w-10" />
      </div>
    ))}
  </div>
);

export const CardSkeleton: FC<{ count?: number; cols?: number }> = ({ count = 6, cols = 5 }) => (
  <div className={`grid grid-cols-${cols} gap-6`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="aspect-square rounded-[28px]" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2 w-1/2" />
      </div>
    ))}
  </div>
);
