/**
 * Componente: Capacitaciones Disponibles
 * Widget que muestra capacitaciones del dominio Uso y Apropiación
 */

import React from 'react';
import { 
  BookOpen, 
  Clock,
  Users,
  Calendar,
  Award,
  ExternalLink,
  TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';

interface CapacitacionesDisponiblesProps {
  userRole: string;
}

export function CapacitacionesDisponibles({ userRole }: CapacitacionesDisponiblesProps) {
  const capacitaciones = [
    {
      id: 'cap-001',
      titulo: 'Fundamentos de Ciberseguridad',
      descripcion: 'Curso básico sobre amenazas digitales y buenas prácticas de seguridad.',
      modalidad: 'Virtual Asincrónica',
      duracion: '2 horas',
      destinatarios: ['Docente', 'Administrativo'],
      fechaFin: '2025-12-20',
      progreso: 0,
      obligatorio: true,
      inscritos: 485,
      completados: 298,
      certificado: true
    },
    {
      id: 'cap-002',
      titulo: 'Uso Avanzado del Sistema Académico v3.0',
      descripcion: 'Capacitación sobre las nuevas funcionalidades del sistema de gestión académica.',
      modalidad: 'Virtual Sincrónica',
      duracion: '3 sesiones de 1.5 horas',
      destinatarios: ['Estudiante', 'Docente', 'Administrativo'],
      fechaFin: '2025-12-15',
      progreso: 0,
      obligatorio: false,
      inscritos: 125,
      completados: 0,
      certificado: true
    },
    {
      id: 'cap-003',
      titulo: 'Transformación Digital y Herramientas Colaborativas',
      descripcion: 'Aprende a usar Microsoft Teams, OneDrive y otras herramientas digitales.',
      modalidad: 'Virtual Asincrónica',
      duracion: '1.5 horas',
      destinatarios: ['Estudiante', 'Docente', 'Graduado', 'Administrativo'],
      fechaFin: '2025-12-28',
      progreso: 0,
      obligatorio: false,
      inscritos: 312,
      completados: 156,
      certificado: false
    }
  ];

  const capacitacionesRelevantes = capacitaciones.filter(c => 
    c.destinatarios.includes(userRole)
  );

  const getModalidadColor = (modalidad: string) => {
    if (modalidad.includes('Sincrónica')) return 'bg-purple-100 text-purple-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white mb-1 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Capacitaciones Disponibles
            </h3>
            <p className="text-xs text-purple-100">
              Dominio de Uso y Apropiación
            </p>
          </div>
          <div className="px-3 py-1 bg-white/20 rounded-lg">
            <span className="text-white font-bold">{capacitacionesRelevantes.length}</span>
            <span className="text-purple-100 text-sm ml-1">cursos</span>
          </div>
        </div>
      </div>

      {/* Lista de capacitaciones */}
      <div className="p-5 space-y-4">
        {capacitacionesRelevantes.map((cap, index) => (
          <motion.div
            key={cap.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
          >
            {/* Header del curso */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold text-gray-900">{cap.titulo}</h4>
                  {cap.obligatorio && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                      Obligatorio
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{cap.descripcion}</p>
              </div>
            </div>

            {/* Detalles del curso */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>{cap.duracion}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Hasta {cap.fechaFin}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4 text-purple-600" />
                <span>{cap.inscritos} inscritos</span>
              </div>
              {cap.certificado && (
                <div className="flex items-center gap-2 text-sm text-purple-600 font-semibold">
                  <Award className="w-4 h-4" />
                  <span>Con certificado</span>
                </div>
              )}
            </div>

            {/* Modalidad */}
            <div className="mb-3">
              <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getModalidadColor(cap.modalidad)}`}>
                {cap.modalidad}
              </span>
            </div>

            {/* Progreso */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progreso del grupo</span>
                <span className="font-bold text-purple-600">
                  {cap.completados}/{cap.inscritos} ({Math.round((cap.completados / cap.inscritos) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${(cap.completados / cap.inscritos) * 100}%` }}
                />
              </div>
            </div>

            {/* Acciones */}
            <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2">
              {cap.progreso === 0 ? 'Comenzar curso' : 'Continuar curso'}
              <ExternalLink className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Footer con estadísticas */}
      <div className="p-4 bg-purple-50 border-t border-purple-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-purple-700">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold">
              {capacitacionesRelevantes.filter(c => c.obligatorio).length} capacitaciones obligatorias
            </span>
          </div>
          <a 
            href="#" 
            className="text-purple-700 hover:text-purple-900 font-semibold transition-colors"
          >
            Ver todas las capacitaciones →
          </a>
        </div>
      </div>
    </motion.div>
  );
}
