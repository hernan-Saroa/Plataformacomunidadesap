/**
 * DOCUMENTOS Y REPORTES - Generación e Informes Estadísticos
 * Todo integrado en un solo módulo
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, BarChart3, Download, FileSpreadsheet, Calendar,
  TrendingUp, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

type SeccionActiva = 'generacion' | 'reportes';

export function DocumentosReportes() {
  const [seccionActiva, setSeccionActiva] = useState<SeccionActiva>('generacion');

  return (
    <div className="space-y-6">
      {/* TABS */}
      <div className="flex items-center gap-2 p-1 rounded-xl border-2 inline-flex" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
        <Button
          size="sm"
          variant={seccionActiva === 'generacion' ? 'default' : 'ghost'}
          onClick={() => setSeccionActiva('generacion')}
          style={seccionActiva === 'generacion' ? { background: '#F97316', color: '#FFFFFF' } : {}}
        >
          <FileText className="w-4 h-4 mr-2" />
          Generación de Documentos
        </Button>
        <Button
          size="sm"
          variant={seccionActiva === 'reportes' ? 'default' : 'ghost'}
          onClick={() => setSeccionActiva('reportes')}
          style={seccionActiva === 'reportes' ? { background: '#F97316', color: '#FFFFFF' } : {}}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Reportes Estadísticos
        </Button>
      </div>

      {/* GENERACIÓN DE DOCUMENTOS */}
      {seccionActiva === 'generacion' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Plan Anual de Auditoría */}
            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ background: '#EFF6FF' }}>
                  <Calendar className="w-6 h-6" style={{ color: '#3B82F6' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                    Plan Anual de Auditoría
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Genera el plan anual con cronograma y alcance
                  </p>
                </div>
              </div>
              <Button className="w-full" style={{ background: '#3B82F6', color: '#FFFFFF' }}>
                <Download className="w-4 h-4 mr-2" />
                Generar Documento
              </Button>
            </motion.div>

            {/* Informe de Auditoría */}
            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
                  <FileText className="w-6 h-6" style={{ color: '#8B5CF6' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                    Informe de Auditoría
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Informe ejecutivo con hallazgos y recomendaciones
                  </p>
                </div>
              </div>
              <Button className="w-full" style={{ background: '#8B5CF6', color: '#FFFFFF' }}>
                <Download className="w-4 h-4 mr-2" />
                Generar Informe
              </Button>
            </motion.div>

            {/* Plan de Mejora */}
            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: '#F59E0B' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                    Plan de Mejora
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Plan de acción para hallazgos identificados
                  </p>
                </div>
              </div>
              <Button className="w-full" style={{ background: '#F59E0B', color: '#FFFFFF' }}>
                <Download className="w-4 h-4 mr-2" />
                Generar Plan
              </Button>
            </motion.div>

            {/* Acta de Apertura */}
            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ background: '#F0FDF4' }}>
                  <FileText className="w-6 h-6" style={{ color: '#10B981' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                    Acta de Apertura
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Documento formal de inicio de auditoría
                  </p>
                </div>
              </div>
              <Button className="w-full" style={{ background: '#10B981', color: '#FFFFFF' }}>
                <Download className="w-4 h-4 mr-2" />
                Generar Acta
              </Button>
            </motion.div>

            {/* Acta de Cierre */}
            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
                  <FileText className="w-6 h-6" style={{ color: '#EF4444' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                    Acta de Cierre
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Documento de finalización de auditoría
                  </p>
                </div>
              </div>
              <Button className="w-full" style={{ background: '#EF4444', color: '#FFFFFF' }}>
                <Download className="w-4 h-4 mr-2" />
                Generar Acta
              </Button>
            </motion.div>

            {/* Matriz de Hallazgos */}
            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ background: '#FFF7ED' }}>
                  <FileSpreadsheet className="w-6 h-6" style={{ color: '#F97316' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                    Matriz de Hallazgos
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Excel con consolidado de hallazgos
                  </p>
                </div>
              </div>
              <Button className="w-full" style={{ background: '#F97316', color: '#FFFFFF' }}>
                <Download className="w-4 h-4 mr-2" />
                Generar Matriz
              </Button>
            </motion.div>
          </div>
        </div>
      )}

      {/* REPORTES ESTADÍSTICOS */}
      {seccionActiva === 'reportes' && (
        <div className="space-y-6">
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Auditorías 2024</p>
                  <h3 className="text-3xl font-black" style={{ color: '#1F2937' }}>24</h3>
                  <p className="text-xs mt-2" style={{ color: '#10B981' }}>
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    +15% vs 2023
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: '#EFF6FF' }}>
                  <BarChart3 className="w-6 h-6" style={{ color: '#3B82F6' }} />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Hallazgos Totales</p>
                  <h3 className="text-3xl font-black" style={{ color: '#F59E0B' }}>38</h3>
                  <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    5 críticos
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
                  <AlertCircle className="w-6 h-6" style={{ color: '#F59E0B' }} />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Tasa de Cierre</p>
                  <h3 className="text-3xl font-black" style={{ color: '#10B981' }}>87%</h3>
                  <p className="text-xs mt-2" style={{ color: '#10B981' }}>
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    33 cerrados
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: '#F0FDF4' }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: '#10B981' }} />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Tiempo Promedio</p>
                  <h3 className="text-3xl font-black" style={{ color: '#8B5CF6' }}>45</h3>
                  <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    días por auditoría
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
                  <Clock className="w-6 h-6" style={{ color: '#8B5CF6' }} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Reportes Descargables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ background: '#EFF6FF' }}>
                  <BarChart3 className="w-6 h-6" style={{ color: '#3B82F6' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                    Reporte de Auditorías por Territorial
                  </h3>
                  <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                    Consolidado de auditorías ejecutadas por cada territorial
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                    <Badge variant="outline">17 Territoriales</Badge>
                    <Badge variant="outline">Año 2024</Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-2">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button variant="outline" className="flex-1 border-2">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
                  <AlertCircle className="w-6 h-6" style={{ color: '#F59E0B' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                    Reporte de Hallazgos por Gravedad
                  </h3>
                  <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                    Análisis de hallazgos clasificados por nivel de gravedad
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                    <Badge variant="outline">38 Hallazgos</Badge>
                    <Badge variant="outline">Q4 2024</Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-2">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button variant="outline" className="flex-1 border-2">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ background: '#F0FDF4' }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: '#10B981' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                    Reporte de Cumplimiento de Planes
                  </h3>
                  <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                    Estado de implementación de planes de mejora
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                    <Badge variant="outline">87% Cumplimiento</Badge>
                    <Badge variant="outline">2024</Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-2">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button variant="outline" className="flex-1 border-2">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
                  <Calendar className="w-6 h-6" style={{ color: '#8B5CF6' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                    Reporte Ejecutivo Anual
                  </h3>
                  <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                    Resumen ejecutivo con todas las métricas del año
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                    <Badge variant="outline">Consolidado</Badge>
                    <Badge variant="outline">2024</Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-2">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button variant="outline" className="flex-1 border-2">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
