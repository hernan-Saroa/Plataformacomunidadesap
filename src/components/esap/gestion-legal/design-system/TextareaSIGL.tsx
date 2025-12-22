/**
 * TEXTAREA SIGL
 * Componente textarea siguiendo el diseño del sistema ESAP
 */

import React from 'react';

interface TextareaSIGLProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function TextareaSIGL({ error, className = '', ...props }: TextareaSIGLProps) {
  return (
    <div>
      <textarea
        className={`
          w-full px-4 py-2 
          border rounded-lg 
          focus:outline-none focus:ring-2 focus:ring-blue-500 
          transition-all
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
