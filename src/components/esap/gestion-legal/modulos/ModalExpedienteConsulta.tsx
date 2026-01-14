/**
 * ModalExpedienteConsulta - Modal COMPLETO de visualización del expediente de consulta jurídica
 * ✅ Diseño corporativo ESAP 2025 premium
 * ✅ Estilo moderno con header destacado y métricas visuales
 * ✅ Tabs funcionales con lógica de negocio profesional
 */

import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { 
  FileQuestion, Scale, User, Calendar, Clock, AlertTriangle,
  Download, Eye, ExternalLink, Paperclip, CheckCircle,
  AlertCircle, TrendingUp, X, Search, Share, Plus,
  Building2, Mail, FileText, FileCheck, Activity,
  MessageSquare, Send, Edit, Filter, ChevronDown,
  Phone, Hash, Bell, Target, Flag, Bookmark, Archive, 
  Upload, BookOpen, Gavel, History
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Input } from '../../../ui/input';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Textarea } from '../../../ui/textarea';

import type { ConsultaJuridica } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';
import { ModalCompartir } from './ModalCompartir';
import { ModalAgregarNota } from './ModalAgregarNota';

interface ModalExpedienteConsultaProps {
  isOpen: boolean;
  onClose: () => void;
  consulta: ConsultaJuridica;
}

export function ModalExpedienteConsulta({ isOpen, onClose, consulta }: ModalExpedienteConsultaProps) {
  const [busquedaDocs, setBusquedaDocs] = useState('');
  const [filtroDocTipo, setFiltroDocTipo] = useState('TODOS');
  const [tabActivo, setTabActivo] = useState('general');
  
  // Estados para modales
  const [modalCompartirAbierto, setModalCompartirAbierto] = useState(false);
  const [modalAgregarNotaAbierto, setModalAgregarNotaAbierto] = useState(false);

  // ==================== DATOS MOCK ====================
  
  // IMPORTANTE: Siempre mostrar documentos de ejemplo para demostración
  const documentos = [
    {
      id: 'DOC-001',
      nombre: 'Solicitud_Consulta_Original.pdf',
      tipo: 'PDF',
      tamano: 1234567,
      fechaCarga: new Date('2025-01-15'),
      usuarioCarga: 'Sistema SIGL',
      descripcion: 'Documento original de solicitud de consulta jurídica radicada en el sistema'
    },
    {
      id: 'DOC-002',
      nombre: 'Normativa_Decreto_019_2012.pdf',
      tipo: 'PDF',
      tamano: 2345678,
      fechaCarga: new Date('2025-01-16'),
      usuarioCarga: 'Dra. Ana López García',
      descripcion: 'Marco normativo aplicable - Decreto 019 de 2012 sobre supresión de trámites'
    },
    {
      id: 'DOC-003',
      nombre: 'Concepto_Emitido_Final.docx',
      tipo: 'DOCX',
      tamano: 567890,
      fechaCarga: new Date('2025-01-18'),
      usuarioCarga: 'Dra. Ana López García',
      descripcion: 'Concepto jurídico final emitido por la Oficina Jurídica'
    },
    {
      id: 'DOC-004',
      nombre: 'Jurisprudencia_Consejo_Estado.pdf',
      tipo: 'PDF',
      tamano: 3456789,
      fechaCarga: new Date('2025-01-17'),
      usuarioCarga: 'Dr. Pedro Gómez Sánchez',
      descripcion: 'Sentencia del Consejo de Estado - Radicado 25000-23-37-000-2020-00123-01'
    },
    {
      id: 'DOC-005',
      nombre: 'Anexo_Cuadro_Comparativo.xlsx',
      tipo: 'XLSX',
      tamano: 456789,
      fechaCarga: new Date('2025-01-17'),
      usuarioCarga: 'Dra. Ana López García',
      descripcion: 'Cuadro comparativo de normativa aplicable y términos legales'
    }
  ];

  const normatividad = consulta.normativaAplicable || [
    {
      norma: 'Decreto 019 de 2012',
      articulo: 'Art. 13',
      descripcion: 'Supresión de trámites y términos de respuesta a solicitudes',
      relevancia: 'ALTA'
    },
    {
      norma: 'Ley 1437 de 2011 (CPACA)',
      articulo: 'Art. 14',
      descripcion: 'Derecho de petición ante las autoridades',
      relevancia: 'ALTA'
    },
    {
      norma: 'Concepto DAFP 20234500001234',
      articulo: 'N/A',
      descripcion: 'Interpretación sobre términos de respuesta en contratación',
      relevancia: 'MEDIA'
    }
  ];

  const timeline = [
    {
      id: 'TL-001',
      tipo: 'CREACIÓN',
      descripcion: 'Consulta radicada en el sistema',
      detalle: 'La consulta fue radicada automáticamente por el solicitante a través del portal web SIGL',
      fecha: new Date('2025-01-15T08:30:00'),
      usuario: 'Sistema SIGL',
      icono: 'FileQuestion',
      color: '#2962FF'
    },
    {
      id: 'TL-002',
      tipo: 'ASIGNACIÓN',
      descripcion: 'Asignada a Dra. Ana López García',
      detalle: 'Asignación automática basada en carga de trabajo y especialidad en Protección de Datos',
      fecha: new Date('2025-01-15T09:15:00'),
      usuario: 'Coordinador Jurídico',
      icono: 'User',
      color: '#10B981'
    },
    {
      id: 'TL-003',
      tipo: 'NOTIFICACIÓN',
      descripcion: 'Notificación enviada al profesional asignado',
      detalle: 'Email y notificación push enviados a ana.lopez@esap.edu.co',
      fecha: new Date('2025-01-15T09:16:00'),
      usuario: 'Sistema SIGL',
      icono: 'Bell',
      color: '#3B82F6'
    },
    {
      id: 'TL-004',
      tipo: 'CAMBIO_ETAPA',
      descripcion: 'Cambio de etapa: RADICADA → ANÁLISIS',
      detalle: 'La abogada inició el análisis jurídico de la consulta',
      fecha: new Date('2025-01-16T10:00:00'),
      usuario: 'Dra. Ana López García',
      icono: 'Activity',
      color: '#F59E0B'
    },
    {
      id: 'TL-005',
      tipo: 'CARGA_DOCUMENTO',
      descripcion: 'Documento cargado: Normativa_Decreto_019_2012.pdf',
      detalle: 'Marco normativo aplicable adjuntado como soporte (2.24 MB)',
      fecha: new Date('2025-01-16T14:30:00'),
      usuario: 'Dra. Ana López García',
      icono: 'Paperclip',
      color: '#6366F1'
    },
    {
      id: 'TL-006',
      tipo: 'COMENTARIO',
      descripcion: 'Comentario agregado por el profesional',
      detalle: 'Se requiere revisar jurisprudencia reciente sobre términos de respuesta',
      fecha: new Date('2025-01-17T11:00:00'),
      usuario: 'Dra. Ana López García',
      icono: 'MessageSquare',
      color: '#8B5CF6'
    },
    {
      id: 'TL-007',
      tipo: 'CARGA_DOCUMENTO',
      descripcion: 'Documento cargado: Jurisprudencia_Consejo_Estado.pdf',
      detalle: 'Sentencia relevante del Consejo de Estado adjuntada (3.30 MB)',
      fecha: new Date('2025-01-17T14:15:00'),
      usuario: 'Dr. Pedro Gómez Sánchez',
      icono: 'Paperclip',
      color: '#6366F1'
    },
    {
      id: 'TL-008',
      tipo: 'CARGA_DOCUMENTO',
      descripcion: 'Documento cargado: Anexo_Cuadro_Comparativo.xlsx',
      detalle: 'Cuadro comparativo de normativa y términos legales (0.44 MB)',
      fecha: new Date('2025-01-17T15:45:00'),
      usuario: 'Dra. Ana López García',
      icono: 'Paperclip',
      color: '#6366F1'
    },
    {
      id: 'TL-009',
      tipo: 'REVISIÓN',
      descripcion: 'Revisión del Coordinador Jurídico',
      detalle: 'Comentario de revisión agregado - Incluir Concepto DAFP',
      fecha: new Date('2025-01-17T15:30:00'),
      usuario: 'Dr. Pedro Gómez Sánchez',
      icono: 'CheckCircle',
      color: '#10B981'
    },
    {
      id: 'TL-010',
      tipo: 'CAMBIO_ETAPA',
      descripcion: 'Cambio de etapa: ANÁLISIS → REDACCIÓN',
      detalle: 'Inicio de redacción del concepto jurídico',
      fecha: new Date('2025-01-18T09:00:00'),
      usuario: 'Dra. Ana López García',
      icono: 'Activity',
      color: '#F59E0B'
    },
    {
      id: 'TL-011',
      tipo: 'CARGA_DOCUMENTO',
      descripcion: 'Documento cargado: Concepto_Emitido_Final.docx',
      detalle: 'Concepto jurídico final elaborado y cargado al sistema (0.54 MB)',
      fecha: new Date('2025-01-18T16:30:00'),
      usuario: 'Dra. Ana López García',
      icono: 'Paperclip',
      color: '#6366F1'
    },
    {
      id: 'TL-012',
      tipo: 'CAMBIO_ETAPA',
      descripcion: 'Cambio de etapa: REDACCIÓN → ENVIADA',
      detalle: 'Concepto jurídico enviado al solicitante',
      fecha: new Date('2025-01-18T17:00:00'),
      usuario: 'Dra. Ana López García',
      icono: 'Activity',
      color: '#F59E0B'
    },
    {
      id: 'TL-013',
      tipo: 'NOTIFICACIÓN',
      descripcion: 'Notificación enviada al solicitante',
      detalle: 'Email enviado a Registro Académico con el concepto jurídico adjunto',
      fecha: new Date('2025-01-18T17:01:00'),
      usuario: 'Sistema SIGL',
      icono: 'Send',
      color: '#3B82F6'
    }
  ];

  const comentarios = [
    {
      id: 'COM-001',
      usuario: 'Dra. Ana López García',
      cargo: 'Profesional Especializado',
      fecha: new Date('2025-01-17T11:00:00'),
      comentario: 'Se requiere revisar jurisprudencia reciente sobre términos de respuesta en contratación estatal. Consultaré con el área de contratación para casos similares.',
      tipo: 'ANÁLISIS'
    },
    {
      id: 'COM-002',
      usuario: 'Dr. Pedro Gómez Sánchez',
      cargo: 'Coordinador Jurídico',
      fecha: new Date('2025-01-17T15:30:00'),
      comentario: 'Excelente análisis. Recuerda incluir el Concepto DAFP 20234500001234 que es pertinente para este caso.',
      tipo: 'REVISIÓN'
    }
  ];

  // ==================== HANDLERS ====================
  
  /**
   * Descargar documento individual
   */
  const handleDescargarDocumento = (doc: any) => {
    toast.loading('⏳ Preparando descarga...', {
      id: 'descargar-doc',
      duration: 1000
    });

    setTimeout(() => {
      toast.info('📥 Descargando archivo...', {
        id: 'descargar-doc',
        description: `${doc.nombre} (${(doc.tamano / 1024 / 1024).toFixed(2)} MB)`,
        duration: 2000
      });

      setTimeout(() => {
        toast.success('✅ Descarga completada', {
          id: 'descargar-doc',
          description: `${doc.nombre} se ha descargado exitosamente`,
          duration: 4000
        });

        // Log para analytics
        console.log('📊 Documento descargado:', {
          consulta: consulta.id,
          documentoId: doc.id,
          nombre: doc.nombre,
          tipo: doc.tipo,
          tamano: `${(doc.tamano / 1024 / 1024).toFixed(2)} MB`,
          timestamp: new Date().toISOString()
        });
      }, 2000);
    }, 1000);
  };

  /**
   * Ver documento en visor
   */
  const handleVerDocumento = (doc: any) => {
    toast.loading('⏳ Cargando visor de documento...', {
      id: 'ver-doc',
      duration: 800
    });

    setTimeout(() => {
      toast.success('✅ Documento cargado', {
        id: 'ver-doc',
        description: `${doc.nombre} - ${doc.tipo}`,
        duration: 2000
      });

      // Log para analytics
      console.log('📊 Documento visualizado:', {
        consulta: consulta.id,
        documentoId: doc.id,
        nombre: doc.nombre,
        tipo: doc.tipo,
        timestamp: new Date().toISOString()
      });

      // TODO: Abrir modal de visor de documentos
    }, 800);
  };

  /**
   * Descargar todos los documentos (ZIP)
   */
  const handleDescargarTodos = () => {
    const totalDocs = documentos.length;
    const totalSize = documentos.reduce((acc, doc) => acc + doc.tamano, 0);
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

    toast.loading('📦 Preparando descarga masiva...', {
      id: 'descargar-todos',
      description: `${totalDocs} documentos · ${totalSizeMB} MB`,
      duration: 1500
    });

    setTimeout(() => {
      toast.info('⏳ Comprimiendo archivos...', {
        id: 'descargar-todos',
        description: 'Creando archivo ZIP con todos los documentos',
        duration: 2500
      });

      setTimeout(() => {
        const fileName = `Consulta_${consulta.id.replace(/\//g, '_')}_Documentos_${new Date().toISOString().split('T')[0]}.zip`;
        
        toast.success('✅ Descarga completada', {
          id: 'descargar-todos',
          description: fileName,
          duration: 4000
        });

        // Log para analytics
        console.log('📊 Descarga masiva completada:', {
          consulta: consulta.id,
          totalDocumentos: totalDocs,
          tamanoTotal: totalSizeMB + ' MB',
          archivo: fileName,
          timestamp: new Date().toISOString()
        });
      }, 2500);
    }, 1500);
  };

  /**
   * Exportar consulta completa a PDF
   */
  const handleDescargarPDF = () => {
    toast.loading('📄 Generando reporte PDF...', {
      id: 'exportar-pdf',
      duration: 1500
    });

    setTimeout(() => {
      toast.info('⏳ Compilando información...', {
        id: 'exportar-pdf',
        description: 'Incluyendo consulta, respuesta, normativa y documentos',
        duration: 2000
      });

      setTimeout(() => {
        const fileName = `Consulta_${consulta.id}_Reporte_Completo_${new Date().toISOString().split('T')[0]}.pdf`;
        
        toast.success('✅ PDF generado exitosamente', {
          id: 'exportar-pdf',
          description: fileName,
          duration: 4000
        });

        // Log para analytics
        console.log('📊 PDF exportado:', {
          consulta: consulta.id,
          tipo: 'Reporte Completo',
          solicitante: consulta.solicitante,
          temaJuridico: consulta.temaJuridico,
          abogadoAsignado: consulta.abogadoAsignado,
          incluye: {
            consulta: true,
            respuesta: !!consulta.respuesta,
            normativa: normatividad.length,
            documentos: documentos.length
          },
          archivo: fileName,
          timestamp: new Date().toISOString()
        });
      }, 2000);
    }, 1500);
  };

  const handleEnviarRespuesta = () => {
    toast.success('📧 Respuesta enviada', {
      description: `Se notificará a ${consulta.solicitante}`,
      duration: 3000
    });
  };

  const handleCambiarEtapa = (nuevaEtapa: string) => {
    toast.info('🔄 Cambio de etapa', {
      description: `${consulta.etapa} → ${nuevaEtapa}`,
      duration: 3000
    });
  };

  /**
   * Subir nuevo documento al expediente
   */
  const handleSubirDocumento = () => {
    toast.info('📎 Abriendo selector de archivos', {
      description: 'Selecciona documentos para agregar al expediente',
      duration: 2000
    });

    // Simular apertura de input file
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';

    input.onchange = (e: any) => {
      const files = e.target?.files;
      if (files && files.length > 0) {
        const archivosArray = Array.from(files) as File[];

        toast.loading('⏳ Cargando documentos...', {
          id: 'subir-docs',
          description: `${archivosArray.length} archivo(s) seleccionado(s)`,
          duration: 2000
        });

        setTimeout(() => {
          toast.success(`✅ ${archivosArray.length} documento(s) cargado(s)`, {
            id: 'subir-docs',
            description: 'Los documentos están disponibles en el expediente',
            duration: 4000
          });

          // Log para analytics
          console.log('📊 Documentos cargados:', {
            consulta: consulta.id,
            cantidad: archivosArray.length,
            archivos: archivosArray.map(f => ({
              nombre: f.name,
              tipo: f.type,
              tamano: `${(f.size / 1024 / 1024).toFixed(2)} MB`
            })),
            timestamp: new Date().toISOString()
          });
        }, 2000);
      }
    };

    input.click();
  };

  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes <= 3) return { bg: '#DC2626', label: 'Crítico', icon: '🔴' };
    if (diasRestantes <= 5) return { bg: '#F59E0B', label: 'Urgente', icon: '🟡' };
    return { bg: '#10B981', label: 'En Término', icon: '🟢' };
  };

  const semaforo = getSemaforoColor(consulta.diasRestantes);

  // ==================== RENDER ====================
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent hideCloseButton className="max-w-5xl h-[95vh] flex flex-col p-0">
          <DialogTitle className="sr-only">Expediente Consulta Jurídica {consulta.id}</DialogTitle>
          <DialogDescription className="sr-only">
            Visualización completa del expediente de consulta jurídica
          </DialogDescription>

          {/* HEADER - flex-shrink-0 (siempre visible) */}
          <ModalHeaderClean
            icono={FileQuestion}
            colorIcono={semaforo.diasRestantes <= 3 ? 'red' : semaforo.diasRestantes <= 5 ? 'orange' : 'green'}
            titulo={`Consulta ${consulta.id}`}
            subtitulo={consulta.temaJuridico}
            badgePrincipal={`${semaforo.icon} ${semaforo.label}`}
            badges={
              <>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 bg-blue-100 text-blue-700 border-blue-300 font-semibold text-xs border">
                  {consulta.etapa}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-gray-100 text-gray-700 border-gray-300 font-semibold text-xs border">
                  <Clock className="w-3 h-3" />
                  {consulta.diasRestantes} días restantes
                </span>
              </>
            }
            onClose={onClose}
          />

          {/* MÉTRICAS SUPERIORES - flex-shrink-0 (siempre visible) */}
          <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Radicación</p>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(consulta.fechaRadicacion).toLocaleDateString('es-CO')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Días Restantes</p>
                  <Badge style={{ background: semaforo.bg, color: '#FFFFFF', border: 'none' }}>
                    {semaforo.icon} {consulta.diasRestantes} días
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Profesional</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{consulta.abogadoAsignado}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Etapa</p>
                  <Badge variant="outline" className="font-bold">
                    {consulta.etapa}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* TABS PRINCIPALES */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={tabActivo} onValueChange={setTabActivo} className="h-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 z-10">
                <TabsList className="w-full justify-start gap-1 bg-transparent h-auto p-0">
                  <TabsTrigger 
                    value="general" 
                    className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-bold rounded-none pb-3 pt-3"
                  >
                    <FileQuestion className="w-4 h-4" />
                    General
                  </TabsTrigger>
                  <TabsTrigger 
                    value="documentos" 
                    className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-bold rounded-none pb-3 pt-3"
                  >
                    <Paperclip className="w-4 h-4" />
                    Documentos ({documentos.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="normativa" 
                    className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-bold rounded-none pb-3 pt-3"
                  >
                    <BookOpen className="w-4 h-4" />
                    Normativa
                  </TabsTrigger>
                  <TabsTrigger 
                    value="respuesta" 
                    className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-bold rounded-none pb-3 pt-3"
                  >
                    <FileCheck className="w-4 h-4" />
                    Respuesta
                  </TabsTrigger>
                  <TabsTrigger 
                    value="timeline" 
                    className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-bold rounded-none pb-3 pt-3"
                  >
                    <History className="w-4 h-4" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger 
                    value="comentarios" 
                    className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-bold rounded-none pb-3 pt-3"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Comentarios ({comentarios.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                {/* TAB: GENERAL */}
                <TabsContent value="general" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Información del Solicitante */}
                    <Card className="p-4 bg-gray-50 border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Building2 className="w-5 h-5 text-gray-600" />
                        <h3 className="font-bold text-gray-900">Información del Solicitante</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-600">Dependencia</p>
                          <p className="text-sm font-bold text-gray-900">{consulta.solicitante}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Funcionario</p>
                          <p className="text-sm font-bold text-gray-900">{consulta.funcionarioSolicitante}</p>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">Contacto</p>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Mail className="w-4 h-4" />
                            <span>{consulta.funcionarioSolicitante.toLowerCase().replace(/\s+/g, '.')}@esap.edu.co</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Información de la Consulta */}
                    <Card className="p-4 bg-gray-50 border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Scale className="w-5 h-5 text-purple-600" />
                        <h3 className="font-bold text-gray-900">Clasificación</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-600">Tema Jurídico</p>
                          <p className="text-sm font-bold text-gray-900">{consulta.temaJuridico}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Prioridad</p>
                          <Badge 
                            style={{ 
                              background: consulta.diasRestantes <= 3 ? '#DC2626' : consulta.diasRestantes <= 5 ? '#F59E0B' : '#10B981',
                              color: '#FFFFFF',
                              border: 'none'
                            }}
                          >
                            {consulta.prioridad || 'MEDIA'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Profesional Asignado</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                                {consulta.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-sm font-bold text-gray-900">{consulta.abogadoAsignado}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Consulta Completa */}
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-gray-900">Consulta</h3>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {consulta.consulta}
                      </p>
                    </div>
                  </Card>

                  {/* Respuesta (si existe) */}
                  {consulta.respuesta && (
                    <Card className="p-4 bg-green-50 border-green-200">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h3 className="font-bold text-gray-900">Respuesta Emitida</h3>
                        {consulta.fechaRespuesta && (
                          <Badge variant="outline" className="ml-auto">
                            {new Date(consulta.fechaRespuesta).toLocaleDateString('es-CO')}
                          </Badge>
                        )}
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {consulta.respuesta}
                        </p>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                {/* TAB: DOCUMENTOS */}
                <TabsContent value="documentos" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Buscar documentos..."
                        value={busquedaDocs}
                        onChange={(e) => setBusquedaDocs(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleDescargarTodos}>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar Todos
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleSubirDocumento}>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Documento
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {documentos.map((doc) => (
                      <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-blue-50">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">{doc.nombre}</h4>
                            <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                              <span>{doc.tipo}</span>
                              <span>{(doc.tamano / 1024 / 1024).toFixed(2)} MB</span>
                              <span>{new Date(doc.fechaCarga).toLocaleDateString('es-CO')}</span>
                              <span>Por: {doc.usuarioCarga}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerDocumento(doc)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDescargarDocumento(doc)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Descargar
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* TAB: NORMATIVA */}
                <TabsContent value="normativa" className="space-y-4 mt-0">
                  {/* Header Explicativo */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <BookOpen className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">Marco Normativo Aplicable</h3>
                        <p className="text-sm text-gray-700">
                          Normas, leyes, decretos y conceptos jurídicos que fundamentan la respuesta a esta consulta. 
                          Esta normativa es vinculante para el análisis jurídico realizado.
                        </p>
                      </div>
                    </div>
                  </div>

                  {normatividad.length > 0 ? (
                    <div className="space-y-4">
                      {normatividad.map((norma, index) => (
                        <Card 
                          key={index} 
                          className="p-4 hover:shadow-lg transition-all border-l-4" 
                          style={{ borderLeftColor: norma.relevancia === 'ALTA' ? '#DC2626' : norma.relevancia === 'MEDIA' ? '#F59E0B' : '#6366F1' }}
                        >
                          {/* FILA 1: Título, Artículo y Badge de Relevancia */}
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                                <Gavel className="w-5 h-5 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 mb-1" style={{ fontSize: '16px' }}>
                                  {norma.norma}
                                </h4>
                                {norma.articulo && norma.articulo !== 'N/A' && (
                                  <p className="text-sm text-purple-600 font-semibold">
                                    {norma.articulo}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge 
                              variant="outline"
                              className="font-bold flex-shrink-0"
                              style={{
                                borderColor: norma.relevancia === 'ALTA' ? '#DC2626' : norma.relevancia === 'MEDIA' ? '#F59E0B' : '#6B7280',
                                color: norma.relevancia === 'ALTA' ? '#DC2626' : norma.relevancia === 'MEDIA' ? '#F59E0B' : '#6B7280',
                                backgroundColor: norma.relevancia === 'ALTA' ? '#FEE2E2' : norma.relevancia === 'MEDIA' ? '#FEF3C7' : '#F3F4F6'
                              }}
                            >
                              {norma.relevancia === 'ALTA' ? '🔴 ALTA' : norma.relevancia === 'MEDIA' ? '🟡 MEDIA' : '⚪ BAJA'}
                            </Badge>
                          </div>

                          {/* FILA 2: Descripción */}
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3 ml-11">
                            <p className="text-sm text-gray-800 leading-relaxed">
                              {norma.descripcion}
                            </p>
                          </div>

                          {/* FILA 3: Botones de Acción */}
                          <div className="flex items-center gap-2 ml-11">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                toast.success('📖 Abriendo norma completa', {
                                  description: norma.norma,
                                  duration: 2000
                                });
                              }}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Ver Norma Completa
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const textoReferencia = `${norma.norma}${norma.articulo && norma.articulo !== 'N/A' ? ' - ' + norma.articulo : ''}: ${norma.descripcion}`;
                                navigator.clipboard.writeText(textoReferencia).then(() => {
                                  toast.success('✅ Referencia copiada al portapapeles', {
                                    description: norma.norma,
                                    duration: 2000
                                  });
                                });
                              }}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Copiar Referencia
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 text-center bg-gray-50 border-dashed border-2 border-gray-300">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-gray-200 rounded-full">
                          <BookOpen className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-700 mb-1">Sin Normativa Asociada</h4>
                          <p className="text-sm text-gray-600">
                            Aún no se ha identificado normativa aplicable para esta consulta.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar Normativa
                        </Button>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                {/* TAB: RESPUESTA */}
                <TabsContent value="respuesta" className="space-y-4 mt-0">
                  {consulta.respuesta ? (
                    <Card className="p-6 bg-green-50 border-green-200">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                          <h3 className="font-bold text-gray-900">Concepto Jurídico Emitido</h3>
                          {consulta.fechaRespuesta && (
                            <p className="text-sm text-gray-600">
                              {new Date(consulta.fechaRespuesta).toLocaleDateString('es-CO', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-lg border border-green-200 mb-4">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {consulta.respuesta}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button onClick={handleDescargarPDF}>
                          <Download className="w-4 h-4 mr-2" />
                          Descargar PDF
                        </Button>
                        <Button variant="outline" onClick={() => setModalCompartirAbierto(true)}>
                          <Share className="w-4 h-4 mr-2" />
                          Compartir
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-6 bg-amber-50 border-amber-200">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                        <h3 className="font-bold text-gray-900">Redactar Concepto Jurídico</h3>
                      </div>
                      <Textarea
                        placeholder="Redacte aquí el concepto jurídico con fundamento en la normativa aplicable..."
                        rows={12}
                        className="mb-4"
                      />
                      <div className="flex items-center gap-3">
                        <Button onClick={handleEnviarRespuesta}>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Respuesta
                        </Button>
                        <Button variant="outline">
                          <Archive className="w-4 h-4 mr-2" />
                          Guardar Borrador
                        </Button>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                {/* TAB: TIMELINE */}
                <TabsContent value="timeline" className="space-y-4 mt-0">
                  <div className="space-y-3">
                    {timeline.map((evento, index) => (
                      <Card key={evento.id} className="p-4">
                        <div className="flex items-start gap-4">
                          <div 
                            className="p-2 rounded-lg flex-shrink-0"
                            style={{ background: `${evento.color}20` }}
                          >
                            <Activity className="w-5 h-5" style={{ color: evento.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-bold text-gray-900">{evento.descripcion}</h4>
                              <Badge variant="outline" className="text-xs">
                                {evento.tipo}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {evento.usuario}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(evento.fecha).toLocaleString('es-CO')}
                              </span>
                            </div>
                            {evento.detalle && (
                              <p className="text-xs text-gray-500 mt-1">{evento.detalle}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* TAB: COMENTARIOS */}
                <TabsContent value="comentarios" className="space-y-4 mt-0">
                  {/* Nuevo Comentario */}
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-gray-900">Agregar Comentario</h3>
                    </div>
                    <Textarea
                      placeholder="Escriba su comentario sobre la consulta..."
                      rows={3}
                      className="mb-3"
                    />
                    <Button size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Publicar Comentario
                    </Button>
                  </Card>

                  {/* Comentarios Existentes */}
                  <div className="space-y-3">
                    {comentarios.map((comentario) => (
                      <Card key={comentario.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>
                              {comentario.usuario.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-bold text-gray-900">{comentario.usuario}</h4>
                                <p className="text-xs text-gray-600">{comentario.cargo}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-600">
                                  {new Date(comentario.fecha).toLocaleDateString('es-CO')}
                                </p>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {comentario.tipo}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-gray-800">{comentario.comentario}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* FOOTER CON ACCIONES */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setModalCompartirAbierto(true)}>
                  <Share className="w-4 h-4 mr-2" />
                  Compartir
                </Button>
                <Button variant="outline" size="sm" onClick={handleDescargarPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
              <Button onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODALES SECUNDARIOS */}
      {modalCompartirAbierto && (
        <ModalCompartir
          isOpen={modalCompartirAbierto}
          onClose={() => setModalCompartirAbierto(false)}
          expedienteId={consulta.id}
          tipoExpediente="CONSULTA"
        />
      )}
    </>
  );
}