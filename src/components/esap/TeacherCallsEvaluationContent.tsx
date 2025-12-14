/**
 * Submódulo: Evaluación de Documentos
 * 
 * Permite validar documento por documento y requisito por requisito
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  ClipboardList,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  MessageSquare,
  User,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  estado: 'Aprobado' | 'Rechazado' | 'Pendiente';
  observaciones?: string;
  url?: string;
}

interface Requisito {
  id: string;
  descripcion: string;
  cumple: boolean | null;
  evidencia?: string;
  observaciones?: string;
}

interface AplicacionEvaluacion {
  id: string;
  aspirante: string;
  convocatoria: string;
  codigoConvocatoria: string;
  fechaAplicacion: string;
  documentos: Documento[];
  requisitos: Requisito[];
  estadoGeneral: 'Pendiente' | 'En Revisión' | 'Aprobada' | 'Rechazada';
  puntajeTotal?: number;
}

export function TeacherCallsEvaluationContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedApplications, setExpandedApplications] = useState<string[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  // Mock data
  const aplicaciones: AplicacionEvaluacion[] = [
    {
      id: '1',
      aspirante: 'María Fernanda López',
      convocatoria: 'Docente de Administración Pública',
      codigoConvocatoria: 'CONV-2024-001',
      fechaAplicacion: '2024-11-18',
      estadoGeneral: 'Pendiente',
      documentos: [
        {
          id: 'd1',
          nombre: 'Hoja de Vida',
          tipo: 'PDF',
          estado: 'Pendiente',
          url: '#'
        },
        {
          id: 'd2',
          nombre: 'Diploma Profesional',
          tipo: 'PDF',
          estado: 'Pendiente',
          url: '#'
        },
        {
          id: 'd3',
          nombre: 'Certificado de Experiencia Docente',
          tipo: 'PDF',
          estado: 'Pendiente',
          url: '#'
        },
        {
          id: 'd4',
          nombre: 'Certificado Judicial',
          tipo: 'PDF',
          estado: 'Pendiente',
          url: '#'
        },
      ],
      requisitos: [
        {
          id: 'r1',
          descripcion: 'Título profesional en Administración Pública o afín',
          cumple: null
        },
        {
          id: 'r2',
          descripcion: 'Experiencia docente mínima de 3 años',
          cumple: null
        },
        {
          id: 'r3',
          descripcion: 'Estudios de posgrado (Maestría o superior)',
          cumple: null
        },
        {
          id: 'r4',
          descripcion: 'Antecedentes disciplinarios y judiciales limpios',
          cumple: null
        },
      ]
    },
    {
      id: '2',
      aspirante: 'Carlos Alberto Ramírez',
      convocatoria: 'Docente de Administración Pública',
      codigoConvocatoria: 'CONV-2024-001',
      fechaAplicacion: '2024-11-17',
      estadoGeneral: 'En Revisión',
      puntajeTotal: 85,
      documentos: [
        {
          id: 'd5',
          nombre: 'Hoja de Vida',
          tipo: 'PDF',
          estado: 'Aprobado',
          observaciones: 'Documento completo y actualizado',
          url: '#'
        },
        {
          id: 'd6',
          nombre: 'Diploma Profesional',
          tipo: 'PDF',
          estado: 'Aprobado',
          observaciones: 'Título verificado con la universidad',
          url: '#'
        },
        {
          id: 'd7',
          nombre: 'Certificado de Experiencia Docente',
          tipo: 'PDF',
          estado: 'Pendiente',
          url: '#'
        },
        {
          id: 'd8',
          nombre: 'Certificado Judicial',
          tipo: 'PDF',
          estado: 'Aprobado',
          url: '#'
        },
      ],
      requisitos: [
        {
          id: 'r5',
          descripcion: 'Título profesional en Administración Pública o afín',
          cumple: true,
          evidencia: 'Diploma profesional verificado'
        },
        {
          id: 'r6',
          descripcion: 'Experiencia docente mínima de 3 años',
          cumple: true,
          evidencia: 'Certificados de 5 años de experiencia'
        },
        {
          id: 'r7',
          descripcion: 'Estudios de posgrado (Maestría o superior)',
          cumple: true,
          evidencia: 'Maestría en Administración Pública'
        },
        {
          id: 'r8',
          descripcion: 'Antecedentes disciplinarios y judiciales limpios',
          cumple: true,
          evidencia: 'Certificado judicial vigente'
        },
      ]
    },
  ];

  const toggleExpanded = (appId: string) => {
    setExpandedApplications(prev =>
      prev.includes(appId)
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      'Aprobado': {
        className: 'bg-green-100 text-green-700 border-green-200',
        icon: <CheckCircle className="w-3 h-3" />
      },
      'Rechazado': {
        className: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="w-3 h-3" />
      },
      'Pendiente': {
        className: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: <AlertCircle className="w-3 h-3" />
      },
      'En Revisión': {
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: <AlertCircle className="w-3 h-3" />
      }
    };

    const variant = variants[estado] || variants['Pendiente'];
    return (
      <Badge className={`${variant.className} border flex items-center gap-1`}>
        {variant.icon}
        {estado}
      </Badge>
    );
  };

  const getRequisitoIcon = (cumple: boolean | null) => {
    if (cumple === null) return <AlertCircle className="w-5 h-5 text-orange-500" />;
    if (cumple) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const filteredAplicaciones = aplicaciones.filter(app =>
    app.aspirante.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.codigoConvocatoria.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalDocumentos: aplicaciones.reduce((acc, app) => acc + app.documentos.length, 0),
    documentosPendientes: aplicaciones.reduce(
      (acc, app) => acc + app.documentos.filter(d => d.estado === 'Pendiente').length,
      0
    ),
    documentosAprobados: aplicaciones.reduce(
      (acc, app) => acc + app.documentos.filter(d => d.estado === 'Aprobado').length,
      0
    ),
    documentosRechazados: aplicaciones.reduce(
      (acc, app) => acc + app.documentos.filter(d => d.estado === 'Rechazado').length,
      0
    ),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            Evaluación de Documentos
          </h2>
          <p className="text-gray-600">
            Validación documento por documento, requisito por requisito
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 font-medium">Total Docs</span>
            <FileText className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-3xl font-black text-gray-900">{stats.totalDocumentos}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-orange-700 font-medium">Pendientes</span>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-black text-orange-900">{stats.documentosPendientes}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-700 font-medium">Aprobados</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-black text-green-900">{stats.documentosAprobados}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-red-700 font-medium">Rechazados</span>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-black text-red-900">{stats.documentosRechazados}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Buscar por aspirante o código de convocatoria..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Aplicaciones con Evaluación Detallada */}
      <div className="space-y-4">
        {filteredAplicaciones.map((app, index) => {
          const isExpanded = expandedApplications.includes(app.id);
          const docsAprobados = app.documentos.filter(d => d.estado === 'Aprobado').length;
          const docsPendientes = app.documentos.filter(d => d.estado === 'Pendiente').length;
          const requisitosAprobados = app.requisitos.filter(r => r.cumple === true).length;

          return (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-5 h-5 text-gray-400" />
                      <h3 className="font-bold text-gray-900">{app.aspirante}</h3>
                      {getEstadoBadge(app.estadoGeneral)}
                      {app.puntajeTotal && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 border">
                          {app.puntajeTotal} puntos
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">{app.codigoConvocatoria}</span> • {app.convocatoria}
                    </p>

                    {/* Progress Indicators */}
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Documentos: <span className="font-bold text-green-600">{docsAprobados}</span>
                          /{app.documentos.length}
                          {docsPendientes > 0 && (
                            <span className="ml-2 text-orange-600">({docsPendientes} pendientes)</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Requisitos: <span className="font-bold text-green-600">{requisitosAprobados}</span>
                          /{app.requisitos.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpanded(app.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Evaluar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded Content - Evaluación Detallada */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 bg-gray-50"
                >
                  <div className="p-6 space-y-6">
                    {/* Sección: Documentos */}
                    <div>
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Documentos ({app.documentos.length})
                      </h4>
                      <div className="space-y-3">
                        {app.documentos.map(doc => (
                          <div
                            key={doc.id}
                            className="bg-white rounded-lg border border-gray-200 p-4"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium text-gray-900">{doc.nombre}</span>
                                  {getEstadoBadge(doc.estado)}
                                </div>
                                <p className="text-xs text-gray-500">{doc.tipo}</p>
                              </div>

                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4 mr-1" />
                                  Ver
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {doc.estado === 'Pendiente' && (
                              <div className="flex gap-2 mt-3">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Aprobar
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Rechazar
                                </Button>
                              </div>
                            )}

                            {doc.observaciones && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-900">
                                  <MessageSquare className="w-4 h-4 inline mr-1" />
                                  {doc.observaciones}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sección: Requisitos */}
                    <div>
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Requisitos ({app.requisitos.length})
                      </h4>
                      <div className="space-y-3">
                        {app.requisitos.map(req => (
                          <div
                            key={req.id}
                            className="bg-white rounded-lg border border-gray-200 p-4"
                          >
                            <div className="flex items-start gap-3 mb-3">
                              {getRequisitoIcon(req.cumple)}
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">{req.descripcion}</p>
                                {req.evidencia && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Evidencia:</span> {req.evidencia}
                                  </p>
                                )}
                              </div>
                            </div>

                            {req.cumple === null && (
                              <div className="flex gap-2 mt-3">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Cumple
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                                  <XCircle className="w-4 h-4 mr-1" />
                                  No Cumple
                                </Button>
                              </div>
                            )}

                            {req.observaciones && (
                              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <p className="text-sm text-amber-900">{req.observaciones}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Decisión Final */}
                    <div className="bg-white rounded-lg border-2 border-gray-300 p-4">
                      <h4 className="font-bold text-gray-900 mb-3">Decisión Final</h4>
                      <div className="flex gap-3">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Aprobar Aplicación
                        </Button>
                        <Button variant="outline" className="flex-1 text-red-600 hover:bg-red-50">
                          <XCircle className="w-4 h-4 mr-2" />
                          Rechazar Aplicación
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAplicaciones.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-bold text-gray-900 mb-2">No hay aplicaciones para evaluar</h3>
          <p className="text-gray-600">
            {searchQuery
              ? 'Intenta con otros términos de búsqueda'
              : 'Las aplicaciones aparecerán aquí cuando estén listas para evaluación'}
          </p>
        </div>
      )}
    </div>
  );
}
