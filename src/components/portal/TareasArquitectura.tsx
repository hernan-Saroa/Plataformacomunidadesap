/**
 * Componente: Tareas desde Arquitectura Empresarial
 * Widget que muestra tareas asignadas desde AE en el Portal
 */

import React, { useState } from 'react';
import { 
  CheckCircle, 
  Clock,
  AlertCircle,
  ChevronRight,
  Trophy
} from 'lucide-react';
import { motion } from 'motion/react';

interface TareasArquitecturaProps {
  userRole: string;
}

export function TareasArquitectura({ userRole }: TareasArquitecturaProps) {
  const [tareas, setTareas] = useState([
    {
      id: 'task-001',
      titulo: 'Actualizar información de contacto',
      descripcion: 'Verifica y actualiza tu información de contacto en el perfil.',
      asignadoPor: 'Gobierno de Datos',
      roles: ['Estudiante', 'Docente', 'Administrativo'],
      prioridad: 'Media',
      fechaLimite: '2025-12-31',
      completada: false,
      diasRestantes: 25
    },
    {
      id: 'task-002',
      titulo: 'Completar curso de Ciberseguridad',
      descripcion: 'Curso obligatorio de 2 horas sobre seguridad de la información.',
      asignadoPor: 'Seguridad y Privacidad',
      roles: ['Docente', 'Administrativo'],
      prioridad: 'Alta',
      fechaLimite: '2025-12-20',
      completada: false,
      diasRestantes: 14
    },
    {
      id: 'task-003',
      titulo: 'Revisar políticas de uso de tecnología',
      descripcion: 'Lee y acepta las nuevas políticas institucionales.',
      asignadoPor: 'Gobierno TI',
      roles: ['Estudiante', 'Docente', 'Graduado', 'Administrativo'],
      prioridad: 'Alta',
      fechaLimite: '2025-12-15',
      completada: false,
      diasRestantes: 9
    },
    {
      id: 'task-004',
      titulo: 'Responder encuesta de adopción tecnológica',
      descripcion: 'Encuesta de 10 minutos sobre uso de herramientas digitales.',
      asignadoPor: 'Uso y Apropiación',
      roles: ['Estudiante', 'Docente'],
      prioridad: 'Media',
      fechaLimite: '2025-12-25',
      completada: false,
      diasRestantes: 19
    }
  ]);

  const tareasRelevantes = tareas.filter(t => 
    t.roles.includes(userRole) && !t.completada
  );

  const completarTarea = (id: string) => {
    setTareas(tareas.map(t => 
      t.id === id ? { ...t, completada: true } : t
    ));
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return 'text-red-600 bg-red-50 border-red-200';
      case 'Media': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Baja': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getDiasColor = (dias: number) => {
    if (dias <= 7) return 'text-red-600';
    if (dias <= 14) return 'text-orange-600';
    return 'text-green-600';
  };

  if (tareasRelevantes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 p-8 text-center"
      >
        <Trophy className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="font-bold text-gray-900 mb-2">¡Excelente trabajo!</h3>
        <p className="text-sm text-gray-600">
          No tienes tareas pendientes asignadas por Arquitectura Empresarial
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-[#003DA5] to-[#0052cc]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white mb-1">Tareas Asignadas</h3>
            <p className="text-xs text-blue-100">
              Desde Arquitectura Empresarial
            </p>
          </div>
          <div className="px-3 py-1 bg-white/20 rounded-lg">
            <span className="text-white font-bold">{tareasRelevantes.length}</span>
            <span className="text-blue-100 text-sm ml-1">pendientes</span>
          </div>
        </div>
      </div>

      {/* Lista de tareas */}
      <div className="divide-y divide-gray-200">
        {tareasRelevantes.map((tarea, index) => (
          <motion.div
            key={tarea.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <button
                onClick={() => completarTarea(tarea.id)}
                className="mt-1 w-5 h-5 rounded border-2 border-gray-300 hover:border-[#003DA5] transition-colors flex items-center justify-center"
              >
                {tarea.completada && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </button>

              {/* Contenido */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">{tarea.titulo}</h4>
                    <p className="text-sm text-gray-600 mb-2">{tarea.descripcion}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Asignado por: <strong>{tarea.asignadoPor}</strong></span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold rounded border ${getPrioridadColor(tarea.prioridad)}`}>
                    {tarea.prioridad}
                  </span>
                </div>

                {/* Footer de la tarea */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${getDiasColor(tarea.diasRestantes)}`} />
                    <span className={`text-sm font-semibold ${getDiasColor(tarea.diasRestantes)}`}>
                      {tarea.diasRestantes} días restantes
                    </span>
                    <span className="text-xs text-gray-400">• {tarea.fechaLimite}</span>
                  </div>
                  <button className="text-sm font-semibold text-[#003DA5] hover:text-[#002d7a] flex items-center gap-1 transition-colors">
                    Ver detalles
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          Las tareas son asignadas por los diferentes dominios de Arquitectura Empresarial
        </p>
      </div>
    </motion.div>
  );
}
