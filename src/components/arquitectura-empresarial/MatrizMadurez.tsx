/**
 * Matriz de Madurez de Arquitectura Empresarial
 * Basada en el modelo de madurez del MRAE MinTIC
 */

import React from 'react';
import { TrendingUp, Target, CheckCircle, Circle } from 'lucide-react';
import { motion } from 'motion/react';

interface MatrizMadurezProps {
  canEdit?: boolean;
}

export function MatrizMadurez({ canEdit }: MatrizMadurezProps) {
  const nivelesMadurez = [
    { nivel: 1, nombre: 'Inicial', descripcion: 'Procesos ad-hoc y reactivos' },
    { nivel: 2, nombre: 'En Desarrollo', descripcion: 'Procesos documentados pero no estandarizados' },
    { nivel: 3, nombre: 'Definido', descripcion: 'Procesos estandarizados y comunicados' },
    { nivel: 4, nombre: 'Gestionado', descripcion: 'Procesos medidos y controlados' },
    { nivel: 5, nombre: 'Optimizado', descripcion: 'Mejora continua basada en métricas' }
  ];

  const evaluacionDominios = [
    { dominio: 'Estrategia TI', actual: 3.5, objetivo: 4.0, tendencia: 'up' },
    { dominio: 'Información', actual: 3.2, objetivo: 4.0, tendencia: 'up' },
    { dominio: 'Sistemas de Información', actual: 3.8, objetivo: 4.0, tendencia: 'up' },
    { dominio: 'Servicios Tecnológicos', actual: 3.4, objetivo: 4.0, tendencia: 'stable' },
    { dominio: 'Uso y Apropiación', actual: 2.9, objetivo: 3.5, tendencia: 'up' }
  ];

  return (
    <div className="space-y-6">
      {/* Niveles de Madurez */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-6">Niveles de Madurez MRAE</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {nivelesMadurez.map((nivel, index) => (
            <motion.div
              key={nivel.nivel}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="border-2 border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition-all"
            >
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-black">
                {nivel.nivel}
              </div>
              <h4 className="font-bold text-gray-900 mb-2">{nivel.nombre}</h4>
              <p className="text-xs text-gray-600">{nivel.descripcion}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Evaluación por Dominio */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-6">Evaluación por Dominio</h3>
        <div className="space-y-6">
          {evaluacionDominios.map((item, index) => (
            <motion.div
              key={item.dominio}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900">{item.dominio}</h4>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Actual</p>
                    <p className="text-lg font-black text-gray-900">{item.actual.toFixed(1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Objetivo</p>
                    <p className="text-lg font-black text-blue-600">{item.objetivo.toFixed(1)}</p>
                  </div>
                  {item.tendencia === 'up' ? (
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Barras de progreso visual */}
              <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex">
                  {nivelesMadurez.map((nivel) => (
                    <div
                      key={nivel.nivel}
                      className="flex-1 border-r border-gray-300 last:border-r-0 flex items-center justify-center"
                    >
                      <span className="text-xs text-gray-400 font-bold">{nivel.nivel}</span>
                    </div>
                  ))}
                </div>
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 opacity-30"
                  style={{ width: `${(item.actual / 5) * 100}%` }}
                />
                <div
                  className="absolute top-0 left-0 h-full border-r-2 border-blue-600"
                  style={{ width: `${(item.actual / 5) * 100}%` }}
                >
                  <div className="absolute -top-1 -right-2 w-4 h-4 bg-blue-600 rounded-full" />
                </div>
                <div
                  className="absolute top-0 left-0 h-full border-r-2 border-dashed border-green-500"
                  style={{ width: `${(item.objetivo / 5) * 100}%` }}
                >
                  <div className="absolute -top-1 -right-2 w-4 h-4 bg-green-500 rounded-full" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Brecha: {(item.objetivo - item.actual).toFixed(1)} puntos</span>
                <span>Avance: {Math.round((item.actual / item.objetivo) * 100)}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Resumen Global */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-lg shadow-md">
            <Target className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-gray-900 text-xl mb-1">Nivel de Madurez Global: 3.36 / 5.0</h3>
            <p className="text-sm text-gray-700">
              ESAP se encuentra en el nivel <strong>"Definido"</strong> con tendencia positiva hacia el nivel "Gestionado"
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-blue-600">67%</div>
            <p className="text-xs text-gray-600">Cumplimiento</p>
          </div>
        </div>
      </div>
    </div>
  );
}
