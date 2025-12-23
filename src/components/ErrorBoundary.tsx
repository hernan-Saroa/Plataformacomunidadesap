import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Users, Brain } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  characterType: 'estudiante' | 'profesor';
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    characterType: Math.random() > 0.5 ? 'estudiante' : 'profesor'
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true,
      characterType: Math.random() > 0.5 ? 'estudiante' : 'profesor'
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isEstudiante = this.state.characterType === 'estudiante';
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 border-2 border-blue-100"
            >
              {/* Ilustración del personaje pensando */}
              <div className="flex justify-center mb-8">
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  {/* Círculo de fondo */}
                  <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full ${
                    isEstudiante 
                      ? 'bg-gradient-to-br from-blue-400 to-blue-600' 
                      : 'bg-gradient-to-br from-purple-400 to-purple-600'
                  } flex items-center justify-center shadow-2xl`}>
                    <Users className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
                  </div>
                  
                  {/* Ícono de cerebro pensando (burbujas de pensamiento) */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute -top-6 -right-6 bg-white rounded-full p-3 shadow-lg border-2 border-blue-200"
                  >
                    <Brain className="w-6 h-6 text-blue-600" />
                  </motion.div>

                  {/* Puntos de pensamiento */}
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    className="absolute -top-2 -right-2 w-3 h-3 bg-blue-400 rounded-full"
                  />
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                    className="absolute -top-4 -right-8 w-2 h-2 bg-blue-300 rounded-full"
                  />
                </motion.div>
              </div>

              {/* Título con el tipo de personaje */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
                    isEstudiante
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-bold text-sm">
                    {isEstudiante ? 'Mensaje de un Estudiante ESAP' : 'Mensaje de un Profesor ESAP'}
                  </span>
                </motion.div>

                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
                  ¡Ups! Algo no salió bien
                </h1>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-dashed border-blue-200">
                  <p className="text-lg sm:text-xl text-gray-700 font-semibold mb-2">
                    🤔 Ya estamos trabajando para solucionar el problema
                  </p>
                  <p className="text-base text-gray-600">
                    Nuestro equipo técnico de la ComUNIdad ESAP está analizando 
                    el inconveniente. Por favor, intenta nuevamente en unos momentos.
                  </p>
                </div>
              </div>

              {/* Mensaje adicional */}
              <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
                <p className="text-sm text-gray-600 text-center">
                  <strong className="text-blue-700">Tip:</strong> Si el problema persiste, 
                  intenta recargar la página o volver al inicio.
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={this.handleReload}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  <RefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  Recargar Página
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  size="lg"
                  variant="outline"
                  className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group"
                >
                  <Home className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Volver al Inicio
                </Button>
              </div>

              {/* Información técnica (solo en desarrollo) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-8 p-4 bg-red-50 rounded-lg border border-red-200">
                  <summary className="cursor-pointer text-sm font-semibold text-red-700 mb-2">
                    Detalles técnicos del error (solo visible en desarrollo)
                  </summary>
                  <div className="text-xs text-red-600 font-mono overflow-auto max-h-40">
                    <p className="font-bold mb-2">Error:</p>
                    <pre className="whitespace-pre-wrap break-words">
                      {this.state.error.toString()}
                    </pre>
                    {this.state.errorInfo && (
                      <>
                        <p className="font-bold mt-4 mb-2">Stack Trace:</p>
                        <pre className="whitespace-pre-wrap break-words">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </>
                    )}
                  </div>
                </details>
              )}

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-500">
                  ComUNIdad ESAP - Transformando la educación digital
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Si necesitas ayuda inmediata, contacta a soporte técnico
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
