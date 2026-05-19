/**
 * CHECKLIST MATRIX VIEW - Lista de Chequeo Documental v2.0
 * 
 * Matriz visual de cumplimiento documental conectada a plantillas reales:
 * - Selector de plantilla de chequeo (template)
 * - Filas: Personas/Carpetas
 * - Columnas: Tipos de documentos de la plantilla seleccionada
 * - Celdas: Estado de cumplimiento real basado en documentos de cada carpeta
 * - Vista previa de la plantilla como la vería el usuario
 * 
 * Usa el endpoint POST /checklist-matrix que cruza documentos reales con plantillas.
 * 
 * Diseño coherente: 100% inline styles para inputs, font-size 13-14px,
 * border-radius 10px, focus con #003DA5.
 * 
 * @version 2.0.0
 * @date 2026-03-09
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle, XCircle, Clock, AlertCircle, FileText,
  User, ChevronDown, ChevronRight, Eye, Search, X,
  Filter, Download, ArrowUpDown, AlertTriangle,
  Shield, Award, Briefcase, FolderOpen, Layers,
  CircleCheck, CircleX, FileUp, Minus, Info,
  ClipboardCheck, ClipboardList, RefreshCw, Loader2,
  ChevronLeft, Upload, Check, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { checklistTemplatesService } from '../../services/api/supabase.service';

// ============================================================================
// TYPES
// ============================================================================

interface CarpetaDigital {
  id: string;
  persona_id: string;
  nombre_carpeta: string;
  email_propietario: string;
  numero_documento?: string;
  total_documentos: number;
  documentos_completos: number;
  documentos_pendientes: number;
  documentos_rechazados: number;
  documentos_vencidos: number;
  ultima_actualizacion: string;
  fecha_creacion: string;
}

interface TipoDocumento {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  obligatorio: boolean;
  formatos_permitidos?: string[];
  color?: string;
}

interface ChecklistTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  items: ChecklistItem[];
  activo: boolean;
  created_at: string;
}

interface ChecklistItem {
  itemId?: string;
  tipoDocumentoId: string;
  nombre: string;
  nombre_documento?: string;
  categoria: string;
  obligatorio: boolean;
  requiere_validacion: boolean;
  orden: number;
}

interface MatrixCarpetaData {
  carpetaId: string;
  nombre: string;
  email: string;
  numeroDocumento: string;
  personaId: string;
  statusByTipo: Record<string, string>;
  completionRate: number;
  totalDocumentos: number;
}

type CellStatus = 'validado' | 'pendiente' | 'rechazado' | 'vencido' | 'faltante';

interface ChecklistMatrixViewProps {
  carpetas: CarpetaDigital[];
  tiposDocumentos: TipoDocumento[];
  onOpenCarpeta: (carpetaId: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  personal:       { label: 'Personal',       color: '#2962FF', icon: User },
  academico:      { label: 'Académico',      color: '#059669', icon: Award },
  certificados:   { label: 'Certificados',   color: '#7C3AED', icon: Shield },
  laboral:        { label: 'Laboral',        color: '#D97706', icon: Briefcase },
  administrativo: { label: 'Administrativo', color: '#DC2626', icon: FolderOpen },
  otros:          { label: 'Otros',          color: '#4B5563', icon: Layers },
};

const STATUS_CELL: Record<CellStatus, {
  icon: React.ElementType; color: string; bg: string; border: string; label: string;
}> = {
  validado:  { icon: CircleCheck,    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Validado' },
  pendiente: { icon: Clock,          color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Pendiente' },
  rechazado: { icon: CircleX,        color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Rechazado' },
  vencido:   { icon: AlertTriangle,  color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', label: 'Vencido' },
  faltante:  { icon: Minus,          color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB', label: 'Faltante' },
};

// API calls handled via checklistTemplatesService

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusCell({ status, tipeName }: { status: CellStatus; tipeName: string }) {
  const cfg = STATUS_CELL[status];
  const Icon = cfg.icon;
  return (
    <div
      title={`${tipeName}: ${cfg.label}`}
      style={{
        width: 28, height: 28, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        cursor: 'default', transition: 'transform 0.15s ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
    >
      <Icon style={{ width: 14, height: 14, color: cfg.color }} />
    </div>
  );
}

function CompletionBar({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const barColor = clampedValue >= 100 ? '#059669' : clampedValue >= 70 ? '#2962FF' : clampedValue >= 40 ? '#D97706' : '#DC2626';
  const h = size === 'sm' ? 6 : 8;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
      <div style={{ flex: 1, height: h, borderRadius: h, background: '#F3F4F6', overflow: 'hidden' }}>
        <div style={{ width: `${clampedValue}%`, height: '100%', borderRadius: h, background: barColor, transition: 'width 0.5s ease-out' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: barColor, minWidth: 32, textAlign: 'right' }}>{Math.round(clampedValue)}%</span>
    </div>
  );
}

// ============================================================================
// PREVIEW MODAL
// ============================================================================

function ChecklistPreviewModal({ template, onClose }: { template: ChecklistTemplate; onClose: () => void }) {
  const itemsByCategory = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    (template.items || []).forEach(item => {
      const cat = item.categoria || 'otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [template.items]);

  const obligatorios = template.items.filter(i => i.obligatorio).length;
  const opcionales = template.items.length - obligatorios;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
        style={{ maxWidth: 600, maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: template.color || '#003DA5', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardCheck style={{ width: 24, height: 24, color: 'white' }} />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vista Previa — Perspectiva del Usuario</p>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'white' }}>{template.nombre}</h3>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 18, height: 18, color: 'white' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Summary */}
          {template.descripcion && (
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>{template.descripcion}</p>
          )}

          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#D97706' }}>{obligatorios}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#92400E' }}>Obligatorios</p>
            </div>
            <div style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: '#F0F7FF', border: '1px solid #BFDBFE' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#2962FF' }}>{opcionales}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#1E40AF' }}>Opcionales</p>
            </div>
            <div style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#7C3AED' }}>{template.items.filter(i => i.requiere_validacion).length}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#5B21B6' }}>Con Validación</p>
            </div>
          </div>

          {/* Banner */}
          <div style={{ padding: '10px 14px', background: '#F0F7FF', borderRadius: 10, border: '1px solid #BFDBFE', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info style={{ width: 14, height: 14, color: '#2962FF', flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: '#1E40AF' }}>
              Esta es la lista de documentos que el usuario debe subir a su carpeta digital. Los documentos <strong>obligatorios</strong> son requisito para completar la lista.
            </p>
          </div>

          {/* Items by category */}
          {Object.entries(itemsByCategory).map(([catId, items]) => {
            const catCfg = CATEGORY_CONFIG[catId] || CATEGORY_CONFIG.otros;
            const CatIcon = catCfg.icon;
            return (
              <div key={catId} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <CatIcon style={{ width: 14, height: 14, color: catCfg.color }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: catCfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{catCfg.label}</span>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>({items.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map((item, idx) => (
                    <div
                      key={item.itemId || item.tipoDocumentoId}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '10px 14px',
                        borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', gap: 12,
                      }}
                    >
                      {/* Checkbox placeholder */}
                      <div style={{
                        width: 20, height: 20, borderRadius: 6,
                        border: '2px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {/* Empty — user hasn't completed */}
                      </div>

                      {/* Number */}
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', minWidth: 16 }}>{idx + 1}.</span>

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{item.nombre_documento || item.nombre}</p>
                        {item.nombre_documento && item.nombre_documento !== item.nombre && (
                          <p style={{ fontSize: 10, color: '#9CA3AF' }}>{item.nombre}</p>
                        )}
                      </div>

                      {/* Badges */}
                      {item.obligatorio && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#FFFBEB', color: '#D97706', flexShrink: 0 }}>Obligatorio</span>
                      )}
                      {item.requiere_validacion && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#F5F3FF', color: '#7C3AED', flexShrink: 0 }}>Validación</span>
                      )}

                      {/* Upload button placeholder */}
                      <button
                        style={{
                          padding: '5px 12px', borderRadius: 8, border: '1px solid #BFDBFE',
                          background: '#F0F7FF', color: '#2962FF', fontSize: 11, fontWeight: 600,
                          cursor: 'default', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                        }}
                      >
                        <Upload style={{ width: 12, height: 12 }} />
                        Subir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 10, fontWeight: 700, color: 'white', background: template.color || '#003DA5', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Cerrar Vista Previa
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ChecklistMatrixView({ carpetas, tiposDocumentos, onOpenCarpeta }: ChecklistMatrixViewProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'incomplete' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'nombre' | 'completitud'>('nombre');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('all');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Matrix data from server
  const [matrixItems, setMatrixItems] = useState<ChecklistItem[]>([]);
  const [matrixCarpetas, setMatrixCarpetas] = useState<MatrixCarpetaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredByAssignment, setFilteredByAssignment] = useState(false);
  const [activeAsignaciones, setActiveAsignaciones] = useState<Array<{tipo: string; valor: string; label?: string}>>([]);

  // Load templates
  useEffect(() => {
    (async () => {
      try {
        const data = await checklistTemplatesService.getAll();
        if (data.success) {
          setTemplates(data.data || []);
        }
      } catch (err) {
        console.error('Error loading checklist templates:', err);
      }
    })();
  }, []);

  // Load matrix data when template changes
  const loadMatrix = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await checklistTemplatesService.getMatrix(selectedTemplateId);
      if (data.success) {
        setMatrixItems(data.data.items || []);
        setMatrixCarpetas(data.data.carpetas || []);
        setFilteredByAssignment(!!data.data.filteredByAssignment);
        setActiveAsignaciones(data.data.asignaciones || []);
      } else {
        console.error('Error loading matrix:', data.error);
        toast.error('Error al cargar matriz', { description: data.error });
      }
    } catch (err) {
      console.error('Error loading checklist matrix:', err);
      toast.error('Error de conexión', { description: 'No se pudo cargar la matriz de chequeo' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplateId]);

  useEffect(() => { loadMatrix(); }, [loadMatrix]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    matrixItems.forEach(item => {
      const cat = item.categoria || 'otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [matrixItems]);

  const categoryOrder = ['personal', 'academico', 'certificados', 'laboral', 'administrativo', 'otros'];
  const orderedCategories = categoryOrder.filter(c => itemsByCategory[c]?.length > 0);

  // Filter and sort
  const filteredData = useMemo(() => {
    let data = [...matrixCarpetas];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(d =>
        (d.nombre || '').toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q) ||
        (d.numeroDocumento || '').toLowerCase().includes(q)
      );
    }
    if (filterStatus === 'complete') data = data.filter(d => d.completionRate >= 100);
    else if (filterStatus === 'incomplete') data = data.filter(d => d.completionRate < 100 && d.completionRate > 0);
    else if (filterStatus === 'critical') {
      data = data.filter(d => Object.values(d.statusByTipo).some(s => s === 'rechazado' || s === 'vencido'));
    }
    data.sort((a, b) => {
      if (sortBy === 'nombre') {
        const cmp = (a.nombre || '').localeCompare(b.nombre || '');
        return sortDir === 'asc' ? cmp : -cmp;
      } else {
        const cmp = a.completionRate - b.completionRate;
        return sortDir === 'asc' ? cmp : -cmp;
      }
    });
    return data;
  }, [matrixCarpetas, search, filterStatus, sortBy, sortDir]);

  // Stats
  const stats = useMemo(() => {
    const total = matrixCarpetas.length;
    const complete = matrixCarpetas.filter(d => d.completionRate >= 100).length;
    const incomplete = matrixCarpetas.filter(d => d.completionRate < 100 && d.completionRate > 0).length;
    const empty = matrixCarpetas.filter(d => d.completionRate === 0).length;
    const avgCompletion = total > 0 ? matrixCarpetas.reduce((sum, d) => sum + d.completionRate, 0) / total : 0;
    return { total, complete, incomplete, empty, avgCompletion };
  }, [matrixCarpetas]);

  const toggleSort = (field: 'nombre' | 'completitud') => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  if (isLoading) {
    return (
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: '#003DA5' }} />
        <p style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
          Cargando matriz de chequeo{selectedTemplate ? ` — ${selectedTemplate.nombre}` : ''}...
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ═══ TEMPLATE SELECTOR + STATS ═══ */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        {/* Template selector card */}
        <div style={{
          background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 14, minWidth: 320, position: 'relative',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: selectedTemplate ? selectedTemplate.color + '20' : '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ClipboardCheck style={{ width: 20, height: 20, color: selectedTemplate?.color || '#003DA5' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lista de Chequeo</p>
            <button
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 14, fontWeight: 800, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {selectedTemplate ? selectedTemplate.nombre : 'Todos los tipos de documentos'}
              <ChevronDown style={{ width: 14, height: 14, color: '#6B7280', transition: 'transform 0.2s', transform: showTemplateDropdown ? 'rotate(180deg)' : 'rotate(0)' }} />
            </button>
            {selectedTemplate && (
              <p style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                {selectedTemplate.items.length} documentos · {selectedTemplate.items.filter(i => i.obligatorio).length} obligatorios
              </p>
            )}
          </div>

          {selectedTemplate && (
            <button
              onClick={() => setShowPreview(true)}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB',
                background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Vista previa de la lista"
            >
              <Eye style={{ width: 15, height: 15, color: '#6B7280' }} />
            </button>
          )}

          <button
            onClick={() => loadMatrix()}
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB',
              background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Actualizar datos"
          >
            <RefreshCw style={{ width: 15, height: 15, color: '#6B7280' }} />
          </button>

          {/* Dropdown */}
          {showTemplateDropdown && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setShowTemplateDropdown(false)} />
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 51,
                background: 'white', borderRadius: 12, border: '1px solid #E5E7EB',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)', marginTop: 6,
                maxHeight: 300, overflowY: 'auto',
              }}>
                <div
                  onClick={() => { setSelectedTemplateId('all'); setShowTemplateDropdown(false); }}
                  style={{
                    padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    background: selectedTemplateId === 'all' ? '#EFF6FF' : 'white',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                  className={selectedTemplateId !== 'all' ? 'hover:bg-gray-50' : ''}
                >
                  <Layers style={{ width: 16, height: 16, color: '#003DA5' }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>Todos los tipos</p>
                    <p style={{ fontSize: 10, color: '#6B7280' }}>Incluye todos los tipos de documentos activos</p>
                  </div>
                  {selectedTemplateId === 'all' && <Check style={{ width: 16, height: 16, color: '#003DA5', marginLeft: 'auto' }} />}
                </div>

                {templates.length > 0 && (
                  <div style={{ padding: '8px 16px 4px' }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mis Listas de Chequeo</p>
                  </div>
                )}

                {templates.map(tpl => (
                  <div
                    key={tpl.id}
                    onClick={() => { setSelectedTemplateId(tpl.id); setShowTemplateDropdown(false); }}
                    style={{
                      padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                      background: selectedTemplateId === tpl.id ? '#EFF6FF' : 'white',
                    }}
                    className={selectedTemplateId !== tpl.id ? 'hover:bg-gray-50' : ''}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: tpl.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ClipboardCheck style={{ width: 14, height: 14, color: tpl.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>{tpl.nombre}</p>
                      <p style={{ fontSize: 10, color: '#6B7280' }}>
                        {tpl.items.length} docs · {tpl.items.filter(i => i.obligatorio).length} oblig.
                      </p>
                    </div>
                    {selectedTemplateId === tpl.id && <Check style={{ width: 16, height: 16, color: '#003DA5' }} />}
                  </div>
                ))}

                {templates.length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: '#6B7280' }}>No hay listas de chequeo. Créalas en Configuración Documental.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
          {[
            { label: 'Total', value: stats.total, color: '#003DA5', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Completas', value: stats.complete, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
            { label: 'Incompletas', value: stats.incomplete, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
            { label: 'Sin docs', value: stats.empty, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
            { label: 'Promedio', value: `${Math.round(stats.avgCompletion)}%`, color: stats.avgCompletion >= 70 ? '#059669' : stats.avgCompletion >= 40 ? '#D97706' : '#DC2626', bg: '#F9FAFB', border: '#E5E7EB' },
          ].map(stat => (
            <div key={stat.label} style={{ flex: 1, background: 'white', borderRadius: 12, border: `1px solid ${stat.border}`, padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ TOOLBAR ═══ */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', height: 36, borderRadius: 10,
            border: searchFocused ? '1px solid #003DA5' : '1px solid #D1D5DB',
            boxShadow: searchFocused ? '0 0 0 3px rgba(0,61,165,0.08)' : 'none',
            background: 'white', transition: 'border-color 0.2s, box-shadow 0.2s',
          }}>
            <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Search style={{ width: 15, height: 15, color: '#9CA3AF' }} />
            </div>
            <input
              placeholder="Buscar persona..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ flex: 1, height: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#1F2937', padding: '0 10px 0 0' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 4, flexShrink: 0 }}>
                <X style={{ width: 12, height: 12, color: '#6B7280' }} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F3F4F6', borderRadius: 10, padding: 3 }}>
          {([
            { key: 'all', label: 'Todos' },
            { key: 'complete', label: 'Completas' },
            { key: 'incomplete', label: 'Incompletas' },
            { key: 'critical', label: 'Críticas' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                background: filterStatus === f.key ? 'white' : 'transparent',
                color: filterStatus === f.key ? '#003DA5' : '#6B7280',
                boxShadow: filterStatus === f.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => toggleSort('completitud')}
          style={{
            height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid #D1D5DB',
            background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, color: '#374151', transition: 'all 0.15s',
          }}
        >
          <ArrowUpDown style={{ width: 14, height: 14, color: '#6B7280' }} />
          {sortBy === 'completitud' ? (sortDir === 'asc' ? 'Menor %' : 'Mayor %') : 'Ordenar'}
        </button>

        <button
          onClick={() => {
            // Export CSV
            const headers = ['Nombre', 'Email', 'Documento', 'Completitud (%)'];
            matrixItems.forEach(item => headers.push(item.nombre_documento || item.nombre));
            const rows = filteredData.map(c => {
              const row = [
                `"${(c.nombre || '').replace(/"/g, '""')}"`,
                `"${c.email || ''}"`,
                `"${c.numeroDocumento || ''}"`,
                Math.round(c.completionRate).toString(),
              ];
              matrixItems.forEach(item => {
                const st = c.statusByTipo[item.tipoDocumentoId] || 'faltante';
                const labels: Record<string, string> = { validado: 'Validado', pendiente: 'Pendiente', rechazado: 'Rechazado', vencido: 'Vencido', faltante: 'Faltante' };
                row.push(labels[st] || st);
              });
              return row.join(',');
            });
            const csv = '\uFEFF' + headers.map(h => `"${h}"`).join(',') + '\n' + rows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `checklist-matrix-${selectedTemplate?.nombre || 'todos'}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Exportación CSV generada', { description: `${filteredData.length} registros exportados` });
          }}
          style={{
            height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid #D1D5DB',
            background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, color: '#374151', transition: 'all 0.15s',
          }}
          title="Exportar matriz a CSV"
        >
          <Download style={{ width: 14, height: 14, color: '#059669' }} />
          Exportar
        </button>
      </div>

      {/* ═══ ASSIGNMENT FILTER BANNER ═══ */}
      {filteredByAssignment && activeAsignaciones.length > 0 && (
        <div style={{
          background: '#F0F7FF', borderRadius: 12, border: '1px solid #BFDBFE',
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Filter style={{ width: 14, height: 14, color: '#2962FF' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF' }}>Filtrado por asignación:</span>
          </div>
          {activeAsignaciones.map((asig, i) => {
            const typeLabels: Record<string, string> = {
              todos: 'Todos', territorial: 'Territorial', cetap: 'CETAP',
              programa: 'Programa', persona: 'Persona',
            };
            const typeColors: Record<string, { bg: string; color: string; border: string }> = {
              todos: { bg: '#EFF6FF', color: '#003DA5', border: '#BFDBFE' },
              territorial: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
              cetap: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
              programa: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
              persona: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
            };
            const c = typeColors[asig.tipo] || typeColors.todos;
            return (
              <span key={`${asig.tipo}-${asig.valor}-${i}`} style={{
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                background: c.bg, color: c.color, border: `1px solid ${c.border}`,
              }}>
                {typeLabels[asig.tipo] || asig.tipo}{asig.valor && asig.valor !== '*' ? `: ${asig.valor}` : ''}
              </span>
            );
          })}
          <span style={{ fontSize: 10, color: '#6B7280', marginLeft: 'auto' }}>
            Mostrando {matrixCarpetas.length} carpeta{matrixCarpetas.length !== 1 ? 's' : ''} que coinciden
          </span>
        </div>
      )}

      {/* ═══ MATRIX TABLE ═══ */}
      {matrixItems.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 48, textAlign: 'center' }}>
          <Info style={{ width: 48, height: 48, color: '#9CA3AF', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
            {selectedTemplate ? 'Lista de chequeo vacía' : 'Sin tipos de documentos configurados'}
          </h3>
          <p style={{ fontSize: 13, color: '#6B7280', maxWidth: 400, margin: '0 auto' }}>
            {selectedTemplate
              ? `La lista "${selectedTemplate.nombre}" no tiene documentos. Agrega tipos de documentos desde Configuración Documental.`
              : 'Para usar la matriz, primero configura los tipos de documentos o crea una lista de chequeo.'
            }
          </p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                {/* Category row */}
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ position: 'sticky', left: 0, zIndex: 20, background: '#F8FAFC', padding: '8px 16px', borderBottom: '1px solid #E5E7EB', borderRight: '2px solid #E5E7EB', minWidth: 240 }} rowSpan={2}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => toggleSort('nombre')}>
                      <User style={{ width: 14, height: 14, color: '#6B7280' }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Persona</span>
                      <ArrowUpDown style={{ width: 12, height: 12, color: '#9CA3AF' }} />
                    </div>
                  </th>
                  <th style={{ position: 'sticky', left: 240, zIndex: 20, background: '#F8FAFC', padding: '8px 12px', borderBottom: '1px solid #E5E7EB', borderRight: '2px solid #E5E7EB', minWidth: 120 }} rowSpan={2}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => toggleSort('completitud')}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cumplimiento</span>
                      <ArrowUpDown style={{ width: 12, height: 12, color: '#9CA3AF' }} />
                    </div>
                  </th>
                  {orderedCategories.map(cat => {
                    const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.otros;
                    const tipos = itemsByCategory[cat] || [];
                    return (
                      <th key={cat} colSpan={tipos.length} style={{ padding: '8px 12px', borderBottom: '1px solid #E5E7EB', borderRight: '1px solid #E5E7EB', textAlign: 'center', background: `${cfg.color}08` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <cfg.icon style={{ width: 12, height: 12, color: cfg.color }} />
                          <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cfg.label}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: cfg.color, background: `${cfg.color}15`, padding: '1px 6px', borderRadius: 4 }}>{tipos.length}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
                {/* Tipo names row */}
                <tr style={{ background: '#FAFBFC' }}>
                  {orderedCategories.flatMap(cat => {
                    const tipos = itemsByCategory[cat] || [];
                    return tipos.map((tipo, tIdx) => {
                      const globalIdx = matrixItems.findIndex(t => t.tipoDocumentoId === tipo.tipoDocumentoId);
                      const isHovered = hoveredCol === globalIdx;
                      return (
                        <th
                          key={tipo.tipoDocumentoId}
                          onMouseEnter={() => setHoveredCol(globalIdx)}
                          onMouseLeave={() => setHoveredCol(null)}
                          style={{
                            padding: '6px 4px', borderBottom: '2px solid #E5E7EB',
                            borderRight: tIdx === tipos.length - 1 ? '1px solid #E5E7EB' : '1px solid #F3F4F6',
                            textAlign: 'center', minWidth: 40, maxWidth: 44,
                            background: isHovered ? '#EFF6FF' : 'transparent',
                            transition: 'background 0.15s', cursor: 'default',
                          }}
                          title={`${tipo.nombre_documento || tipo.nombre}${tipo.obligatorio ? ' (Obligatorio)' : ''}${tipo.nombre_documento && tipo.nombre_documento !== tipo.nombre ? ` [${tipo.nombre}]` : ''}`}
                        >
                          <div style={{
                            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                            fontSize: 9, fontWeight: 700, color: '#4B5563',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            maxHeight: 80, margin: '0 auto', lineHeight: 1.2,
                          }}>{tipo.nombre_documento || tipo.nombre}</div>
                          {tipo.obligatorio && (
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', margin: '4px auto 0' }} />
                          )}
                        </th>
                      );
                    });
                  })}
                </tr>
              </thead>

              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={2 + matrixItems.length} style={{ padding: 48, textAlign: 'center' }}>
                      <FileText style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 12px' }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#6B7280' }}>
                        {search ? 'No se encontraron resultados' : 'No hay datos para mostrar'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, rowIdx) => {
                    const isRowHovered = hoveredRow === rowIdx;
                    const initials = (row.nombre || 'NA').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <tr
                        key={row.carpetaId}
                        onMouseEnter={() => setHoveredRow(rowIdx)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          borderBottom: '1px solid #F3F4F6',
                          background: isRowHovered ? '#FAFBFF' : 'white',
                          transition: 'background 0.15s', cursor: 'pointer',
                        }}
                        onClick={() => onOpenCarpeta(row.carpetaId)}
                      >
                        <td style={{ position: 'sticky', left: 0, zIndex: 10, background: isRowHovered ? '#FAFBFF' : 'white', padding: '10px 16px', borderRight: '2px solid #E5E7EB', transition: 'background 0.15s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{initials}</span>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 12, fontWeight: 700, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, lineHeight: 1.3 }}>
                                {row.nombre}
                              </p>
                              <p style={{ fontSize: 10, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, lineHeight: 1.3 }}>
                                {row.numeroDocumento ? `CC ${row.numeroDocumento}` : row.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td style={{ position: 'sticky', left: 240, zIndex: 10, background: isRowHovered ? '#FAFBFF' : 'white', padding: '10px 12px', borderRight: '2px solid #E5E7EB', transition: 'background 0.15s' }}>
                          <CompletionBar value={row.completionRate} />
                        </td>
                        {orderedCategories.flatMap(cat => {
                          const tipos = itemsByCategory[cat] || [];
                          return tipos.map((tipo, tIdx) => {
                            const globalIdx = matrixItems.findIndex(t => t.tipoDocumentoId === tipo.tipoDocumentoId);
                            const status = (row.statusByTipo[tipo.tipoDocumentoId] || 'faltante') as CellStatus;
                            const isColHovered = hoveredCol === globalIdx;
                            return (
                              <td
                                key={tipo.tipoDocumentoId}
                                style={{
                                  padding: '6px 4px', textAlign: 'center',
                                  borderRight: tIdx === tipos.length - 1 ? '1px solid #E5E7EB' : '1px solid #F9FAFB',
                                  background: isColHovered && isRowHovered ? '#EFF6FF' : isColHovered ? '#F8FAFF' : 'transparent',
                                  transition: 'background 0.15s',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <StatusCell status={status} tipeName={tipo.nombre} />
                                </div>
                              </td>
                            );
                          });
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{ borderTop: '1px solid #E5E7EB', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFBFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leyenda:</span>
              {Object.entries(STATUS_CELL).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <Icon style={{ width: 10, height: 10, color: cfg.color }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#4B5563' }}>{cfg.label}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#4B5563' }}>Obligatorio</span>
              </div>
            </div>
            <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
              {filteredData.length} de {matrixCarpetas.length} carpetas
              {selectedTemplate && <> · Lista: <strong>{selectedTemplate.nombre}</strong></>}
            </span>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedTemplate && (
          <ChecklistPreviewModal template={selectedTemplate} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
