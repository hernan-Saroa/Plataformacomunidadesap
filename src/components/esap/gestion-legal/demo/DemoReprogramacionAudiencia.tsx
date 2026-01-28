/**
 * DemoReprogramacionAudiencia - Ejemplo interactivo de reprogramación
 * ✅ Muestra paso a paso el flujo completo
 * ✅ Diseño corporativo ESAP 2025
 */

import { useState } from 'react';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { 
  Calendar, Clock, MapPin, User, ArrowRight, 
  CheckCircle, AlertCircle, FileText, Repeat,
  ChevronRight, History
} from 'lucide-react';

export function DemoReprogramacionAudiencia() {
  const [pasoActual, setPasoActual] = useState(1);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const pasos = [
    { numero: 1, titulo: 'Audiencia Original', icon: Calendar },
    { numero: 2, titulo: 'Iniciar Reprogramación', icon: Repeat },
    { numero: 3, titulo: 'Llenar Datos', icon: FileText },
    { numero: 4, titulo: 'Resultado Final', icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                🔄 Ejemplo: Reprogramación de Audiencia
              </h1>
              <p className="text-gray-600 mt-2">
                Expediente DJ-001 - NULIDAD Y RESTABLECIMIENTO
              </p>
            </div>
            <Badge className="text-lg px-4 py-2 bg-blue-600 text-white font-bold">
              Paso {pasoActual} de 4
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {pasos.map((paso, idx) => (
              <div key={paso.numero} className="flex items-center flex-1">
                <div className="flex-1">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      pasoActual >= paso.numero ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                  <p className={`text-xs mt-1 font-semibold ${
                    pasoActual === paso.numero ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {paso.titulo}
                  </p>
                </div>
                {idx < pasos.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-gray-400 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contenido según paso actual */}
        <div className="space-y-6">
          
          {/* PASO 1: Audiencia Original */}
          {pasoActual === 1 && (
            <Card className="p-6 bg-white shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    Paso 1: Audiencia Original Programada
                  </h2>
                  <p className="text-gray-600">
                    Esta es la audiencia que fue programada inicialmente
                  </p>
                </div>
              </div>

              {/* Card de la audiencia original */}
              <div className="bg-gradient-to-r from-purple-50 to-white border-2 border-purple-200 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge className="text-sm font-bold bg-purple-100 text-purple-700 border-2 border-purple-300">
                      🟣 Audiencia de Pruebas
                    </Badge>
                    <Badge className="text-sm font-bold bg-green-100 text-green-700 border-2 border-green-300">
                      🟢 Programada
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Fecha</p>
                      <p className="font-bold text-gray-900">15/02/2025</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Hora</p>
                      <p className="font-bold text-gray-900">10:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 md:col-span-2">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Lugar</p>
                      <p className="font-bold text-gray-900">
                        Juzgado 1° Administrativo de Bogotá - Sala 3
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200">
                    <User className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Juez</p>
                      <p className="font-bold text-gray-900">Dr. Carlos Ramírez González</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200">
                    <User className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Abogado ESAP</p>
                      <p className="font-bold text-gray-900">Dra. Ana María López</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>🎯 Objetivo:</strong> Práctica de pruebas testimoniales y 
                    documentales según auto del 05/01/2025
                  </p>
                </div>
              </div>

              {/* Escenario */}
              <div className="mt-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-orange-900 mb-1">📞 Notificación del Juzgado</p>
                    <p className="text-sm text-orange-800">
                      El Juzgado 1° Administrativo de Bogotá notifica mediante oficio 2025-0234 
                      del 20/01/2025 que debido al <strong>cambio del magistrado ponente</strong> 
                      Dr. Carlos Ramírez por la Dra. Patricia Herrera, se debe reprogramar 
                      la audiencia para el <strong>28 de febrero de 2025 a las 2:00 PM</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* PASO 2: Iniciar Reprogramación */}
          {pasoActual === 2 && (
            <Card className="p-6 bg-white shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Repeat className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    Paso 2: Iniciar Reprogramación
                  </h2>
                  <p className="text-gray-600">
                    Click en el botón "🔄 Reasignar" abre el modal de reprogramación
                  </p>
                </div>
              </div>

              {/* Simulación de la audiencia con botón */}
              <div className="bg-gradient-to-r from-purple-50 to-white border-2 border-purple-200 rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="text-sm font-bold bg-purple-100 text-purple-700">
                        🟣 Audiencia de Pruebas
                      </Badge>
                      <Badge className="text-sm font-bold bg-green-100 text-green-700">
                        🟢 Programada
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <strong>15/02/2025</strong> a las 10:00 AM
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Juzgado 1° Administrativo - Sala 3
                      </p>
                    </div>
                  </div>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                  >
                    🔄 Reasignar
                  </Button>
                </div>
              </div>

              {/* Alert de modal */}
              <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-xl">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-lg font-bold text-orange-900 mb-2">
                      ⚠️ Modal de Reasignación de Audiencia
                    </p>
                    <p className="text-sm text-orange-800 mb-3">
                      El modal se abre con todos los datos de la audiencia original <strong>prellenados</strong>, 
                      permitiendo al usuario modificar solo lo necesario.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border border-orange-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    📋 Datos Prellenados:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ Tipo de audiencia: Audiencia de Pruebas</li>
                    <li>✓ Modalidad: Presencial</li>
                    <li>✓ Lugar: Juzgado 1° Administrativo de Bogotá - Sala 3</li>
                    <li>✓ Juez: Dr. Carlos Ramírez González</li>
                    <li>✓ Abogado: Dra. Ana María López</li>
                    <li>✓ Objetivo: Práctica de pruebas testimoniales...</li>
                  </ul>
                </div>

                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    💡 <strong>Usuario solo debe cambiar:</strong> Nueva fecha, nueva hora, 
                    motivo de reasignación y detalles adicionales.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* PASO 3: Llenar Datos */}
          {pasoActual === 3 && (
            <Card className="p-6 bg-white shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    Paso 3: Completar Datos de Reprogramación
                  </h2>
                  <p className="text-gray-600">
                    Usuario ingresa la nueva fecha/hora y motivo
                  </p>
                </div>
              </div>

              {/* Formulario simulado */}
              <div className="space-y-4">
                
                {/* Fecha y Hora NUEVAS */}
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                  <p className="text-sm font-bold text-green-900 mb-3">
                    ✅ Nuevos Datos Ingresados:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-green-300">
                      <p className="text-xs text-gray-500 mb-1">📅 Nueva Fecha</p>
                      <p className="text-lg font-bold text-green-900">28/02/2025</p>
                      <p className="text-xs text-red-500 line-through">15/02/2025</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-green-300">
                      <p className="text-xs text-gray-500 mb-1">⏰ Nueva Hora</p>
                      <p className="text-lg font-bold text-green-900">02:00 PM</p>
                      <p className="text-xs text-red-500 line-through">10:00 AM</p>
                    </div>
                  </div>
                </div>

                {/* Motivo */}
                <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
                  <p className="text-sm font-bold text-blue-900 mb-3">
                    🔍 Motivo de la Reasignación:
                  </p>
                  <div className="p-3 bg-white rounded-lg border border-blue-300 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Motivo seleccionado:</p>
                    <p className="font-bold text-gray-900">Cambio de magistrado/juez</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-blue-300">
                    <p className="text-xs text-gray-500 mb-2">Detalle del motivo:</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      El Juzgado 1° Administrativo de Bogotá notificó mediante oficio 2025-0234 
                      del 20/01/2025 que debido al cambio del magistrado ponente 
                      <strong> Dr. Carlos Ramírez</strong> por la <strong>Dra. Patricia Herrera</strong>, 
                      se reprograma la audiencia de pruebas para el <strong>28 de febrero de 2025 
                      a las 2:00 PM</strong> en la misma sala.
                    </p>
                  </div>
                </div>

                {/* Juez actualizado (opcional) */}
                <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-xl">
                  <p className="text-sm font-bold text-purple-900 mb-3">
                    👨‍⚖️ Juez Actualizado:
                  </p>
                  <div className="p-3 bg-white rounded-lg border border-purple-300">
                    <p className="font-bold text-green-900">Dra. Patricia Herrera</p>
                    <p className="text-xs text-gray-500 line-through">Dr. Carlos Ramírez González</p>
                  </div>
                </div>

                {/* Botón de guardar */}
                <div className="flex justify-end pt-4">
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg px-8 py-3"
                    onClick={() => {}}
                  >
                    💾 Reasignar Audiencia
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* PASO 4: Resultado Final */}
          {pasoActual === 4 && (
            <Card className="p-6 bg-white shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    Paso 4: Resultado Final
                  </h2>
                  <p className="text-gray-600">
                    Audiencia reprogramada exitosamente con historial completo
                  </p>
                </div>
              </div>

              {/* Toast de éxito */}
              <div className="mb-6 p-4 bg-green-100 border-2 border-green-500 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-bold text-green-900">✅ Audiencia reasignada exitosamente</p>
                  <p className="text-sm text-green-700">
                    Audiencia de Pruebas - 28/02/2025 a las 14:00
                  </p>
                </div>
              </div>

              {/* Audiencia actualizada */}
              <div className="bg-gradient-to-r from-purple-50 to-white border-2 border-purple-300 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Audiencia Actualizada
                  </h3>
                  <Badge className="bg-green-100 text-green-700 border-2 border-green-300 font-bold">
                    ✅ REPROGRAMADA
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-white rounded-lg border-2 border-green-500">
                    <p className="text-xs text-gray-500">Fecha</p>
                    <p className="text-xl font-bold text-green-900">28/02/2025</p>
                    <p className="text-xs text-gray-400 line-through">15/02/2025</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border-2 border-green-500">
                    <p className="text-xs text-gray-500">Hora</p>
                    <p className="text-xl font-bold text-green-900">02:00 PM</p>
                    <p className="text-xs text-gray-400 line-through">10:00 AM</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-purple-200 col-span-2">
                    <p className="text-xs text-gray-500">Juez</p>
                    <p className="font-bold text-gray-900">Dra. Patricia Herrera</p>
                    <p className="text-xs text-gray-400 line-through">Dr. Carlos Ramírez González</p>
                  </div>
                </div>

                {/* Historial */}
                <div className="border-t pt-4">
                  <button
                    onClick={() => setMostrarHistorial(!mostrarHistorial)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="flex items-center gap-2 font-bold text-gray-700">
                      <History className="w-4 h-4" />
                      Historial de Reasignaciones (1)
                    </span>
                    <span className="text-xl">{mostrarHistorial ? '▲' : '▼'}</span>
                  </button>
                  
                  {mostrarHistorial && (
                    <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="space-y-2 text-sm">
                        <p className="font-bold text-gray-900">
                          ❌ De: <span className="text-red-600">15/02/2025 10:00 AM</span> →{' '}
                          ✅ A: <span className="text-green-600">28/02/2025 02:00 PM</span>
                        </p>
                        <p className="text-gray-700">
                          <strong>Motivo:</strong> Cambio de magistrado/juez
                        </p>
                        <p className="text-gray-600 text-xs">
                          El Juzgado 1° Administrativo de Bogotá notificó mediante oficio 
                          2025-0234 del 20/01/2025...
                        </p>
                        <p className="text-gray-500 text-xs border-t pt-2 mt-2">
                          👤 Dra. Ana María López • 📅 28/01/2025
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Nueva actuación en timeline */}
              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
                <p className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Nueva Actuación Registrada Automáticamente:
                </p>
                <div className="p-4 bg-white rounded-lg border-l-4 border-blue-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="text-xs bg-blue-600 text-white">28/01/2025</Badge>
                    <Badge className="text-xs bg-orange-100 text-orange-700">
                      🔄 Reasignación de Audiencia
                    </Badge>
                    <Badge className="text-xs bg-green-100 text-green-700 ml-auto">
                      ⚡ Más Reciente
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-2">
                    Se reasignó Audiencia de Pruebas: de 15/02/2025 10:00 AM a 28/02/2025 02:00 PM
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    Motivo: Cambio de magistrado/juez
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Dra. Ana María López
                    </span>
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      ✅ Completado
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          )}

        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setPasoActual(Math.max(1, pasoActual - 1))}
            disabled={pasoActual === 1}
            className="font-bold"
          >
            ← Anterior
          </Button>
          
          {pasoActual < 4 ? (
            <Button
              onClick={() => setPasoActual(Math.min(4, pasoActual + 1))}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Siguiente →
            </Button>
          ) : (
            <Button
              onClick={() => setPasoActual(1)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              🔄 Reiniciar Demo
            </Button>
          )}
        </div>

        {/* Footer Info */}
        <Card className="mt-6 p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="text-center">
            <p className="text-2xl font-black mb-2">
              ✨ Funcionalidad Completa de Reprogramación
            </p>
            <p className="text-blue-100">
              Sistema SIGL - Gestión Legal ESAP 2025 | Trazabilidad total con historial completo
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
