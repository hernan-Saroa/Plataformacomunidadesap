/**
 * Componente: Reportería Avanzada
 * Sistema de generación y exportación de reportes de Arquitectura Empresarial
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Download,
  Calendar,
  Filter,
  Mail,
  Clock,
  CheckCircle2,
  Eye,
  Settings
} from 'lucide-react';
import { motion } from 'motion/react';

interface ReporteriaAvanzadaProps {
  canEdit?: boolean;
}

export function ReporteriaAvanzada({ canEdit = true }: ReporteriaAvanzadaProps) {
  const [selectedTipo, setSelectedTipo] = useState<string>('todos');

  // Tipos de reportes
  const tiposReportes = [
    { id: 'todos', name: 'Todos los Reportes' },
    { id: 'ejecutivo', name: 'Ejecutivos' },
    { id: 'tecnico', name: 'Técnicos' },
    { id: 'cumplimiento', name: 'Cumplimiento' },
    { id: 'operativo', name: 'Operativos' }
  ];

  // Reportes predefinidos
  const reportesPredefinidos = [
    {
      id: 'rep-001',
      tipo: 'ejecutivo',
      nombre: 'Dashboard Ejecutivo de Arquitectura Empresarial',
      descripcion: 'Resumen ejecutivo con KPIs principales y estado general de AE',
      frecuencia: 'Mensual',
      ultimaGeneracion: '2025-12-01',
      proximaGeneracion: '2026-01-01',
      destinatarios: 'Dirección General, CIO',
      formato: ['PDF', 'PowerPoint'],
      automatizado: true,
      secciones: [
        'Métricas clave',
        'Estado de proyectos',
        'Nivel de madurez',
        'Cumplimiento MRAE',
        'Riesgos críticos'
      ]
    },
    {
      id: 'rep-002',
      tipo: 'cumplimiento',
      nombre: 'Informe de Cumplimiento MinTIC',
      descripcion: 'Reporte detallado de cumplimiento del Marco de Referencia MRAE',
      frecuencia: 'Trimestral',
      ultimaGeneracion: '2025-10-01',
      proximaGeneracion: '2026-01-01',
      destinatarios: 'MinTIC, Dirección General',
      formato: ['PDF', 'Excel'],
      automatizado: true,
      secciones: [
        'Requisitos cumplidos por dominio',
        'Evidencias documentadas',
        'Brechas identificadas',
        'Plan de acción',
        'Roadmap de cumplimiento'
      ]
    },
    {
      id: 'rep-003',
      tipo: 'tecnico',
      nombre: 'Inventario de Artefactos MRAE',
      descripcion: 'Listado completo de artefactos documentados por dominio',
      frecuencia: 'Mensual',
      ultimaGeneracion: '2025-11-15',
      proximaGeneracion: '2025-12-15',
      destinatarios: 'Equipo de Arquitectura',
      formato: ['Excel', 'CSV'],
      automatizado: true,
      secciones: [
        'Artefactos por dominio',
        'Estado de actualización',
        'Responsables',
        'Fechas de revisión'
      ]
    },
    {
      id: 'rep-004',
      tipo: 'operativo',
      nombre: 'Seguimiento de Proyectos de AE',
      descripcion: 'Estado detallado de proyectos de arquitectura empresarial',
      frecuencia: 'Semanal',
      ultimaGeneracion: '2025-12-06',
      proximaGeneracion: '2025-12-13',
      destinatarios: 'PMO, Líderes de Proyecto',
      formato: ['PDF', 'Excel'],
      automatizado: true,
      secciones: [
        'Proyectos activos',
        'Progreso vs. plan',
        'Riesgos y problemas',
        'Hitos alcanzados',
        'Presupuesto ejecutado'
      ]
    },
    {
      id: 'rep-005',
      tipo: 'ejecutivo',
      nombre: 'Matriz de Madurez Institucional',
      descripcion: 'Evaluación del nivel de madurez en arquitectura empresarial',
      frecuencia: 'Semestral',
      ultimaGeneracion: '2025-07-01',
      proximaGeneracion: '2026-01-01',
      destinatarios: 'Dirección General, Comité TI',
      formato: ['PDF', 'PowerPoint'],
      automatizado: false,
      secciones: [
        'Nivel de madurez por dominio',
        'Evolución histórica',
        'Benchmarking sector público',
        'Recomendaciones',
        'Plan de mejora'
      ]
    },
    {
      id: 'rep-006',
      tipo: 'cumplimiento',
      nombre: 'Auditoría de Seguridad y Privacidad',
      descripcion: 'Reporte de cumplimiento de políticas de seguridad y protección de datos',
      frecuencia: 'Trimestral',
      ultimaGeneracion: '2025-10-15',
      proximaGeneracion: '2026-01-15',
      destinatarios: 'CISO, DPO, Auditoría',
      formato: ['PDF'],
      automatizado: true,
      secciones: [
        'Incidentes de seguridad',
        'Vulnerabilidades',
        'Cumplimiento ISO 27001',
        'Protección de datos personales',
        'Controles implementados'
      ]
    },
    {
      id: 'rep-007',
      tipo: 'tecnico',
      nombre: 'Análisis de Riesgos TI',
      descripcion: 'Evaluación y seguimiento de riesgos tecnológicos',
      frecuencia: 'Mensual',
      ultimaGeneracion: '2025-11-30',
      proximaGeneracion: '2025-12-30',
      destinatarios: 'Comité de Riesgos, CIO',
      formato: ['PDF', 'Excel'],
      automatizado: true,
      secciones: [
        'Riesgos activos',
        'Matriz de riesgos',
        'Planes de mitigación',
        'Indicadores de riesgo',
        'Tendencias'
      ]
    },
    {
      id: 'rep-008',
      tipo: 'operativo',
      nombre: 'Catálogo de Servicios TI',
      descripcion: 'Inventario actualizado de servicios tecnológicos institucionales',
      frecuencia: 'Trimestral',
      ultimaGeneracion: '2025-10-01',
      proximaGeneracion: '2026-01-01',
      destinatarios: 'Operaciones TI, Mesa de Ayuda',
      formato: ['Excel', 'PDF'],
      automatizado: false,
      secciones: [
        'Servicios por categoría',
        'SLAs vigentes',
        'Disponibilidad',
        'Costos',
        'Responsables'
      ]
    }
  ];

  // Reportes generados recientemente
  const reportesGenerados = [
    {
      id: 'gen-001',
      nombre: 'Dashboard Ejecutivo - Noviembre 2025',
      tipo: 'Ejecutivo',
      fecha: '2025-12-01 09:30',
      formato: 'PDF',
      tamaño: '2.4 MB',
      estado: 'Disponible'
    },
    {
      id: 'gen-002',
      nombre: 'Seguimiento Proyectos - Semana 48',
      tipo: 'Operativo',
      fecha: '2025-12-06 14:15',
      formato: 'Excel',
      tamaño: '1.8 MB',
      estado: 'Disponible'
    },
    {
      id: 'gen-003',
      nombre: 'Análisis de Riesgos - Noviembre',
      tipo: 'Técnico',
      fecha: '2025-11-30 16:45',
      formato: 'PDF',
      tamaño: '3.2 MB',
      estado: 'Disponible'
    },
    {
      id: 'gen-004',
      nombre: 'Inventario Artefactos - Noviembre',
      tipo: 'Técnico',
      fecha: '2025-11-15 10:20',
      formato: 'Excel',
      tamaño: '950 KB',
      estado: 'Disponible'
    }
  ];

  const reportesFiltrados = selectedTipo === 'todos' 
    ? reportesPredefinidos 
    : reportesPredefinidos.filter(r => r.tipo === selectedTipo);

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ejecutivo': return 'bg-purple-100 text-purple-700';
      case 'tecnico': return 'bg-blue-100 text-blue-700';
      case 'cumplimiento': return 'bg-green-100 text-green-700';
      case 'operativo': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] rounded-xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8" />
              <h2 className="text-2xl font-black">Reportería Avanzada</h2>
            </div>
            <p className="text-blue-100">
              Generación y distribución automatizada de reportes de Arquitectura Empresarial
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filtros */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">Tipo de Reporte:</span>
        </div>
        {tiposReportes.map((tipo) => (
          <button
            key={tipo.id}
            onClick={() => setSelectedTipo(tipo.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedTipo === tipo.id
                ? 'bg-[#003DA5] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tipo.name}
          </button>
        ))}
      </div>

      {/* Reportes Predefinidos */}
      <div>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Reportes Predefinidos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportesFiltrados.map((reporte, index) => (
            <motion.div
              key={reporte.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 text-xs font-bold rounded capitalize ${getTipoColor(reporte.tipo)}`}>
                      {reporte.tipo}
                    </span>
                    {reporte.automatizado && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Automatizado
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{reporte.nombre}</h4>
                  <p className="text-sm text-gray-600 mb-3">{reporte.descripcion}</p>

                  {/* Información del reporte */}
                  <div className="space-y-2 mb-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Frecuencia: <strong>{reporte.frecuencia}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Última: {reporte.ultimaGeneracion}</span>
                      <span className="text-gray-400">•</span>
                      <span>Próxima: {reporte.proximaGeneracion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="text-xs">{reporte.destinatarios}</span>
                    </div>
                  </div>

                  {/* Formatos disponibles */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-600">Formatos:</span>
                    {reporte.formato.map((fmt, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-semibold">
                        {fmt}
                      </span>
                    ))}
                  </div>

                  {/* Secciones */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Secciones incluidas:</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {reporte.secciones.map((seccion, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                          {seccion}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              {canEdit && (
                <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                  <button className="flex-1 px-3 py-2 bg-[#003DA5] text-white rounded-lg text-sm font-semibold hover:bg-[#002d7a] transition-colors flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Generar Ahora
                  </button>
                  <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Ver
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Reportes Generados Recientemente */}
      <div>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          Reportes Generados Recientemente
        </h3>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Reporte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Formato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Tamaño
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportesGenerados.map((reporte) => (
                  <tr key={reporte.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {reporte.nombre}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                        {reporte.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {reporte.fecha}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded">
                        {reporte.formato}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {reporte.tamaño}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        {reporte.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Información */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Sistema de Reportería
        </h3>
        <div className="prose prose-sm max-w-none text-gray-700">
          <p>
            El sistema de reportería avanzada genera automáticamente <strong>8 tipos de reportes</strong> con 
            frecuencias que van desde semanal hasta semestral. Los reportes se distribuyen automáticamente a los 
            destinatarios configurados vía correo electrónico.
          </p>
          <p className="mt-3">
            Todos los reportes están disponibles en múltiples formatos (PDF, Excel, PowerPoint) y se almacenan 
            históricos por 24 meses. Los reportes ejecutivos incluyen visualizaciones interactivas y análisis de 
            tendencias para facilitar la toma de decisiones.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
