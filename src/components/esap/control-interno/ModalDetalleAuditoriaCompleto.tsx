/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL WORLD CLASS - DETALLE DE AUDITORÍA (VER)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ DISEÑO WORLD CLASS aplicado - Solo aspectos visuales
 * ✅ Header gradiente corporativo con glassmorphism + 5 badges informativos
 * ✅ Tabs responsive con scroll horizontal y estados activos
 * ✅ Footer con gradiente sutil + métricas en tiempo real
 * ✅ Barra de progreso animada con Motion
 * ✅ Tarjetas con hover states y bordes corporativos
 * 
 * FUNCIONALIDADES MANTENIDAS (100%):
 * - 6 pestañas funcionales
 * - Sub-pestañas en Etapas (Planeación, Ejecución, Comunicación)
 * - Formularios editables
 * - Documentos con tags de periodo
 * - Modal anidado Plan Individual
 * 
 * REFERENCIA ESTÁNDAR: /WIZARD_WORLD_CLASS_STANDARD.md
 * ÚLTIMA ACTUALIZACIÓN: 17 Febrero 2026
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Target, ListChecks, AlertTriangle, FolderOpen, Info,
  Calendar, User, MapPin, Building2, Save, X, Eye, Edit, CheckCircle2,
  PlayCircle, MessageSquare, Download, Upload, FileCheck, ClipboardList, 
  Clock, Trash2, ChevronRight
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog';
import { ModalPlanIndividualAuditoria } from './ModalPlanIndividualAuditoria';
import { toast } from 'sonner@2.0.3';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

type PestanaActiva = 'informacion' | 'plan-individual' | 'etapas' | 'listas-chequeo' | 'hallazgos' | 'documentos';
type SubEtapa = 'planeacion' | 'ejecucion' | 'comunicacion';

interface DocumentoConPeriodo {
  id: string;
  nombre: string;
  tipo: 'documento' | 'nota' | 'adjunto' | 'evidencia';
  contenido?: string;
  url?: string;
  etapa: SubEtapa;
  fechaRegistro: string;
  periodo: string;
  usuarioRegistro: string;
  tamanio?: string;
}

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  fase: string;
  territorial: string;
  sede: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  progreso: number;
  prioridad: 'Alta' | 'Media' | 'Baja';
  hallazgos: number;
}

interface ModalDetalleAuditoriaCompletoProps {
  auditoria: Auditoria;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardarCambios: (datos: any) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE PESTAÑAS
// ═══════════════════════════════════════════════════════════════════════════

const pestanas = [
  { id: 'informacion' as PestanaActiva, label: 'Información', icon: Info },
  { id: 'plan-individual' as PestanaActiva, label: 'Plan Individual', icon: Target },
  { id: 'etapas' as PestanaActiva, label: 'Etapas', icon: PlayCircle },
  { id: 'listas-chequeo' as PestanaActiva, label: 'Listas Chequeo', icon: ListChecks },
  { id: 'hallazgos' as PestanaActiva, label: 'Hallazgos', icon: AlertTriangle },
  { id: 'documentos' as PestanaActiva, label: 'Documentos', icon: FolderOpen }
];

const subEtapas = [
  { id: 'planeacion' as SubEtapa, label: 'Planeación', color: '#3B82F6' },
  { id: 'ejecucion' as SubEtapa, label: 'Ejecución', color: '#F59E0B' },
  { id: 'comunicacion' as SubEtapa, label: 'Comunicación', color: '#10B981' }
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function ModalDetalleAuditoriaCompleto({
  auditoria,
  open,
  onOpenChange,
  onGuardarCambios
}: ModalDetalleAuditoriaCompletoProps) {
  const [pestanaActiva, setPestanaActiva] = useState<PestanaActiva>('informacion');
  const [subEtapaActiva, setSubEtapaActiva] = useState<SubEtapa>('planeacion');
  const [modalPIAOpen, setModalPIAOpen] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    codigo: auditoria.codigo,
    tipo: auditoria.tipo,
    areaAuditada: 'Dirección Administrativa',
    liderAuditoria: auditoria.responsable,
    fechaInicio: auditoria.fechaInicio,
    fechaFin: auditoria.fechaFin,
    objetivoGeneral: 'Evaluar la eficacia de los controles internos en los procesos de gestión administrativa.',
    alcance: 'La auditoría comprende la revisión de procesos de gestión documental, contratación y talento humano.',
    equipoAuditor: ['Mario Bernal', 'Ana García', 'Carlos Ruiz']
  });

  // Datos mock de documentos
  const [documentosYNotas] = useState<DocumentoConPeriodo[]>([
    {
      id: 'doc-001',
      nombre: 'Plan de Auditoría Aprobado.pdf',
      tipo: 'documento',
      url: '/docs/plan-auditoria.pdf',
      etapa: 'planeacion',
      fechaRegistro: '2026-01-15T10:30:00',
      periodo: 'Q1 2026',
      usuarioRegistro: 'Mario Bernal',
      tamanio: '2.4 MB'
    },
    {
      id: 'doc-002',
      nombre: 'Cronograma Detallado.xlsx',
      tipo: 'documento',
      url: '/docs/cronograma.xlsx',
      etapa: 'planeacion',
      fechaRegistro: '2026-01-20T14:15:00',
      periodo: 'Ene 2026',
      usuarioRegistro: 'Ana García',
      tamanio: '156 KB'
    },
    {
      id: 'nota-001',
      nombre: 'Nota de Campo - Revisión Inicial',
      tipo: 'nota',
      contenido: 'Se identificó la necesidad de ampliar el alcance en el área de contratación debido a hallazgos preliminares.',
      etapa: 'ejecucion',
      fechaRegistro: '2026-02-05T09:00:00',
      periodo: 'Feb 2026',
      usuarioRegistro: 'Carlos Ruiz'
    },
    {
      id: 'doc-003',
      nombre: 'Informe Preliminar.docx',
      tipo: 'documento',
      url: '/docs/informe-preliminar.docx',
      etapa: 'comunicacion',
      fechaRegistro: '2026-02-12T16:45:00',
      periodo: 'Feb 2026',
      usuarioRegistro: 'Mario Bernal',
      tamanio: '3.1 MB'
    }
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIONES
  // ═══════════════════════════════════════════════════════════════════════════

  const handleGuardarCambios = () => {
    onGuardarCambios(formData);
    toast.success('Cambios guardados correctamente', {
      description: `Auditoría ${auditoria.codigo} actualizada`
    });
  };

  const handleVerEditarPIA = () => {
    setModalPIAOpen(true);
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return '#EF4444';
      case 'Media': return '#F59E0B';
      case 'Baja': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getIconoDocumento = (tipo: string) => {
    switch (tipo) {
      case 'documento': return FileText;
      case 'nota': return MessageSquare;
      case 'evidencia': return FileCheck;
      default: return FileText;
    }
  };

  // Filtrar documentos por etapa activa
  const documentosFiltrados = documentosYNotas.filter(doc => doc.etapa === subEtapaActiva);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton className="w-[95vw] max-w-[750px] lg:max-w-3xl h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">
            Detalle de Auditoría {auditoria.codigo}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Vista completa de la auditoría con pestañas de información, plan individual, etapas, listas de chequeo, hallazgos y documentos
          </DialogDescription>

          {/* ═════════════════════════════════════════════════════════════════
              HEADER GRADIENTE WORLD CLASS
              ═════════════════════════════════════════════════════════════════ */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white px-6 py-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Icono con glassmorphism */}
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                
                <div>
                  <h2 className="text-xl font-black text-white leading-tight mb-1">
                    {auditoria.nombre}
                  </h2>
                  <p className="text-sm text-blue-100 font-semibold">
                    {auditoria.codigo} · Territorial {auditoria.territorial}
                  </p>
                </div>
              </div>

              <Button 
                onClick={() => onOpenChange(false)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 -mt-1"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* 5 BADGES INFORMATIVOS */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className="bg-white/20 text-white font-bold border border-white/30 backdrop-blur-sm">
                <FileText className="w-3 h-3 mr-1" />
                {auditoria.tipo}
              </Badge>
              
              <Badge
                className="text-white font-bold shadow-md"
                style={{
                  background: auditoria.fase === 'En Progreso' ? '#10B981' : '#6B7280'
                }}
              >
                <PlayCircle className="w-3 h-3 mr-1" />
                {auditoria.fase}
              </Badge>
              
              <Badge
                className="text-white font-bold shadow-md"
                style={{
                  background: getPrioridadColor(auditoria.prioridad)
                }}
              >
                {auditoria.prioridad}
              </Badge>
              
              <Badge className="bg-orange-500 text-white font-bold shadow-md">
                <Target className="w-3 h-3 mr-1" />
                {auditoria.progreso}% completado
              </Badge>
              
              {auditoria.hallazgos > 0 && (
                <Badge className="bg-red-500 text-white font-bold animate-pulse shadow-md">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {auditoria.hallazgos} hallazgo{auditoria.hallazgos !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* BARRA DE PROGRESO ANIMADA */}
            <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-white to-blue-100 shadow-lg"
                initial={{ width: 0 }}
                animate={{ width: `${auditoria.progreso}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              TABS/PESTAÑAS CON SCROLL HORIZONTAL
              ═════════════════════════════════════════════════════════════════ */}
          <div className="flex-shrink-0 border-b-2 border-gray-200 bg-gradient-to-b from-gray-50 to-white">
            <div className="flex overflow-x-auto px-6 scrollbar-hide">
              {pestanas.map((pestana) => {
                const Icon = pestana.icon;
                const isActive = pestanaActiva === pestana.id;
                
                return (
                  <button
                    key={pestana.id}
                    onClick={() => setPestanaActiva(pestana.id)}
                    className={`
                      flex items-center gap-2 px-4 py-3 border-b-3 transition-all whitespace-nowrap
                      ${isActive 
                        ? 'border-blue-600 text-blue-700' 
                        : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                      }
                    `}
                    style={{
                      fontWeight: isActive ? 700 : 500,
                      borderBottomWidth: '3px'
                    }}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className="text-sm">{pestana.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              CONTENIDO DE PESTAÑAS
              ═════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <AnimatePresence mode="wait">
              <motion.div
                key={pestanaActiva}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* ──────────────────────────────────────────────────────────
                    PESTAÑA: INFORMACIÓN
                    ────────────────────────────────────────────────────────── */}
                {pestanaActiva === 'informacion' && (
                  <div className="space-y-6">
                    {/* Formulario Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Código
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-gray-100 text-gray-600 font-semibold outline-none cursor-not-allowed"
                          value={formData.codigo}
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Tipo de Auditoría
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          value={formData.tipo}
                          onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Área Auditada
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          value={formData.areaAuditada}
                          onChange={(e) => setFormData({ ...formData, areaAuditada: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Líder de Auditoría
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          value={formData.liderAuditoria}
                          onChange={(e) => setFormData({ ...formData, liderAuditoria: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Fecha Inicio
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          value={formData.fechaInicio}
                          onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Fecha Fin
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          value={formData.fechaFin}
                          onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Objetivo General */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        Objetivo General
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                        value={formData.objetivoGeneral}
                        onChange={(e) => setFormData({ ...formData, objetivoGeneral: e.target.value })}
                      />
                    </div>

                    {/* Alcance */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        Alcance
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                        value={formData.alcance}
                        onChange={(e) => setFormData({ ...formData, alcance: e.target.value })}
                      />
                    </div>

                    {/* Equipo Auditor */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        Equipo Auditor
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {formData.equipoAuditor.map((auditor, idx) => (
                          <Badge 
                            key={idx}
                            className="bg-blue-100 text-blue-700 border border-blue-300 font-semibold"
                          >
                            <User className="w-3 h-3 mr-1" />
                            {auditor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ──────────────────────────────────────────────────────────
                    PESTAÑA: PLAN INDIVIDUAL
                    ────────────────────────────────────────────────────────── */}
                {pestanaActiva === 'plan-individual' && (
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-6 text-center">
                    <Target className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                      Plan Individual de Auditoría
                    </h4>
                    <p className="text-sm text-gray-600 mb-6">
                      Documento maestro con cronograma, recursos y alcance detallado
                    </p>
                    <Button
                      onClick={handleVerEditarPIA}
                      style={{ background: '#003DA5' }}
                      className="text-white font-bold"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Ver / Editar Plan Individual
                    </Button>
                  </div>
                )}

                {/* ──────────────────────────────────────────────────────────
                    PESTAÑA: ETAPAS (con sub-tabs)
                    ────────────────────────────────────────────────────────── */}
                {pestanaActiva === 'etapas' && (
                  <div className="space-y-4">
                    {/* Sub-tabs de etapas */}
                    <div className="flex gap-2 p-1 bg-white rounded-lg border-2 border-gray-200">
                      {subEtapas.map((subEtapa) => {
                        const isActive = subEtapaActiva === subEtapa.id;
                        return (
                          <button
                            key={subEtapa.id}
                            onClick={() => setSubEtapaActiva(subEtapa.id)}
                            className={`
                              flex-1 px-4 py-2 rounded-md text-sm font-bold transition-all
                              ${isActive 
                                ? 'text-white shadow-md' 
                                : 'text-gray-600 hover:bg-gray-100'
                              }
                            `}
                            style={{
                              background: isActive ? subEtapa.color : 'transparent'
                            }}
                          >
                            {subEtapa.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Contenido de sub-etapas */}
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-base font-bold text-gray-900">
                            Documentos y Notas - {subEtapas.find(s => s.id === subEtapaActiva)?.label}
                          </h4>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {documentosFiltrados.length} documento{documentosFiltrados.length !== 1 ? 's' : ''} registrado{documentosFiltrados.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button size="sm" style={{ background: '#003DA5' }} className="text-white font-bold">
                          <Upload className="w-4 h-4 mr-2" />
                          Subir
                        </Button>
                      </div>

                      {documentosFiltrados.length > 0 ? (
                        <div className="space-y-3">
                          {documentosFiltrados.map((doc) => {
                            const IconoDoc = getIconoDocumento(doc.tipo);
                            
                            return (
                              <div
                                key={doc.id}
                                className="group p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all bg-white"
                              >
                                <div className="flex items-start gap-3">
                                  {/* Icono */}
                                  <div 
                                    className="p-2.5 rounded-lg"
                                    style={{ 
                                      background: doc.tipo === 'nota' ? '#FEF3C7' : '#EFF6FF' 
                                    }}
                                  >
                                    <IconoDoc 
                                      className="w-5 h-5" 
                                      style={{ 
                                        color: doc.tipo === 'nota' ? '#F59E0B' : '#003DA5' 
                                      }} 
                                    />
                                  </div>
                                  
                                  {/* Información */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-bold text-sm text-gray-900 truncate">
                                        {doc.nombre}
                                      </p>
                                      
                                      {/* TAG DE PERIODO */}
                                      <Badge
                                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold flex-shrink-0 text-white"
                                        style={{
                                          background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)'
                                        }}
                                      >
                                        <Clock className="w-3 h-3" />
                                        {doc.periodo}
                                      </Badge>
                                    </div>
                                    
                                    {doc.tipo === 'nota' && doc.contenido && (
                                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                        {doc.contenido}
                                      </p>
                                    )}
                                    
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        <span>{doc.usuarioRegistro}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{new Date(doc.fechaRegistro).toLocaleDateString('es-CO')}</span>
                                      </div>
                                      {doc.tamanio && (
                                        <span className="font-semibold">{doc.tamanio}</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Botones de acción */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {doc.tipo !== 'nota' && (
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <Download className="w-4 h-4 text-blue-600" />
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Eye className="w-4 h-4 text-gray-600" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-sm font-semibold text-gray-700 mb-1">
                            No hay documentos en esta etapa
                          </p>
                          <p className="text-xs text-gray-500">
                            Sube archivos o agrega notas para comenzar
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ──────────────────────────────────────────────────────────
                    PESTAÑA: LISTAS DE CHEQUEO
                    ────────────────────────────────────────────────────────── */}
                {pestanaActiva === 'listas-chequeo' && (
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center">
                    <ListChecks className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                      Listas de Chequeo
                    </h4>
                    <p className="text-sm text-gray-600 mb-6">
                      Gestión de listas de verificación para la auditoría
                    </p>
                    <Button style={{ background: '#003DA5' }} className="text-white font-bold">
                      <ListChecks className="w-4 h-4 mr-2" />
                      Crear Lista de Chequeo
                    </Button>
                  </div>
                )}

                {/* ──────────────────────────────────────────────────────────
                    PESTAÑA: HALLAZGOS
                    ────────────────────────────────────────────────────────── */}
                {pestanaActiva === 'hallazgos' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-bold text-gray-900">
                          Hallazgos Identificados
                        </h4>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {auditoria.hallazgos} hallazgo{auditoria.hallazgos !== 1 ? 's' : ''} registrado{auditoria.hallazgos !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Nuevo Hallazgo
                      </Button>
                    </div>

                    {auditoria.hallazgos > 0 ? (
                      <div className="space-y-3">
                        {Array.from({ length: auditoria.hallazgos }).map((_, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:shadow-md transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                                  <p className="font-bold text-sm text-gray-900">
                                    Hallazgo #{idx + 1}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                  Descripción del hallazgo identificado durante la auditoría. Se requiere seguimiento y plan de acción.
                                </p>
                                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>12 Feb 2026</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    <span>Mario Bernal</span>
                                  </div>
                                </div>
                              </div>
                              <Badge className="bg-yellow-100 text-orange-600 border border-orange-300 font-bold">
                                Pendiente
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
                        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                        <p className="text-lg font-bold text-gray-900 mb-1">Sin hallazgos</p>
                        <p className="text-sm text-gray-600">
                          No se han identificado hallazgos en esta auditoría
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ──────────────────────────────────────────────────────────
                    PESTAÑA: DOCUMENTOS
                    ────────────────────────────────────────────────────────── */}
                {pestanaActiva === 'documentos' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-bold text-gray-900">
                          Documentos de la Auditoría
                        </h4>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Gestión de archivos y evidencias
                        </p>
                      </div>
                      <Button size="sm" style={{ background: '#003DA5' }} className="text-white font-bold">
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Documento
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {documentosYNotas.map((doc) => (
                        <div
                          key={doc.id}
                          className="group bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-blue-50">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-gray-900 truncate mb-0.5">
                                {doc.nombre}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{doc.tamanio || 'N/A'}</span>
                                <span>•</span>
                                <span>{doc.periodo}</span>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                              <Download className="w-4 h-4 text-blue-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              FOOTER WORLD CLASS CON MÉTRICAS
              ═════════════════════════════════════════════════════════════════ */}
          <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-t-2 border-gray-200 px-6 py-4 shadow-lg">
            <div className="flex items-center justify-between">
              {/* Botón Cerrar + Métricas */}
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="font-bold border-2 border-gray-300 hover:border-gray-400"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cerrar
                </Button>
                
                {/* Métricas en tiempo real */}
                <div className="hidden md:flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 border-blue-300 text-blue-700">
                    <Eye className="w-3 h-3" />
                    {pestanas.find(p => p.id === pestanaActiva)?.label}
                  </Badge>
                  
                  {pestanaActiva === 'informacion' && (
                    <Badge variant="outline" className="gap-1 border-green-300 text-green-700">
                      <CheckCircle2 className="w-3 h-3" />
                      6 campos editables
                    </Badge>
                  )}
                  
                  {pestanaActiva === 'hallazgos' && auditoria.hallazgos > 0 && (
                    <Badge variant="outline" className="gap-1 border-orange-300 text-orange-700">
                      <AlertTriangle className="w-3 h-3" />
                      {auditoria.hallazgos} hallazgos
                    </Badge>
                  )}
                  
                  {pestanaActiva === 'etapas' && (
                    <Badge variant="outline" className="gap-1 border-purple-300 text-purple-700">
                      <FileText className="w-3 h-3" />
                      {documentosFiltrados.length} docs
                    </Badge>
                  )}
                </div>
              </div>

              {/* Botón Guardar (solo en pestaña información) */}
              {pestanaActiva === 'informacion' && (
                <Button
                  style={{ background: '#003DA5' }}
                  onClick={handleGuardarCambios}
                  className="font-bold text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═════════════════════════════════════════════════════════════════
          MODAL ANIDADO: PLAN INDIVIDUAL DE AUDITORÍA
          ═════════════════════════════════════════════════════════════════ */}
      <ModalPlanIndividualAuditoria
        auditoria={{
          codigo: auditoria.codigo,
          nombre: auditoria.nombre,
          tipo: auditoria.tipo,
          territorial: auditoria.territorial
        }}
        open={modalPIAOpen}
        onOpenChange={setModalPIAOpen}
        onGuardar={(datos) => {
          toast.success('Plan Individual de Auditoría guardado', {
            description: 'Los cambios se han registrado correctamente'
          });
          setModalPIAOpen(false);
        }}
      />
    </>
  );
}
