/**
 * ═══════════════════════════════════════════════════════════════
 * ERROR BOUNDARY - MANEJO GLOBAL DE ERRORES
 * ═══════════════════════════════════════════════════════════════
 * 
 * Captura errores de React y muestra una UI amigable al usuario
 * En lugar de pantalla en blanco, muestra un mini-juego interactivo
 */

import React, { Component, ReactNode } from 'react';
import { ErrorGamePage } from '../esap/ErrorGamePage';

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
  };

  handleGoHome = () => {
    // Reiniciar la aplicación
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Renderizar UI de error personalizada
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorGamePage
          onRetry={this.handleReset}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}