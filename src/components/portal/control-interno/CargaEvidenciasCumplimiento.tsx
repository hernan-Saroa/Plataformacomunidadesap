/**
 * MÓDULO: CARGA DE EVIDENCIAS DE CUMPLIMIENTO - PORTAL TRANSACCIONAL
 * 
 * Componente para que las áreas auditadas carguen evidencias de cumplimiento
 * de sus acciones correctivas durante el seguimiento trimestral.
 * 
 * CAMPOS DEL FORMATO EM-FO-002 (SEGUIMIENTO):
 * - Campo 11: Cantidad de acciones implementadas
 * - Campo 12: Cumplimiento (CALCULADO: 2=cumple, 1=parcial, 0=no cumple)
 * - Campo 13: Estado de la acción (ABIERTA / CERRADA)
 * - Campo 14: Responsable del seguimiento (Jefe Control Interno)
 * - Campo 15: Observación cumplimiento
 * 
 * FÓRMULA DE CUMPLIMIENTO:
 * - 2 (CUMPLE) 🟢: implementadas >= programadas
 * - 1 (PARCIAL) 🟡: implementadas >= 1 pero < programadas
 * - 0 (NO CUMPLE) 🔴: implementadas = 0
 * 
 * USUARIOS: Personal de áreas auditadas
 * ROL: Área Auditada
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  X,
  FileText,
  File,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  Trash2,
  Save,
  Send,
  Calendar,
  Target,
  AlertTriangle,
  Info,
  Clock,
  CheckSquare
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

// Tipos
interface ArchivoEvidencia {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  url: string;
  fechaCarga: string;
}

interface AccionCorrectiva {
  id: string;
  hallazgoNumero: string;
  hallazgoDescripcion: string;
  accionMejora: string;
  cantidadProgramada: number;
  fechaInicial: string;
  fechaFin: string;
  tiempoEjecucionMeses: number;
  responsable: string;
  // Campos de seguimiento
  cantidadImplementada: number;
  cumplimiento: 0 | 1 | 2; // Calculado
  estadoAccion: 'ABIERTA' | 'CERRADA';
  observacionCumplimiento: string;
  evidencias: ArchivoEvidencia[];
}

interface PlanMejoramiento {
  id: string;
  auditoria: string;
  codigoAuditoria: string;
  area: string;
  fechaSeguimiento: string;
  numeroSeguimiento: number;
  acciones: AccionCorrectiva[];
}

export function CargaEvidenciasCumplimiento() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [accionSeleccionada, setAccionSeleccionada] = useState<AccionCorrectiva | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Usuario actual
  const usuarioActual = {
    nombre: 'María Fernanda Rodríguez López',
    area: 'Gestión Contractual',
    cargo: 'Coordinadora de Contratación'
  };

  // Mock data - Plan de mejoramiento con acciones
  const [plan, setPlan] = useState<PlanMejoramiento>({
    id: 'PM-2024-045',
    auditoria: 'Auditoría Gestión Contractual 2024',
    codigoAuditoria: 'AUD-2024-032',
    area: 'Gestión Contractual',
    fechaSeguimiento: '2025-12-01',
    numeroSeguimiento: 4, // Cuarto seguimiento trimestral
    acciones: [
      {
        id: 'ACC-001',
        hallazgoNumero: 'H-2024-032-01',
        hallazgoDescripcion: 'No se encontró evidencia de actas del comité de contratación para 5 contratos superiores a 100 SMMLV',
        accionMejora: 'Actualizar procedimiento de convocatoria del comité de contratación y documentar todas las reuniones',
        cantidadProgramada: 4, // 4 veces en el año
        fechaInicial: '2024-08-01',
        fechaFin: '2025-11-15',
        tiempoEjecucionMeses: 15,
        responsable: 'María Fernanda Rodríguez López',
        cantidadImplementada: 3, // Ha implementado 3 de 4
        cumplimiento: 1, // Parcial
        estadoAccion: 'ABIERTA',
        observacionCumplimiento: '',
        evidencias: [
          {
            id: 'EV-001',
            nombre: 'Acta_Comite_Contratacion_Sept2024.pdf',
            tipo: 'application/pdf',
            tamaño: 245000,
            url: '/evidencias/acta-sept.pdf',
            fechaCarga: '2024-09-15'
          },
          {
            id: 'EV-002',
            nombre: 'Procedimiento_PR-CTL-001_v1.0.docx',
            tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            tamaño: 180000,
            url: '/evidencias/procedimiento.docx',
            fechaCarga: '2024-10-01'
          }
        ]
      },
      {
        id: 'ACC-002',
        hallazgoNumero: 'H-2024-032-02',
        hallazgoDescripcion: 'Los expedientes contractuales no cuentan con el orden establecido en la Guía de Gestión Documental',
        accionMejora: 'Socializar Guía de Gestión Documental con el equipo y reorganizar expedientes del año 2024',
        cantidadProgramada: 2,
        fechaInicial: '2024-08-01',
        fechaFin: '2025-12-15',
        tiempoEjecucionMeses: 16,
        responsable: 'María Fernanda Rodríguez López',
        cantidadImplementada: 2, // Ha completado las 2 socializaciones
        cumplimiento: 2, // Cumple
        estadoAccion: 'CERRADA',
        observacionCumplimiento: 'Se realizaron dos socializaciones completas con todo el equipo de contratación',
        evidencias: [
          {
            id: 'EV-003',
            nombre: 'Acta_Socializacion_1_Agosto2024.pdf',
            tipo: 'application/pdf',
            tamaño: 320000,
            url: '/evidencias/socializacion-1.pdf',
            fechaCarga: '2024-08-20'
          },
          {
            id: 'EV-004',
            nombre: 'Acta_Socializacion_2_Noviembre2024.pdf',
            tipo: 'application/pdf',
            tamaño: 310000,
            url: '/evidencias/socializacion-2.pdf',
            fechaCarga: '2024-11-10'
          },
          {
            id: 'EV-005',
            nombre: 'Listado_Asistencia.xlsx',
            tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            tamaño: 45000,
            url: '/evidencias/asistencia.xlsx',
            fechaCarga: '2024-11-10'
          }
        ]
      },
      {
        id: 'ACC-003',
        hallazgoNumero: 'H-2024-032-03',
        hallazgoDescripcion: 'No se evidencia seguimiento sistemático al cumplimiento de obligaciones contractuales',
        accionMejora: 'Implementar matriz de seguimiento mensual de obligaciones contractuales',
        cantidadProgramada: 12, // Mensual
        fechaInicial: '2024-09-01',
        fechaFin: '2025-08-31',
        tiempoEjecucionMeses: 12,
        responsable: 'María Fernanda Rodríguez López',
        cantidadImplementada: 0, // No ha implementado
        cumplimiento: 0, // No cumple
        estadoAccion: 'ABIERTA',
        observacionCumplimiento: '',
        evidencias: []
      }
    ]
  });

  // Calcular cumplimiento automáticamente
  const calcularCumplimiento = (implementadas: number, programadas: number): 0 | 1 | 2 => {
    if (implementadas >= programadas) return 2; // CUMPLE
    if (implementadas >= 1) return 1; // PARCIAL
    return 0; // NO CUMPLE
  };

  // Actualizar cantidad implementada
  const actualizarCantidadImplementada = (accionId: string, cantidad: number) => {
    setPlan(prev => ({
      ...prev,
      acciones: prev.acciones.map(accion => {
        if (accion.id === accionId) {
          const cumplimiento = calcularCumplimiento(cantidad, accion.cantidadProgramada);
          return {
            ...accion,
            cantidadImplementada: cantidad,
            cumplimiento,
            estadoAccion: cumplimiento === 2 ? 'CERRADA' : 'ABIERTA'
          };
        }
        return accion;
      })
    }));
  };

  // Actualizar observaciones
  const actualizarObservaciones = (accionId: string, observaciones: string) => {
    setPlan(prev => ({
      ...prev,
      acciones: prev.acciones.map(accion =>
        accion.id === accionId ? { ...accion, observacionCumplimiento: observaciones } : accion
      )
    }));
  };

  // Actualizar estado de acción
  const actualizarEstadoAccion = (accionId: string, estado: 'ABIERTA' | 'CERRADA') => {
    setPlan(prev => ({
      ...prev,
      acciones: prev.acciones.map(accion =>
        accion.id === accionId ? { ...accion, estadoAccion: estado } : accion
      )
    }));
  };

  // Manejar archivos seleccionados
  const handleFileSelect = async (files: FileList | null, accionId: string) => {
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

    // Validar archivos
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validar tipo
      if (!tiposPermitidos.includes(file.type)) {
        toast.error('Tipo de archivo no permitido', {
          description: `${file.name} - Solo se permiten PDF, Word, Excel, JPG, PNG`
        });
        continue;
      }

      // Validar tamaño (máximo 10 MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Archivo muy grande', {
          description: `${file.name} - El tamaño máximo es 10 MB`
        });
        continue;
      }

      archivosValidos.push(file);
    }

    if (archivosValidos.length === 0) return;

    // Simular carga de archivos
    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < archivosValidos.length; i++) {
      const file = archivosValidos[i];
      
      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      // Simular tiempo de carga
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Crear evidencia
      const nuevaEvidencia: ArchivoEvidencia = {
        id: `EV-${Date.now()}-${i}`,
        nombre: file.name,
        tipo: file.type,
        tamaño: file.size,
        url: URL.createObjectURL(file),
        fechaCarga: new Date().toISOString().split('T')[0]
      };

      // Agregar a la acción
      setPlan(prev => ({
        ...prev,
        acciones: prev.acciones.map(accion =>
          accion.id === accionId
            ? { ...accion, evidencias: [...accion.evidencias, nuevaEvidencia] }
            : accion
        )
      }));

      clearInterval(progressInterval);
      setUploadProgress(0);
    }

    setIsUploading(false);
    toast.success('Archivos cargados', {
      description: `${archivosValidos.length} ${archivosValidos.length === 1 ? 'archivo cargado' : 'archivos cargados'} correctamente`
    });
  };

  // Eliminar evidencia
  const eliminarEvidencia = (accionId: string, evidenciaId: string) => {
    setPlan(prev => ({
      ...prev,
      acciones: prev.acciones.map(accion =>
        accion.id === accionId
          ? { ...accion, evidencias: accion.evidencias.filter(ev => ev.id !== evidenciaId) }
          : accion
      )
    }));
    toast.info('Evidencia eliminada');
  };

  // Drag and drop handlers
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

  const handleDrop = (e: React.DragEvent, accionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files, accionId);
  };

  // Enviar seguimiento
  const enviarSeguimiento = () => {
    // Validaciones
    const accionesSinEvidencias = plan.acciones.filter(
      a => a.cantidadImplementada > 0 && a.evidencias.length === 0
    );

    if (accionesSinEvidencias.length > 0) {
      toast.error('Evidencias requeridas', {
        description: 'Debe cargar evidencias para todas las acciones implementadas'
      });
      return;
    }

    toast.loading('Enviando seguimiento...', { id: 'submit' });
    setTimeout(() => {
      toast.success('¡Seguimiento enviado!', {
        id: 'submit',
        description: 'El auditor validará las evidencias cargadas'
      });
      setIsConfirmOpen(false);
    }, 2000);
  };

  const getCumplimientoInfo = (cumplimiento: 0 | 1 | 2) => {
    const info = {
      0: {
        badge: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'No Cumple' },
        emoji: '🔴',
        color: 'text-red-600'
      },
      1: {
        badge: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle, label: 'Cumple Parcialmente' },
        emoji: '🟡',
        color: 'text-yellow-600'
      },
      2: {
        badge: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Cumple' },
        emoji: '🟢',
        color: 'text-green-600'
      }
    };
    return info[cumplimiento];
  };

  const getCumplimientoBadge = (cumplimiento: 0 | 1 | 2) => {
    const info = getCumplimientoInfo(cumplimiento);
    const Icon = info.badge.icon;
    return (
      <Badge className={`${info.badge.bg} ${info.badge.text} border-0 px-3 py-1 flex items-center gap-1.5 w-fit`}>
        <Icon className="w-4 h-4" />
        {info.badge.label}
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

  const diasRestantes = Math.ceil(
    (new Date(plan.fechaSeguimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const accionesConAlerta = plan.acciones.filter(a => a.cumplimiento === 0 || a.cumplimiento === 1).length;
  const porcentajeAvance = Math.round(
    (plan.acciones.reduce((acc, a) => acc + a.cantidadImplementada, 0) /
    plan.acciones.reduce((acc, a) => acc + a.cantidadProgramada, 0)) * 100
  );

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
                <Upload className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Seguimiento Trimestral - Evidencias de Cumplimiento
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {plan.auditoria} • Seguimiento #{plan.numeroSeguimiento}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {diasRestantes > 0 ? (
              <Badge className="bg-blue-100 text-blue-800 border-0 px-3 py-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {diasRestantes} días restantes
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 border-0 px-3 py-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Vencido
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* Información del plan */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-600 mb-1">Plan de Mejoramiento</p>
            <p className="font-semibold text-gray-900">{plan.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Área</p>
            <p className="font-semibold text-gray-900">{plan.area}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Fecha de Seguimiento</p>
            <p className="font-semibold text-gray-900">
              {new Date(plan.fechaSeguimiento).toLocaleDateString('es-CO')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Avance General</p>
            <p className="text-2xl font-bold text-[#003DA5]">{porcentajeAvance}%</p>
          </div>
        </div>
      </Card>

      {/* Alerta si hay acciones sin cumplir */}
      {accionesConAlerta > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">
                Atención: Acciones con cumplimiento pendiente
              </h3>
              <p className="text-sm text-yellow-800">
                Tiene {accionesConAlerta} {accionesConAlerta === 1 ? 'acción' : 'acciones'} con cumplimiento parcial o sin cumplimiento. 
                Debe cargar evidencias y actualizar el estado de implementación.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Lista de acciones correctivas */}
      <div className="space-y-6">
        {plan.acciones.map((accion, index) => (
          <motion.div
            key={accion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`p-6 border-l-4 ${
              accion.cumplimiento === 2 ? 'border-l-green-500 bg-green-50' :
              accion.cumplimiento === 1 ? 'border-l-yellow-500 bg-yellow-50' :
              'border-l-red-500 bg-red-50'
            }`}>
              {/* Header de la acción */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{accion.hallazgoNumero}</Badge>
                    <Badge className={`text-xs px-2 py-1 border-0 ${
                      accion.estadoAccion === 'CERRADA' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {accion.estadoAccion}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {accion.accionMejora}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Hallazgo: {accion.hallazgoDescripcion}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Responsable: <strong>{accion.responsable}</strong></span>
                    <span>•</span>
                    <span>Período: {new Date(accion.fechaInicial).toLocaleDateString('es-CO')} - {new Date(accion.fechaFin).toLocaleDateString('es-CO')}</span>
                  </div>
                </div>
                <div>
                  {getCumplimientoBadge(accion.cumplimiento)}
                </div>
              </div>

              {/* Métricas de cumplimiento */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 bg-white border-2">
                  <p className="text-xs text-gray-600 mb-1">Cantidad Programada</p>
                  <p className="text-2xl font-bold text-gray-900">{accion.cantidadProgramada}</p>
                  <p className="text-xs text-gray-600 mt-1">Veces planificadas</p>
                </Card>

                <Card className="p-4 bg-white border-2">
                  <p className="text-xs text-gray-600 mb-2">Cantidad Implementada</p>
                  <Input
                    type="number"
                    min="0"
                    max={accion.cantidadProgramada}
                    value={accion.cantidadImplementada}
                    onChange={(e) => actualizarCantidadImplementada(accion.id, parseInt(e.target.value) || 0)}
                    className="text-2xl font-bold h-12"
                  />
                </Card>

                <Card className={`p-4 border-2 ${
                  accion.cumplimiento === 2 ? 'bg-green-100 border-green-300' :
                  accion.cumplimiento === 1 ? 'bg-yellow-100 border-yellow-300' :
                  'bg-red-100 border-red-300'
                }`}>
                  <p className="text-xs text-gray-600 mb-1">Cumplimiento</p>
                  <p className={`text-3xl font-bold ${getCumplimientoInfo(accion.cumplimiento).color}`}>
                    {getCumplimientoInfo(accion.cumplimiento).emoji}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {accion.cumplimiento === 2 ? 'Cumple' : accion.cumplimiento === 1 ? 'Parcial' : 'No cumple'}
                  </p>
                </Card>

                <Card className="p-4 bg-white border-2">
                  <p className="text-xs text-gray-600 mb-2">Estado de Acción</p>
                  <Select
                    value={accion.estadoAccion}
                    onValueChange={(value) => actualizarEstadoAccion(accion.id, value as 'ABIERTA' | 'CERRADA')}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABIERTA">ABIERTA</SelectItem>
                      <SelectItem value="CERRADA">CERRADA</SelectItem>
                    </SelectContent>
                  </Select>
                </Card>
              </div>

              {/* Zona de carga de evidencias */}
              <div className="mb-6">
                <Label className="mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#003DA5]" />
                  Evidencias de Cumplimiento
                  <Badge variant="outline" className="ml-2 text-xs">
                    {accion.evidencias.length} {accion.evidencias.length === 1 ? 'archivo' : 'archivos'}
                  </Badge>
                </Label>

                {/* Drop zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    isDragging
                      ? 'border-[#003DA5] bg-blue-50'
                      : 'border-gray-300 hover:border-[#003DA5] hover:bg-blue-50'
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, accion.id)}
                >
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-[#003DA5]' : 'text-gray-400'}`} />
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Arrastra archivos aquí</strong> o haz click para seleccionar
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    PDF, Word, Excel, JPG, PNG • Máximo 10 MB por archivo
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileSelect(e.target.files, accion.id)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Seleccionar Archivos
                  </Button>
                </div>

                {/* Progress bar al cargar */}
                {isUploading && uploadProgress > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Cargando archivos...</span>
                      <span className="font-semibold text-gray-900">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#003DA5] h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Lista de evidencias */}
                {accion.evidencias.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <AnimatePresence>
                      {accion.evidencias.map((evidencia) => (
                        <motion.div
                          key={evidencia.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card className="p-3 bg-white hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0">
                                {getIconoArchivo(evidencia.tipo)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {evidencia.nombre}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatearTamaño(evidencia.tamaño)} • Cargado: {new Date(evidencia.fechaCarga).toLocaleDateString('es-CO')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    toast.info('Abriendo vista previa');
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    toast.info('Descargando archivo');
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarEvidencia(accion.id, evidencia.id)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <Label htmlFor={`obs-${accion.id}`} className="mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#003DA5]" />
                  Observaciones de Cumplimiento
                </Label>
                <Textarea
                  id={`obs-${accion.id}`}
                  value={accion.observacionCumplimiento}
                  onChange={(e) => actualizarObservaciones(accion.id, e.target.value)}
                  placeholder="Describa el avance, dificultades encontradas o justificación en caso de incumplimiento..."
                  className="mt-2 min-h-[100px]"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Campo obligatorio si el cumplimiento es parcial o no cumple
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Panel informativo */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Criterios de Cumplimiento</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🟢</span>
                <p><strong>CUMPLE (2 puntos):</strong> Implementó la cantidad programada o más</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🟡</span>
                <p><strong>CUMPLE PARCIALMENTE (1 punto):</strong> Implementó al menos 1 vez pero menos de lo programado</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔴</span>
                <p><strong>NO CUMPLE (0 puntos):</strong> No implementó ninguna acción</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Botones de acción */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" className="gap-2">
          <Save className="w-4 h-4" />
          Guardar Borrador
        </Button>
        <Button
          onClick={() => setIsConfirmOpen(true)}
          className="bg-[#003DA5] hover:bg-[#002873] gap-2"
        >
          <Send className="w-4 h-4" />
          Enviar Seguimiento
        </Button>
      </div>

      {/* Modal de confirmación */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-[#003DA5]" />
              Confirmar Envío de Seguimiento Trimestral
            </DialogTitle>
            <DialogDescription>
              Revise el resumen antes de enviar. El auditor validará las evidencias cargadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Resumen de cumplimiento */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-3">Resumen de Cumplimiento:</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {plan.acciones.filter(a => a.cumplimiento === 2).length}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Cumplen</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-yellow-600">
                    {plan.acciones.filter(a => a.cumplimiento === 1).length}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Parciales</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-600">
                    {plan.acciones.filter(a => a.cumplimiento === 0).length}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">No cumplen</p>
                </div>
              </div>
            </Card>

            {/* Evidencias cargadas */}
            <Card className="p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-900 mb-3">Evidencias Cargadas:</h4>
              <div className="space-y-2 text-sm">
                {plan.acciones.map((accion) => (
                  <div key={accion.id} className="flex items-center justify-between">
                    <span className="text-gray-700">{accion.hallazgoNumero}</span>
                    <Badge variant="outline" className="text-xs">
                      {accion.evidencias.length} {accion.evidencias.length === 1 ? 'archivo' : 'archivos'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Advertencia */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">
                    Importante
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Una vez enviado, el seguimiento no podrá ser modificado</li>
                    <li>• El auditor validará las evidencias cargadas</li>
                    <li>• Puede ser contactado para aclaraciones adicionales</li>
                    <li>• El cumplimiento afecta los indicadores de su área</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={enviarSeguimiento}
              className="bg-[#003DA5] hover:bg-[#002873] gap-2"
            >
              <Send className="w-4 h-4" />
              Confirmar Envío
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
