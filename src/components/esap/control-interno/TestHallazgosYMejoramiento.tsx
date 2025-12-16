/**
 * PÁGINA DE PRUEBA - HALLAZGOS Y MEJORAMIENTO
 * Componente de prueba para verificar la integración de:
 * - Semáforo Automático
 * - Sistema de Evidencias
 * - Acciones Expandibles
 */

import { useState } from 'react';
import { HallazgosYMejoramientoCompleto } from './HallazgosYMejoramientoCompleto';
import { ArrowLeft, TestTube, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

interface TestHallazgosYMejoramientoProps {
  onBack?: () => void;
}

export function TestHallazgosYMejoramiento({ onBack }: TestHallazgosYMejoramientoProps) {
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER DE PRUEBA */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TestTube className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-black">MODO PRUEBA - Hallazgos y Mejoramiento</h1>
                <p className="text-purple-100 text-sm">
                  Verificación de integración: Semáforo Automático + Sistema de Evidencias
                </p>
              </div>
            </div>
            {onBack && (
              <Button 
                variant="outline" 
                onClick={onBack}
                className="bg-white text-purple-600 hover:bg-purple-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            )}
          </div>

          {/* INDICADORES DE ESTADO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <div>
                  <p className="text-xs text-purple-100">Componente</p>
                  <p className="font-bold">SemaforoAutomatico</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <div>
                  <p className="text-xs text-purple-100">Componente</p>
                  <p className="font-bold">SistemaEvidencias</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <div>
                  <p className="text-xs text-purple-100">Estado</p>
                  <p className="font-bold">Integrado ✓</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INSTRUCCIONES DE PRUEBA */}
      {mostrarInstrucciones && (
        <div className="max-w-7xl mx-auto p-6">
          <Card className="border-2 border-purple-200 bg-purple-50">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-black text-gray-900">
                    Instrucciones de Prueba
                  </h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setMostrarInstrucciones(false)}
                >
                  Ocultar
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-purple-900 mb-2">
                    🎯 Objetivo de esta prueba:
                  </h4>
                  <p className="text-gray-700">
                    Verificar que los componentes críticos <strong>SemaforoAutomatico</strong> y{' '}
                    <strong>SistemaEvidencias</strong> estén correctamente integrados en el módulo
                    de Hallazgos y Mejoramiento.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-3">
                    ✅ Pasos para probar:
                  </h4>
                  <ol className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Badge className="bg-purple-600 text-white mt-0.5">1</Badge>
                      <div>
                        <strong>Ir al tab "Seguimiento"</strong> en el módulo de abajo
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge className="bg-purple-600 text-white mt-0.5">2</Badge>
                      <div>
                        <strong>Verificar que aparezca el Semáforo Automático</strong>
                        <ul className="list-disc list-inside ml-4 mt-1 text-sm">
                          <li>Debe mostrar un círculo de color (🟢🟡🔴)</li>
                          <li>Debe mostrar estadísticas en tiempo real</li>
                          <li>Debe mostrar alertas (si aplica)</li>
                          <li>Debe mostrar recomendaciones</li>
                        </ul>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge className="bg-purple-600 text-white mt-0.5">3</Badge>
                      <div>
                        <strong>Click en una acción</strong> para expandirla
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge className="bg-purple-600 text-white mt-0.5">4</Badge>
                      <div>
                        <strong>Verificar que aparezca el Sistema de Evidencias</strong>
                        <ul className="list-disc list-inside ml-4 mt-1 text-sm">
                          <li>Debe tener botón "Cargar Evidencia"</li>
                          <li>Debe mostrar estadísticas de evidencias</li>
                          <li>Debe permitir cargar archivos</li>
                        </ul>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge className="bg-purple-600 text-white mt-0.5">5</Badge>
                      <div>
                        <strong>Probar cargar una evidencia</strong> (simulada en frontend)
                      </div>
                    </li>
                  </ol>
                </div>

                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Qué verificar:
                  </h4>
                  <ul className="space-y-1 text-gray-700 text-sm">
                    <li>✅ El semáforo calcula el color automáticamente</li>
                    <li>✅ Las estadísticas se muestran correctamente</li>
                    <li>✅ Las acciones se expanden/colapsan con click</li>
                    <li>✅ El sistema de evidencias aparece al expandir</li>
                    <li>✅ El botón de cargar evidencia funciona</li>
                    <li>✅ Las animaciones son suaves</li>
                    <li>✅ No hay errores en la consola</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => setMostrarInstrucciones(false)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Comenzar Prueba
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const seguimientoTab = document.querySelector('[data-tab="seguimiento"]') as HTMLElement;
                      if (seguimientoTab) {
                        seguimientoTab.click();
                        setMostrarInstrucciones(false);
                      }
                    }}
                  >
                    Ir directo al Tab Seguimiento
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MÓDULO COMPLETO */}
      <div className="max-w-7xl mx-auto p-6">
        <Card className="overflow-hidden">
          <div className="p-6">
            <HallazgosYMejoramientoCompleto />
          </div>
        </Card>
      </div>

      {/* FOOTER DE AYUDA */}
      <div className="max-w-7xl mx-auto p-6">
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200">
          <div className="p-6">
            <h4 className="font-bold text-purple-900 mb-3">
              💡 Ayuda y Documentación
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <p className="font-bold mb-1">Documentos de referencia:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>VERIFICACION_FINAL_COMPLETA.md</li>
                  <li>INTEGRACION_COMPLETADA.md</li>
                  <li>IMPLEMENTACION_CRITICAS_COMPLETADA.md</li>
                </ul>
              </div>
              <div>
                <p className="font-bold mb-1">Componentes integrados:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>SemaforoAutomatico.tsx (450 líneas)</li>
                  <li>SistemaEvidencias.tsx (450 líneas)</li>
                  <li>CardAccionMejorada (nueva función)</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
