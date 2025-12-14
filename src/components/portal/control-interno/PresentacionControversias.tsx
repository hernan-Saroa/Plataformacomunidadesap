/**
 * MÓDULO: PRESENTACIÓN DE CONTROVERSIAS - PORTAL TRANSACCIONAL
 * 
 * Permite a las áreas auditadas presentar argumentos y evidencias para refutar
 * o controvertir hallazgos identificados durante una auditoría.
 * 
 * PROCESO DE CONTROVERSIA:
 * 1. Área auditada tiene 5 días calendario para presentar controversia
 * 2. Debe presentar argumentos técnicos con evidencias de soporte
 * 3. Auditor líder analiza argumentos (máximo 5 días)
 * 4. Auditor puede: RATIFICAR hallazgo o MODIFICAR/ELIMINAR hallazgo
 * 5. Área auditada recibe respuesta fundamentada
 * 
 * ESTADOS DE CONTROVERSIA:
 * - Pendiente: Hallazgo notificado, área puede controvertir
 * - En Análisis: Controversia presentada, auditor revisando
 * - Resuelta - Ratificado: Auditor mantiene el hallazgo
 * - Resuelta - Modificado: Auditor modificó el hallazgo
 * - Resuelta - Eliminado: Auditor eliminó el hallazgo
 * - Expirada: Plazo vencido sin controversia
 * 
 * USUARIOS: Personal de áreas auditadas
 * ROL: Área Auditada
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Send,
  Eye,
  FileText,
  File,
  Image as ImageIcon,
  Download,
  Trash2,
  Save,
  ChevronRight,
  Info,
  Calendar,
  User,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../ui/tabs';

// Tipos
interface ArchivoEvidencia {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  url: string;
  fechaCarga: string;
}

interface Controversia {
  id: string;
  hallazgoId: string;
  argumentos: string;
  justificacionTecnica: string;
  normativaAplicable: string;
  evidencias: ArchivoEvidencia[];
  fechaPresentacion: string;
  estado: 'pendiente' | 'en-analisis' | 'ratificado' | 'modificado' | 'eliminado';
  respuestaAuditor?: string;
  fechaRespuesta?: string;
  auditorResponsable?: string;
}

interface Hallazgo {
  id: string;
  numero: string;
  auditoria: string;
  codigoAuditoria: string;
  tipo: 'no-conformidad' | 'observacion' | 'oportunidad-mejora';
  gravedad: 'critico' | 'mayor' | 'menor';
  descripcion: string;
  criterioIncumplido: string;
  normativaRelacionada: string;
  evidenciasAuditor: string[];
  fechaNotificacion: string;
  diasRestantes: number;
  puedeControvertir: boolean;
  tieneControversia: boolean;
  controversia?: Controversia;
}

export function PresentacionControversias() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('disponibles');
  const [hallazgoSeleccionado, setHallazgoSeleccionado] = useState<Hallazgo | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Usuario actual
  const usuarioActual = {
    nombre: 'María Fernanda Rodríguez López',
    area: 'Gestión Contractual',
    cargo: 'Coordinadora de Contratación',
    email: 'maria.rodriguez@esap.edu.co'
  };

  // Formulario de controversia
  const [formulario, setFormulario] = useState({
    argumentos: '',
    justificacionTecnica: '',
    normativaAplicable: '',
    evidencias: [] as ArchivoEvidencia[]
  });

  // Mock data - Hallazgos
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([
    {
      id: 'HALL-001',
      numero: 'H-2024-032-01',
      auditoria: 'Auditoría Gestión Contractual 2024',
      codigoAuditoria: 'AUD-2024-032',
      tipo: 'no-conformidad',
      gravedad: 'critico',
      descripcion: 'No se encontró evidencia de actas del comité de contratación para 5 contratos superiores a 100 SMMLV durante el período auditado (enero-junio 2024), incumpliendo lo establecido en el Estatuto de Contratación institucional artículo 12.',
      criterioIncumplido: 'Estatuto de Contratación ESAP - Artículo 12: Comité de Contratación',
      normativaRelacionada: 'Ley 1150 de 2007, Decreto 1082 de 2015, Manual de Contratación ESAP v3.0',
      evidenciasAuditor: [
        'Revisión de expedientes contractuales enero-junio 2024',
        'Matriz de contratos superiores a 100 SMMLV',
        'Listado de actas del comité (solo 3 de 8 contratos)'
      ],
      fechaNotificacion: '2024-11-20',
      diasRestantes: 3,
      puedeControvertir: true,
      tieneControversia: false
    },
    {
      id: 'HALL-002',
      numero: 'H-2024-032-02',
      auditoria: 'Auditoría Gestión Contractual 2024',
      codigoAuditoria: 'AUD-2024-032',
      tipo: 'observacion',
      gravedad: 'mayor',
      descripcion: 'Los expedientes contractuales no cuentan con el orden establecido en la Guía de Gestión Documental v3.0, específicamente falta numeración de folios y separadores por etapa contractual.',
      criterioIncumplido: 'Guía de Gestión Documental ESAP v3.0 - Sección 4.2',
      normativaRelacionada: 'Ley 594 de 2000 (Ley de Archivo), Acuerdo 060 de 2001 AGN',
      evidenciasAuditor: [
        'Muestra de 15 expedientes revisados',
        'Checklist de cumplimiento de gestión documental',
        'Fotografías de expedientes'
      ],
      fechaNotificacion: '2024-11-20',
      diasRestantes: 3,
      puedeControvertir: true,
      tieneControversia: false
    },
    {
      id: 'HALL-003',
      numero: 'H-2024-032-03',
      auditoria: 'Auditoría Gestión Contractual 2024',
      codigoAuditoria: 'AUD-2024-032',
      tipo: 'observacion',
      gravedad: 'mayor',
      descripcion: 'No se evidencia seguimiento sistemático al cumplimiento de obligaciones contractuales en contratos de prestación de servicios, generando riesgo de incumplimiento.',
      criterioIncumplido: 'Procedimiento PR-CTL-005 Supervisión Contractual',
      normativaRelacionada: 'Ley 1474 de 2011 artículo 83, Manual de Supervisión ESAP',
      evidenciasAuditor: [
        'Revisión de informes de supervisión',
        'Entrevistas a supervisores',
        'Matriz de obligaciones contractuales'
      ],
      fechaNotificacion: '2024-11-15',
      diasRestantes: -2,
      puedeControvertir: false,
      tieneControversia: false
    },
    {
      id: 'HALL-004',
      numero: 'H-2024-025-01',
      auditoria: 'Auditoría Gestión Administrativa 2024',
      codigoAuditoria: 'AUD-2024-025',
      tipo: 'no-conformidad',
      gravedad: 'menor',
      descripcion: 'Se identificaron inconsistencias en el inventario de bienes devolutivos con diferencias entre el registro físico y el sistema de información.',
      criterioIncumplido: 'Procedimiento PR-ADM-008 Control de Bienes',
      normativaRelacionada: 'Régimen de Contabilidad Pública, Manual de Bienes ESAP',
      evidenciasAuditor: [
        'Acta de inventario físico septiembre 2024',
        'Reporte del sistema de información',
        'Fotografías de placas no registradas'
      ],
      fechaNotificacion: '2024-11-10',
      diasRestantes: -7,
      puedeControvertir: false,
      tieneControversia: true,
      controversia: {
        id: 'CONT-001',
        hallazgoId: 'HALL-004',
        argumentos: 'Los bienes identificados como "no registrados" corresponden a donaciones recibidas en octubre 2024 que aún no habían sido ingresadas al sistema al momento de la auditoría. El proceso de registro estaba en curso y se completó el 15 de noviembre.',
        justificacionTecnica: 'El procedimiento PR-ADM-008 establece un plazo de 30 días para el registro de bienes recibidos por donación. Las donaciones fueron recibidas el 5 de octubre y registradas el 15 de noviembre (41 días), excediendo el plazo en 11 días debido a la alta carga laboral del área.',
        normativaAplicable: 'Procedimiento PR-ADM-008 v2.0 - Sección 3.4: Registro de donaciones',
        evidencias: [
          {
            id: 'EV-C-001',
            nombre: 'Acta_Donacion_Octubre2024.pdf',
            tipo: 'application/pdf',
            tamaño: 450000,
            url: '/evidencias/donacion.pdf',
            fechaCarga: '2024-11-12'
          },
          {
            id: 'EV-C-002',
            nombre: 'Comprobante_Registro_Sistema.pdf',
            tipo: 'application/pdf',
            tamaño: 280000,
            url: '/evidencias/registro.pdf',
            fechaCarga: '2024-11-12'
          }
        ],
        fechaPresentacion: '2024-11-12',
        estado: 'modificado',
        respuestaAuditor: 'Revisados los argumentos y evidencias presentadas, se acepta parcialmente la controversia. Se modifica el hallazgo de "No Conformidad" a "Observación" considerando que los bienes fueron registrados y que el retraso de 11 días es justificado. Se recomienda fortalecer el proceso para cumplir los plazos establecidos.',
        fechaRespuesta: '2024-11-15',
        auditorResponsable: 'Fernando Ávila'
      }
    }
  ]);

  // Abrir formulario de controversia
  const abrirFormulario = (hallazgo: Hallazgo) => {
    setHallazgoSeleccionado(hallazgo);
    setFormulario({
      argumentos: '',
      justificacionTecnica: '',
      normativaAplicable: '',
      evidencias: []
    });
    setIsFormOpen(true);
  };

  // Manejar archivos
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const archivosValidos: File[] = [];
    const tiposPermitidos = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!tiposPermitidos.includes(file.type)) {
        toast.error('Tipo no permitido', { description: `${file.name} - Solo PDF, Word, Excel, JPG, PNG` });
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('Archivo muy grande', { description: `${file.name} - Máximo 10 MB` });
        continue;
      }

      archivosValidos.push(file);
    }

    if (archivosValidos.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < archivosValidos.length; i++) {
      const file = archivosValidos[i];
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const nuevaEvidencia: ArchivoEvidencia = {
        id: `EV-${Date.now()}-${i}`,
        nombre: file.name,
        tipo: file.type,
        tamaño: file.size,
        url: URL.createObjectURL(file),
        fechaCarga: new Date().toISOString().split('T')[0]
      };

      setFormulario(prev => ({
        ...prev,
        evidencias: [...prev.evidencias, nuevaEvidencia]
      }));

      clearInterval(progressInterval);
      setUploadProgress(0);
    }

    setIsUploading(false);
    toast.success('Archivos cargados', { description: `${archivosValidos.length} archivo(s) cargado(s)` });
  };

  // Eliminar evidencia
  const eliminarEvidencia = (evidenciaId: string) => {
    setFormulario(prev => ({
      ...prev,
      evidencias: prev.evidencias.filter(ev => ev.id !== evidenciaId)
    }));
    toast.info('Evidencia eliminada');
  };

  // Drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Enviar controversia
  const enviarControversia = () => {
    if (!hallazgoSeleccionado) return;

    // Validaciones
    if (!formulario.argumentos.trim()) {
      toast.error('Argumentos requeridos', { description: 'Debe presentar argumentos claros' });
      return;
    }
    if (!formulario.justificacionTecnica.trim()) {
      toast.error('Justificación requerida', { description: 'Debe justificar técnicamente su posición' });
      return;
    }
    if (formulario.evidencias.length === 0) {
      toast.error('Evidencias requeridas', { description: 'Debe adjuntar evidencias de soporte' });
      return;
    }

    toast.loading('Enviando controversia...', { id: 'submit' });
    
    setTimeout(() => {
      const nuevaControversia: Controversia = {
        id: `CONT-${Date.now()}`,
        hallazgoId: hallazgoSeleccionado.id,
        argumentos: formulario.argumentos,
        justificacionTecnica: formulario.justificacionTecnica,
        normativaAplicable: formulario.normativaAplicable,
        evidencias: formulario.evidencias,
        fechaPresentacion: new Date().toISOString().split('T')[0],
        estado: 'en-analisis'
      };

      setHallazgos(prev => prev.map(h => 
        h.id === hallazgoSeleccionado.id 
          ? { ...h, tieneControversia: true, controversia: nuevaControversia }
          : h
      ));

      toast.success('¡Controversia enviada!', {
        id: 'submit',
        description: 'El auditor revisará sus argumentos en los próximos 5 días'
      });

      setIsFormOpen(false);
      setIsConfirmOpen(false);
      setHallazgoSeleccionado(null);
      setActiveTab('enviadas');
    }, 2000);
  };

  const getTipoHallazgoBadge = (tipo: string) => {
    const estilos = {
      'no-conformidad': { bg: 'bg-red-100', text: 'text-red-800', label: 'No Conformidad' },
      'observacion': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Observación' },
      'oportunidad-mejora': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Oportunidad' }
    };
    const estilo = estilos[tipo as keyof typeof estilos];
    return <Badge className={`${estilo.bg} ${estilo.text} border-0 px-2 py-1 text-xs`}>{estilo.label}</Badge>;
  };

  const getGravedadBadge = (gravedad: string) => {
    const estilos = {
      'critico': { bg: 'bg-red-100', text: 'text-red-800', label: 'Crítico' },
      'mayor': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Mayor' },
      'menor': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menor' }
    };
    const estilo = estilos[gravedad as keyof typeof estilos];
    return <Badge className={`${estilo.bg} ${estilo.text} border-0 px-2 py-1 text-xs`}>{estilo.label}</Badge>;
  };

  const getEstadoControversiaBadge = (estado: string) => {
    const estilos = {
      'pendiente': { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, label: 'Pendiente' },
      'en-analisis': { bg: 'bg-blue-100', text: 'text-blue-800', icon: AlertCircle, label: 'En Análisis' },
      'ratificado': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Ratificado' },
      'modificado': { bg: 'bg-orange-100', text: 'text-orange-800', icon: Edit3, label: 'Modificado' },
      'eliminado': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Eliminado' }
    };
    const estilo = estilos[estado as keyof typeof estilos];
    const Icon = estilo.icon;
    return (
      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-3 py-1 flex items-center gap-1.5 w-fit`}>
        <Icon className="w-4 h-4" />
        {estilo.label}
      </Badge>
    );
  };

  const getIconoArchivo = (tipo: string) => {
    if (tipo.includes('pdf')) return <FileText className="w-5 h-5 text-red-600" />;
    if (tipo.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-600" />;
    return <File className="w-5 h-5 text-gray-600" />;
  };

  const formatearTamaño = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const hallazgosDisponibles = hallazgos.filter(h => h.puedeControvertir && !h.tieneControversia);
  const hallazgosEnviadas = hallazgos.filter(h => h.tieneControversia);
  const hallazgosVencidos = hallazgos.filter(h => !h.puedeControvertir && !h.tieneControversia);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                  boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
                }}
              >
                <MessageSquare className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Presentación de Controversias
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Refute hallazgos con argumentos técnicos y evidencias
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hallazgosDisponibles.length > 0 && (
              <Badge className="bg-orange-500 text-white border-0 px-3 py-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {hallazgosDisponibles.length} disponible{hallazgosDisponibles.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* Panel informativo */}
      <Card className="p-6 bg-blue-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Proceso de Controversia</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• Tiene <strong>5 días calendario</strong> desde la notificación para presentar controversia</p>
              <p>• Debe presentar <strong>argumentos técnicos fundamentados</strong> con evidencias de soporte</p>
              <p>• El auditor líder analizará sus argumentos en un plazo máximo de <strong>5 días hábiles</strong></p>
              <p>• Puede resultar en: <strong>Ratificación</strong> (se mantiene), <strong>Modificación</strong> (se ajusta) o <strong>Eliminación</strong> (se retira)</p>
              <p>• Recibirá notificación con la decisión fundamentada del auditor</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="disponibles" className="gap-2">
            <Clock className="w-4 h-4" />
            Disponibles
            {hallazgosDisponibles.length > 0 && (
              <Badge className="bg-orange-500 text-white border-0 ml-1 px-1.5 py-0.5 text-xs">
                {hallazgosDisponibles.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="enviadas" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Enviadas
            {hallazgosEnviadas.length > 0 && (
              <Badge variant="outline" className="ml-1 px-1.5 py-0.5 text-xs">
                {hallazgosEnviadas.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vencidos" className="gap-2">
            <XCircle className="w-4 h-4" />
            Vencidos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Disponibles */}
        <TabsContent value="disponibles" className="space-y-4 mt-6">
          {hallazgosDisponibles.length > 0 ? (
            hallazgosDisponibles.map((hallazgo) => (
              <motion.div
                key={hallazgo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">{hallazgo.numero}</Badge>
                        {getTipoHallazgoBadge(hallazgo.tipo)}
                        {getGravedadBadge(hallazgo.gravedad)}
                        {hallazgo.diasRestantes <= 2 && (
                          <Badge className="bg-red-500 text-white border-0 text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {hallazgo.diasRestantes} {hallazgo.diasRestantes === 1 ? 'día' : 'días'}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{hallazgo.auditoria}</h3>
                      <p className="text-sm text-gray-700 mb-3">{hallazgo.descripcion}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-gray-600 font-medium min-w-[140px]">Criterio incumplido:</span>
                          <span className="text-gray-900">{hallazgo.criterioIncumplido}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-gray-600 font-medium min-w-[140px]">Normativa:</span>
                          <span className="text-gray-900">{hallazgo.normativaRelacionada}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-gray-600 font-medium min-w-[140px]">Notificado:</span>
                          <span className="text-gray-900">{new Date(hallazgo.fechaNotificacion).toLocaleDateString('es-CO')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm">
                      {hallazgo.diasRestantes > 0 ? (
                        <p className={`font-medium ${hallazgo.diasRestantes <= 2 ? 'text-red-600' : 'text-gray-600'}`}>
                          <Clock className="w-4 h-4 inline mr-1" />
                          {hallazgo.diasRestantes} {hallazgo.diasRestantes === 1 ? 'día restante' : 'días restantes'} para presentar controversia
                        </p>
                      ) : (
                        <p className="text-red-600 font-medium">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          Plazo vencido
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => abrirFormulario(hallazgo)}
                      className="bg-[#003DA5] hover:bg-[#002873] gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Presentar Controversia
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="p-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay hallazgos disponibles para controvertir
              </h3>
              <p className="text-sm text-gray-600">
                No tiene hallazgos pendientes dentro del plazo de controversia
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Enviadas */}
        <TabsContent value="enviadas" className="space-y-4 mt-6">
          {hallazgosEnviadas.length > 0 ? (
            hallazgosEnviadas.map((hallazgo) => (
              <motion.div
                key={hallazgo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">{hallazgo.numero}</Badge>
                        {getTipoHallazgoBadge(hallazgo.tipo)}
                        {getGravedadBadge(hallazgo.gravedad)}
                        {hallazgo.controversia && getEstadoControversiaBadge(hallazgo.controversia.estado)}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{hallazgo.auditoria}</h3>
                      <p className="text-sm text-gray-700 mb-3">{hallazgo.descripcion}</p>
                    </div>
                  </div>

                  {/* Controversia presentada */}
                  {hallazgo.controversia && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-[#003DA5]" />
                          Sus Argumentos
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="text-gray-600 font-medium mb-1">Argumentos:</p>
                            <p className="text-gray-900">{hallazgo.controversia.argumentos}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium mb-1">Justificación Técnica:</p>
                            <p className="text-gray-900">{hallazgo.controversia.justificacionTecnica}</p>
                          </div>
                          {hallazgo.controversia.normativaAplicable && (
                            <div>
                              <p className="text-gray-600 font-medium mb-1">Normativa Aplicable:</p>
                              <p className="text-gray-900">{hallazgo.controversia.normativaAplicable}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-600 font-medium mb-1">Evidencias Adjuntas:</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {hallazgo.controversia.evidencias.map((ev) => (
                                <Badge key={ev.id} variant="outline" className="text-xs gap-1">
                                  {getIconoArchivo(ev.tipo)}
                                  {ev.nombre}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600 pt-2 border-t">
                            <span>Presentado: {new Date(hallazgo.controversia.fechaPresentacion).toLocaleDateString('es-CO')}</span>
                            <span>•</span>
                            <span>Por: {usuarioActual.nombre}</span>
                          </div>
                        </div>
                      </div>

                      {/* Respuesta del auditor */}
                      {hallazgo.controversia.estado !== 'en-analisis' && hallazgo.controversia.respuestaAuditor && (
                        <div className={`rounded-lg p-4 border-2 ${
                          hallazgo.controversia.estado === 'eliminado' ? 'bg-green-50 border-green-300' :
                          hallazgo.controversia.estado === 'modificado' ? 'bg-orange-50 border-orange-300' :
                          'bg-red-50 border-red-300'
                        }`}>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Respuesta del Auditor
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p className="text-gray-900">{hallazgo.controversia.respuestaAuditor}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-600 pt-2 border-t">
                              <span>Respondido: {new Date(hallazgo.controversia.fechaRespuesta!).toLocaleDateString('es-CO')}</span>
                              <span>•</span>
                              <span>Por: {hallazgo.controversia.auditorResponsable}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {hallazgo.controversia.estado === 'en-analisis' && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-semibold text-blue-900">En análisis por el auditor</p>
                              <p className="text-sm text-blue-800 mt-1">
                                El auditor revisará sus argumentos y emitirá una respuesta en los próximos días
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No ha presentado controversias
              </h3>
              <p className="text-sm text-gray-600">
                Las controversias que presente aparecerán aquí
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Vencidos */}
        <TabsContent value="vencidos" className="space-y-4 mt-6">
          {hallazgosVencidos.length > 0 ? (
            hallazgosVencidos.map((hallazgo) => (
              <motion.div
                key={hallazgo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 border-l-4 border-l-gray-400 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">{hallazgo.numero}</Badge>
                        {getTipoHallazgoBadge(hallazgo.tipo)}
                        {getGravedadBadge(hallazgo.gravedad)}
                        <Badge className="bg-gray-500 text-white border-0 text-xs">
                          Plazo vencido
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{hallazgo.auditoria}</h3>
                      <p className="text-sm text-gray-700 mb-3">{hallazgo.descripcion}</p>
                      <p className="text-xs text-gray-600">
                        Notificado: {new Date(hallazgo.fechaNotificacion).toLocaleDateString('es-CO')} • 
                        Vencido hace {Math.abs(hallazgo.diasRestantes)} días
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="p-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tiene hallazgos vencidos
              </h3>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Formulario de Controversia */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b bg-gray-50">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#003DA5]" />
              Presentar Controversia
            </DialogTitle>
            <DialogDescription>
              {hallazgoSeleccionado?.numero} • {hallazgoSeleccionado?.auditoria}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {hallazgoSeleccionado && (
              <div className="space-y-6">
                {/* Hallazgo */}
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Hallazgo a Controvertir
                  </h4>
                  <p className="text-sm text-gray-900 mb-3">{hallazgoSeleccionado.descripcion}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 font-medium">Criterio incumplido:</p>
                      <p className="text-gray-900">{hallazgoSeleccionado.criterioIncumplido}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium">Normativa relacionada:</p>
                      <p className="text-gray-900">{hallazgoSeleccionado.normativaRelacionada}</p>
                    </div>
                  </div>
                </div>

                {/* Formulario */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="argumentos" className="flex items-center gap-1">
                      Argumentos de Controversia *
                      <Info className="w-3 h-3 text-gray-400" />
                    </Label>
                    <Textarea
                      id="argumentos"
                      value={formulario.argumentos}
                      onChange={(e) => setFormulario({ ...formulario, argumentos: e.target.value })}
                      placeholder="Presente sus argumentos claros y concisos sobre por qué considera que el hallazgo no aplica o debe ser modificado..."
                      className="mt-2 min-h-[120px]"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Sea específico y objetivo en sus argumentos
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="justificacion" className="flex items-center gap-1">
                      Justificación Técnica *
                      <Info className="w-3 h-3 text-gray-400" />
                    </Label>
                    <Textarea
                      id="justificacion"
                      value={formulario.justificacionTecnica}
                      onChange={(e) => setFormulario({ ...formulario, justificacionTecnica: e.target.value })}
                      placeholder="Fundamente técnicamente su posición explicando aspectos procedimentales, temporales o contextuales..."
                      className="mt-2 min-h-[120px]"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Incluya detalles técnicos que respalden su posición
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="normativa">
                      Normativa Aplicable (Opcional)
                    </Label>
                    <Input
                      id="normativa"
                      value={formulario.normativaAplicable}
                      onChange={(e) => setFormulario({ ...formulario, normativaAplicable: e.target.value })}
                      placeholder="Ej: Procedimiento PR-CTL-001 v2.0, Resolución 123 de 2024..."
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Referencias normativas que soporten su argumentación
                    </p>
                  </div>

                  {/* Carga de evidencias */}
                  <div>
                    <Label className="mb-3 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#003DA5]" />
                      Evidencias de Soporte *
                      <Badge variant="outline" className="ml-2 text-xs">
                        {formulario.evidencias.length} archivo(s)
                      </Badge>
                    </Label>

                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                        isDragging ? 'border-[#003DA5] bg-blue-50' : 'border-gray-300 hover:border-[#003DA5]'
                      }`}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-[#003DA5]' : 'text-gray-400'}`} />
                      <p className="text-sm text-gray-700 mb-2">
                        Arrastra archivos o haz click para seleccionar
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        PDF, Word, Excel, Imágenes • Máximo 10 MB
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Seleccionar Archivos
                      </Button>
                    </div>

                    {isUploading && uploadProgress > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#003DA5] h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {formulario.evidencias.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <AnimatePresence>
                          {formulario.evidencias.map((evidencia) => (
                            <motion.div
                              key={evidencia.id}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <Card className="p-3 bg-white">
                                <div className="flex items-center gap-3">
                                  {getIconoArchivo(evidencia.tipo)}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {evidencia.nombre}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatearTamaño(evidencia.tamaño)}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarEvidencia(evidencia.id)}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </Card>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setIsFormOpen(false);
                setIsConfirmOpen(true);
              }}
              className="bg-[#003DA5] hover:bg-[#002873] gap-2"
            >
              Revisar y Enviar
              <ChevronRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-[#003DA5]" />
              Confirmar Envío de Controversia
            </DialogTitle>
            <DialogDescription>
              Revise su controversia antes de enviar al auditor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-3">Resumen:</h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700">
                  • Hallazgo: <strong>{hallazgoSeleccionado?.numero}</strong>
                </p>
                <p className="text-gray-700">
                  • Evidencias adjuntas: <strong>{formulario.evidencias.length}</strong>
                </p>
                <p className="text-gray-700">
                  • Presentado por: <strong>{usuarioActual.nombre}</strong>
                </p>
              </div>
            </Card>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">Importante</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Una vez enviada, la controversia no puede ser modificada</li>
                    <li>• El auditor tiene 5 días hábiles para responder</li>
                    <li>• Recibirá notificación con la decisión del auditor</li>
                    <li>• La decisión del auditor es definitiva</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={enviarControversia}
              className="bg-[#003DA5] hover:bg-[#002873] gap-2"
            >
              <Send className="w-4 h-4" />
              Enviar Controversia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
