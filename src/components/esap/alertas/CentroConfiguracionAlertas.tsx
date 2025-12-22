/**
 * 🔔 CENTRO DE ALERTAS - SISTEMA SIGL (VERSIÓN USABILIDAD MEJORADA)
 * 
 * Principios de Diseño:
 * ✓ Limpio: Sin saturación visual
 * ✓ Sencillo: Opciones claras y directas
 * ✓ Intuitivo: Flujo natural de trabajo
 * ✓ Espacioso: Respiración visual
 * ✓ Guiado: Ayudas contextuales
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Settings, FileText, Clock, BarChart3,
  ChevronRight, Info, HelpCircle
} from 'lucide-react';
import { Button } from '../../ui/button';
import { PlantillasMensajes } from './PlantillasMensajes';
import { HistorialAlertas } from './HistorialAlertas';
import { EstadisticasAlertas } from './EstadisticasAlertas';
import { ConfiguracionSimplificada } from './ConfiguracionSimplificada';
import { MotorAlertasAutomaticas } from './MotorAlertasAutomaticas';

type Vista = 'CONFIG' | 'PLANTILLAS' | 'HISTORIAL' | 'DASHBOARD' | 'MOTOR';

const VISTAS = [
  {
    id: 'CONFIG' as Vista,
    nombre: 'Configuración',
    icono: Settings,
    color: 'blue',
    descripcion: 'Configura alertas por módulo'
  },
  {
    id: 'PLANTILLAS' as Vista,
    nombre: 'Plantillas',
    icono: FileText,
    color: 'purple',
    descripcion: 'Personaliza mensajes'
  },
  {
    id: 'HISTORIAL' as Vista,
    nombre: 'Historial',
    icono: Clock,
    color: 'orange',
    descripcion: 'Consulta alertas enviadas'
  },
  {
    id: 'DASHBOARD' as Vista,
    nombre: 'Dashboard',
    icono: BarChart3,
    color: 'green',
    descripcion: 'Análisis ejecutivo'
  },
  {
    id: 'MOTOR' as Vista,
    nombre: 'Motor Automático',
    icono: Bell,
    color: 'red',
    descripcion: 'Monitor en tiempo real (REQ-MOD01-002)'
  },
];

export function CentroConfiguracionAlertas() {
  const [vistaActual, setVistaActual] = useState<Vista>('DASHBOARD');
  const [mostrarAyuda, setMostrarAyuda] = useState(true);

  const vistaActualData = VISTAS.find(v => v.id === vistaActual);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 -m-3 sm:-m-4 md:-m-6">
      {/* Header Simplificado - Altura fija */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          {/* Título Principal */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Centro de Alertas</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Sistema de notificaciones para cumplimiento de plazos legales
                </p>
              </div>
            </div>

            {/* Toggle Ayuda */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarAyuda(!mostrarAyuda)}
              className={`${mostrarAyuda ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              {mostrarAyuda ? 'Ocultar ayuda' : 'Mostrar ayuda'}
            </Button>
          </div>

          {/* Navegación por Cards (Más Visual) */}
          <div className="grid grid-cols-5 gap-3">
            {VISTAS.map((vista) => {
              const Icon = vista.icono;
              const isActive = vistaActual === vista.id;
              const colorClasses = {
                blue: isActive ? 'bg-blue-50 border-blue-400 shadow-lg shadow-blue-100' : 'hover:border-blue-300',
                purple: isActive ? 'bg-purple-50 border-purple-400 shadow-lg shadow-purple-100' : 'hover:border-purple-300',
                orange: isActive ? 'bg-orange-50 border-orange-400 shadow-lg shadow-orange-100' : 'hover:border-orange-300',
                green: isActive ? 'bg-green-50 border-green-400 shadow-lg shadow-green-100' : 'hover:border-green-300',
                red: isActive ? 'bg-red-50 border-red-400 shadow-lg shadow-red-100' : 'hover:border-red-300',
              };

              return (
                <motion.button
                  key={vista.id}
                  onClick={() => setVistaActual(vista.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all text-left
                    ${isActive ? colorClasses[vista.color] : 'bg-white border-gray-200 hover:shadow-md'}
                  `}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`
                      p-2 rounded-lg
                      ${isActive 
                        ? vista.color === 'blue' ? 'bg-blue-500' : 
                          vista.color === 'purple' ? 'bg-purple-500' : 
                          vista.color === 'orange' ? 'bg-orange-500' : 
                          vista.color === 'green' ? 'bg-green-500' :
                          'bg-red-500'
                        : 'bg-gray-200'}
                    `}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <span className={`font-bold text-sm ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                      {vista.nombre}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{vista.descripcion}</p>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-b-lg"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ayuda Contextual */}
      <AnimatePresence>
        {mostrarAyuda && vistaActualData && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-blue-50 border-b border-blue-200 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-blue-900 mb-1">
                  {vistaActualData.nombre}
                </h3>
                <p className="text-xs text-blue-800 leading-relaxed">
                  {vistaActualData.id === 'CONFIG' && (
                    <>
                      Define <strong>cuándo y cómo</strong> se envían las alertas para cada módulo del SIGL. 
                      Configura umbrales de días, canales de notificación y destinatarios.
                    </>
                  )}
                  {vistaActualData.id === 'PLANTILLAS' && (
                    <>
                      Personaliza el <strong>contenido de los mensajes</strong> que se envían por cada canal. 
                      Usa variables dinámicas para incluir información del proceso.
                    </>
                  )}
                  {vistaActualData.id === 'HISTORIAL' && (
                    <>
                      Consulta todas las alertas enviadas con <strong>filtros avanzados</strong>. 
                      Verifica quién recibió qué mensaje y cuándo lo leyó.
                    </>
                  )}
                  {vistaActualData.id === 'DASHBOARD' && (
                    <>
                      Panel ejecutivo con <strong>métricas de cumplimiento</strong> de plazos legales. 
                      Identifica procesos en riesgo y responsables que necesitan apoyo.
                    </>
                  )}
                  {vistaActualData.id === 'MOTOR' && (
                    <>
                      <strong>Motor de Alertas Automáticas (REQ-MOD01-002)</strong>: Sistema que ejecuta diariamente cálculo de días restantes, 
                      asigna colores de alerta (VERDE/AMARILLO/ROJO/VENCIDO), detecta cambios de estado y envía notificaciones por canales configurados. 
                      Incluye monitoreo en tiempo real y auditoría completa de ejecuciones.
                    </>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={vistaActual}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {vistaActual === 'CONFIG' && <ConfiguracionSimplificada />}
            {vistaActual === 'PLANTILLAS' && <PlantillasMensajes />}
            {vistaActual === 'HISTORIAL' && <HistorialAlertas />}
            {vistaActual === 'DASHBOARD' && <EstadisticasAlertas />}
            {vistaActual === 'MOTOR' && <MotorAlertasAutomaticas />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}