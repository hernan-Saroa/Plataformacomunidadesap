/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INFORMACIÓN NORMATIVA - DECRETO 648/2017
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Componente educativo que muestra la base legal del Plan Anual de Auditoría
 * y explica cada uno de los 5 roles obligatorios del Decreto 648/2017.
 * 
 * 📋 BASE LEGAL:
 * - Decreto 648 de 2017 - Art. 2: Roles de las Oficinas de Control Interno
 * - Formato EM-FO-001: Plan Anual de Auditoría Interna
 * - DAFP: Metodología de Gestión de Riesgos
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Info, BookOpen, FileText, ExternalLink,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  Scale, Eye, Users, TrendingUp, Lock, X
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface ArticuloNormativo {
  numero: string;
  titulo: string;
  contenido: string;
  url?: string;
}

interface RolNormativo {
  numero: number;
  nombre: string;
  articulo: string;
  icono: JSX.Element;
  color: string;
  descripcion: string;
  fundamentoLegal: string;
  objetivos: string[];
  ejemplosActividades: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// DATOS NORMATIVOS
// ════════════════════════════════════════════════════════════════════════════

const ARTICULOS_DECRETO_648: ArticuloNormativo[] = [
  {
    numero: 'Art. 1',
    titulo: 'Objeto',
    contenido: 'Por el cual se modifica y adiciona el Decreto 1083 de 2015, Reglamentario Único del Sector de Función Pública, en lo relacionado con el Modelo Estándar de Control Interno - MECI, para entidades del Estado colombiano.',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=80782'
  },
  {
    numero: 'Art. 2',
    titulo: 'Roles de las Oficinas de Control Interno',
    contenido: 'Las Oficinas de Control Interno o quienes hagan sus veces deberán desarrollar los siguientes roles: 1) Liderazgo Estratégico, 2) Enfoque hacia la Prevención, 3) Evaluación de la Gestión del Riesgo, 4) Evaluación del Sistema de Control Interno, y 5) Relación con Organismos de Control Externo.',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=80782'
  }
];

const ROLES_NORMATIVOS: RolNormativo[] = [
  {
    numero: 1,
    nombre: 'Liderazgo Estratégico',
    articulo: 'Decreto 648/2017 - Art. 2, Numeral 1',
    icono: <TrendingUp className="w-5 h-5" />,
    color: '#2962FF',
    descripcion: 'Asesorar y apoyar a la alta dirección en la gestión estratégica del control y el mejoramiento continuo institucional.',
    fundamentoLegal: 'El rol de liderazgo estratégico busca que la OCI participe activamente en la orientación del control interno desde una perspectiva estratégica, apoyando la toma de decisiones directivas.',
    objetivos: [
      'Asesorar al representante legal en materia de control interno',
      'Participar en comités estratégicos institucionales',
      'Promover cultura de autocontrol y mejoramiento continuo',
      'Alinear el control interno con los objetivos estratégicos'
    ],
    ejemplosActividades: [
      'Asesoría al Comité Institucional de Coordinación de Control Interno (CICC)',
      'Seguimiento al Plan Estratégico Institucional',
      'Evaluación de indicadores de gestión estratégicos',
      'Presentación de informes ejecutivos a la alta dirección'
    ]
  },
  {
    numero: 2,
    nombre: 'Enfoque hacia la Prevención',
    articulo: 'Decreto 648/2017 - Art. 2, Numeral 2',
    icono: <Shield className="w-5 h-5" />,
    color: '#00C853',
    descripcion: 'Promover actividades preventivas que eviten la materialización de riesgos y fortalezcan los controles existentes.',
    fundamentoLegal: 'Este rol enfatiza la importancia de la prevención sobre la detección, fomentando la implementación proactiva de controles antes de que se materialicen los riesgos.',
    objetivos: [
      'Diseñar y ejecutar actividades de prevención de riesgos',
      'Fortalecer la cultura del autocontrol en la entidad',
      'Identificar oportunidades de mejora antes de incidentes',
      'Capacitar a servidores en gestión preventiva'
    ],
    ejemplosActividades: [
      'Talleres de sensibilización en ética pública',
      'Evaluación preventiva de nuevos procesos',
      'Monitoreo de alertas tempranas de riesgo',
      'Campañas de cultura de control preventivo'
    ]
  },
  {
    numero: 3,
    nombre: 'Evaluación de la Gestión del Riesgo',
    articulo: 'Decreto 648/2017 - Art. 2, Numeral 3',
    icono: <Eye className="w-5 h-5" />,
    color: '#FF6D00',
    descripcion: 'Evaluar la efectividad del sistema de gestión de riesgos institucional y la adecuación de los controles implementados.',
    fundamentoLegal: 'La OCI debe verificar que la entidad identifique, valore y gestione adecuadamente sus riesgos, siguiendo las metodologías DAFP y estándares internacionales.',
    objetivos: [
      'Evaluar la metodología de gestión de riesgos',
      'Verificar la identificación y valoración de riesgos',
      'Validar la efectividad de controles implementados',
      'Emitir recomendaciones para fortalecer la gestión del riesgo'
    ],
    ejemplosActividades: [
      'Auditoría al Mapa de Riesgos Institucional',
      'Evaluación de controles por proceso',
      'Seguimiento a planes de tratamiento de riesgos',
      'Validación de matrices de riesgo por dependencia'
    ]
  },
  {
    numero: 4,
    nombre: 'Evaluación del Sistema de Control Interno',
    articulo: 'Decreto 648/2017 - Art. 2, Numeral 4',
    icono: <CheckCircle2 className="w-5 h-5" />,
    color: '#AA00FF',
    descripcion: 'Evaluar de manera independiente el diseño, implementación y efectividad del Sistema de Control Interno institucional.',
    fundamentoLegal: 'Este es el rol tradicional de auditoría interna, enfocado en verificar que el MECI se implemente adecuadamente en todos los procesos de la entidad.',
    objetivos: [
      'Auditar el diseño del Sistema de Control Interno',
      'Evaluar la implementación del MECI',
      'Verificar el cumplimiento normativo y procedimental',
      'Emitir informes de auditoría con hallazgos y recomendaciones'
    ],
    ejemplosActividades: [
      'Auditoría de cumplimiento normativo',
      'Evaluación del Manual de Procesos y Procedimientos',
      'Auditoría de gestión por dependencia',
      'Seguimiento a planes de mejoramiento'
    ]
  },
  {
    numero: 5,
    nombre: 'Relación con Organismos Externos',
    articulo: 'Decreto 648/2017 - Art. 2, Numeral 5',
    icono: <Scale className="w-5 h-5" />,
    color: '#C62828',
    descripcion: 'Coordinar y facilitar las relaciones con entes de control externo (Contraloría, Procuraduría, Auditoría General de la República).',
    fundamentoLegal: 'La OCI actúa como enlace entre la entidad y los organismos de control externo, facilitando auditorías externas y reportando a sistemas como SIRECI y SUIT.',
    objetivos: [
      'Coordinar visitas de entes de control externo',
      'Reportar información a sistemas externos (SIRECI, SUIT)',
      'Hacer seguimiento a hallazgos de auditorías externas',
      'Garantizar trazabilidad de planes de mejoramiento'
    ],
    ejemplosActividades: [
      'Atención de requerimientos de la Contraloría General',
      'Reporte trimestral al SIRECI',
      'Seguimiento a hallazgos de Auditoría General de la República',
      'Consolidación de informes para Procuraduría'
    ]
  }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: Panel Informativo Compacto
// ════════════════════════════════════════════════════════════════════════════

export function PanelInformativoDecreto648() {
  const [expandido, setExpandido] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <>
      {/* Panel Compacto */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl border-2 border-blue-800 overflow-hidden shadow-lg">
        <button
          onClick={() => setExpandido(!expandido)}
          className="w-full px-6 py-4 flex items-center justify-between text-white hover:bg-blue-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold">Decreto 648 de 2017</h3>
              <p className="text-sm text-blue-100">Base legal del Plan Anual de Auditoría • 5 Roles Obligatorios</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModalAbierto(true);
              }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Ver Normatividad Completa
            </button>
            {expandido ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {/* Contenido Expandible */}
        <AnimatePresence>
          {expandido && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-blue-800/50"
            >
              <div className="p-6 bg-blue-800/20">
                <div className="grid grid-cols-5 gap-4">
                  {ROLES_NORMATIVOS.map((rol) => (
                    <div
                      key={rol.numero}
                      className="bg-white rounded-lg p-4 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setModalAbierto(true)}
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 text-white"
                        style={{ backgroundColor: rol.color }}
                      >
                        {rol.icono}
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1 text-sm">ROL {rol.numero}</h4>
                      <p className="text-xs text-gray-700 font-medium mb-2">{rol.nombre}</p>
                      <p className="text-xs text-gray-500">{rol.articulo}</p>
                    </div>
                  ))}
                </div>

                {/* Nota informativa */}
                <div className="mt-4 p-4 bg-white/90 rounded-lg border-2 border-blue-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-semibold mb-1">
                        ¿Por qué son obligatorios estos 5 roles?
                      </p>
                      <p className="text-sm text-gray-700">
                        El Decreto 648 de 2017 establece que <strong>todas las Oficinas de Control Interno</strong> deben estructurar
                        su Plan Anual de Auditoría incluyendo actividades en cada uno de estos 5 roles. Esto garantiza un enfoque 
                        integral del control interno: desde el liderazgo estratégico hasta la relación con organismos externos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal con Información Detallada */}
      <ModalNormatividadCompleta
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: Modal de Normatividad Completa
// ════════════════════════════════════════════════════════════════════════════

interface ModalNormatividadCompletaProps {
  isOpen: boolean;
  onClose: () => void;
}

function ModalNormatividadCompleta({ isOpen, onClose }: ModalNormatividadCompletaProps) {
  const [rolSeleccionado, setRolSeleccionado] = useState<number>(1);

  if (!isOpen) return null;

  const rol = ROLES_NORMATIVOS.find(r => r.numero === rolSeleccionado)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Decreto 648 de 2017</h2>
              <p className="text-blue-100 text-sm">Marco normativo del Plan Anual de Auditoría OCI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Información General */}
            <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Artículos Relevantes
              </h3>
              <div className="space-y-3">
                {ARTICULOS_DECRETO_648.map((articulo) => (
                  <div key={articulo.numero} className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-600 text-white rounded font-bold text-xs">
                          {articulo.numero}
                        </span>
                        <h4 className="font-bold text-gray-900">{articulo.titulo}</h4>
                      </div>
                      {articulo.url && (
                        <a
                          href={articulo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                        >
                          Ver norma <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{articulo.contenido}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Selector de Roles */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Detalle de los 5 Roles Obligatorios</h3>
              <div className="grid grid-cols-5 gap-3">
                {ROLES_NORMATIVOS.map((r) => (
                  <button
                    key={r.numero}
                    onClick={() => setRolSeleccionado(r.numero)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      rolSeleccionado === r.numero
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 text-white"
                      style={{ backgroundColor: r.color }}
                    >
                      {r.icono}
                    </div>
                    <p className="text-xs font-bold text-gray-900 text-center">ROL {r.numero}</p>
                    <p className="text-xs text-gray-600 text-center mt-1">{r.nombre}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Información del Rol Seleccionado */}
            <motion.div
              key={rolSeleccionado}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden"
            >
              {/* Header del Rol */}
              <div
                className="px-6 py-4 text-white"
                style={{ backgroundColor: rol.color }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    {rol.icono}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">ROL {rol.numero}: {rol.nombre}</h4>
                    <p className="text-sm opacity-90">{rol.articulo}</p>
                  </div>
                </div>
              </div>

              {/* Contenido del Rol */}
              <div className="p-6 space-y-6">
                {/* Descripción */}
                <div>
                  <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    Descripción
                  </h5>
                  <p className="text-gray-700">{rol.descripcion}</p>
                </div>

                {/* Fundamento Legal */}
                <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg">
                  <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-600" />
                    Fundamento Legal
                  </h5>
                  <p className="text-sm text-gray-700">{rol.fundamentoLegal}</p>
                </div>

                {/* Objetivos */}
                <div>
                  <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Objetivos del Rol
                  </h5>
                  <ul className="space-y-2">
                    {rol.objetivos.map((objetivo, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-700">{idx + 1}</span>
                        </div>
                        <span className="text-sm text-gray-700">{objetivo}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ejemplos de Actividades */}
                <div>
                  <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    Ejemplos de Actividades
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    {rol.ejemplosActividades.map((actividad, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-800">{actividad}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <p className="font-semibold">Referencias adicionales:</p>
            <p>• Modelo Estándar de Control Interno - MECI 2014</p>
            <p>• Guía de Auditoría Interna - DAFP</p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: Badge Normativo Simple (para usar inline)
// ════════════════════════════════════════════════════════════════════════════

export function BadgeNormativoDecreto648({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`${sizeClasses[size]} bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors`}
      >
        <Shield className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} />
        Decreto 648/2017
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white rounded-lg shadow-xl text-xs z-50"
          >
            <p className="font-semibold mb-1">Base Legal del Plan Anual</p>
            <p className="opacity-90">
              Este decreto establece los 5 roles obligatorios que toda Oficina de Control Interno debe cumplir.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
