/**
 * ============================================
 * MODAL DE VISTA DETALLADA DEL CASO
 * ============================================
 * 
 * Modal grande con información completa del caso:
 * - Workflow visual
 * - Timeline de actividad
 * - Documentos adjuntos
 * - Información completa
 * - Acciones rápidas
 */

import { useState } from 'react';
import {
  X,
  FileText,
  Download,
  Eye,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Printer,
  MoreVertical,
  Paperclip,
  Flag,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Card, CardContent } from '../../ui/card';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { WorkflowVisualCaso } from './WorkflowVisualCaso';
import { TimelineActividad, generarActividadesMock } from './TimelineActividad';

// ============================================
// TIPOS
// ============================================

type EstadoCaso = 
  | 'inicial' 
  | 'en_revision' 
  | 'asignado' 
  | 'en_proceso' 
  | 'requiere_accion'
  | 'pendiente_aprobacion'
  | 'en_espera'
  | 'completado' 
  | 'archivado'
  | 'vencido';

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  tamano: string;
  fechaCarga: Date;
  usuario: {
    nombre: string;
    iniciales: string;
    color: string;
  };
}

interface Caso {
  id: string;
  moduloId: string;
  moduloNombre: string;
  radicado: string;
  asunto: string;
  estado: EstadoCaso;
  prioridad: string;
  responsable: {
    id: string;
    nombre: string;
    rol: string;
    iniciales: string;
    color: string;
    email?: string;
    telefono?: string;
  };
  creador: {
    nombre: string;
    iniciales: string;
    color: string;
  };
  fechaCreacion: Date;
  fechaVencimiento: Date;
  diasRestantes: number;
  progreso: number;
  proximaAccion: string;
  descripcionCompleta?: string;
  entidadDemandante?: string;
  numeroJuzgado?: string;
  pretensiones?: string;
  cuantia?: string;
}

interface ModalVistaDetalladaProps {
  isOpen: boolean;
  onClose: () => void;
  caso: Caso | null;
  onAccion?: (caso: Caso, tipoAccion: string) => void;
}

// ============================================
// MOCK DATA
// ============================================

const DOCUMENTOS_MOCK: Documento[] = [
  {
    id: 'doc-1',
    nombre: 'Notificacion_Demanda.pdf',
    tipo: 'PDF',
    tamano: '2.4 MB',
    fechaCarga: new Date('2024-12-01'),
    usuario: {
      nombre: 'Pedro Sánchez',
      iniciales: 'PS',
      color: '#20B2AA',
    },
  },
  {
    id: 'doc-2',
    nombre: 'Auto_Admisorio.pdf',
    tipo: 'PDF',
    tamano: '856 KB',
    fechaCarga: new Date('2024-12-01'),
    usuario: {
      nombre: 'Pedro Sánchez',
      iniciales: 'PS',
      color: '#20B2AA',
    },
  },
  {
    id: 'doc-3',
    nombre: 'Escrito_Contestacion_v1.pdf',
    tipo: 'PDF',
    tamano: '3.1 MB',
    fechaCarga: new Date('2024-12-05'),
    usuario: {
      nombre: 'Luis Rodríguez',
      iniciales: 'LR',
      color: '#4A90E2',
    },
  },
  {
    id: 'doc-4',
    nombre: 'Jurisprudencia_Soporte.docx',
    tipo: 'DOCX',
    tamano: '1.8 MB',
    fechaCarga: new Date('2024-12-08'),
    usuario: {
      nombre: 'Luis Rodríguez',
      iniciales: 'LR',
      color: '#4A90E2',
    },
  },
  {
    id: 'doc-5',
    nombre: 'Escrito_Contestacion_v2_Final.pdf',
    tipo: 'PDF',
    tamano: '3.5 MB',
    fechaCarga: new Date('2024-12-15'),
    usuario: {
      nombre: 'Luis Rodríguez',
      iniciales: 'LR',
      color: '#4A90E2',
    },
  },
];

const HISTORIAL_MOCK = [
  {
    etapa: 'inicial' as EstadoCaso,
    fechaInicio: new Date('2024-12-01'),
    fechaFin: new Date('2024-12-01'),
    duracionDias: 0.5,
    usuario: {
      nombre: 'Pedro Sánchez',
      iniciales: 'PS',
      color: '#20B2AA',
    },
    cumplePlazos: 'excelente' as const,
  },
  {
    etapa: 'asignado' as EstadoCaso,
    fechaInicio: new Date('2024-12-01'),
    fechaFin: new Date('2024-12-02'),
    duracionDias: 1,
    usuario: {
      nombre: 'Luis Rodríguez',
      iniciales: 'LR',
      color: '#4A90E2',
    },
    observaciones: 'Caso asignado con prioridad alta por fecha de vencimiento próxima',
    cumplePlazos: 'excelente' as const,
  },
  {
    etapa: 'en_proceso' as EstadoCaso,
    fechaInicio: new Date('2024-12-02'),
    fechaFin: new Date('2024-12-10'),
    duracionDias: 8,
    usuario: {
      nombre: 'Luis Rodríguez',
      iniciales: 'LR',
      color: '#4A90E2',
    },
    observaciones: 'Se realizó análisis jurídico y elaboración de escrito',
    cumplePlazos: 'bueno' as const,
  },
  {
    etapa: 'pendiente_aprobacion' as EstadoCaso,
    fechaInicio: new Date('2024-12-15'),
    usuario: {
      nombre: 'Luis Rodríguez',
      iniciales: 'LR',
      color: '#4A90E2',
    },
    cumplePlazos: 'aceptable' as const,
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModalVistaDetallada({
  isOpen,
  onClose,
  caso,
  onAccion,
}: ModalVistaDetalladaProps) {
  const [tabActual, setTabActual] = useState('info');

  if (!caso) return null;

  const actividades = generarActividadesMock();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{caso.moduloNombre}</Badge>
                <Badge variant="outline">{caso.radicado}</Badge>
                {caso.diasRestantes < 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    ¡VENCIDO!
                  </Badge>
                )}
                {caso.diasRestantes > 0 && caso.diasRestantes <= 3 && (
                  <Badge className="bg-orange-500">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {caso.diasRestantes} días restantes
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl mb-2">{caso.asunto}</DialogTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Vence: {caso.fechaVencimiento.toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Progreso: {caso.progreso}%
                </div>
              </div>
            </div>

            {/* Acciones Rápidas Header */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido con Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={tabActual} onValueChange={setTabActual} className="h-full">
            <TabsList className="grid w-full grid-cols-4 sticky top-0 bg-white z-10">
              <TabsTrigger value="info">
                <FileText className="w-4 h-4 mr-2" />
                Información
              </TabsTrigger>
              <TabsTrigger value="workflow">
                <Flag className="w-4 h-4 mr-2" />
                Flujo de Trabajo
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Clock className="w-4 h-4 mr-2" />
                Historial
              </TabsTrigger>
              <TabsTrigger value="documentos">
                <Paperclip className="w-4 h-4 mr-2" />
                Documentos ({DOCUMENTOS_MOCK.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB: Información General */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Información del Caso</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Radicado</p>
                      <p className="font-medium">{caso.radicado}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Estado</p>
                      <Badge>{caso.estado}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Prioridad</p>
                      <Badge
                        className={
                          caso.prioridad === 'critica'
                            ? 'bg-red-500'
                            : caso.prioridad === 'alta'
                            ? 'bg-orange-500'
                            : 'bg-blue-500'
                        }
                      >
                        {caso.prioridad}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Módulo</p>
                      <p className="text-sm">{caso.moduloNombre}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Fecha de Creación</p>
                      <p className="text-sm">{caso.fechaCreacion.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Fecha de Vencimiento</p>
                      <p className="text-sm font-medium">{caso.fechaVencimiento.toLocaleDateString()}</p>
                    </div>
                  </div>

                  {caso.descripcionCompleta && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500 mb-2">Descripción Completa</p>
                      <p className="text-sm">{caso.descripcionCompleta}</p>
                    </div>
                  )}

                  {/* Información específica de Defensa Judicial */}
                  {caso.moduloId === 'mod-01' && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <h4 className="font-semibold text-sm">Detalles Procesales</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {caso.entidadDemandante && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Entidad/Demandante</p>
                            <p className="text-sm">{caso.entidadDemandante}</p>
                          </div>
                        )}
                        {caso.numeroJuzgado && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Juzgado</p>
                            <p className="text-sm">{caso.numeroJuzgado}</p>
                          </div>
                        )}
                        {caso.pretensiones && (
                          <div className="col-span-2">
                            <p className="text-sm text-gray-500 mb-1">Pretensiones</p>
                            <p className="text-sm">{caso.pretensiones}</p>
                          </div>
                        )}
                        {caso.cuantia && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Cuantía</p>
                            <p className="text-sm font-medium">{caso.cuantia}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Responsables */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Responsables</h3>
                  <div className="space-y-4">
                    {/* Responsable Actual */}
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Responsable Actual</p>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <Avatar className="w-10 h-10" style={{ backgroundColor: caso.responsable.color }}>
                          <AvatarFallback className="text-white">
                            {caso.responsable.iniciales}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{caso.responsable.nombre}</p>
                          <p className="text-sm text-gray-600">{caso.responsable.rol}</p>
                        </div>
                        {caso.responsable.email && (
                          <div className="text-xs text-gray-500">
                            {caso.responsable.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Creador */}
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Creado Por</p>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Avatar className="w-10 h-10" style={{ backgroundColor: caso.creador.color }}>
                          <AvatarFallback className="text-white">
                            {caso.creador.iniciales}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{caso.creador.nombre}</p>
                          <p className="text-sm text-gray-600">
                            {caso.fechaCreacion.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Próxima Acción */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm text-blue-900 mb-1">
                        Próxima Acción Requerida
                      </h4>
                      <p className="text-sm text-blue-800">{caso.proximaAccion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Workflow Visual */}
            <TabsContent value="workflow" className="mt-4">
              <WorkflowVisualCaso
                estadoActual={caso.estado}
                moduloId={caso.moduloId}
                historial={HISTORIAL_MOCK}
                fechaInicio={caso.fechaCreacion}
                fechaVencimiento={caso.fechaVencimiento}
                diasRestantes={caso.diasRestantes}
              />
            </TabsContent>

            {/* TAB: Timeline de Actividad */}
            <TabsContent value="timeline" className="mt-4">
              <TimelineActividad actividades={actividades} mostrarTodo={true} />
            </TabsContent>

            {/* TAB: Documentos */}
            <TabsContent value="documentos" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Documentos Adjuntos</h3>
                    <Button size="sm">
                      <Paperclip className="w-4 h-4 mr-2" />
                      Cargar Documento
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {DOCUMENTOS_MOCK.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{doc.nombre}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{doc.tipo}</span>
                              <span>{doc.tamano}</span>
                              <span>{doc.fechaCarga.toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Avatar className="w-6 h-6" style={{ backgroundColor: doc.usuario.color }}>
                              <AvatarFallback className="text-white text-xs">
                                {doc.usuario.iniciales}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-600">{doc.usuario.nombre}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer con Acciones */}
        <div className="flex-shrink-0 border-t pt-4 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <div className="flex items-center gap-2">
            {caso.estado === 'pendiente_aprobacion' && onAccion && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onAccion(caso, 'rechazar')}
                >
                  Rechazar
                </Button>
                <Button
                  onClick={() => onAccion(caso, 'aprobar')}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aprobar
                </Button>
              </>
            )}
            {caso.estado === 'asignado' && onAccion && (
              <Button onClick={() => onAccion(caso, 'completar')}>
                Iniciar Trabajo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
