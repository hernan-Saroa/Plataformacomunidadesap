/**
 * Gestión de Proyectos de Arquitectura Empresarial
 */

import React from 'react';
import { GitBranch, Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface GestionProyectosAEProps {
  canEdit?: boolean;
}

export function GestionProyectosAE({ canEdit }: GestionProyectosAEProps) {
  const proyectos = [
    {
      id: 'AE-001',
      nombre: 'Actualización Marco AE 2025',
      sponsor: 'CIO',
      inicio: '2024-10-01',
      fin: '2025-03-31',
      presupuesto: 180000000,
      ejecutado: 72000000,
      avance: 40,
      dominio: 'Todos',
      prioridad: 'Crítica',
      equipo: 8
    },
    {
      id: 'AE-002',
      nombre: 'Implementación Data Catalog',
      sponsor: 'CDO',
      inicio: '2024-11-01',
      fin: '2025-05-31',
      presupuesto: 250000000,
      ejecutado: 50000000,
      avance: 20,
      dominio: 'Información',
      prioridad: 'Alta',
      equipo: 6
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-6">Proyectos de Arquitectura Empresarial</h3>
        <div className="space-y-4">
          {proyectos.map((proyecto, index) => (
            <motion.div
              key={proyecto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold text-gray-900">{proyecto.nombre}</h4>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                      {proyecto.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      proyecto.prioridad === 'Crítica'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {proyecto.prioridad}
                    </span>
                    <span className="text-sm text-gray-600">Dominio: {proyecto.dominio}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">Equipo</p>
                    <p className="text-sm font-semibold">{proyecto.equipo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">Duración</p>
                    <p className="text-sm font-semibold">
                      {new Date(proyecto.inicio).toLocaleDateString('es-CO', { month: 'short' })} - {new Date(proyecto.fin).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">Presupuesto</p>
                    <p className="text-sm font-semibold">
                      ${(proyecto.presupuesto / 1000000).toFixed(0)}M
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">Sponsor</p>
                    <p className="text-sm font-semibold">{proyecto.sponsor}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-600">Avance del proyecto</span>
                  <span className="font-bold text-gray-900">{proyecto.avance}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                    style={{ width: `${proyecto.avance}%` }}
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
