/**
 * ═══════════════════════════════════════════════════════════════
 * ERROR BOUNDARY - MANEJO GLOBAL DE ERRORES CON JUEGO INTERACTIVO
 * ═══════════════════════════════════════════════════════════════
 * 
 * Captura errores de React y muestra un mini-juego interactivo
 * para hacer la espera más amena mientras se soluciona el problema
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualizar estado para que el siguiente render muestre la UI de error
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Registrar error para debugging
    console.error('🚨 Error capturado por ErrorBoundary:', error, errorInfo);
    
    // Guardar información del error
    this.setState({
      error,
      errorInfo,
    });

    // Opcional: Enviar error a servicio de logging (ej: Sentry)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Recargar la página
    window.location.reload();
  };

  handleGoHome = () => {
    // Ir al inicio
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Renderizar UI de error personalizada
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
          <AlertTriangle className="w-24 h-24 text-red-500" />
          <h1 className="text-2xl font-bold mt-4">¡Oops! Algo salió mal</h1>
          <p className="text-gray-500 mt-2">Parece que hubo un error en la aplicación.</p>
          <div className="mt-6">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
              onClick={this.handleReset}
            >
              <RefreshCcw className="w-4 h-4 mr-1" />
              Reintentar
            </button>
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded"
              onClick={this.handleGoHome}
            >
              <Home className="w-4 h-4 mr-1" />
              Ir al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}