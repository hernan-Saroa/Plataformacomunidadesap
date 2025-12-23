/**
 * Modal de Vista General del PTA - Antes de Enviar
 * Muestra un resumen completo con gráfica de distribución
 */

import { useState } from 'react';
import * as React from 'react';
import { X, Send, CheckCircle, Download, TrendingUp, Clock, BookOpen, Microscope, Users, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ButtonSIGL } from '../esap/gestion-legal/design-system/ButtonSIGL';

interface PTA {
  id: string;
  codigo: string;
  docente: {
    nombre: string;
    email: string;
    documento: string;
    programa: string;
  };
  periodo: string;
  estado: string;
  fecha_creacion: string;
  horas_totales: number;
  horas_programables: number;
}

interface ModalVistaGeneralPTAProps {
  isOpen: boolean;
  onClose: () => void;
  pta: PTA | null;
  onEnviar: (pta: PTA) => void;
}

export function ModalVistaGeneralPTA({ isOpen, onClose, pta, onEnviar }: ModalVistaGeneralPTAProps) {
  // Distribución simulada del PTA (en producción vendría de los datos reales)
  const distribucion = {
    docencia: { horas: 180, porcentaje: 50 },
    investigacion: { horas: 99, porcentaje: 27.5 },
    extension: { horas: 57.6, porcentaje: 16 },
    complementarias: { horas: 23.4, porcentaje: 6.5 }
  };

  const horasProgramables = 360;
  const horasAsignadas = distribucion.docencia.horas + distribucion.investigacion.horas + 
                         distribucion.extension.horas + distribucion.complementarias.horas;
  const horasRestantes = horasProgramables - horasAsignadas;
  const progreso = (horasAsignadas / horasProgramables) * 100;

  const handleConfirmarEnvio = () => {
    if (pta) {
      onEnviar(pta);
      onClose();
    }
  };

  if (!isOpen || !pta) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 flex flex-col"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold">Plan de Trabajo Académico</h2>
              <p className="text-sm text-white/90 mt-1">Vista General y Resumen</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Métricas Principales */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-medium text-blue-700">Horas Programables</p>
                </div>
                <p className="text-3xl font-bold text-blue-900">{horasProgramables}h</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <p className="text-xs font-medium text-indigo-700">Horas Asignadas</p>
                </div>
                <p className="text-3xl font-bold text-indigo-900">{horasAsignadas.toFixed(0)}h</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-medium text-green-700">Horas Restantes</p>
                </div>
                <p className="text-3xl font-bold text-green-900">{horasRestantes.toFixed(0)}h</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <p className="text-xs font-medium text-purple-700">Progreso</p>
                </div>
                <p className="text-3xl font-bold text-purple-900">{progreso.toFixed(1)}%</p>
              </div>
            </div>

            {/* Distribución del PTA con Gráfica */}
            <div className="border-2 border-yellow-400 rounded-xl p-6 bg-gradient-to-br from-yellow-50/50 to-amber-50/50">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Distribución del PTA</h3>
              
              {/* Gráfica de Barras Horizontal */}
              <div className="space-y-4 mb-6">
                {/* Docencia */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">Docencia</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-bold text-gray-900">{distribucion.docencia.horas}h</span>
                      <span className="text-gray-600 ml-2">({distribucion.docencia.porcentaje}%)</span>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${distribucion.docencia.porcentaje}%` }}
                    />
                  </div>
                </div>

                {/* Investigación */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Microscope className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium text-gray-900">Investigación</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-bold text-gray-900">{distribucion.investigacion.horas}h</span>
                      <span className="text-gray-600 ml-2">({distribucion.investigacion.porcentaje}%)</span>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${distribucion.investigacion.porcentaje}%` }}
                    />
                  </div>
                </div>

                {/* Extensión */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">Extensión</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-bold text-gray-900">{distribucion.extension.horas}h</span>
                      <span className="text-gray-600 ml-2">({distribucion.extension.porcentaje}%)</span>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                      style={{ width: `${distribucion.extension.porcentaje}%` }}
                    />
                  </div>
                </div>

                {/* Complementarias */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-gray-900">Complementarias</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-bold text-gray-900">{distribucion.complementarias.horas}h</span>
                      <span className="text-gray-600 ml-2">({distribucion.complementarias.porcentaje}%)</span>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
                      style={{ width: `${distribucion.complementarias.porcentaje}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Leyenda con colores */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-yellow-300">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span className="text-xs text-gray-700">Docencia {distribucion.docencia.horas}h ({distribucion.docencia.porcentaje}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                  <span className="text-xs text-gray-700">Investigación {distribucion.investigacion.horas}h ({distribucion.investigacion.porcentaje}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span className="text-xs text-gray-700">Extensión {distribucion.extension.horas}h ({distribucion.extension.porcentaje}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                  <span className="text-xs text-gray-700">Complementarias {distribucion.complementarias.horas}h ({distribucion.complementarias.porcentaje}%)</span>
                </div>
              </div>
            </div>

            {/* Estado del PTA, Estadísticas y Validación */}
            <div className="grid grid-cols-3 gap-4">
              {/* Estado del PTA */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Estado del PTA</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Estado:</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      En Borrador
                    </span>
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Estadísticas</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total actividades:</span>
                    <span className="font-bold text-gray-900">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Componentes activos:</span>
                    <span className="font-bold text-gray-900">0 de 5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cumplimiento:</span>
                    <span className="font-bold text-gray-900">0.0%</span>
                  </div>
                </div>
              </div>

              {/* Validación */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Validación</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-gray-700">Distribución correcta</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">Límites respetados</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">Listo para aprobar</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Advertencia */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-amber-600 mt-0.5">⚠️</div>
                <div>
                  <p className="text-sm font-medium text-amber-900">Importante antes de enviar:</p>
                  <ul className="text-sm text-amber-800 mt-1 space-y-1 list-disc list-inside">
                    <li>El PTA será enviado al Nivel 1 (Coordinador Académico)</li>
                    <li>No podrá ser editado hasta recibir feedback</li>
                    <li>Recibirá notificaciones del progreso de aprobación</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
          <ButtonSIGL variant="outline" onClick={onClose}>
            Cerrar Resumen
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            onClick={handleConfirmarEnvio}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar a Aprobación
          </ButtonSIGL>
        </div>
      </motion.div>
    </div>
  );
}