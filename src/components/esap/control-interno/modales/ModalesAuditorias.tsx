/**
 * ═════════════════════════════════════════════════════════════════════════
 * MODALES AUDITORÍAS - WORLD CLASS VERSION
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Modales premium para gestión de auditorías OCIG:
 * - ModalFormularioAuditoria (Crear/Editar) - Diseño wizard mejorado
 * - ModalDetalleAuditoria (Ver detalle) - Layout premium con tabs
 * - ModalHistorial (Timeline) - Cronología visual mejorada
 * 
 * CARACTERÍSTICAS WORLD CLASS:
 * ✅ Posicionamiento centrado perfecto (vertical + horizontal)
 * ✅ Animaciones fluidas con motion/react
 * ✅ Diseño corporativo ESAP (#003DA5, #F57C00)
 * ✅ Badges inline y estados visuales
 * ✅ Optimizado para 4K (3840px)
 * ✅ Responsive y mobile-first
 * ✅ UX mejorada (ESC, overlay click, validaciones)
 * 
 * @version 3.0 - WORLD CLASS
 * @date 30 Enero 2025
 */

import React, { useState, useEffect } from 'react';
import { 
  X, Save, Calendar, User, FileText, Clock, CheckCircle, 
  Target, AlertCircle, TrendingUp, Users, FolderOpen,
  Download, Eye, Paperclip, MessageSquare, Activity, Award, 
  BarChart3, Building2, Mail, Phone, MapPin, Calendar as CalendarIcon,
  FileCheck, Clock3, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModalBaseWorldClass } from '../ModalBaseWorldClass';
import { motion } from 'motion/react';

// ═════════════════════════════════════════════════════════════════════════
// TIPOS COMPARTIDOS
// ═════════════════════════════════════════════════════════════════════════

export interface Auditoria {
  id?: string;
  codigo?: string;
  nombre: string;
  tipo: string;
  proceso?: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado?: string;
  progreso?: number;
  objetivo?: string;
  alcance?: string;
  criterios?: string;
}

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ═════════════════════════════════════════════════════════════════════════
// 1. MODAL FORMULARIO AUDITORÍA - WORLD CLASS
// ═════════════════════════════════════════════════════════════════════════

interface ModalFormularioAuditoriaProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria?: Auditoria;
  onSave: (data: Auditoria) => void;
}

export function ModalFormularioAuditoria({ isOpen, onClose, auditoria, onSave }: ModalFormularioAuditoriaProps) {
  const [formData, setFormData] = useState<Auditoria>(
    auditoria || {
      nombre: '',
      tipo: 'SEDE',
      responsable: '',
      fechaInicio: '',
      fechaFin: '',
    }
  );
  const [paso, setPaso] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la auditoría es obligatorio');
      return;
    }
    if (!formData.responsable.trim()) {
      toast.error('Debe asignar un responsable');
      return;
    }
    if (!formData.fechaInicio || !formData.fechaFin) {
      toast.error('Las fechas son obligatorias');
      return;
    }
    
    onSave(formData);
    toast.success(
      auditoria ? 'Auditoría actualizada exitosamente' : 'Auditoría creada exitosamente',
      { description: `Código: ${formData.codigo || 'Generado automáticamente'}` }
    );
    onClose();
    setPaso(1);
  };

  const headerIcon = auditoria ? (
    <FileText className="w-5 h-5 text-[#003DA5]" />
  ) : (
    <Target className="w-5 h-5 text-[#003DA5]" />
  );

  const footerActions = (
    <div className="flex items-center justify-between w-full">
      <div className="text-sm text-gray-600">
        Paso {paso} de 2
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium"
        >
          Cancelar
        </button>
        {paso > 1 && (
          <button
            type="button"
            onClick={() => setPaso(paso - 1)}
            className="px-5 py-2.5 text-[#003DA5] bg-[#E0EDFF] rounded-lg hover:bg-[#C5DCFF] transition-colors text-base font-medium"
          >
            Anterior
          </button>
        )}
        {paso < 2 ? (
          <button
            type="button"
            onClick={() => setPaso(paso + 1)}
            className="px-5 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all text-base font-medium flex items-center gap-2"
          >
            Siguiente
            <TrendingUp className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all text-base font-medium flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {auditoria ? 'Actualizar' : 'Crear Auditoría'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ModalBaseWorldClass
      isOpen={isOpen}
      onClose={onClose}
      title={auditoria ? 'Editar Auditoría' : 'Nueva Auditoría OCIG'}
      subtitle={paso === 1 ? 'Información Básica' : 'Alcance y Objetivos'}
      size="xl"
      headerIcon={headerIcon}
      footerActions={footerActions}
    >
      <form onSubmit={handleSubmit}>
        {/* PASO 1: Información Básica */}
        {paso === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Grid de 2 columnas optimizado para 4K */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Nombre */}
              <div className="xl:col-span-2">
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Nombre de la Auditoría <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base"
                  placeholder="Ej: Auditoría Interna de Gestión 2025"
                  required
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Tipo de Auditoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base bg-white"
                >
                  <option value="SEDE">SEDE CENTRAL</option>
                  <option value="TERRITORIAL">TERRITORIAL</option>
                  <option value="ESPECIAL">ESPECIAL</option>
                  <option value="SEGUIMIENTO">SEGUIMIENTO</option>
                </select>
              </div>

              {/* Proceso */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Proceso Asociado
                </label>
                <input
                  type="text"
                  value={formData.proceso || ''}
                  onChange={(e) => setFormData({ ...formData, proceso: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base"
                  placeholder="Ej: Gestión Financiera"
                />
              </div>

              {/* Responsable */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Responsable <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base"
                    placeholder="Nombre del auditor líder"
                    required
                  />
                </div>
              </div>

              {/* Vigencia/Año */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Vigencia
                </label>
                <input
                  type="text"
                  value={formData.codigo || new Date().getFullYear().toString()}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base"
                  placeholder="2025"
                />
              </div>

              {/* Fecha Inicio */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Fecha Inicio <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base"
                    required
                  />
                </div>
              </div>

              {/* Fecha Fin */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Fecha Fin <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.fechaFin}
                    onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-[#003DA5] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#003DA5] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Información importante
                  </p>
                  <p className="text-sm text-gray-700">
                    Los campos marcados con <span className="text-red-500 font-semibold">*</span> son obligatorios.
                    En el siguiente paso podrá definir el alcance y objetivos de la auditoría.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* PASO 2: Alcance y Objetivos */}
        {paso === 2 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Objetivo */}
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Target className="w-5 h-5 text-[#F57C00]" />
                Objetivo de la Auditoría
              </label>
              <textarea
                value={formData.objetivo || ''}
                onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base resize-none"
                placeholder="Describa el objetivo general de esta auditoría..."
              />
            </div>

            {/* Alcance */}
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-[#F57C00]" />
                Alcance
              </label>
              <textarea
                value={formData.alcance || ''}
                onChange={(e) => setFormData({ ...formData, alcance: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base resize-none"
                placeholder="Defina el alcance de la auditoría (áreas, procesos, período)..."
              />
            </div>

            {/* Criterios */}
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#F57C00]" />
                Criterios de Auditoría
              </label>
              <textarea
                value={formData.criterios || ''}
                onChange={(e) => setFormData({ ...formData, criterios: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base resize-none"
                placeholder="Especifique los criterios, normas o estándares aplicables..."
              />
            </div>

            {/* Resumen Card */}
            <div className="bg-white border-2 border-[#E0EDFF] rounded-xl p-5">
              <h4 className="text-base font-semibold text-gray-900 mb-4">Resumen</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Nombre:</span>
                  <p className="font-semibold text-gray-900 mt-1">{formData.nombre || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Tipo:</span>
                  <p className="font-semibold text-gray-900 mt-1">{formData.tipo}</p>
                </div>
                <div>
                  <span className="text-gray-600">Responsable:</span>
                  <p className="font-semibold text-gray-900 mt-1">{formData.responsable || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Período:</span>
                  <p className="font-semibold text-gray-900 mt-1">
                    {formData.fechaInicio && formData.fechaFin
                      ? `${new Date(formData.fechaInicio).toLocaleDateString('es-CO')} - ${new Date(formData.fechaFin).toLocaleDateString('es-CO')}`
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </form>
    </ModalBaseWorldClass>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// 2. MODAL DETALLE AUDITORÍA - WORLD CLASS VERSION 3.0
// ═════════════════════════════════════════════════════════════════════════

interface ModalDetalleAuditoriaProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: Auditoria;
}

type TabDetalle = 'general' | 'equipo' | 'documentos' | 'hallazgos' | 'timeline';

export function ModalDetalleAuditoria({ isOpen, onClose, auditoria }: ModalDetalleAuditoriaProps) {
  const [tabActiva, setTabActiva] = useState<TabDetalle>('general');

  if (!isOpen) return null;

  const getEstadoConfig = () => {
    const estados: Record<string, { bg: string; text: string; label: string }> = {
      backlog: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Backlog' },
      planeacion: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Planeación' },
      ejecucion: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ejecución' },
      comunicacion: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Comunicación' },
      cerrado: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cerrado' },
    };
    return estados[auditoria.estado || 'backlog'];
  };

  // Datos mock del equipo auditor
  const equipoAuditor = [
    { id: '1', nombre: 'Fernando Ávila', rol: 'Auditor Líder', email: 'favila@esap.edu.co', telefono: '+57 310 123 4567', iniciales: 'FA', color: '#003DA5' },
    { id: '2', nombre: 'Catalina Rubio', rol: 'Auditor Senior', email: 'crubio@esap.edu.co', telefono: '+57 311 234 5678', iniciales: 'CR', color: '#2962FF' },
    { id: '3', nombre: 'Laura Villa', rol: 'Auditor', email: 'lvilla@esap.edu.co', telefono: '+57 312 345 6789', iniciales: 'LV', color: '#F57C00' },
    { id: '4', nombre: 'Mario Bernal', rol: 'Apoyo Técnico', email: 'mbernal@esap.edu.co', telefono: '+57 313 456 7890', iniciales: 'MB', color: '#27AE60' }
  ];

  // Documentos adjuntos
  const documentos = [
    { id: '1', nombre: 'Plan de Auditoría.pdf', tipo: 'PDF', tamaño: '2.5 MB', fecha: '2025-01-15', autor: 'Fernando Ávila', icono: FileText, color: '#E74C3C' },
    { id: '2', nombre: 'Lista de Chequeo.xlsx', tipo: 'Excel', tamaño: '856 KB', fecha: '2025-01-18', autor: 'Catalina Rubio', icono: FileCheck, color: '#27AE60' },
    { id: '3', nombre: 'Evidencias Fotográficas.zip', tipo: 'ZIP', tamaño: '15.8 MB', fecha: '2025-01-22', autor: 'Laura Villa', icono: FolderOpen, color: '#3498DB' },
    { id: '4', nombre: 'Informe Preliminar.docx', tipo: 'Word', tamaño: '1.2 MB', fecha: '2025-01-25', autor: 'Fernando Ávila', icono: FileText, color: '#2B5797' }
  ];

  // Hallazgos
  const hallazgos = [
    { id: '1', titulo: 'Inconsistencia en documentación contable', tipo: 'Crítico', estado: 'Abierto', area: 'Contabilidad', color: '#E74C3C', icono: AlertTriangle },
    { id: '2', titulo: 'Proceso de aprobación incompleto', tipo: 'Alto', estado: 'En revisión', area: 'Procesos', color: '#F39C12', icono: AlertCircle },
    { id: '3', titulo: 'Falta capacitación del personal', tipo: 'Medio', estado: 'Abierto', area: 'Talento Humano', color: '#3498DB', icono: Users }
  ];

  // Timeline de actividades
  const timeline = [
    { id: '1', fecha: '2025-01-15 10:00', titulo: 'Auditoría creada', descripcion: 'Se creó la auditoría en el sistema OCIG', usuario: 'Mario Bernal', tipo: 'success', icono: CheckCircle },
    { id: '2', fecha: '2025-01-15 14:30', titulo: 'Equipo asignado', descripcion: 'Se asignó el equipo auditor completo', usuario: 'Mario Bernal', tipo: 'info', icono: Users },
    { id: '3', fecha: '2025-01-18 09:00', titulo: 'Plan de trabajo aprobado', descripcion: 'El plan de auditoría fue aprobado por el jefe OCIG', usuario: 'Fernando Ávila', tipo: 'success', icono: FileCheck },
    { id: '4', fecha: '2025-01-20 11:30', titulo: 'Inicio de ejecución', descripcion: 'Se dio inicio a las actividades de campo', usuario: 'Catalina Rubio', tipo: 'warning', icono: Activity },
    { id: '5', fecha: '2025-01-22 16:00', titulo: 'Primer hallazgo registrado', descripcion: 'Se identificó inconsistencia en documentación', usuario: 'Laura Villa', tipo: 'alert', icono: AlertTriangle }
  ];

  const config = getEstadoConfig();

  const tabs: { id: TabDetalle; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'general', label: 'General', icon: <FileText className="w-4 h-4" /> },
    { id: 'equipo', label: 'Equipo', icon: <Users className="w-4 h-4" />, badge: equipoAuditor.length },
    { id: 'documentos', label: 'Documentos', icon: <FolderOpen className="w-4 h-4" />, badge: documentos.length },
    { id: 'hallazgos', label: 'Hallazgos', icon: <AlertCircle className="w-4 h-4" />, badge: hallazgos.length },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" />, badge: timeline.length }
  ];

  return (
    <div className="fixed inset-0 z-[9998] overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container - World Class Design */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-[95vw] lg:max-w-[85vw] xl:max-w-7xl my-auto mx-4 bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] z-[9999]"
      >
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* HEADER - Gradiente Corporativo ESAP */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 lg:px-8 py-5 lg:py-6 rounded-t-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Título y Badge de Estado */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                <h2 className="text-xl lg:text-2xl font-semibold">{auditoria.nombre}</h2>
                <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${config.bg} ${config.text} inline-block w-fit`}>
                  {config.label}
                </span>
              </div>

              {/* Subtítulo */}
              <p className="text-blue-100 mb-4 text-sm lg:text-base">
                Código: {auditoria.codigo || 'N/A'} · Tipo: {auditoria.tipo}
              </p>

              {/* Grid de Información Principal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-sm">
                <div>
                  <div className="text-blue-200 text-xs mb-1">Responsable</div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate font-medium">{auditoria.responsable}</span>
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Fecha Inicio</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{new Date(auditoria.fechaInicio).toLocaleDateString('es-CO')}</span>
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Fecha Fin</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{new Date(auditoria.fechaFin).toLocaleDateString('es-CO')}</span>
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Progreso</div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 flex-shrink-0" />
                    <span className="font-bold text-lg">{auditoria.progreso || 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botón Cerrar */}
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Progreso Global */}
          <div className="mt-4">
            <div className="bg-white/20 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${auditoria.progreso || 0}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="bg-white h-full"
              />
            </div>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* KPIs DASHBOARD */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KPICardAuditoria
              label="Equipo"
              valor={equipoAuditor.length}
              color="#3498DB"
              icon={<Users className="w-4 h-4" />}
            />
            <KPICardAuditoria
              label="Documentos"
              valor={documentos.length}
              color="#9B59B6"
              icon={<FolderOpen className="w-4 h-4" />}
            />
            <KPICardAuditoria
              label="Hallazgos"
              valor={hallazgos.length}
              color="#E67E22"
              icon={<AlertCircle className="w-4 h-4" />}
            />
            <KPICardAuditoria
              label="Actividades"
              valor={timeline.length}
              color="#27AE60"
              icon={<Activity className="w-4 h-4" />}
            />
            <KPICardAuditoria
              label="Avance"
              valor={`${auditoria.progreso || 0}%`}
              color="#17A2B8"
              icon={<BarChart3 className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TABS NAVIGATION */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-base font-medium whitespace-nowrap transition-all border-b-2 ${
                  tabActiva === tab.id ? 'border-[#003DA5] text-[#003DA5] bg-[#E0EDFF]' : 'border-transparent text-gray-600 hover:text-[#003DA5] hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge && (
                  <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-full">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB CONTENT */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex-1 overflow-auto px-6 py-6">
          {/* TAB: GENERAL */}
          {tabActiva === 'general' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#003DA5]" />
                  Información General
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InfoField icon={<User className="w-4 h-4" />} label="Responsable" value={auditoria.responsable} />
                  <InfoField icon={<FileText className="w-4 h-4" />} label="Tipo" value={auditoria.tipo} />
                  <InfoField icon={<Calendar className="w-4 h-4" />} label="Fecha Inicio" value={new Date(auditoria.fechaInicio).toLocaleDateString('es-CO')} />
                  <InfoField icon={<Calendar className="w-4 h-4" />} label="Fecha Fin" value={new Date(auditoria.fechaFin).toLocaleDateString('es-CO')} />
                  {auditoria.proceso && <InfoField icon={<FolderOpen className="w-4 h-4" />} label="Proceso" value={auditoria.proceso} className="md:col-span-2" />}
                </div>
              </div>
              {auditoria.progreso !== undefined && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-[#E0EDFF] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#003DA5]" />
                      Progreso General
                    </span>
                    <span className="text-2xl font-bold text-[#003DA5]">{auditoria.progreso}%</span>
                  </div>
                  <div className="w-full h-4 bg-white rounded-full overflow-hidden shadow-inner">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${auditoria.progreso}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-[#003DA5] to-[#2962FF]" />
                  </div>
                </div>
              )}
              {(auditoria.objetivo || auditoria.alcance || auditoria.criterios) && (
                <div className="space-y-4">
                  {auditoria.objetivo && <DetailSection icon={<Target className="w-5 h-5 text-[#F57C00]" />} title="Objetivo" content={auditoria.objetivo} />}
                  {auditoria.alcance && <DetailSection icon={<FolderOpen className="w-5 h-5 text-[#F57C00]" />} title="Alcance" content={auditoria.alcance} />}
                  {auditoria.criterios && <DetailSection icon={<CheckCircle className="w-5 h-5 text-[#F57C00]" />} title="Criterios" content={auditoria.criterios} />}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: EQUIPO */}
          {tabActiva === 'equipo' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#003DA5]" />
                  Equipo Auditor
                  <span className="ml-2 px-3 py-1 bg-[#E0EDFF] text-[#003DA5] text-sm font-bold rounded-full">{equipoAuditor.length} miembros</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {equipoAuditor.map((miembro, index) => (
                  <motion.div key={miembro.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-[#003DA5] transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0" style={{ background: miembro.color }}>
                        {miembro.iniciales}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 mb-1">{miembro.nombre}</h4>
                        <p className="text-sm text-[#003DA5] font-medium mb-3 flex items-center gap-1">
                          <Award className="w-4 h-4" />{miembro.rol}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{miembro.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{miembro.telefono}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB: DOCUMENTOS */}
          {tabActiva === 'documentos' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-[#003DA5]" />
                  Documentos Adjuntos
                  <span className="ml-2 px-3 py-1 bg-[#E0EDFF] text-[#003DA5] text-sm font-bold rounded-full">{documentos.length}</span>
                </h3>
                <button onClick={() => toast.info('Subir nuevo documento...')} className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />Adjuntar
                </button>
              </div>
              <div className="space-y-3">
                {documentos.map((doc, index) => (
                  <motion.div key={doc.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-[#003DA5] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${doc.color}20` }}>
                        <doc.icono className="w-6 h-6" style={{ color: doc.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 mb-1 truncate">{doc.nombre}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1"><FileText className="w-4 h-4" />{doc.tipo}</span>
                          <span>·</span>
                          <span>{doc.tamaño}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" />{new Date(doc.fecha).toLocaleDateString('es-CO')}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Subido por {doc.autor}</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toast.info(`Previsualizando ${doc.nombre}`)} className="p-2 rounded-lg bg-[#E0EDFF] text-[#003DA5] hover:bg-[#003DA5] hover:text-white transition-colors" title="Ver">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => toast.success(`Descargando ${doc.nombre}`)} className="p-2 rounded-lg bg-[#E0EDFF] text-[#003DA5] hover:bg-[#003DA5] hover:text-white transition-colors" title="Descargar">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB: HALLAZGOS */}
          {tabActiva === 'hallazgos' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#003DA5]" />
                  Hallazgos Identificados
                  <span className="ml-2 px-3 py-1 bg-red-100 text-red-800 text-sm font-bold rounded-full">{hallazgos.length}</span>
                </h3>
                <button onClick={() => toast.info('Crear nuevo hallazgo...')} className="px-4 py-2 bg-gradient-to-r from-[#E74C3C] to-[#C0392B] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />Nuevo Hallazgo
                </button>
              </div>
              <div className="space-y-3">
                {hallazgos.map((hallazgo, index) => (
                  <motion.div key={hallazgo.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-red-300 transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${hallazgo.color}20` }}>
                        <hallazgo.icono className="w-6 h-6" style={{ color: hallazgo.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-base font-semibold text-gray-900">{hallazgo.titulo}</h4>
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex-shrink-0 ml-2" style={{ backgroundColor: `${hallazgo.color}20`, color: hallazgo.color }}>
                            {hallazgo.tipo}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{hallazgo.area}</span>
                          <span>·</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">{hallazgo.estado}</span>
                        </div>
                      </div>
                      <button onClick={() => toast.info(`Abriendo hallazgo: ${hallazgo.titulo}`)} className="px-3 py-2 bg-[#E0EDFF] text-[#003DA5] rounded-lg hover:bg-[#003DA5] hover:text-white transition-all text-sm font-medium opacity-0 group-hover:opacity-100">
                        Ver Detalle
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB: TIMELINE */}
          {tabActiva === 'timeline' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#003DA5]" />
                Timeline de Actividades
                <span className="ml-2 px-3 py-1 bg-[#E0EDFF] text-[#003DA5] text-sm font-bold rounded-full">{timeline.length} eventos</span>
              </h3>
              <div className="space-y-4">
                {timeline.map((evento, index) => {
                  const colorMap = {
                    success: { bg: '#D4EFDF', border: '#27AE60', icon: '#1E8449' },
                    info: { bg: '#D6EAF8', border: '#3498DB', icon: '#2874A6' },
                    warning: { bg: '#FCF3CF', border: '#F39C12', icon: '#D68910' },
                    alert: { bg: '#FADBD8', border: '#E74C3C', icon: '#C0392B' }
                  };
                  const colors = colorMap[evento.tipo as keyof typeof colorMap];
                  return (
                    <motion.div key={evento.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="relative pl-12 pb-4 last:pb-0">
                      {index < timeline.length - 1 && <div className="absolute left-5 top-12 w-0.5 h-full" style={{ backgroundColor: colors.border, opacity: 0.3 }} />}
                      <div className="absolute left-0 top-2 w-10 h-10 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.border }}>
                        <evento.icono className="w-5 h-5" style={{ color: colors.icon }} />
                      </div>
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-base font-semibold text-gray-900">{evento.titulo}</h4>
                          <span className="text-sm text-gray-500 font-mono whitespace-nowrap ml-4">{evento.fecha}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{evento.descripcion}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#003DA5] to-[#2962FF] flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{evento.usuario}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* FOOTER - Acciones */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Auditoría {auditoria.codigo || 'N/A'} · {auditoria.tipo}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => toast.info('Descargando informe completo...')}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Descargar Informe
              </button>
              <button
                onClick={() => toast.info('Abriendo expediente completo...')}
                className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Eye className="w-4 h-4" />
                Ver Expediente Completo
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// 3. MODAL HISTORIAL - WORLD CLASS - ✅ CONECTADO AL BACKEND
// ═════════════════════════════════════════════════════════════════════════

interface EventoHistorial {
  id: string | number;
  accion: string;
  usuario: string;
  fecha: string;
  tipo: 'success' | 'info' | 'warning' | 'error';
  descripcion: string;
}

interface ModalHistorialProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  onLoadHistorial?: (auditoriaId: string) => Promise<any[]>;
}

export function ModalHistorial({ isOpen, onClose, auditoriaId, onLoadHistorial }: ModalHistorialProps) {
  const [eventos, setEventos] = useState<EventoHistorial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Cargar historial del backend cuando se abre el modal
  useEffect(() => {
    if (isOpen && auditoriaId && onLoadHistorial) {
      cargarHistorial();
    }
  }, [isOpen, auditoriaId]);

  const cargarHistorial = async () => {
    if (!onLoadHistorial) return;
    
    setCargando(true);
    setError(null);
    try {
      const data = await onLoadHistorial(auditoriaId);
      // Mapear datos del backend al formato esperado
      const eventosMapeados: EventoHistorial[] = (data || []).map((item: any, index: number) => ({
        id: item.id || index,
        accion: item.accion || item.action || 'Acción registrada',
        usuario: item.usuario || item.user || item.nombreUsuario || 'Sistema',
        fecha: item.fecha || item.createdAt || item.created_at || new Date().toISOString(),
        tipo: mapearTipoEvento(item.tipo || item.type || item.tipoEvento),
        descripcion: item.descripcion || item.description || item.detalle || ''
      }));
      setEventos(eventosMapeados);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError('Error al cargar el historial');
      setEventos([]);
    } finally {
      setCargando(false);
    }
  };

  // Mapear tipos de evento del backend a tipos del UI
  const mapearTipoEvento = (tipo: string): 'success' | 'info' | 'warning' | 'error' => {
    const tipoLower = (tipo || '').toLowerCase();
    if (tipoLower.includes('creat') || tipoLower.includes('aprob') || tipoLower.includes('complet') || tipoLower === 'success') {
      return 'success';
    }
    if (tipoLower.includes('cambio') || tipoLower.includes('estado') || tipoLower === 'warning') {
      return 'warning';
    }
    if (tipoLower.includes('error') || tipoLower.includes('rechaz')) {
      return 'error';
    }
    return 'info';
  };

  const headerIcon = <Clock className="w-5 h-5 text-[#003DA5]" />;

  return (
    <ModalBaseWorldClass
      isOpen={isOpen}
      onClose={onClose}
      title="Historial de Cambios"
      subtitle="Cronología completa de eventos"
      size="lg"
      headerIcon={headerIcon}
    >
      <div className="space-y-4">
        {/* Estado de carga */}
        {cargando && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Cargando historial...</p>
          </div>
        )}

        {/* Error */}
        {!cargando && error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button 
              onClick={cargarHistorial}
              className="mt-4 px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002d7a] transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Sin eventos */}
        {!cargando && !error && eventos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No hay eventos en el historial</p>
            <p className="text-sm text-gray-500 mt-2">Los cambios y acciones se registrarán aquí</p>
          </div>
        )}

        {/* Lista de eventos */}
        {!cargando && !error && eventos.map((evento, index) => (
          <motion.div
            key={evento.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative pl-8 pb-6 last:pb-0"
          >
            {/* Línea vertical */}
            {index < eventos.length - 1 && (
              <div className="absolute left-3.5 top-10 w-0.5 h-full bg-gradient-to-b from-gray-300 to-transparent" />
            )}
            
            {/* Punto indicador */}
            <div
              className={`absolute left-0 top-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm ${
                evento.tipo === 'success'
                  ? 'bg-green-100 border-2 border-green-500'
                  : evento.tipo === 'warning'
                  ? 'bg-yellow-100 border-2 border-yellow-500'
                  : evento.tipo === 'error'
                  ? 'bg-red-100 border-2 border-red-500'
                  : 'bg-blue-100 border-2 border-blue-500'
              }`}
            >
              <CheckCircle
                className={`w-4 h-4 ${
                  evento.tipo === 'success'
                    ? 'text-green-600'
                    : evento.tipo === 'warning'
                    ? 'text-yellow-600'
                    : evento.tipo === 'error'
                    ? 'text-red-600'
                    : 'text-blue-600'
                }`}
              />
            </div>

            {/* Contenido */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-base font-semibold text-gray-900">{evento.accion}</h4>
                <span className="text-sm text-gray-500 font-mono">{evento.fecha}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{evento.descripcion}</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#003DA5] to-[#2962FF] flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{evento.usuario}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </ModalBaseWorldClass>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═════════════════════════════════════════════════════════════════════════

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function InfoField({ icon, label, value, className = '' }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="p-2 rounded-lg bg-[#E0EDFF] text-[#003DA5] flex-shrink-0 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        <p className="text-base font-semibold text-gray-900 break-words">{value}</p>
      </div>
    </div>
  );
}

function DetailSection({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
      <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h4>
      <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function KPICardAuditoria({ label, valor, color, icon }: { label: string; valor: number | string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{valor}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// MODAL DE REGISTRAR HALLAZGO - CONECTADO AL BACKEND
// ═════════════════════════════════════════════════════════════════════════

interface ModalRegistrarHallazgoProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  auditoriaNombre: string;
  onCrearHallazgo: (auditoriaId: string, data: {
    titulo?: string;
    categoria: string;
    tipo?: string;
    area: string;
    descripcion: string;
    criterioIncumplido: string;
    fechaDeteccion: string;
    responsable?: string;
  }) => Promise<boolean>;
}

export function ModalRegistrarHallazgo({ 
  isOpen, 
  onClose, 
  auditoriaId, 
  auditoriaNombre,
  onCrearHallazgo 
}: ModalRegistrarHallazgoProps) {
  const [formData, setFormData] = React.useState({
    titulo: '',
    categoria: 'critico' as 'critico' | 'controversia' | 'borrador',
    tipo: 'no-conformidad' as 'no-conformidad' | 'observacion' | 'oportunidad-mejora',
    area: '',
    descripcion: '',
    criterioIncumplido: '',
    fechaDeteccion: new Date().toISOString().split('T')[0],
    responsable: '',
  });
  const [guardando, setGuardando] = React.useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.area.trim()) {
      toast.error('El área es requerida');
      return;
    }
    if (!formData.descripcion.trim()) {
      toast.error('La descripción es requerida');
      return;
    }
    if (!formData.criterioIncumplido.trim()) {
      toast.error('El criterio incumplido es requerido');
      return;
    }

    setGuardando(true);
    try {
      const success = await onCrearHallazgo(auditoriaId, formData);
      if (success) {
        onClose();
        // Reset form
        setFormData({
          titulo: '',
          categoria: 'critico',
          tipo: 'no-conformidad',
          area: '',
          descripcion: '',
          criterioIncumplido: '',
          fechaDeteccion: new Date().toISOString().split('T')[0],
          responsable: '',
        });
      }
    } finally {
      setGuardando(false);
    }
  };

  const headerIcon = <AlertTriangle className="w-5 h-5 text-[#F57C00]" />;

  return (
    <ModalBaseWorldClass
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Hallazgo"
      subtitle={`Auditoría: ${auditoriaNombre}`}
      size="lg"
      headerIcon={headerIcon}
    >
      <div className="space-y-6">
        {/* Título (opcional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título del Hallazgo (opcional)
          </label>
          <input
            type="text"
            value={formData.titulo}
            onChange={(e) => handleChange('titulo', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:ring-0 transition-colors"
            placeholder="Ej: Falta de segregación de funciones"
          />
        </div>

        {/* Categoría y Tipo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.categoria}
              onChange={(e) => handleChange('categoria', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:ring-0 transition-colors"
            >
              <option value="critico">Crítico</option>
              <option value="controversia">Controversia</option>
              <option value="borrador">Borrador</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:ring-0 transition-colors"
            >
              <option value="no-conformidad">No Conformidad</option>
              <option value="observacion">Observación</option>
              <option value="oportunidad-mejora">Oportunidad de Mejora</option>
            </select>
          </div>
        </div>

        {/* Área */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Área Afectada <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.area}
            onChange={(e) => handleChange('area', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:ring-0 transition-colors"
            placeholder="Ej: Gestión Financiera, Talento Humano"
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción del Hallazgo <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:ring-0 transition-colors resize-none"
            placeholder="Describa detalladamente el hallazgo identificado..."
          />
        </div>

        {/* Criterio Incumplido */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Criterio Incumplido <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.criterioIncumplido}
            onChange={(e) => handleChange('criterioIncumplido', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:ring-0 transition-colors resize-none"
            placeholder="Ley, decreto o normativa incumplida..."
          />
        </div>

        {/* Fecha y Responsable */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Detección <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.fechaDeteccion}
              onChange={(e) => handleChange('fechaDeteccion', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:ring-0 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsable (opcional)
            </label>
            <input
              type="text"
              value={formData.responsable}
              onChange={(e) => handleChange('responsable', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:ring-0 transition-colors"
              placeholder="Nombre del responsable"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={guardando}
            className="flex-1 px-6 py-3 bg-[#F57C00] text-white rounded-xl font-medium hover:bg-[#E65100] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Guardando...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                Registrar Hallazgo
              </>
            )}
          </button>
        </div>
      </div>
    </ModalBaseWorldClass>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default {
  Formulario: ModalFormularioAuditoria,
  Detalle: ModalDetalleAuditoria,
  Historial: ModalHistorial,
  RegistrarHallazgo: ModalRegistrarHallazgo,
};