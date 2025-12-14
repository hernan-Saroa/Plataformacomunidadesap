/**
 * Componente de Reporte: Distribución Territorial y Académica
 * Muestra métricas y visualizaciones de usuarios por sede y programa
 */

import React from 'react';
import { Building2, GraduationCap, Users, MapPin, BarChart3, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { SEDES_ESAP, PROGRAMAS_ESAP } from '../../data/oferta-academica-esap';
import { getEstadisticasDistribucion, usuariosConSedesYProgramas } from '../../mock-data/usuarios-con-sedes-programas';

export function ReporteDistribucionTerritorialAcademica() {
  const estadisticas = getEstadisticasDistribucion();

  // Calcular métricas generales
  const totalUsuarios = usuariosConSedesYProgramas.length;
  const usuariosConProgramas = usuariosConSedesYProgramas.filter(
    (u) => u.asignacionesProgramas && u.asignacionesProgramas.length > 0
  ).length;
  const usuariosConMultiplesSedes = usuariosConSedesYProgramas.filter(
    (u) => u.asignacionesSedes && u.asignacionesSedes.length > 1
  ).length;
  const usuariosConMultiplesProgramas = usuariosConSedesYProgramas.filter(
    (u) => u.asignacionesProgramas && u.asignacionesProgramas.length > 1
  ).length;

  // Top 5 sedes con más usuarios
  const top5Sedes = Object.entries(estadisticas.porSede)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([codigo, cantidad]) => {
      const sede = SEDES_ESAP.find((s) => s.codigo === codigo);
      return { codigo, nombre: sede?.nombre || codigo, cantidad };
    });

  // Top 5 programas con más usuarios
  const top5Programas = Object.entries(estadisticas.porPrograma)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([codigo, cantidad]) => {
      const programa = PROGRAMAS_ESAP.find((p) => p.codigo === codigo);
      return { codigo, nombre: programa?.nombre || codigo, cantidad };
    });

  // Distribución por nivel académico
  const distribucionPorNivel = {
    Pregrado: 0,
    Especialización: 0,
    Maestría: 0,
  };

  usuariosConSedesYProgramas.forEach((usuario) => {
    usuario.asignacionesProgramas?.forEach((asignacion) => {
      const programa = PROGRAMAS_ESAP.find((p) => p.codigo === asignacion.programaId);
      if (programa) {
        distribucionPorNivel[programa.nivel as keyof typeof distribucionPorNivel]++;
      }
    });
  });

  // Distribución por modalidad
  const distribucionPorModalidad = {
    Presencial: 0,
    Virtual: 0,
    Distancia: 0,
  };

  usuariosConSedesYProgramas.forEach((usuario) => {
    usuario.asignacionesProgramas?.forEach((asignacion) => {
      const programa = PROGRAMAS_ESAP.find((p) => p.codigo === asignacion.programaId);
      if (programa) {
        distribucionPorModalidad[programa.modalidad as keyof typeof distribucionPorModalidad]++;
      }
    });
  });

  // Distribución por nivel organizacional
  const distributionData: Record<string, number> = {
    Nacional: 0,
    Territorial: 0,
    Regional: 0,
    Sede: 0,
  };

  usuariosConSedesYProgramas.forEach((usuario) => {
    usuario.asignacionesSedes?.forEach((asignacion) => {
      const sede = SEDES_ESAP.find((s) => s.codigo === asignacion.unidadId);
      if (sede) {
        distributionData[sede.nivel as keyof typeof distributionData]++;
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-purple-600" />
            Distribución Territorial y Académica
          </h2>
          <p className="text-gray-600 mt-1">
            Análisis de usuarios por sede y programa académico
          </p>
        </div>
      </div>

      {/* Métricas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Usuarios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalUsuarios}</div>
            <div className="text-sm text-gray-600">Total Usuarios</div>
          </Card>
        </motion.div>

        {/* Usuarios con Programas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <GraduationCap className="w-8 h-8 text-purple-600" />
              <Badge className="text-xs" style={{ backgroundColor: '#8b5cf6' }}>
                {Math.round((usuariosConProgramas / totalUsuarios) * 100)}%
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900">{usuariosConProgramas}</div>
            <div className="text-sm text-gray-600">Con Programas</div>
          </Card>
        </motion.div>

        {/* Múltiples Sedes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-8 h-8 text-green-600" />
              <Badge className="text-xs" style={{ backgroundColor: '#10b981' }}>
                Multi-sede
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900">{usuariosConMultiplesSedes}</div>
            <div className="text-sm text-gray-600">Múltiples Sedes</div>
          </Card>
        </motion.div>

        {/* Múltiples Programas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <GraduationCap className="w-8 h-8 text-orange-600" />
              <Badge className="text-xs" style={{ backgroundColor: '#f59e0b' }}>
                Multi-programa
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900">{usuariosConMultiplesProgramas}</div>
            <div className="text-sm text-gray-600">Múltiples Programas</div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Sedes */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900">Top 5 Sedes con Más Usuarios</h3>
          </div>
          <div className="space-y-3">
            {top5Sedes.map((sede, index) => (
              <div key={sede.codigo} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, #3B82F6 0%, ${
                        index === 0 ? '#F59E0B' : '#6B7280'
                      } 100%)`,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{sede.nombre}</div>
                    <div className="text-xs text-gray-600">{sede.codigo}</div>
                  </div>
                </div>
                <Badge className="text-sm" style={{ backgroundColor: '#3B82F6' }}>
                  {sede.cantidad} usuarios
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Top 5 Programas */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-900">Top 5 Programas con Más Usuarios</h3>
          </div>
          <div className="space-y-3">
            {top5Programas.map((programa, index) => (
              <div key={programa.codigo} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, #8b5cf6 0%, ${
                        index === 0 ? '#F59E0B' : '#6B7280'
                      } 100%)`,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{programa.nombre}</div>
                    <div className="text-xs text-gray-600">{programa.codigo}</div>
                  </div>
                </div>
                <Badge className="text-sm" style={{ backgroundColor: '#8b5cf6' }}>
                  {programa.cantidad} usuarios
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución por Nivel Académico */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Nivel Académico</h3>
          <div className="space-y-3">
            {Object.entries(distribucionPorNivel).map(([nivel, cantidad]) => (
              <div key={nivel}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{nivel}</span>
                  <span className="text-sm font-bold text-gray-900">{cantidad}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(cantidad / Math.max(...Object.values(distribucionPorNivel))) * 100}%`,
                      background:
                        nivel === 'Pregrado'
                          ? '#3B82F6'
                          : nivel === 'Especialización'
                          ? '#A855F7'
                          : '#F59E0B',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Distribución por Modalidad */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Modalidad</h3>
          <div className="space-y-3">
            {Object.entries(distribucionPorModalidad).map(([modalidad, cantidad]) => (
              <div key={modalidad}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{modalidad}</span>
                  <span className="text-sm font-bold text-gray-900">{cantidad}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(cantidad / Math.max(...Object.values(distribucionPorModalidad))) * 100}%`,
                      background:
                        modalidad === 'Presencial'
                          ? '#10b981'
                          : modalidad === 'Virtual'
                          ? '#8b5cf6'
                          : '#f59e0b',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Distribución por Nivel Organizacional */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Nivel Organizacional</h3>
          <div className="space-y-3">
            {Object.entries(distributionData).map(([nivel, cantidad]) => (
              <div key={nivel}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{nivel}</span>
                  <span className="text-sm font-bold text-gray-900">{cantidad}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(cantidad / Math.max(...Object.values(distributionData))) * 100}%`,
                      background: '#3B82F6',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}