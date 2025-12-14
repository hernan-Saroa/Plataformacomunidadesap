/**
 * Dominio: Uso y Apropiación
 * Capacitación y adopción tecnológica
 */

import React from 'react';
import { Users, GraduationCap, TrendingUp, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface DominioUsoApropiacionProps {
  canEdit?: boolean;
}

export function DominioUsoApropiacion({ canEdit }: DominioUsoApropiacionProps) {
  const programasCapacitacion = [
    { nombre: 'Alfabetización Digital', participantes: 450, completados: 380, satisfaccion: 4.5, duracion: '20 horas' },
    { nombre: 'Seguridad Informática', participantes: 320, completados: 295, satisfaccion: 4.7, duracion: '15 horas' },
    { nombre: 'Herramientas Colaborativas', participantes: 280, completados: 250, satisfaccion: 4.3, duracion: '12 horas' },
    { nombre: 'Analítica de Datos', participantes: 150, completados: 125, satisfaccion: 4.6, duracion: '30 horas' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-6">Programas de Capacitación</h3>
        <div className="space-y-4">
          {programasCapacitacion.map((programa, index) => (
            <motion.div
              key={programa.nombre}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-pink-50 rounded-lg">
                    <GraduationCap className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{programa.nombre}</h4>
                    <p className="text-sm text-gray-600">{programa.duracion}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Satisfacción</p>
                  <p className="text-sm font-bold text-gray-900">{programa.satisfaccion}/5.0</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Participantes</p>
                  <p className="text-sm font-semibold text-gray-900">{programa.participantes}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Completados</p>
                  <p className="text-sm font-semibold text-gray-900">{programa.completados}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Tasa de completitud</span>
                  <span className="font-bold">{Math.round((programa.completados / programa.participantes) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-rose-600 h-2 rounded-full"
                    style={{ width: `${(programa.completados / programa.participantes) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
