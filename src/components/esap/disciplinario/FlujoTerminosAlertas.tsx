/**
 * FLUJO INTERACTIVO: TÉRMINOS Y ALERTAS EN EL PROCESO DISCIPLINARIO
 * Documentación visual del módulo RF006
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, Bell, Calendar, AlertTriangle, CheckCircle, Mail,
  X, Info, Zap, Eye, Play, FileText, Users, Archive,
  TrendingUp, Target, AlertCircle, ChevronRight, HelpCircle
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';

interface Etapa {
  id: string;
  modulo: string;
  nombre: string;
  icono: React.ReactNode;
  color: string;
  descripcion: string;
  terminosGenerados: string[];
  ejemploReal: {
    accion: string;
    terminoCreado: string;
    responsable: string;
    diasHabiles: number;
  };
}

const ETAPAS_FLUJO: Etapa[] = [
  {
    id: 'rf001',
    modulo: 'RF001',
    nombre: 'Noticias Disciplinarias',
    icono: <FileText className="w-5 h-5" />,
    color: '#6366F1',
    descripcion: 'Se recibe la queja o denuncia',
    terminosGenerados: ['Valoración de Noticia (30 días hábiles)'],
    ejemploReal: {
      accion: 'Se recibe noticia disciplinaria ND-150-2025',
      terminoCreado: 'Valorar noticia y decidir apertura',
      responsable: 'Jefe OCID',
      diasHabiles: 30
    }
  },
  {
    id: 'rf002',
    modulo: 'RF002',
    nombre: 'Valoración y Asignación',
    icono: <Target className="w-5 h-5" />,
    color: '#8B5CF6',
    descripcion: 'Jefe decide abrir investigación',
    terminosGenerados: ['Indagación Preliminar (6 meses)'],
    ejemploReal: {
      accion: 'Jefe abre proceso P-120-2025',
      terminoCreado: 'Completar indagación preliminar',
      responsable: 'Profesional Marta Torres',
      diasHabiles: 180
    }
  },
  {
    id: 'rf004',
    modulo: 'RF004',
    nombre: 'Revisión y Aprobación',
    icono: <CheckCircle className="w-5 h-5" />,
    color: '#10B981',
    descripcion: 'Jefe firma auto procesal',
    terminosGenerados: [
      'Notificación de Auto (5 días hábiles)',
      'Presentación de Descargos (10 días hábiles)'
    ],
    ejemploReal: {
      accion: 'Jefe firma Auto de Apertura',
      terminoCreado: 'Notificar auto al investigado',
      responsable: 'Secretaría OCID',
      diasHabiles: 5
    }
  },
  {
    id: 'rf003',
    modulo: 'RF003',
    nombre: 'Carpeta Digital',
    icono: <Archive className="w-5 h-5" />,
    color: '#3B82F6',
    descripcion: 'Profesional gestiona el proceso',
    terminosGenerados: ['Práctica de Pruebas (15 días hábiles)'],
    ejemploReal: {
      accion: 'Solicita pruebas testimoniales',
      terminoCreado: 'Recibir testimonios solicitados',
      responsable: 'Profesional Juan Ruiz',
      diasHabiles: 15
    }
  }
];

const REGLAS_ALERTA = [
  {
    id: 'r1',
    nombre: 'Alerta Temprana',
    dias: 10,
    color: '#3B82F6',
    icono: <Info className="w-4 h-4" />,
    canales: ['Panel'],
    descripcion: 'Primera notificación preventiva'
  },
  {
    id: 'r2',
    nombre: 'Alerta Preventiva',
    dias: 5,
    color: '#F59E0B',
    icono: <Bell className="w-4 h-4" />,
    canales: ['Email', 'Panel'],
    descripcion: 'Recordatorio con mayor urgencia'
  },
  {
    id: 'r3',
    nombre: 'Alerta Crítica',
    dias: 2,
    color: '#DC2626',
    icono: <AlertTriangle className="w-4 h-4" />,
    canales: ['Email', 'Panel', 'SMS'],
    descripcion: 'Alerta urgente a responsable y Jefe'
  }
];

export function FlujoTerminosAlertas() {
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const etapaActual = ETAPAS_FLUJO.find(e => e.id === etapaSeleccionada);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-orange-500 to-red-500 border-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Flujo de Términos y Alertas
              </h2>
              <p className="text-orange-100">
                RF006 - Sistema Transversal de Control de Tiempos Procesales
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </Card>

      {/* Concepto Principal */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 border-2 border-orange-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-100">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">¿Qué es RF006?</h3>
              <p className="text-sm text-gray-600">
                Es el <span className="font-bold text-orange-600">"reloj automático"</span> que monitorea 
                TODOS los términos legales del proceso disciplinario.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Calcula días hábiles automáticamente</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Envía alertas antes de vencimientos</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Previene prescripciones y nulidades</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 border-blue-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Módulo Transversal</h3>
              <p className="text-sm text-gray-600">
                A diferencia de otros módulos, RF006 <span className="font-bold text-blue-600">NO es lineal</span>. 
                Monitorea TODAS las etapas simultáneamente.
              </p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-900 mb-2 font-semibold">
              FLUJO TRADICIONAL:
            </p>
            <p className="text-xs text-gray-600 mb-3">
              RF001 → RF002 → RF003 → RF004 → RF005
            </p>
            <p className="text-xs text-blue-900 mb-2 font-semibold">
              RF006 (TRANSVERSAL):
            </p>
            <p className="text-xs text-gray-600">
              Monitorea desde RF001 hasta RF005 en tiempo real ⏰
            </p>
          </div>
        </Card>
      </div>

      {/* Flujo de Generación de Términos */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gray-100">
            <Play className="w-5 h-5 text-gray-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            ¿Cómo se generan los términos?
          </h3>
        </div>

        <div className="grid gap-4">
          {ETAPAS_FLUJO.map((etapa, index) => (
            <motion.div
              key={etapa.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="p-5 border-2 hover:shadow-lg transition-all cursor-pointer"
                style={{ borderColor: etapa.color + '40' }}
                onClick={() => setEtapaSeleccionada(etapa.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Número de Etapa */}
                  <div 
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: etapa.color }}
                  >
                    {index + 1}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded" style={{ background: etapa.color + '20' }}>
                        {etapa.icono}
                      </div>
                      <h4 className="font-bold text-gray-900">
                        {etapa.modulo} - {etapa.nombre}
                      </h4>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {etapa.descripcion}
                    </p>

                    {/* Ejemplo Real */}
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">ACCIÓN EN EL MÓDULO:</p>
                          <p className="font-semibold text-gray-900">{etapa.ejemploReal.accion}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">TÉRMINO CREADO:</p>
                          <p className="font-semibold text-gray-900">{etapa.ejemploReal.terminoCreado}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">RESPONSABLE:</p>
                          <p className="font-semibold text-gray-900">{etapa.ejemploReal.responsable}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">PLAZO LEGAL:</p>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="font-bold text-orange-600">
                              {etapa.ejemploReal.diasHabiles} días hábiles
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Términos Generados */}
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-500 mb-2">
                        TÉRMINOS QUE SE GENERAN:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {etapa.terminosGenerados.map((termino, idx) => (
                          <Badge
                            key={idx}
                            className="text-xs px-3 py-1"
                            style={{
                              background: etapa.color + '20',
                              color: etapa.color
                            }}
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {termino}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Flecha */}
                  <div className="flex-shrink-0">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sistema de Alertas */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-orange-100">
            <Bell className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Sistema de Alertas Automáticas
          </h3>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {REGLAS_ALERTA.map((regla, index) => (
            <motion.div
              key={regla.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.15 }}
            >
              <Card className="p-5 border-2" style={{ borderColor: regla.color }}>
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="p-2 rounded-lg text-white"
                    style={{ background: regla.color }}
                  >
                    {regla.icono}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{regla.nombre}</h4>
                    <p className="text-xs text-gray-600">{regla.descripcion}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <span className="text-sm text-gray-600">Días antes:</span>
                    <span className="font-bold text-lg" style={{ color: regla.color }}>
                      {regla.dias} días
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">CANALES:</p>
                    <div className="flex flex-wrap gap-2">
                      {regla.canales.map((canal) => (
                        <Badge
                          key={canal}
                          className="text-xs"
                          style={{
                            background: regla.color + '20',
                            color: regla.color
                          }}
                        >
                          {canal === 'Email' && <Mail className="w-3 h-3 mr-1" />}
                          {canal === 'Panel' && <Eye className="w-3 h-3 mr-1" />}
                          {canal === 'SMS' && <Bell className="w-3 h-3 mr-1" />}
                          {canal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Ejemplo de Ciclo Completo */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-500 text-white">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Ejemplo: Ciclo Completo de un Término
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    7 Enero: Jefe firma Auto de Apertura (RF004)
                  </p>
                  <p className="text-xs text-gray-600">
                    → RF006 crea automáticamente: "Notificar en 5 días hábiles" (Vence: 14 enero)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    10 Enero: Sistema calcula que quedan 3 días
                  </p>
                  <p className="text-xs text-gray-600">
                    → RF006 envía "Alerta Preventiva" por email a Secretaría
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    12 Enero: Quedan 2 días (Crítico)
                  </p>
                  <p className="text-xs text-gray-600">
                    → RF006 envía "Alerta Crítica" a Secretaría + Jefe OCID
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    13 Enero: Secretaría notifica al investigado ✅
                  </p>
                  <p className="text-xs text-gray-600">
                    → RF006 marca término como "CUMPLIDO" y registra en auditoría
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Beneficios */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 bg-green-50 border-2 border-green-200">
          <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Con RF006 - Términos y Alertas
          </h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Cálculo automático de días hábiles (excluye festivos)</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Alertas preventivas antes de vencimientos</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Prevención de prescripciones y nulidades</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Trazabilidad completa para auditoría</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-red-50 border-2 border-red-200">
          <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Sin RF006 - Términos y Alertas
          </h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Procesos prescriben por olvido de plazos</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Autos mal notificados causan nulidades</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Profesionales olvidan fechas límite</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">No hay evidencia para auditorías</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer Info */}
      <Card className="p-4 bg-gray-50 border border-gray-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-gray-900 mb-1">
              Documentación Completa Disponible
            </p>
            <p>
              Para más detalles sobre la integración de RF006 con todos los módulos del sistema, 
              consulta el archivo <code className="px-2 py-1 bg-white rounded border border-gray-300 text-orange-600">/FLUJO_TERMINOS_ALERTAS.md</code>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
