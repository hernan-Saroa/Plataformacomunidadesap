/**
 * CONFIGURACIÓN DOCUMENTAL UNIFICADA - ESAP WORLD CLASS
 * 
 * Modal unificado con 2 tabs:
 * Tab 1: "Tipos de Documentos" — CRUD completo de tipos de documento
 * Tab 2: "Listas de Chequeo" — Plantillas de checklist con:
 *        - Panel lateral: lista de plantillas + crear nueva
 *        - Panel principal: editor de plantilla seleccionada con items,
 *          toggles obligatorio/validación, reorden, vista previa
 * 
 * Flujo de Lista de Chequeo:
 * 1. Crear una nueva lista (nombre, descripción, color)
 * 2. Agregar ítems seleccionando tipos de documentos existentes
 * 3. Configurar cada ítem (obligatorio/opcional, con/sin validación)
 * 4. Guardar — la lista queda disponible para asignar a personas
 * 
 * KV Prefixes: tipo_documento:, checklist-template:
 * 
 * @version 3.0.0 — Plantillas de chequeo reales
 * @date 2026-03-09
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Plus, Edit, Trash2, Save, Loader2,
  FileText, FolderOpen, Shield, CheckCircle,
  AlertCircle, Search, ChevronDown,
  ChevronRight, Tag, File, Image, Award,
  Briefcase, ToggleLeft, ToggleRight,
  Settings, Archive, ClipboardCheck,
  Eye, EyeOff, ArrowUp, ArrowDown, Layers,
  Info, ListChecks, User, Copy, MoreHorizontal,
  CircleDot, Grip, Check, XCircle, ChevronLeft,
  ClipboardList, Palette, Hash, FileUp
} from 'lucide-react';
import { toast } from 'sonner';
import { tiposDocumentosService, checklistTemplatesService } from '../../services/api/supabase.service';

// ============================================================================
// TIPOS
// ============================================================================

interface TipoDocumento {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  icono: string;
  color: string;
  obligatorio: boolean;
  requiere_validacion: boolean;
  formatos_permitidos: string[];
  tamano_max_mb: number;
  activo: boolean;
  es_sistema: boolean;
  rol_validador?: string;
  orden: number;
  documentos_asociados?: number;
  asignacion_tipo?: 'todos' | 'rol' | 'territorial' | 'sede' | 'asignatura';
  asignacion_valor?: string;
  created_at?: string;
  updated_at?: string;
}

interface ChecklistItem {
  itemId: string;
  tipoDocumentoId: string;
  nombre: string;
  nombre_documento: string;
  categoria: string;
  obligatorio: boolean;
  requiere_validacion: boolean;
  orden: number;
}

interface ChecklistTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
  items: ChecklistItem[];
  activo: boolean;
  rol_validador?: string;
  asignaciones: { tipo: string; valor: string; label?: string }[];
  created_at: string;
  updated_at: string;
}

interface FormularioTipoDocumento {
  nombre: string;
  descripcion: string;
  categoria: string;
  icono: string;
  color: string;
  obligatorio: boolean;
  requiere_validacion: boolean;
  formatos_permitidos: string[];
  tamano_max_mb: number;
  activo: boolean;
  rol_validador?: string;
  orden: number;
  asignacion_tipo: 'todos' | 'rol' | 'territorial' | 'sede' | 'asignatura';
  asignacion_valor: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveTab = 'tipos' | 'checklist';

// ============================================================================
// CONSTANTES
// ============================================================================

const CATEGORIAS_CARPETA = [
  { id: 'personal', nombre: 'Personal', color: '#2962FF', icono: 'user', icon: User },
  { id: 'academico', nombre: 'Académico', color: '#10B981', icono: 'graduation', icon: Award },
  { id: 'laboral', nombre: 'Laboral', color: '#F59E0B', icono: 'briefcase', icon: Briefcase },
  { id: 'certificados', nombre: 'Certificados', color: '#8B5CF6', icono: 'award', icon: Shield },
  { id: 'administrativo', nombre: 'Administrativo', color: '#EF4444', icono: 'folder', icon: FolderOpen },
  { id: 'otros', nombre: 'Otros', color: '#6B7280', icono: 'file', icon: Layers },
];

const COLORES = [
  { nombre: 'Azul ESAP', valor: '#2962FF' },
  { nombre: 'Azul Oscuro', valor: '#003DA5' },
  { nombre: 'Verde', valor: '#10B981' },
  { nombre: 'Amarillo', valor: '#F59E0B' },
  { nombre: 'Rojo', valor: '#EF4444' },
  { nombre: 'Púrpura', valor: '#8B5CF6' },
  { nombre: 'Naranja', valor: '#FF6D00' },
  { nombre: 'Gris', valor: '#6B7280' },
  { nombre: 'Rosa', valor: '#EC4899' },
  { nombre: 'Cyan', valor: '#06B6D4' },
];

const TEMPLATE_COLORES = [
  '#003DA5', '#2962FF', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#FF6D00', '#06B6D4', '#EC4899', '#059669',
];

const ICONOS = [
  { nombre: 'Documento', valor: 'file-text', comp: FileText },
  { nombre: 'Archivo', valor: 'file', comp: File },
  { nombre: 'Imagen', valor: 'image', comp: Image },
  { nombre: 'Certificado', valor: 'award', comp: Award },
  { nombre: 'Carpeta', valor: 'folder', comp: FolderOpen },
  { nombre: 'Laboral', valor: 'briefcase', comp: Briefcase },
  { nombre: 'Seguridad', valor: 'shield', comp: Shield },
  { nombre: 'Etiqueta', valor: 'tag', comp: Tag },
  { nombre: 'Archivo Hist.', valor: 'archive', comp: Archive },
];

const FORMATOS = [
  { label: 'PDF', value: 'pdf' },
  { label: 'Word', value: 'doc,docx' },
  { label: 'Excel', value: 'xls,xlsx' },
  { label: 'Imágenes', value: 'jpg,jpeg,png' },
  { label: 'Todos', value: '*' },
];

const FORMULARIO_INICIAL: FormularioTipoDocumento = {
  nombre: '',
  descripcion: '',
  categoria: 'personal',
  icono: 'file-text',
  color: '#2962FF',
  obligatorio: false,
  requiere_validacion: true,
  formatos_permitidos: ['pdf'],
  tamano_max_mb: 10,
  activo: true,
  rol_validador: '',
  orden: 0,
  asignacion_tipo: 'todos',
  asignacion_valor: ''
};

// ============================================================================
// INPUT STYLE HELPERS
// ============================================================================

const inputStyle = (focused: boolean): React.CSSProperties => ({
  height: 36,
  border: focused ? '1px solid #003DA5' : '1px solid #D1D5DB',
  borderRadius: 10,
  fontSize: 13,
  color: '#1F2937',
  padding: '0 12px',
  outline: 'none',
  background: 'white',
  width: '100%',
  boxShadow: focused ? '0 0 0 3px rgba(0,61,165,0.08)' : 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
});

const selectStyle = (focused: boolean): React.CSSProperties => ({
  ...inputStyle(focused),
  paddingRight: 32,
  appearance: 'auto' as any,
});

const textareaStyle = (focused: boolean): React.CSSProperties => ({
  ...inputStyle(focused),
  height: 'auto',
  padding: '8px 12px',
  resize: 'none' as any,
});

// ============================================================================
// API HELPERS
// ============================================================================

async function fetchTiposDocumentos(): Promise<TipoDocumento[]> {
  const data = await tiposDocumentosService.getAll();
  if (!data.success) throw new Error(data.error || 'Error al cargar tipos');
  return data.data || [];
}

async function crearTipoDocumento(tipo: FormularioTipoDocumento): Promise<TipoDocumento> {
  const data = await tiposDocumentosService.create(tipo);
  if (!data.success) throw new Error(data.error || 'Error al crear tipo');
  return data.data;
}

async function actualizarTipoDocumento(id: string, tipo: Partial<FormularioTipoDocumento>): Promise<TipoDocumento> {
  const data = await tiposDocumentosService.update(id, tipo);
  if (!data.success) throw new Error(data.error || 'Error al actualizar tipo');
  return data.data;
}

async function eliminarTipoDocumento(id: string): Promise<void> {
  const data = await tiposDocumentosService.delete(id);
  if (!data.success) throw new Error(data.error || 'Error al eliminar tipo');
}

// Checklist Templates API
async function fetchTemplates(): Promise<ChecklistTemplate[]> {
  const data = await checklistTemplatesService.getAll();
  if (!data.success) throw new Error(data.error || 'Error al cargar plantillas');
  return data.data || [];
}

async function saveTemplate(template: Partial<ChecklistTemplate> & { nombre: string }): Promise<ChecklistTemplate> {
  const data = await checklistTemplatesService.save(template);
  if (!data.success) throw new Error(data.error || 'Error al guardar plantilla');
  return data.data;
}

async function deleteTemplate(id: string): Promise<void> {
  const data = await checklistTemplatesService.delete(id);
  if (!data.success) throw new Error(data.error || 'Error al eliminar plantilla');
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function ConfiguracionTiposDocumentos({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tipos');
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoDocumento | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tipoAEliminar, setTipoAEliminar] = useState<TipoDocumento | null>(null);
  const [formulario, setFormulario] = useState<FormularioTipoDocumento>({ ...FORMULARIO_INICIAL });
  const [focusField, setFocusField] = useState<string | null>(null);

  // ========== CARGAR DATOS ==========
  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen]);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      const [tipos, tpls] = await Promise.all([fetchTiposDocumentos(), fetchTemplates()]);
      setTiposDocumentos(tipos);
      setTemplates(tpls);
    } catch (err: any) {
      console.error('Error cargando datos configuración documental:', err);
      toast.error('Error al cargar datos', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // ========== FILTROS TAB TIPOS ==========
  const tiposFiltrados = useMemo(() => {
    let filtered = tiposDocumentos;
    if (categoriaFiltro !== 'all') {
      filtered = filtered.filter(t => t.categoria === categoriaFiltro);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.nombre.toLowerCase().includes(q) ||
        (t.descripcion || '').toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => {
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
      return a.orden - b.orden;
    });
  }, [tiposDocumentos, categoriaFiltro, searchQuery]);

  const tiposAgrupados = useMemo(() => {
    const grupos: Record<string, TipoDocumento[]> = {};
    tiposFiltrados.forEach(tipo => {
      if (!grupos[tipo.categoria]) grupos[tipo.categoria] = [];
      grupos[tipo.categoria].push(tipo);
    });
    return grupos;
  }, [tiposFiltrados]);

  // Estadísticas
  const stats = useMemo(() => ({
    total: tiposDocumentos.length,
    activos: tiposDocumentos.filter(t => t.activo).length,
    obligatorios: tiposDocumentos.filter(t => t.obligatorio).length,
    sistema: tiposDocumentos.filter(t => t.es_sistema).length,
  }), [tiposDocumentos]);

  // ========== HANDLERS TAB TIPOS ==========
  const handleAbrirCrear = (categoria?: string) => {
    setFormulario({ ...FORMULARIO_INICIAL, categoria: categoria || 'personal', orden: tiposDocumentos.length });
    setModoEdicion(false);
    setTipoSeleccionado(null);
    setShowFormModal(true);
  };

  const handleAbrirEditar = (tipo: TipoDocumento) => {
    if (tipo.es_sistema) {
      toast.error('Tipo de sistema', { description: 'No se pueden editar tipos del sistema' });
      return;
    }
    setTipoSeleccionado(tipo);
    setFormulario({
      nombre: tipo.nombre, descripcion: tipo.descripcion, categoria: tipo.categoria,
      icono: tipo.icono, color: tipo.color, obligatorio: tipo.obligatorio,
      requiere_validacion: tipo.requiere_validacion,
      formatos_permitidos: tipo.formatos_permitidos || ['pdf'],
      tamano_max_mb: tipo.tamano_max_mb || 10, activo: tipo.activo, orden: tipo.orden,
      rol_validador: tipo.rol_validador || '',
      asignacion_tipo: tipo.asignacion_tipo || 'todos', asignacion_valor: tipo.asignacion_valor || ''
    });
    setModoEdicion(true);
    setShowFormModal(true);
  };

  const handleEliminar = (tipo: TipoDocumento) => {
    if (tipo.es_sistema) {
      toast.error('Tipo de sistema', { description: 'No se pueden eliminar tipos del sistema' });
      return;
    }
    if (tipo.documentos_asociados && tipo.documentos_asociados > 0) {
      toast.error('Tipo en uso', { description: `Hay ${tipo.documentos_asociados} documento(s) usando este tipo` });
      return;
    }
    setTipoAEliminar(tipo);
    setShowDeleteConfirm(true);
  };

  const confirmarEliminar = async () => {
    if (!tipoAEliminar) return;
    try {
      setIsSaving(true);
      await eliminarTipoDocumento(tipoAEliminar.id);
      toast.success('Tipo eliminado', { description: `"${tipoAEliminar.nombre}" eliminado` });
      setShowDeleteConfirm(false);
      setTipoAEliminar(null);
      await cargarDatos();
    } catch (err: any) {
      toast.error('Error al eliminar', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGuardar = async () => {
    if (!formulario.nombre.trim()) {
      toast.error('Validación', { description: 'El nombre es obligatorio' });
      return;
    }
    if (formulario.nombre.length < 3) {
      toast.error('Validación', { description: 'El nombre debe tener al menos 3 caracteres' });
      return;
    }
    try {
      setIsSaving(true);
      if (modoEdicion && tipoSeleccionado) {
        await actualizarTipoDocumento(tipoSeleccionado.id, formulario);
        toast.success('Tipo actualizado', { description: `"${formulario.nombre}" actualizado` });
      } else {
        await crearTipoDocumento(formulario);
        toast.success('Tipo creado', { description: `"${formulario.nombre}" creado` });
      }
      setShowFormModal(false);
      await cargarDatos();
    } catch (err: any) {
      toast.error('Error al guardar', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFormatoPermitido = (formato: string) => {
    setFormulario(prev => {
      const formatos = [...prev.formatos_permitidos];
      if (formato === '*') return { ...prev, formatos_permitidos: ['*'] };
      const filtered = formatos.filter(f => f !== '*');
      const parts = formato.split(',');
      const hasAll = parts.every(p => filtered.includes(p));
      if (hasAll) return { ...prev, formatos_permitidos: filtered.filter(f => !parts.includes(f)) };
      return { ...prev, formatos_permitidos: [...filtered, ...parts.filter(p => !filtered.includes(p))] };
    });
  };

  const getIconoComponente = (icono: string) => {
    const found = ICONOS.find(i => i.valor === icono);
    return found ? found.comp : FileText;
  };

  const getCategoriaInfo = (catId: string) => {
    if (!catId || catId === 'undefined' || catId === 'null') return CATEGORIAS_CARPETA[5];
    return CATEGORIAS_CARPETA.find(c => c.id === catId) || { id: catId, nombre: catId.charAt(0).toUpperCase() + catId.slice(1), color: '#6B7280', icono: 'file', icon: Layers };
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
            style={{ maxWidth: '1280px', height: '95vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ════════ HEADER ════════ */}
            <div
              className="px-6 py-4 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Configuración Documental</h2>
                    <p className="text-sm text-white/80">Tipos de documentos y listas de chequeo</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 3,
                  }}>
                    {([
                      { key: 'tipos' as ActiveTab, label: 'Tipos de Documentos', icon: FileText },
                      { key: 'checklist' as ActiveTab, label: 'Listas de Chequeo', icon: ClipboardCheck },
                    ]).map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                          padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: activeTab === tab.key ? 'white' : 'transparent',
                          color: activeTab === tab.key ? '#003DA5' : 'rgba(255,255,255,0.85)',
                          boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                        }}
                      >
                        <tab.icon style={{ width: 16, height: 16 }} />
                        {tab.label}
                        {tab.key === 'checklist' && templates.length > 0 && (
                          <span style={{
                            background: activeTab === tab.key ? '#003DA5' : 'rgba(255,255,255,0.3)',
                            color: activeTab === tab.key ? 'white' : 'white',
                            fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 8,
                          }}>{templates.length}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors ml-2"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* ════════ CONTENIDO POR TAB ════════ */}
            {activeTab === 'tipos' ? (
              <TiposDocumentosTab
                tiposDocumentos={tiposDocumentos}
                tiposFiltrados={tiposFiltrados}
                tiposAgrupados={tiposAgrupados}
                stats={stats}
                isLoading={isLoading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                categoriaFiltro={categoriaFiltro}
                setCategoriaFiltro={setCategoriaFiltro}
                handleAbrirCrear={handleAbrirCrear}
                handleAbrirEditar={handleAbrirEditar}
                handleEliminar={handleEliminar}
                getIconoComponente={getIconoComponente}
                getCategoriaInfo={getCategoriaInfo}
                focusField={focusField}
                setFocusField={setFocusField}
              />
            ) : (
              <ChecklistTab
                tiposDocumentos={tiposDocumentos}
                templates={templates}
                setTemplates={setTemplates}
                isLoading={isLoading}
                getIconoComponente={getIconoComponente}
                getCategoriaInfo={getCategoriaInfo}
                focusField={focusField}
                setFocusField={setFocusField}
                reloadData={cargarDatos}
              />
            )}
          </motion.div>

          {/* ════════ MODAL CREAR/EDITAR TIPO ════════ */}
          <FormModalTipo
            show={showFormModal}
            onClose={() => setShowFormModal(false)}
            formulario={formulario}
            setFormulario={setFormulario}
            modoEdicion={modoEdicion}
            isSaving={isSaving}
            onGuardar={handleGuardar}
            toggleFormatoPermitido={toggleFormatoPermitido}
            focusField={focusField}
            setFocusField={setFocusField}
          />

          {/* ════════ MODAL CONFIRMAR ELIMINACIÓN ════════ */}
          <DeleteConfirmModal
            show={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            tipoAEliminar={tipoAEliminar}
            isSaving={isSaving}
            onConfirm={confirmarEliminar}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ============================================================================
// TAB 1: TIPOS DE DOCUMENTOS
// ============================================================================

function TiposDocumentosTab({
  tiposDocumentos, tiposFiltrados, tiposAgrupados, stats, isLoading,
  searchQuery, setSearchQuery, categoriaFiltro, setCategoriaFiltro,
  handleAbrirCrear, handleAbrirEditar, handleEliminar, getIconoComponente, getCategoriaInfo,
  focusField, setFocusField,
}: any) {
  return (
    <>
      {/* Stats + Toolbar */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-5">
          {[
            { label: 'Total', value: stats.total, color: '#003DA5', bg: '#EFF6FF', icon: FileText },
            { label: 'Activos', value: stats.activos, color: '#059669', bg: '#ECFDF5', icon: CheckCircle },
            { label: 'Obligatorios', value: stats.obligatorios, color: '#D97706', bg: '#FFFBEB', icon: AlertCircle },
            { label: 'Sistema', value: stats.sistema, color: '#7C3AED', bg: '#F5F3FF', icon: Shield },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, lineHeight: 1 }}>{s.label}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: s.color, lineHeight: 1.3 }}>{s.value}</p>
              </div>
            </div>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => handleAbrirCrear()}
            style={{ padding: '8px 16px', borderRadius: 10, fontWeight: 700, color: 'white', background: '#2962FF', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            Nuevo Tipo
          </button>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-gray-200 flex-shrink-0 flex items-center gap-3">
        <div className="flex-1">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Buscar tipo de documento..." focusId="tipos-search" focusField={focusField} setFocusField={setFocusField} />
        </div>
        <CategoryFilter current={categoriaFiltro} onChange={setCategoriaFiltro} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? <LoadingState text="Cargando tipos de documentos..." /> : tiposFiltrados.length === 0 ? (
          <EmptyState icon={FileText} title="No hay tipos de documentos" subtitle={searchQuery ? 'No se encontraron resultados' : 'Crea tu primer tipo de documento'} actionLabel={!searchQuery ? 'Crear primer tipo' : undefined} onAction={() => handleAbrirCrear()} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(tiposAgrupados).map(([categoria, tipos]: [string, any]) => {
              const catInfo = getCategoriaInfo(categoria);
              return (
                <div key={categoria}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: catInfo.color + '15' }}>
                        <FolderOpen style={{ width: 16, height: 16, color: catInfo.color }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>{catInfo.nombre}</h3>
                        <p style={{ fontSize: 11, color: '#6B7280' }}>{tipos.length} tipo{tipos.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAbrirCrear(categoria)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', fontSize: 12, fontWeight: 600, color: '#2962FF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Plus style={{ width: 14, height: 14 }} /> Agregar
                    </button>
                  </div>
                  <TiposTable tipos={tipos} getIconoComponente={getIconoComponente} handleAbrirEditar={handleAbrirEditar} handleEliminar={handleEliminar} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function TiposTable({ tipos, getIconoComponente, handleAbrirEditar, handleEliminar }: any) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
        <thead>
          <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            {['Tipo de Documento', 'Descripción', 'Alcance', 'Formatos', 'Obligatorio', 'Estado', 'Acciones'].map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Tipo de Documento' || h === 'Descripción' || h === 'Alcance' ? 'left' : 'center', fontSize: 10, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', ...(h === 'Acciones' ? { width: 100 } : {}) }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tipos.map((tipo: any) => {
            const IconComp = getIconoComponente(tipo.icono);
            return (
              <tr key={tipo.id} style={{ borderBottom: '1px solid #F3F4F6' }} className="hover:bg-gray-50/80">
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: tipo.color + '15' }}>
                      <IconComp style={{ width: 16, height: 16, color: tipo.color }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tipo.nombre}</p>
                      {tipo.es_sistema && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#EDE9FE', color: '#7C3AED', marginTop: 2 }}><Shield style={{ width: 9, height: 9 }} />Sistema</span>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <p style={{ fontSize: 12, color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tipo.descripcion || '—'}</p>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  {(!tipo.asignacion_tipo || tipo.asignacion_tipo === 'todos') ? (
                    <span style={{ fontSize: 11, color: '#003DA5', background: '#EFF6FF', padding: '3px 8px', borderRadius: 10, fontWeight: 600 }}>Todos</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>{tipo.asignacion_tipo}</span>
                      <span style={{ fontSize: 11, color: '#4B5563' }}>{tipo.asignacion_valor}</span>
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {(tipo.formatos_permitidos || []).slice(0, 3).map((f: string) => (
                      <span key={f} style={{ padding: '2px 6px', fontSize: 9, fontWeight: 600, borderRadius: 4, background: '#F3F4F6', color: '#6B7280', textTransform: 'uppercase' }}>{f === '*' ? 'Todos' : f}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  {tipo.obligatorio ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: '#FFFBEB', color: '#D97706' }}><AlertCircle style={{ width: 11, height: 11 }} />Sí</span> : <span style={{ fontSize: 11, color: '#9CA3AF' }}>No</span>}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  {tipo.activo ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: '#ECFDF5', color: '#059669' }}><CheckCircle style={{ width: 11, height: 11 }} />Activo</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626' }}>Inactivo</span>}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <button onClick={() => handleAbrirEditar(tipo)} disabled={tipo.es_sistema} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: tipo.es_sistema ? 'not-allowed' : 'pointer', background: tipo.es_sistema ? '#F3F4F6' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: tipo.es_sistema ? 0.4 : 1 }} title={tipo.es_sistema ? 'Tipo de sistema' : 'Editar'}>
                      <Edit style={{ width: 13, height: 13, color: tipo.es_sistema ? '#9CA3AF' : '#2962FF' }} />
                    </button>
                    <button onClick={() => handleEliminar(tipo)} disabled={tipo.es_sistema} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: tipo.es_sistema ? 'not-allowed' : 'pointer', background: tipo.es_sistema ? '#F3F4F6' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: tipo.es_sistema ? 0.4 : 1 }} title={tipo.es_sistema ? 'Tipo de sistema' : 'Eliminar'}>
                      <Trash2 style={{ width: 13, height: 13, color: tipo.es_sistema ? '#9CA3AF' : '#EF4444' }} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 2: LISTAS DE CHEQUEO — PLANTILLAS
// ============================================================================

function ChecklistTab({
  tiposDocumentos, templates, setTemplates, isLoading,
  getIconoComponente, getCategoriaInfo, focusField, setFocusField, reloadData,
}: any) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ChecklistTemplate> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addItemSearch, setAddItemSearch] = useState('');
  const [showAddItemPanel, setShowAddItemPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const selectedTemplate = selectedTemplateId
    ? editingTemplate?.id === selectedTemplateId ? editingTemplate as ChecklistTemplate : templates.find((t: ChecklistTemplate) => t.id === selectedTemplateId)
    : null;

  const handleNuevaLista = () => {
    const newTemplate: Partial<ChecklistTemplate> = {
      nombre: '',
      descripcion: '',
      color: TEMPLATE_COLORES[templates.length % TEMPLATE_COLORES.length],
      icono: 'clipboard-check',
      items: [],
      activo: true,
      rol_validador: '',
      asignaciones: [],
    };
    setEditingTemplate(newTemplate);
    setSelectedTemplateId('__new__');
  };

  const handleSelectTemplate = (tpl: ChecklistTemplate) => {
    setSelectedTemplateId(tpl.id);
    // Backward compat: ensure all items have itemId and nombre_documento
    const migratedItems = (tpl.items || []).map((item, idx) => ({
      ...item,
      itemId: item.itemId || `migrated_${tpl.id}_${idx}_${Date.now()}`,
      nombre_documento: item.nombre_documento || item.nombre,
    }));
    setEditingTemplate({ ...tpl, items: migratedItems });
    setShowAddItemPanel(false);
    setExpandedTipoId(null);
  };

  const handleGuardarPlantilla = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.nombre || editingTemplate.nombre.trim().length < 2) {
      toast.error('Validación', { description: 'El nombre de la lista es obligatorio (mín. 2 caracteres)' });
      return;
    }
    try {
      setIsSaving(true);
      const saved = await saveTemplate(editingTemplate as any);
      toast.success(editingTemplate.id && editingTemplate.id !== '__new__' ? 'Lista actualizada' : 'Lista creada', {
        description: `"${saved.nombre}" guardada exitosamente`,
      });
      await reloadData();
      setSelectedTemplateId(saved.id);
      setEditingTemplate(saved);
    } catch (err: any) {
      toast.error('Error al guardar', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarPlantilla = async () => {
    if (!selectedTemplate || !selectedTemplate.id || selectedTemplate.id === '__new__') return;
    try {
      setIsSaving(true);
      await deleteTemplate(selectedTemplate.id);
      toast.success('Lista eliminada', { description: `"${selectedTemplate.nombre}" eliminada` });
      setSelectedTemplateId(null);
      setEditingTemplate(null);
      setShowDeleteConfirm(false);
      await reloadData();
    } catch (err: any) {
      toast.error('Error al eliminar', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicar = async (tpl: ChecklistTemplate) => {
    try {
      setIsSaving(true);
      const dup = await saveTemplate({
        nombre: `${tpl.nombre} (copia)`,
        descripcion: tpl.descripcion,
        color: tpl.color,
        icono: tpl.icono,
        items: [...tpl.items],
        activo: true,
        rol_validador: tpl.rol_validador,
        asignaciones: [],
      });
      toast.success('Lista duplicada', { description: `"${dup.nombre}" creada` });
      await reloadData();
      setSelectedTemplateId(dup.id);
      setEditingTemplate(dup);
    } catch (err: any) {
      toast.error('Error al duplicar', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Item management
  const [expandedTipoId, setExpandedTipoId] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState('');

  const generateItemId = () => `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const addItem = (tipo: TipoDocumento, nombreDocumento?: string) => {
    if (!editingTemplate) return;
    const docName = (nombreDocumento || '').trim();
    if (!docName) {
      toast.error('Nombre requerido', { description: 'Ingresa el nombre específico del documento' });
      return;
    }
    const newItem: ChecklistItem = {
      itemId: generateItemId(),
      tipoDocumentoId: tipo.id,
      nombre: tipo.nombre,
      nombre_documento: docName,
      categoria: tipo.categoria,
      obligatorio: tipo.obligatorio,
      requiere_validacion: tipo.requiere_validacion,
      orden: (editingTemplate.items || []).length,
    };
    setEditingTemplate({
      ...editingTemplate,
      items: [...(editingTemplate.items || []), newItem],
    });
    setNewDocName('');
    setExpandedTipoId(null);
    toast.success('Agregado', { description: `"${docName}" añadido a la lista` });
  };

  const addItemLegacy = (tipo: TipoDocumento) => {
    // For "Add all" — uses tipo name as document name
    if (!editingTemplate) return;
    const newItem: ChecklistItem = {
      itemId: generateItemId(),
      tipoDocumentoId: tipo.id,
      nombre: tipo.nombre,
      nombre_documento: tipo.nombre,
      categoria: tipo.categoria,
      obligatorio: tipo.obligatorio,
      requiere_validacion: tipo.requiere_validacion,
      orden: (editingTemplate.items || []).length,
    };
    setEditingTemplate(prev => ({
      ...prev!,
      items: [...(prev!.items || []), newItem],
    }));
  };

  const removeItem = (itemId: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      items: (editingTemplate.items || []).filter(i => i.itemId !== itemId).map((item, idx) => ({ ...item, orden: idx })),
    });
  };

  const toggleItemProp = (itemId: string, prop: 'obligatorio' | 'requiere_validacion') => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      items: (editingTemplate.items || []).map(item =>
        item.itemId === itemId ? { ...item, [prop]: !item[prop] } : item
      ),
    });
  };

  const updateItemDocName = (itemId: string, newName: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      items: (editingTemplate.items || []).map(item =>
        item.itemId === itemId ? { ...item, nombre_documento: newName } : item
      ),
    });
  };

  const moveItem = (itemId: string, dir: 'up' | 'down') => {
    if (!editingTemplate) return;
    const items = [...(editingTemplate.items || [])];
    const idx = items.findIndex(i => i.itemId === itemId);
    if (idx < 0) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
    setEditingTemplate({ ...editingTemplate, items: items.map((it, i) => ({ ...it, orden: i })) });
  };

  // Available types for adding (all active types — duplicates allowed with different doc names)
  const availableTypes = useMemo(() => {
    let types = tiposDocumentos.filter((t: TipoDocumento) => t.activo);
    if (addItemSearch.trim()) {
      const q = addItemSearch.toLowerCase();
      types = types.filter((t: TipoDocumento) => t.nombre.toLowerCase().includes(q) || (t.descripcion || '').toLowerCase().includes(q));
    }
    return types;
  }, [tiposDocumentos, addItemSearch]);

  // Group available types by category
  const availableByCategory = useMemo(() => {
    const groups: Record<string, TipoDocumento[]> = {};
    availableTypes.forEach((t: TipoDocumento) => {
      const cat = t.categoria || 'otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  }, [availableTypes]);

  const itemsGroupedByCat = useMemo(() => {
    if (!editingTemplate?.items) return {};
    const groups: Record<string, ChecklistItem[]> = {};
    editingTemplate.items.forEach(item => {
      const cat = item.categoria || 'otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [editingTemplate?.items]);

  const isNew = selectedTemplateId === '__new__';
  const hasChanges = !!editingTemplate;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ════════ SIDEBAR: Lista de plantillas ════════ */}
      <div style={{ width: 280, borderRight: '1px solid #E5E7EB', background: '#FAFBFC', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Sidebar header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>Mis Listas</p>
              <p style={{ fontSize: 11, color: '#6B7280' }}>{templates.length} plantilla{templates.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={handleNuevaLista}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px dashed #BFDBFE',
              background: '#F0F7FF', color: '#2962FF', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s',
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            Nueva Lista de Chequeo
          </button>
        </div>

        {/* Sidebar items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {isLoading ? <LoadingState text="Cargando..." /> : templates.length === 0 && !isNew ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <ClipboardCheck style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>Sin listas de chequeo</p>
              <p style={{ fontSize: 11, color: '#9CA3AF' }}>Crea tu primera lista para definir qué documentos deben presentar las personas</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* New template (unsaved) */}
              {isNew && (
                <div
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    background: '#EFF6FF', border: '2px solid #2962FF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: (editingTemplate?.color || '#003DA5') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ClipboardCheck style={{ width: 16, height: 16, color: editingTemplate?.color || '#003DA5' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>{editingTemplate?.nombre || 'Nueva lista...'}</p>
                      <p style={{ fontSize: 10, color: '#6B7280' }}>Sin guardar · {(editingTemplate?.items || []).length} ítems</p>
                    </div>
                  </div>
                </div>
              )}

              {templates.map((tpl: ChecklistTemplate) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    style={{
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                      background: isSelected ? '#EFF6FF' : 'white',
                      border: isSelected ? '2px solid #2962FF' : '1px solid transparent',
                    }}
                    className={!isSelected ? 'hover:bg-gray-50' : ''}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: tpl.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ClipboardCheck style={{ width: 16, height: 16, color: tpl.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.nombre}</p>
                        <p style={{ fontSize: 10, color: '#6B7280' }}>
                          {tpl.items.length} documento{tpl.items.length !== 1 ? 's' : ''}
                          {' · '}
                          {tpl.items.filter(i => i.obligatorio).length} oblig.
                        </p>
                      </div>
                      {!tpl.activo && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#FEF2F2', color: '#DC2626' }}>OFF</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ════════ PANEL PRINCIPAL: Editor de plantilla ════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedTemplate && !isNew ? (
          /* Empty state - no template selected */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, background: '#F0F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <ClipboardCheck style={{ width: 40, height: 40, color: '#2962FF' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1F2937', marginBottom: 8 }}>Listas de Chequeo</h3>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
                Crea listas de chequeo para definir qué documentos deben presentar las personas en su carpeta digital.
                Cada lista tiene un conjunto de tipos de documentos con reglas de obligatoriedad y validación.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', background: '#F9FAFB', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                {[
                  { step: '1', title: 'Crea una nueva lista', desc: 'Dale un nombre descriptivo (ej: "Carpeta Docente", "Requisitos Contratista")' },
                  { step: '2', title: 'Agrega tipos de documentos', desc: 'Selecciona los documentos que se deben presentar de los tipos existentes' },
                  { step: '3', title: 'Configura cada ítem', desc: 'Define si es obligatorio u opcional, y si requiere validación manual' },
                  { step: '4', title: 'Guarda y asigna', desc: 'La lista queda disponible para asignar a personas o grupos' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#003DA5', color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.step}</div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>{s.title}</p>
                      <p style={{ fontSize: 11, color: '#6B7280' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleNuevaLista}
                style={{ padding: '10px 24px', borderRadius: 10, fontWeight: 700, color: 'white', background: '#2962FF', border: 'none', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                Crear Primera Lista
              </button>
            </div>
          </div>
        ) : editingTemplate ? (
          /* Template editor */
          <>
            {/* Editor header */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #E5E7EB', background: '#FAFBFC', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  {/* Color picker */}
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 10, background: editingTemplate.color || '#003DA5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <ClipboardCheck style={{ width: 18, height: 18, color: 'white' }} />
                    </div>
                  </div>

                  {/* Name input inline */}
                  <div style={{ flex: 1, maxWidth: 400 }}>
                    <input
                      type="text"
                      value={editingTemplate.nombre || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, nombre: e.target.value })}
                      placeholder="Nombre de la lista de chequeo..."
                      onFocus={() => setFocusField('tpl-name')}
                      onBlur={() => setFocusField(null)}
                      style={inputStyle(focusField === 'tpl-name')}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Color selector mini */}
                  <div style={{ display: 'flex', gap: 3 }}>
                    {TEMPLATE_COLORES.slice(0, 6).map(c => (
                      <button
                        key={c}
                        onClick={() => setEditingTemplate({ ...editingTemplate, color: c })}
                        style={{
                          width: 20, height: 20, borderRadius: '50%', backgroundColor: c, border: editingTemplate.color === c ? '2px solid #1F2937' : '2px solid transparent',
                          cursor: 'pointer', transition: 'all 0.15s', transform: editingTemplate.color === c ? 'scale(1.15)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>

                  <div style={{ width: 1, height: 24, background: '#E5E7EB', margin: '0 4px' }} />

                  {selectedTemplateId !== '__new__' && (
                    <>
                      <button
                        onClick={() => setShowPreview(true)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #BFDBFE', background: '#F0F7FF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Vista previa (perspectiva del usuario)"
                      >
                        <Eye style={{ width: 14, height: 14, color: '#2962FF' }} />
                      </button>
                      <button
                        onClick={() => handleDuplicar(editingTemplate as ChecklistTemplate)}
                        disabled={isSaving}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Duplicar lista"
                      >
                        <Copy style={{ width: 14, height: 14, color: '#6B7280' }} />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Eliminar lista"
                      >
                        <Trash2 style={{ width: 14, height: 14, color: '#DC2626' }} />
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleGuardarPlantilla}
                    disabled={isSaving}
                    style={{
                      padding: '8px 20px', borderRadius: 10, fontWeight: 700, color: 'white',
                      background: '#2962FF', border: 'none', cursor: 'pointer', fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 8, opacity: isSaving ? 0.6 : 1,
                    }}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save style={{ width: 15, height: 15 }} />}
                    {isNew ? 'Crear Lista' : 'Guardar'}
                  </button>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  value={editingTemplate.descripcion || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, descripcion: e.target.value })}
                  placeholder="Descripción breve (opcional)..."
                  onFocus={() => setFocusField('tpl-desc')}
                  onBlur={() => setFocusField(null)}
                  style={{ ...inputStyle(focusField === 'tpl-desc'), height: 32, fontSize: 12, color: '#6B7280' }}
                />
              </div>
            </div>

            {/* Items header + add button */}
            <div style={{ padding: '12px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>
                  Documentos en esta lista
                </p>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#EFF6FF', color: '#003DA5' }}>
                  {(editingTemplate.items || []).length} ítems
                </span>
                {(editingTemplate.items || []).filter(i => i.obligatorio).length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#FFFBEB', color: '#D97706' }}>
                    {(editingTemplate.items || []).filter(i => i.obligatorio).length} obligatorios
                  </span>
                )}
                {(editingTemplate.items || []).filter(i => i.requiere_validacion).length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#F5F3FF', color: '#7C3AED' }}>
                    {(editingTemplate.items || []).filter(i => i.requiere_validacion).length} con validación
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAddItemPanel(!showAddItemPanel)}
                style={{
                  padding: '7px 16px', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  border: showAddItemPanel ? '2px solid #2962FF' : '2px dashed #BFDBFE',
                  background: showAddItemPanel ? '#EFF6FF' : '#F0F7FF',
                  color: '#2962FF', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {showAddItemPanel ? <X style={{ width: 14, height: 14 }} /> : <Plus style={{ width: 14, height: 14 }} />}
                {showAddItemPanel ? 'Cerrar' : 'Agregar Documentos'}
              </button>
            </div>

            {/* Main content area */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Items list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                {(editingTemplate.items || []).length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: '#F0F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <ListChecks style={{ width: 32, height: 32, color: '#2962FF' }} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Lista vacía</p>
                    <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 20, maxWidth: 300, margin: '0 auto 20px' }}>
                      Agrega tipos de documentos a esta lista usando el botón "Agregar Documentos" de arriba.
                      Cada ítem puede ser obligatorio u opcional.
                    </p>
                    <button
                      onClick={() => setShowAddItemPanel(true)}
                      style={{ padding: '8px 20px', borderRadius: 10, fontWeight: 700, color: 'white', background: '#2962FF', border: 'none', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      <Plus style={{ width: 16, height: 16 }} />
                      Agregar Documentos
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Info banner */}
                    <div style={{ padding: '10px 24px', background: '#F0F7FF', borderBottom: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Info style={{ width: 14, height: 14, color: '#2962FF', flexShrink: 0 }} />
                      <p style={{ fontSize: 11, color: '#1E40AF' }}>
                        Configura cada ítem: <strong>Obligatorio</strong> = la persona debe subir este documento. <strong>Validación</strong> = requiere aprobación de un administrador.
                      </p>
                    </div>

                    {/* Items grouped by category */}
                    {Object.entries(itemsGroupedByCat).map(([catId, items]) => {
                      const catInfo = getCategoriaInfo(catId);
                      return (
                        <div key={catId}>
                          <div style={{ padding: '10px 24px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <catInfo.icon style={{ width: 14, height: 14, color: catInfo.color }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: catInfo.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{catInfo.nombre}</span>
                            <span style={{ fontSize: 10, color: '#9CA3AF' }}>({items.length})</span>
                          </div>
                          {items.map((item: ChecklistItem, idx: number) => {
                            const tipo = tiposDocumentos.find((t: TipoDocumento) => t.id === item.tipoDocumentoId);
                            const IconComp = tipo ? getIconoComponente(tipo.icono) : FileText;
                            const itemColor = tipo?.color || '#6B7280';
                            const itemKey = item.itemId || item.tipoDocumentoId;

                            return (
                              <div
                                key={itemKey}
                                style={{
                                  display: 'flex', alignItems: 'center', padding: '10px 24px', gap: 12,
                                  borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s',
                                }}
                                className="hover:bg-blue-50/30"
                              >
                                {/* Order arrows */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                                  <button onClick={() => moveItem(itemKey, 'up')} style={{ width: 18, height: 13, borderRadius: 3, border: 'none', cursor: 'pointer', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }} className="hover:opacity-100">
                                    <ArrowUp style={{ width: 11, height: 11, color: '#6B7280' }} />
                                  </button>
                                  <button onClick={() => moveItem(itemKey, 'down')} style={{ width: 18, height: 13, borderRadius: 3, border: 'none', cursor: 'pointer', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }} className="hover:opacity-100">
                                    <ArrowDown style={{ width: 11, height: 11, color: '#6B7280' }} />
                                  </button>
                                </div>

                                {/* Order number */}
                                <span style={{ width: 22, height: 22, borderRadius: 6, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#6B7280', flexShrink: 0 }}>
                                  {idx + 1}
                                </span>

                                {/* Icon */}
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: itemColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <IconComp style={{ width: 15, height: 15, color: itemColor }} />
                                </div>

                                {/* Name — shows document name + tipo */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.nombre_documento || item.nombre}
                                  </p>
                                  <p style={{ fontSize: 10, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.nombre}{item.nombre_documento && item.nombre_documento !== item.nombre ? ` · ${tipo?.descripcion || ''}` : (tipo?.descripcion || '')}
                                  </p>
                                </div>

                                {/* Inline edit doc name */}
                                <button
                                  onClick={() => {
                                    const newName = prompt('Nombre del documento:', item.nombre_documento || item.nombre);
                                    if (newName && newName.trim()) updateItemDocName(itemKey, newName.trim());
                                  }}
                                  style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', cursor: 'pointer', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                  title="Editar nombre del documento"
                                >
                                  <Edit style={{ width: 12, height: 12, color: '#6B7280' }} />
                                </button>

                                {/* Toggle: Obligatorio */}
                                <button
                                  onClick={() => toggleItemProp(itemKey, 'obligatorio')}
                                  style={{
                                    padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: item.obligatorio ? '#FFFBEB' : '#F3F4F6',
                                    display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                                  }}
                                >
                                  {item.obligatorio ? <AlertCircle style={{ width: 13, height: 13, color: '#D97706' }} /> : <CircleDot style={{ width: 13, height: 13, color: '#9CA3AF' }} />}
                                  <span style={{ fontSize: 11, fontWeight: 700, color: item.obligatorio ? '#D97706' : '#9CA3AF' }}>
                                    {item.obligatorio ? 'Obligatorio' : 'Opcional'}
                                  </span>
                                </button>

                                {/* Toggle: Validación */}
                                <button
                                  onClick={() => toggleItemProp(itemKey, 'requiere_validacion')}
                                  style={{
                                    padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: item.requiere_validacion ? '#F5F3FF' : '#F3F4F6',
                                    display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                                  }}
                                >
                                  {item.requiere_validacion ? <Shield style={{ width: 13, height: 13, color: '#7C3AED' }} /> : <CircleDot style={{ width: 13, height: 13, color: '#9CA3AF' }} />}
                                  <span style={{ fontSize: 11, fontWeight: 700, color: item.requiere_validacion ? '#7C3AED' : '#9CA3AF' }}>
                                    {item.requiere_validacion ? 'Validación' : 'Sin valid.'}
                                  </span>
                                </button>

                                {/* Remove */}
                                <button
                                  onClick={() => removeItem(itemKey)}
                                  style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Quitar de la lista"
                                >
                                  <XCircle style={{ width: 14, height: 14, color: '#DC2626' }} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ════════ ASIGNACIONES SECTION ════════ */}
                {(editingTemplate.items || []).length > 0 && (
                  <AsignacionesSection
                    asignaciones={editingTemplate.asignaciones || []}
                    rol_validador={editingTemplate.rol_validador || ''}
                    onChange={(asignaciones, rol_validador) => setEditingTemplate({ ...editingTemplate, asignaciones, rol_validador })}
                    focusField={focusField}
                    setFocusField={setFocusField}
                  />
                )}
              </div>

              {/* ════════ ADD ITEM PANEL (right sidebar) ════════ */}
              {showAddItemPanel && (
                <div style={{ width: 320, borderLeft: '1px solid #E5E7EB', background: '#FAFBFC', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>Tipos disponibles</p>
                    <SearchInput
                      value={addItemSearch}
                      onChange={setAddItemSearch}
                      placeholder="Buscar tipo..."
                      focusId="add-item-search"
                      focusField={focusField}
                      setFocusField={setFocusField}
                    />
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
                    {availableTypes.length === 0 ? (
                      <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                        <Check style={{ width: 32, height: 32, color: '#059669', margin: '0 auto 8px' }} />
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          {addItemSearch ? 'Sin resultados' : 'No hay tipos de documentos disponibles'}
                        </p>
                      </div>
                    ) : (
                      Object.entries(availableByCategory).map(([catId, types]: [string, any]) => {
                        const catInfo = getCategoriaInfo(catId);
                        return (
                          <div key={catId} style={{ marginBottom: 12 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: catInfo.color, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px' }}>
                              {catInfo.nombre}
                            </p>
                            {types.map((tipo: TipoDocumento) => {
                              const IconComp = getIconoComponente(tipo.icono);
                              const isExpanded = expandedTipoId === tipo.id;
                              const existingCount = (editingTemplate?.items || []).filter(i => i.tipoDocumentoId === tipo.id).length;
                              return (
                                <div key={tipo.id} style={{ marginBottom: 4 }}>
                                  <button
                                    onClick={() => {
                                      if (isExpanded) {
                                        setExpandedTipoId(null);
                                        setNewDocName('');
                                      } else {
                                        setExpandedTipoId(tipo.id);
                                        setNewDocName('');
                                      }
                                    }}
                                    style={{
                                      width: '100%', padding: '8px 10px', borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                                      border: isExpanded ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
                                      borderBottom: isExpanded ? '1px dashed #BFDBFE' : '1px solid #E5E7EB',
                                      background: isExpanded ? '#F0F7FF' : 'white', cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', gap: 10,
                                      transition: 'all 0.15s', textAlign: 'left',
                                    }}
                                    className={!isExpanded ? 'hover:bg-blue-50 hover:border-blue-200' : ''}
                                  >
                                    <div style={{ width: 28, height: 28, borderRadius: 6, background: tipo.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <IconComp style={{ width: 13, height: 13, color: tipo.color }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tipo.nombre}</p>
                                      <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                                        {existingCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: '#2962FF' }}>{existingCount} en lista</span>}
                                        {tipo.obligatorio && <span style={{ fontSize: 9, fontWeight: 600, color: '#D97706' }}>Obligatorio</span>}
                                        {tipo.requiere_validacion && <span style={{ fontSize: 9, fontWeight: 600, color: '#7C3AED' }}>Validación</span>}
                                      </div>
                                    </div>
                                    <Plus style={{ width: 16, height: 16, color: '#2962FF', flexShrink: 0, transform: isExpanded ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                                  </button>
                                  {isExpanded && (
                                    <div style={{
                                      padding: '10px', background: '#F0F7FF',
                                      border: '1px solid #BFDBFE', borderTop: 'none',
                                      borderRadius: '0 0 8px 8px',
                                    }}>
                                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                                        Nombre del documento a chequear
                                      </label>
                                      <input
                                        type="text"
                                        value={newDocName}
                                        onChange={(e) => setNewDocName(e.target.value)}
                                        placeholder={`Ej: ${tipo.nombre === 'Personal' ? 'Cédula de ciudadanía' : tipo.nombre === 'Académico' ? 'Diploma de pregrado' : 'Nombre específico...'}`}
                                        onFocus={() => setFocusField('new-doc-name')}
                                        onBlur={() => setFocusField(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && newDocName.trim()) {
                                            addItem(tipo, newDocName);
                                          }
                                        }}
                                        autoFocus
                                        style={{
                                          height: 32, border: focusField === 'new-doc-name' ? '1px solid #003DA5' : '1px solid #D1D5DB',
                                          borderRadius: 8, fontSize: 12, color: '#1F2937', padding: '0 10px',
                                          outline: 'none', background: 'white', width: '100%',
                                          boxShadow: focusField === 'new-doc-name' ? '0 0 0 3px rgba(0,61,165,0.08)' : 'none',
                                        }}
                                      />
                                      <button
                                        onClick={() => addItem(tipo, newDocName)}
                                        disabled={!newDocName.trim()}
                                        style={{
                                          width: '100%', marginTop: 6, padding: '6px 12px', borderRadius: 8,
                                          border: 'none', background: newDocName.trim() ? '#2962FF' : '#D1D5DB',
                                          color: 'white', fontSize: 11, fontWeight: 700, cursor: newDocName.trim() ? 'pointer' : 'not-allowed',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        }}
                                      >
                                        <Plus style={{ width: 13, height: 13 }} />
                                        Agregar a la lista
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add all button */}
                  {availableTypes.length > 0 && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB' }}>
                      <button
                        onClick={() => {
                          availableTypes.forEach((t: TipoDocumento) => addItemLegacy(t));
                          setShowAddItemPanel(false);
                        }}
                        style={{
                          width: '100%', padding: '8px 16px', borderRadius: 10, border: '1px solid #D1D5DB',
                          background: 'white', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                      >
                        <Plus style={{ width: 14, height: 14 }} />
                        Agregar todos ({availableTypes.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', padding: 24, maxWidth: 400, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 style={{ width: 24, height: 24, color: '#DC2626' }} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>Eliminar lista de chequeo</h3>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  ¿Eliminar <strong>"{editingTemplate?.nombre}"</strong>? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#374151', background: 'white', border: '1px solid #D1D5DB', borderRadius: 10, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleEliminarPlantilla} disabled={isSaving} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: '#DC2626', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: isSaving ? 0.6 : 1 }}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 style={{ width: 14, height: 14 }} />} Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && editingTemplate && (editingTemplate.items || []).length > 0 && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxWidth: 600, width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: editingTemplate.color || '#003DA5', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClipboardCheck style={{ width: 24, height: 24, color: 'white' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vista Previa — Perspectiva del Usuario</p>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: 'white' }}>{editingTemplate.nombre || 'Sin nombre'}</h3>
                  </div>
                </div>
                <button onClick={() => setShowPreview(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 18, height: 18, color: 'white' }} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {editingTemplate.descripcion && (
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>{editingTemplate.descripcion}</p>
              )}

              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#D97706' }}>{(editingTemplate.items || []).filter(i => i.obligatorio).length}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#92400E' }}>Obligatorios</p>
                </div>
                <div style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: '#F0F7FF', border: '1px solid #BFDBFE' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#2962FF' }}>{(editingTemplate.items || []).filter(i => !i.obligatorio).length}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#1E40AF' }}>Opcionales</p>
                </div>
                <div style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#7C3AED' }}>{(editingTemplate.items || []).filter(i => i.requiere_validacion).length}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#5B21B6' }}>Con Validación</p>
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: '#F0F7FF', borderRadius: 10, border: '1px solid #BFDBFE', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info style={{ width: 14, height: 14, color: '#2962FF', flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: '#1E40AF' }}>
                  Esta es la lista de documentos que el usuario debe subir. Los <strong>obligatorios</strong> son requisito para completar la lista.
                </p>
              </div>

              {(() => {
                const byCategory: Record<string, ChecklistItem[]> = {};
                (editingTemplate.items || []).forEach((item: ChecklistItem) => {
                  const cat = item.categoria || 'otros';
                  if (!byCategory[cat]) byCategory[cat] = [];
                  byCategory[cat].push(item);
                });
                return Object.entries(byCategory).map(([catId, items]) => {
                  const catInfo = getCategoriaInfo(catId);
                  return (
                    <div key={catId} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <catInfo.icon style={{ width: 14, height: 14, color: catInfo.color }} />
                        <span style={{ fontSize: 11, fontWeight: 800, color: catInfo.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{catInfo.nombre}</span>
                      </div>
                      {items.map((item: ChecklistItem, idx: number) => (
                        <div key={item.itemId || item.tipoDocumentoId} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', gap: 12, marginBottom: 4 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid #D1D5DB', flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', minWidth: 16 }}>{idx + 1}.</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{item.nombre_documento || item.nombre}</p>
                            {item.nombre_documento && item.nombre_documento !== item.nombre && (
                              <p style={{ fontSize: 10, color: '#9CA3AF' }}>{item.nombre}</p>
                            )}
                          </div>
                          {item.obligatorio && <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#FFFBEB', color: '#D97706', flexShrink: 0 }}>Obligatorio</span>}
                          {item.requiere_validacion && <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#F5F3FF', color: '#7C3AED', flexShrink: 0 }}>Validación</span>}
                          <button style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#F0F7FF', color: '#2962FF', fontSize: 11, fontWeight: 600, cursor: 'default', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <FileUp style={{ width: 12, height: 12 }} /> Subir
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPreview(false)} style={{ padding: '8px 20px', borderRadius: 10, fontWeight: 700, color: 'white', background: editingTemplate.color || '#003DA5', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ============================================================================
// ASIGNACIONES SECTION
// ============================================================================

interface Asignacion {
  tipo: string;
  valor: string;
  label?: string;
}

function AsignacionesSection({ asignaciones, rol_validador, onChange, focusField, setFocusField }: {
  asignaciones: Asignacion[];
  rol_validador?: string;
  onChange: (asignaciones: Asignacion[], rol_validador?: string) => void;
  focusField: string | null;
  setFocusField: (f: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState<string>('todos');
  const [nuevoValor, setNuevoValor] = useState('');

  const tiposAsignacion = [
    { id: 'todos', label: 'Todos los usuarios', icon: User, color: '#003DA5', needsValue: false },
    { id: 'territorial', label: 'Por Territorial', icon: FolderOpen, color: '#059669', needsValue: true, placeholder: 'Ej: Cundinamarca, Antioquia...' },
    { id: 'cetap', label: 'Por CETAP', icon: Award, color: '#7C3AED', needsValue: true, placeholder: 'Ej: CETAP Bogotá, CETAP Medellín...' },
    { id: 'programa', label: 'Por Programa', icon: Briefcase, color: '#D97706', needsValue: true, placeholder: 'Ej: Administración Pública, Derecho...' },
    { id: 'persona', label: 'Persona específica', icon: User, color: '#DC2626', needsValue: true, placeholder: 'Ej: correo@esap.edu.co' },
  ];

  const tipoActual = tiposAsignacion.find(t => t.id === nuevoTipo) || tiposAsignacion[0];

  const agregarAsignacion = () => {
    if (tipoActual.needsValue && !nuevoValor.trim()) {
      toast.error('Valor requerido', { description: 'Ingresa un valor para la asignación' });
      return;
    }
    // Check for duplicates
    const exists = asignaciones.some(a => a.tipo === nuevoTipo && (a.valor === nuevoValor || (!tipoActual.needsValue && a.tipo === 'todos')));
    if (exists) {
      toast.error('Ya existe', { description: 'Esta asignación ya está en la lista' });
      return;
    }
    const nueva: Asignacion = {
      tipo: nuevoTipo,
      valor: tipoActual.needsValue ? nuevoValor.trim() : '*',
      label: tipoActual.needsValue ? `${tipoActual.label}: ${nuevoValor.trim()}` : tipoActual.label,
    };
    onChange([...asignaciones, nueva], rol_validador);
    setNuevoValor('');
    toast.success('Asignación agregada');
  };

  const removerAsignacion = (idx: number) => {
    const updated = [...asignaciones];
    updated.splice(idx, 1);
    onChange(updated, rol_validador);
  };

  return (
    <div style={{ borderTop: '1px solid #E5E7EB' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', padding: '12px 24px', background: '#FAFBFC', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: expanded ? '1px solid #E5E7EB' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <User style={{ width: 14, height: 14, color: '#003DA5' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>Asignaciones</span>
          {asignaciones.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#ECFDF5', color: '#059669' }}>
              {asignaciones.length}
            </span>
          )}
          {asignaciones.length === 0 && (
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Sin asignar (disponible para todos)</span>
          )}
        </div>
        <ChevronDown style={{ width: 14, height: 14, color: '#6B7280', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
      </button>

      {expanded && (
        <div style={{ padding: '16px 24px' }}>
          <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 12 }}>
            Define a quién aplica esta lista de chequeo. Si no hay asignaciones, la lista estará disponible para todos los usuarios.
          </p>

          {/* Current assignments */}
          {asignaciones.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {asignaciones.map((asig, idx) => {
                const tipoInfo = tiposAsignacion.find(t => t.id === asig.tipo) || tiposAsignacion[0];
                const TipoIcon = tipoInfo.icon;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <TipoIcon style={{ width: 14, height: 14, color: tipoInfo.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>
                        {asig.label || `${tipoInfo.label}${asig.valor !== '*' ? `: ${asig.valor}` : ''}`}
                      </span>
                    </div>
                    <button onClick={() => removerAsignacion(idx)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: '#FEE2E2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X style={{ width: 12, height: 12, color: '#DC2626' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new assignment */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Tipo de asignación</label>
              <select
                value={nuevoTipo}
                onChange={(e) => { setNuevoTipo(e.target.value); setNuevoValor(''); }}
                onFocus={() => setFocusField('asig-tipo')}
                onBlur={() => setFocusField(null)}
                style={{
                  height: 36, border: focusField === 'asig-tipo' ? '1px solid #003DA5' : '1px solid #D1D5DB',
                  borderRadius: 10, fontSize: 13, color: '#1F2937', padding: '0 12px', outline: 'none',
                  background: 'white', width: '100%',
                  boxShadow: focusField === 'asig-tipo' ? '0 0 0 3px rgba(0,61,165,0.08)' : 'none',
                }}
              >
                {tiposAsignacion.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            {tipoActual.needsValue && (
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Valor</label>
                <input
                  type="text"
                  value={nuevoValor}
                  onChange={(e) => setNuevoValor(e.target.value)}
                  placeholder={tipoActual.placeholder}
                  onFocus={() => setFocusField('asig-valor')}
                  onBlur={() => setFocusField(null)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarAsignacion()}
                  style={{
                    height: 36, border: focusField === 'asig-valor' ? '1px solid #003DA5' : '1px solid #D1D5DB',
                    borderRadius: 10, fontSize: 13, color: '#1F2937', padding: '0 12px', outline: 'none',
                    background: 'white', width: '100%',
                    boxShadow: focusField === 'asig-valor' ? '0 0 0 3px rgba(0,61,165,0.08)' : 'none',
                  }}
                />
              </div>
            )}

            <button
              onClick={agregarAsignacion}
              style={{
                height: 36, padding: '0 16px', borderRadius: 10, border: 'none', background: '#2962FF',
                color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Agregar
            </button>
          </div>
          {/* Rol Validador Configuration */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Shield style={{ width: 14, height: 14, color: '#1E40AF' }} />
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>Rol Validador de esta Lista</p>
            </div>
            <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
              Â¿QuiÃ©n puede validar los documentos de esta lista una vez que el usuario los suba? 
              <span style={{ color: '#F59E0B' }}> (Dejar vacÃo para que cualquier revisor autorizado pueda validar)</span>
            </p>
            <input 
              type="text" 
              value={rol_validador || ''} 
              onChange={(e) => onChange(asignaciones, e.target.value)} 
              placeholder="Ej: Coordinador AcadÃ©mico, RRHH, Revisor..." 
              style={{
                height: 36, border: focusField === 'form-rol-tpl' ? '1px solid #2563EB' : '1px solid #D1D5DB',
                borderRadius: 8, fontSize: 13, color: '#1F2937', padding: '0 12px', outline: 'none',
                background: 'white', width: '100%',
                boxShadow: focusField === 'form-rol-tpl' ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
              }}
              onFocus={() => setFocusField('form-rol-tpl')} 
              onBlur={() => setFocusField(null)} 
            />
          </div>

        </div>
      )}
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function SearchInput({ value, onChange, placeholder, focusId, focusField, setFocusField }: {
  value: string; onChange: (v: string) => void; placeholder: string; focusId: string; focusField: string | null; setFocusField: (f: string | null) => void;
}) {
  const isFocused = focusField === focusId;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center',
        height: 36, borderRadius: 10,
        border: isFocused ? '1px solid #003DA5' : '1px solid #D1D5DB',
        boxShadow: isFocused ? '0 0 0 3px rgba(0,61,165,0.08)' : 'none',
        background: 'white', transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Search style={{ width: 15, height: 15, color: '#9CA3AF' }} />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocusField(focusId)}
        onBlur={() => setFocusField(null)}
        style={{ fontSize: 13, color: '#1F2937', border: 'none', outline: 'none', background: 'transparent', height: '100%', width: '100%', padding: '0 10px 0 0' }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 4, flexShrink: 0 }}
        >
          <X style={{ width: 12, height: 12, color: '#6B7280' }} />
        </button>
      )}
    </div>
  );
}

function CategoryFilter({ current, onChange }: { current: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#F3F4F6', borderRadius: 10, padding: 3 }}>
      <button
        onClick={() => onChange('all')}
        style={{
          padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', background: current === 'all' ? 'white' : 'transparent',
          color: current === 'all' ? '#003DA5' : '#6B7280',
          boxShadow: current === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        Todas
      </button>
      {CATEGORIAS_CARPETA.map(cat => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          style={{
            padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', background: current === cat.id ? 'white' : 'transparent',
            color: current === cat.id ? cat.color : '#6B7280',
            boxShadow: current === cat.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {cat.nombre}
        </button>
      ))}
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#003DA5' }} />
        <p style={{ fontSize: 12, color: '#6B7280' }}>{text}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }: {
  icon: any; title: string; subtitle: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Icon style={{ width: 64, height: 64, color: '#D1D5DB', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>{subtitle}</p>
        {actionLabel && onAction && (
          <button onClick={onAction} style={{ padding: '8px 16px', borderRadius: 10, fontWeight: 700, color: 'white', background: '#2962FF', border: 'none', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Plus style={{ width: 16, height: 16 }} /> {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL CREAR/EDITAR TIPO
// ============================================================================

function FormModalTipo({ show, onClose, formulario, setFormulario, modoEdicion, isSaving, onGuardar, toggleFormatoPermitido, focusField, setFocusField }: any) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {modoEdicion ? <Edit style={{ width: 20, height: 20, color: '#003DA5' }} /> : <Plus style={{ width: 20, height: 20, color: '#003DA5' }} />}
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>{modoEdicion ? 'Editar Tipo de Documento' : 'Nuevo Tipo de Documento'}</h3>
                <p style={{ fontSize: 12, color: '#6B7280' }}>{modoEdicion ? 'Actualiza la configuración' : 'Completa los datos del tipo'}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 16, height: 16, color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(85vh - 140px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Nombre <span style={{ color: '#EF4444' }}>*</span></label>
              <input type="text" value={formulario.nombre} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormulario({ ...formulario, nombre: e.target.value })} placeholder="Ej: Copia documento de identidad" onFocus={() => setFocusField('form-nombre')} onBlur={() => setFocusField(null)} style={inputStyle(focusField === 'form-nombre')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Descripción</label>
              <textarea value={formulario.descripcion} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormulario({ ...formulario, descripcion: e.target.value })} placeholder="Describe el tipo de documento..." rows={2} onFocus={() => setFocusField('form-desc')} onBlur={() => setFocusField(null)} style={textareaStyle(focusField === 'form-desc')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Carpeta / Categoría</label>
                <select value={formulario.categoria} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormulario({ ...formulario, categoria: e.target.value })} onFocus={() => setFocusField('form-cat')} onBlur={() => setFocusField(null)} style={selectStyle(focusField === 'form-cat')}>
                  {CATEGORIAS_CARPETA.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Icono</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ICONOS.map(ic => {
                    const Ic = ic.comp;
                    return (
                      <button key={ic.valor} type="button" onClick={() => setFormulario({ ...formulario, icono: ic.valor })} style={{ width: 32, height: 32, borderRadius: 8, border: formulario.icono === ic.valor ? '2px solid #2962FF' : '1px solid #E5E7EB', background: formulario.icono === ic.valor ? '#EFF6FF' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title={ic.nombre}>
                        <Ic style={{ width: 16, height: 16, color: formulario.icono === ic.valor ? '#2962FF' : '#6B7280' }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORES.map(c => <button key={c.valor} type="button" onClick={() => setFormulario({ ...formulario, color: c.valor })} style={{ width: 28, height: 28, borderRadius: '50%', border: formulario.color === c.valor ? '3px solid #1F2937' : '2px solid transparent', backgroundColor: c.valor, cursor: 'pointer', transform: formulario.color === c.valor ? 'scale(1.1)' : 'scale(1)' }} title={c.nombre} />)}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Formatos permitidos</label>
              <div className="flex items-center gap-2 flex-wrap">
                {FORMATOS.map(f => {
                  const parts = f.value.split(',');
                  const isAll = f.value === '*';
                  const isSelected = isAll ? formulario.formatos_permitidos.includes('*') : parts.every((p: string) => formulario.formatos_permitidos.includes(p));
                  return (
                    <button key={f.value} type="button" onClick={() => toggleFormatoPermitido(f.value)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: isSelected ? '1px solid #BFDBFE' : '1px solid #E5E7EB', background: isSelected ? '#EFF6FF' : 'white', color: isSelected ? '#2962FF' : '#6B7280', cursor: 'pointer' }}>{f.label}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Tamaño máximo (MB)</label>
              <input type="number" min={1} max={100} value={formulario.tamano_max_mb} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormulario({ ...formulario, tamano_max_mb: parseInt(e.target.value) || 10 })} onFocus={() => setFocusField('form-size')} onBlur={() => setFocusField(null)} style={{ ...inputStyle(focusField === 'form-size'), width: 100 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { key: 'obligatorio' as const, label: 'Obligatorio', desc: 'El usuario debe subir este tipo', color: '#D97706', activeBg: '#FFFBEB', activeBorder: '#FDE68A' },
                { key: 'requiere_validacion' as const, label: 'Validación', desc: 'Requiere revisión manual', color: '#2962FF', activeBg: '#EFF6FF', activeBorder: '#BFDBFE' },
                { key: 'activo' as const, label: 'Activo', desc: 'Visible para usuarios', color: '#059669', activeBg: '#ECFDF5', activeBorder: '#A7F3D0' },
              ].map(toggle => {
                const isActive = formulario[toggle.key];
                return (
                  <button key={toggle.key} type="button" onClick={() => setFormulario({ ...formulario, [toggle.key]: !isActive })} style={{ padding: 12, borderRadius: 10, textAlign: 'left' as any, cursor: 'pointer', border: isActive ? `1px solid ${toggle.activeBorder}` : '1px solid #E5E7EB', background: isActive ? toggle.activeBg : '#F9FAFB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {isActive ? <ToggleRight style={{ width: 20, height: 20, color: toggle.color }} /> : <ToggleLeft style={{ width: 20, height: 20, color: '#9CA3AF' }} />}
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{toggle.label}</span>
                    </div>
                    <p style={{ fontSize: 10, color: '#6B7280' }}>{toggle.desc}</p>
                  </button>
                );
              })}
            </div>

            {formulario.requiere_validacion && (
              <div style={{ padding: '16px', background: '#EFF6FF', borderRadius: 12, border: '1px solid #BFDBFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Shield style={{ width: 16, height: 16, color: '#1E40AF' }} />
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#1E40AF' }}>
                    Autorización de Validación
                  </label>
                </div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#3B82F6', marginBottom: 4 }}>
                  Especifique qué Rol puede validar este documento
                </label>
                <input 
                  type="text" 
                  value={formulario.rol_validador || ''} 
                  onChange={(e: any) => setFormulario({ ...formulario, rol_validador: e.target.value })} 
                  placeholder="Ej: Coordinador Académico, RRHH, Revisor..." 
                  style={{
                    height: 36, border: focusField === 'form-rol' ? '1px solid #2563EB' : '1px solid #93C5FD',
                    borderRadius: 10, fontSize: 13, color: '#1E3A8A', padding: '0 12px', outline: 'none',
                    background: 'white', width: '100%',
                    boxShadow: focusField === 'form-rol' ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
                  }}
                  onFocus={() => setFocusField('form-rol')} 
                  onBlur={() => setFocusField(null)} 
                />
                <p style={{ fontSize: 10, color: '#60A5FA', marginTop: 6 }}>Si se deja vacío, cualquier usuario con permisos de edición en la carpeta podrá validarlo.</p>
              </div>
            )}

            {/* SECCIÓN ASIGNACIÓN */}
            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Shield style={{ width: 16, height: 16, color: '#003DA5' }} />
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1E293B' }}>Alcance y Visibilidad</label>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Asignar a</label>
                  <select
                    value={formulario.asignacion_tipo}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormulario({ ...formulario, asignacion_tipo: e.target.value as any, asignacion_valor: '' })}
                    onFocus={() => setFocusField('form-asig-tipo')} onBlur={() => setFocusField(null)}
                    style={selectStyle(focusField === 'form-asig-tipo')}
                  >
                    <option value="todos">🔹 Todos los usuarios</option>
                    <option value="rol">👥 Por Rol Específico</option>
                    <option value="territorial">📍 Por Territorial</option>
                    <option value="sede">🏢 Por Sede / CETAP</option>
                    <option value="asignatura">📚 Por Asignatura</option>
                  </select>
                </div>
                {formulario.asignacion_tipo !== 'todos' && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                      Especifique el {formulario.asignacion_tipo}
                    </label>
                    <input
                      type="text"
                      value={formulario.asignacion_valor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormulario({ ...formulario, asignacion_valor: e.target.value })}
                      placeholder={
                        formulario.asignacion_tipo === 'rol' ? 'Ej: Docente, Estudiante' :
                        formulario.asignacion_tipo === 'territorial' ? 'Ej: Antioquia' :
                        formulario.asignacion_tipo === 'sede' ? 'Ej: CETAP Medellín' : 'Ej: Algebra'
                      }
                      onFocus={() => setFocusField('form-asig-valor')} onBlur={() => setFocusField(null)}
                      style={inputStyle(focusField === 'form-asig-valor')}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#374151', background: 'white', border: '1px solid #D1D5DB', borderRadius: 10, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onGuardar} disabled={isSaving} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700, color: 'white', background: '#2962FF', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: isSaving ? 0.6 : 1 }}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save style={{ width: 16, height: 16 }} />}
            {modoEdicion ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MODAL CONFIRMAR ELIMINACIÓN
// ============================================================================

function DeleteConfirmModal({ show, onClose, tipoAEliminar, isSaving, onConfirm }: any) {
  if (!show || !tipoAEliminar) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-6">
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trash2 style={{ width: 24, height: 24, color: '#DC2626' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>Eliminar tipo de documento</h3>
            <p style={{ fontSize: 13, color: '#6B7280' }}>¿Eliminar <strong>"{tipoAEliminar.nombre}"</strong>? Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#374151', background: 'white', border: '1px solid #D1D5DB', borderRadius: 10, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} disabled={isSaving} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: '#DC2626', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: isSaving ? 0.6 : 1 }}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 style={{ width: 14, height: 14 }} />} Eliminar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
