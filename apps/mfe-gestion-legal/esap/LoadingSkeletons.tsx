import { Skeleton } from '@esap-mfe/shared-ui/skeleton';

export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 mb-0">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-[--esap-gray-200] p-5"
          style={{ boxShadow: 'var(--esap-shadow-sm)' }}
        >
          <div className="flex justify-between items-start mb-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="w-7 h-7 rounded-lg" />
          </div>
          <div className="mb-4">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-[--esap-gray-200]">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RolesPanelSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[--esap-gray-200] overflow-hidden" style={{ boxShadow: 'var(--esap-shadow-sm)' }}>
      <div className="p-5 border-b border-[--esap-gray-200]">
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="p-4 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-[--esap-gray-200]"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[--esap-gray-200]">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PermissionsPanelSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[--esap-gray-200] overflow-hidden" style={{ boxShadow: 'var(--esap-shadow-sm)' }}>
      <div className="p-5 border-b border-[--esap-gray-200]">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="p-5 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-[--esap-gray-200] rounded-xl overflow-hidden">
            <div className="p-4 bg-[--esap-gray-50] border-b border-[--esap-gray-200]">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="w-5 h-5 rounded" />
                    <div>
                      <Skeleton className="h-4 w-48 mb-1" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </div>
                  <Skeleton className="w-10 h-5 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="flex-1 px-4 md:px-8 py-6">
      {/* Header Skeleton */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-0">
          <div className="flex-1">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96 mb-4" />
            <StatsCardsSkeleton />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-12 w-32 rounded-xl" />
            <Skeleton className="h-12 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Action Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-5">
        <Skeleton className="h-12 flex-1 max-w-md rounded-xl" />
        <Skeleton className="h-12 w-32 rounded-xl" />
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
        <RolesPanelSkeleton />
        <PermissionsPanelSkeleton />
      </div>
    </div>
  );
}
