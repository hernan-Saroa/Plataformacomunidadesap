import React from 'react';

export function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm overflow-hidden flex flex-col justify-between h-full animate-pulse">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-gray-200"></div>
          <div className="w-6 h-6 rounded-full bg-gray-100"></div>
        </div>
        <div className="h-5 bg-gray-200 rounded-md w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-100 rounded-md w-full mb-2"></div>
        <div className="h-4 bg-gray-100 rounded-md w-5/6"></div>
      </div>
      <div className="mt-6 flex items-center justify-between space-x-4">
        <div className="h-8 bg-blue-100/50 rounded-lg w-full"></div>
      </div>
    </div>
  );
}

export function EmptyStateIllustration({ title, description, actionText, onAction }: { title: string, description: string, actionText?: string, onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-dashed border-gray-300 rounded-3xl min-h-[300px]">
      <div className="w-24 h-24 mb-6 relative">
        <div className="absolute inset-0 bg-blue-50 rounded-full animate-pulse opacity-50"></div>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-12 h-12 text-blue-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
