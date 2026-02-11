/**
 * MODAL COMPLETO DE AUDITORÍA
 * Con todas las pestañas funcionales: Información, Plan Individual, Etapas, Listas Chequeo, Hallazgos, Documentos
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Target, ListChecks, AlertTriangle, FolderOpen, Info,
  Calendar, User, MapPin, Building2, Save, X, Eye, Edit, CheckCircle2,
  PlayCircle, MessageSquare, Download, Upload, FileCheck, ClipboardList
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { ModalPlanIndividualAuditoria } from './ModalPlanIndividualAuditoria';
import { toast } from 'sonner@2.0.3';

type PestanaActiva = 'informacion' | 'plan-individual' | 'etapas' | 'listas-chequeo' | 'hallazgos' | 'documentos';
type SubEtapa = 'planeacion' | 'ejecucion' | 'comunicacion';

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

export function ModalDetalleAuditoriaCompleto({
  auditoria,
  open,
  onOpenChange,
  onGuardarCambios
}: ModalDetalleAuditoriaCompletoProps) {
  const [pestanaActiva, setPestanaActiva] = useState<PestanaActiva>('informacion');
  const [subEtapaActiva, setSubEtapaActiva] = useState<SubEtapa>('planeacion');
  const [modalPIAOpen, setModalPIAOpen] = useState(false);

  // Form data para la pestaña de Información
  const [formData, setFormData] = useState({
    codigo: auditoria.codigo,
    tipo: auditoria.tipo,
    areaAuditada: auditoria.territorial,
    liderAuditoria: auditoria.responsable,
    fechaInicio: auditoria.fechaInicio,
    fechaFin: auditoria.fechaFin,
    objetivoGeneral: 'Evaluar gestión administrativa y académica de la territorial',
    alcance: 'Procesos misionales y de apoyo',
    equipoAuditor: ['Camila Díaz', 'Felipe Gómez']
  });

  const pestanas = [
    { id: 'informacion' as PestanaActiva, label: 'Información', icon: Info },
    { id: 'plan-individual' as PestanaActiva, label: 'Plan Individual', icon: Target },
    { id: 'etapas' as PestanaActiva, label: 'Etapas', icon: PlayCircle },
    { id: 'listas-chequeo' as PestanaActiva, label: 'Listas Chequeo', icon: ListChecks },
    { id: 'hallazgos' as PestanaActiva, label: 'Hallazgos', icon: AlertTriangle },
    { id: 'documentos' as PestanaActiva, label: 'Documentos', icon: FolderOpen }
  ];

  const subEtapas = [
    { id: 'planeacion' as SubEtapa, label: 'Planeación', icon: FileText, color: '#3B82F6' },
    { id: 'ejecucion' as SubEtapa, label: 'Ejecución', icon: PlayCircle, color: '#F59E0B' },
    { id: 'comunicacion' as SubEtapa, label: 'Comunicación', icon: MessageSquare, color: '#10B981' }
  ];

  const handleGuardarCambios = () => {
    onGuardarCambios(formData);
    toast.success('Cambios guardados exitosamente');
  };

  const handleVerEditarPIA = () => {
    toast.info('Abriendo Plan Individual de Auditoría...');
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Badge
                    style={{
                      background: auditoria.fase === 'En Progreso' ? '#3B82F6' : '#6B7280',
                      color: '#FFFFFF'
                    }}
                  >
                    {auditoria.fase}
                  </Badge>
                  <Badge
                    style={{
                      background: getPrioridadColor(auditoria.prioridad),
                      color: '#FFFFFF'
                    }}
                  >
                    {auditoria.prioridad}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <DialogTitle className="mt-3">
              <div>
                <p className="text-xs mb-1" style={{ color: '#6B7280' }}>{auditoria.codigo}</p>
                <h3 className="font-black text-xl" style={{ color: '#1F2937' }}>
                  {auditoria.nombre}
                </h3>
                <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Territorial {auditoria.territorial}</p>
              </div>
            </DialogTitle>

            {/* Barra de progreso general */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: '#6B7280' }}>Progreso General</span>
                <span className="font-black" style={{ color: '#F97316' }}>{auditoria.progreso}%</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ background: '#F97316', width: `${auditoria.progreso}%` }}
                />
              </div>
            </div>
          </DialogHeader>

          {/* Pestañas */}
          <div className="border-b-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
            <div className="flex overflow-x-auto px-6">
              {pestanas.map((pestana) => {
                const Icon = pestana.icon;
                const isActive = pestanaActiva === pestana.id;
                
                return (
                  <button
                    key={pestana.id}
                    onClick={() => setPestanaActiva(pestana.id)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                      isActive ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
                    }`}
                    style={{
                      color: isActive ? '#003DA5' : '#6B7280',
                      fontWeight: isActive ? 700 : 400
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{pestana.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido de las pestañas */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
            {/* PESTAÑA: INFORMACIÓN */}
            {pestanaActiva === 'informacion' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>
                      Código
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                      style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}
                      value={formData.codigo}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>
                      Tipo
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>
                      Área Auditada
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                      value={formData.areaAuditada}
                      onChange={(e) => setFormData({ ...formData, areaAuditada: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>
                      Líder de Auditoría
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                      value={formData.liderAuditoria}
                      onChange={(e) => setFormData({ ...formData, liderAuditoria: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                      value={formData.fechaInicio}
                      onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                      value={formData.fechaFin}
                      onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>
                    Objetivo General
                  </label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                    rows={3}
                    value={formData.objetivoGeneral}
                    onChange={(e) => setFormData({ ...formData, objetivoGeneral: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>
                    Alcance
                  </label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                    rows={2}
                    value={formData.alcance}
                    onChange={(e) => setFormData({ ...formData, alcance: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>
                    Equipo Auditor
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {formData.equipoAuditor.map((miembro, idx) => (
                      <Badge key={idx} variant="outline" className="px-3 py-1">
                        <User className="w-3 h-3 mr-1" />
                        {miembro}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="text-xs" style={{ color: '#9CA3AF' }}>
                  Última actualización: 2025-01-05
                </div>
              </div>
            )}

            {/* PESTAÑA: PLAN INDIVIDUAL */}
            {pestanaActiva === 'plan-individual' && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="inline-flex p-6 rounded-full mb-4" style={{ background: '#EFF6FF' }}>
                    <Target className="w-16 h-16" style={{ color: '#003DA5' }} />
                  </div>
                  <h3 className="font-black text-xl mb-2" style={{ color: '#1F2937' }}>
                    Plan Individual de Auditoría
                  </h3>
                  <p className="mb-6" style={{ color: '#6B7280' }}>
                    Documento completo con objetivos, metodología y recursos
                  </p>
                  <Button
                    size="lg"
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                    onClick={handleVerEditarPIA}
                    className="px-8"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Ver/Editar PIA
                  </Button>
                </div>
              </div>
            )}

            {/* PESTAÑA: ETAPAS */}
            {pestanaActiva === 'etapas' && (
              <div className="space-y-6">
                {/* Sub-pestañas de Etapas */}
                <div className="flex gap-2 p-2 rounded-xl" style={{ background: '#F9FAFB' }}>
                  {subEtapas.map((subEtapa) => {
                    const Icon = subEtapa.icon;
                    const isActive = subEtapaActiva === subEtapa.id;
                    
                    return (
                      <button
                        key={subEtapa.id}
                        onClick={() => setSubEtapaActiva(subEtapa.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                          isActive ? 'shadow-md' : 'hover:bg-white'
                        }`}
                        style={{
                          background: isActive ? subEtapa.color : 'transparent',
                          color: isActive ? '#FFFFFF' : '#6B7280'
                        }}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-bold text-sm">{subEtapa.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Contenido de Sub-etapas */}
                {subEtapaActiva === 'planeacion' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl" style={{ background: '#EFF6FF' }}>
                      <h4 className="font-bold mb-2" style={{ color: '#003DA5' }}>
                        Contenido de la etapa planeación
                      </h4>
                      <p className="text-sm" style={{ color: '#6B7280' }}>
                        Aquí se mostrará el formulario y contenido específico de la etapa de Planeación
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                        <FileCheck className="w-8 h-8 mb-2" style={{ color: '#3B82F6' }} />
                        <p className="font-bold text-sm mb-1" style={{ color: '#1F2937' }}>Documentos Planeación</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>5 archivos adjuntos</p>
                      </div>
                      <div className="p-4 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                        <Calendar className="w-8 h-8 mb-2" style={{ color: '#3B82F6' }} />
                        <p className="font-bold text-sm mb-1" style={{ color: '#1F2937' }}>Cronograma</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>15 Nov - 30 Nov 2024</p>
                      </div>
                    </div>
                  </div>
                )}

                {subEtapaActiva === 'ejecucion' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl" style={{ background: '#FEF3C7' }}>
                      <h4 className="font-bold mb-2" style={{ color: '#92400E' }}>
                        Contenido de la etapa ejecución
                      </h4>
                      <p className="text-sm" style={{ color: '#78350F' }}>
                        Aquí se mostrará el formulario y contenido específico de la etapa de Ejecución
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                        <ClipboardList className="w-8 h-8 mb-2" style={{ color: '#F59E0B' }} />
                        <p className="font-bold text-sm mb-1" style={{ color: '#1F2937' }}>Listas de Chequeo</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>3 listas completadas</p>
                      </div>
                      <div className="p-4 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                        <AlertTriangle className="w-8 h-8 mb-2" style={{ color: '#F59E0B' }} />
                        <p className="font-bold text-sm mb-1" style={{ color: '#1F2937' }}>Hallazgos</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{auditoria.hallazgos} identificados</p>
                      </div>
                    </div>
                  </div>
                )}

                {subEtapaActiva === 'comunicacion' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl" style={{ background: '#F0FDF4' }}>
                      <h4 className="font-bold mb-2" style={{ color: '#14532D' }}>
                        Contenido de la etapa comunicación
                      </h4>
                      <p className="text-sm" style={{ color: '#166534' }}>
                        Aquí se mostrará el formulario y contenido específico de la etapa de Comunicación
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                        <FileText className="w-8 h-8 mb-2" style={{ color: '#10B981' }} />
                        <p className="font-bold text-sm mb-1" style={{ color: '#1F2937' }}>Informe Final</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>En preparación</p>
                      </div>
                      <div className="p-4 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                        <MessageSquare className="w-8 h-8 mb-2" style={{ color: '#10B981' }} />
                        <p className="font-bold text-sm mb-1" style={{ color: '#1F2937' }}>Notificaciones</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>2 enviadas</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA: LISTAS CHEQUEO */}
            {pestanaActiva === 'listas-chequeo' && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <ListChecks className="w-12 h-12 mx-auto mb-3" style={{ color: '#6B7280' }} />
                  <p className="font-bold" style={{ color: '#1F2937' }}>Listas de Chequeo</p>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Gestión de listas de verificación para la auditoría
                  </p>
                </div>
              </div>
            )}

            {/* PESTAÑA: HALLAZGOS */}
            {pestanaActiva === 'hallazgos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold" style={{ color: '#1F2937' }}>Hallazgos Identificados</h4>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      {auditoria.hallazgos} hallazgo{auditoria.hallazgos !== 1 ? 's' : ''} registrado{auditoria.hallazgos !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button size="sm" style={{ background: '#F97316', color: '#FFFFFF' }}>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Nuevo Hallazgo
                  </Button>
                </div>
                {auditoria.hallazgos > 0 ? (
                  <div className="space-y-3">
                    {Array.from({ length: auditoria.hallazgos }).map((_, idx) => (
                      <div key={idx} className="p-4 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-sm mb-1" style={{ color: '#1F2937' }}>
                              Hallazgo #{idx + 1}
                            </p>
                            <p className="text-xs" style={{ color: '#6B7280' }}>
                              Descripción del hallazgo identificado durante la auditoría
                            </p>
                          </div>
                          <Badge style={{ background: '#FEF3C7', color: '#F59E0B' }}>
                            Pendiente
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#10B981' }} />
                    <p className="font-bold" style={{ color: '#1F2937' }}>Sin hallazgos</p>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      No se han identificado hallazgos en esta auditoría
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA: DOCUMENTOS */}
            {pestanaActiva === 'documentos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold" style={{ color: '#1F2937' }}>Documentos de la Auditoría</h4>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      Gestión de archivos y evidencias
                    </p>
                  </div>
                  <Button size="sm" style={{ background: '#003DA5', color: '#FFFFFF' }}>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Documento
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['Plan de Auditoría.pdf', 'Cronograma.xlsx', 'Evidencia 1.pdf', 'Informe Preliminar.docx'].map((doc, idx) => (
                    <div key={idx} className="p-3 rounded-lg border-2 hover:border-blue-300 transition-colors cursor-pointer" style={{ borderColor: '#E5E7EB' }}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ background: '#EFF6FF' }}>
                          <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs truncate" style={{ color: '#1F2937' }}>{doc}</p>
                          <p className="text-xs" style={{ color: '#6B7280' }}>125 KB</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer con botones de acción */}
          <div className="p-4 border-t-2 flex gap-3" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
            <Button
              variant="outline"
              className="flex-1 border-2"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            {pestanaActiva === 'informacion' && (
              <Button
                className="flex-1"
                style={{ background: '#003DA5', color: '#FFFFFF' }}
                onClick={handleGuardarCambios}
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal del Plan Individual de Auditoría */}
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
          toast.success('Plan Individual de Auditoría guardado');
          setModalPIAOpen(false);
        }}
      />
    </>
  );
}