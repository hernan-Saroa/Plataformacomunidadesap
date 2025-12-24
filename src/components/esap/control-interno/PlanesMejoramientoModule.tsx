/**
 * PLANES DE MEJORAMIENTO - Módulo Contenedor Rediseñado
 * Agrupa: Formulación (RF010) + Seguimiento (RF011)
 * Diseño unificado con Modelos de Soporte - World-Class UX
 */

import { useState } from "react";
import { AlertTriangle, TrendingUp, Info, ChevronRight, FileQuestion, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "../../ui/badge";

// Componentes existentes
import { FormulacionPlanMejoramientoModule } from "./FormulacionPlanMejoramientoModule";
import { SeguimientoPlanMejoramientoModule } from "./SeguimientoPlanMejoramientoModule";

export function PlanesMejoramientoModule() {
  const [tabActiva, setTabActiva] = useState<'formulacion' | 'seguimiento'>('formulacion');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      {/* Header con breadcrumb y descripción - Estilo unificado naranja */}
      <div 
        className="bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 px-6 py-6 border-b-4"
        style={{ borderBottomColor: '#EA580C' }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-orange-100 mb-4">
          <span>Control Interno de Gestión</span>
          <ChevronRight className="w-3 h-3" />
          <span>Planes de Mejoramiento</span>
          <ChevronRight className="w-3 h-3" />
          <span>1. Planificación</span>
          <ChevronRight className="w-3 h-3" />
          <span>2. Proceso Auditoría</span>
          <ChevronRight className="w-3 h-3" />
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
            3. MEJORAMIENTO
          </Badge>
          <ChevronRight className="w-3 h-3" />
          <span>4. Soporte</span>
        </div>

        {/* Descripción */}
        <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="p-2 bg-white/20 rounded-lg">
            <Info className="w-5 h-5 text-white" />
          </div>
          <p className="text-white text-sm">
            Formula planes de mejoramiento basados en hallazgos de auditoría y realiza seguimiento al cumplimiento de acciones correctivas
          </p>
        </div>
      </div>

      {/* Pestañas - Estilo unificado con borde inferior */}
      <div className="bg-white border-b-2 border-gray-200 px-6">
        <div className="flex gap-1">
          <TabButton
            activo={tabActiva === 'formulacion'}
            onClick={() => setTabActiva('formulacion')}
            icono={<AlertTriangle className="w-4 h-4" />}
            titulo="Formulación de Planes"
            color="#EA580C"
          />
          <TabButton
            activo={tabActiva === 'seguimiento'}
            onClick={() => setTabActiva('seguimiento')}
            icono={<TrendingUp className="w-4 h-4" />}
            titulo="Seguimiento"
            color="#EA580C"
          />
          <TabButton
            activo={tabActiva === 'soporte'}
            onClick={() => setTabActiva('soporte')}
            icono={<BookOpen className="w-4 h-4" />}
            titulo="Soporte y Ayuda"
            color="#EA580C"
          />
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {tabActiva === 'formulacion' && (
            <motion.div
              key="formulacion"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FormulacionPlanMejoramientoModule />
            </motion.div>
          )}

          {tabActiva === 'seguimiento' && (
            <motion.div
              key="seguimiento"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SeguimientoPlanMejoramientoModule />
            </motion.div>
          )}

          {tabActiva === 'soporte' && (
            <motion.div
              key="soporte"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TabSoporteAyuda />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============ COMPONENTE: TAB BUTTON ============

function TabButton({ 
  activo, 
  onClick, 
  icono, 
  titulo,
  color 
}: { 
  activo: boolean; 
  onClick: () => void; 
  icono: React.ReactNode; 
  titulo: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-all border-b-3 ${
        activo 
          ? 'border-b-3' 
          : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
      }`}
      style={{
        borderBottomWidth: '3px',
        borderBottomStyle: 'solid',
        color: activo ? color : undefined,
        borderBottomColor: activo ? color : undefined
      }}
    >
      {icono}
      <span>{titulo}</span>
    </button>
  );
}

// ============ TAB: SOPORTE Y AYUDA ============

function TabSoporteAyuda() {
  const recursos = [
    {
      id: '1',
      titulo: 'Guía de Formulación de Planes',
      descripcion: 'Aprende cómo formular planes de mejoramiento efectivos',
      icono: <FileQuestion className="w-5 h-5" />,
      color: '#EA580C'
    },
    {
      id: '2',
      titulo: 'Manual de Seguimiento',
      descripcion: 'Procedimientos para el seguimiento trimestral',
      icono: <TrendingUp className="w-5 h-5" />,
      color: '#EA580C'
    },
    {
      id: '3',
      titulo: 'Preguntas Frecuentes',
      descripcion: 'Respuestas a las dudas más comunes',
      icono: <Info className="w-5 h-5" />,
      color: '#EA580C'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-600 to-red-600">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-gray-900 mb-1">
              Centro de Soporte y Ayuda
            </h2>
            <p className="text-sm text-gray-600">
              Encuentra recursos, guías y asistencia para gestionar los Planes de Mejoramiento de manera efectiva
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {recursos.map((recurso) => (
          <div
            key={recurso.id}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${recurso.color}15` }}
              >
                <div style={{ color: recurso.color }}>
                  {recurso.icono}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">{recurso.titulo}</h3>
                <p className="text-sm text-gray-600">{recurso.descripcion}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
