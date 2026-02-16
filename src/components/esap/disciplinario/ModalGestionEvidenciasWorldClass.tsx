/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL GESTIÓN DE EVIDENCIAS - DISEÑO WORLD CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Modal para gestionar evidencias y material probatorio del proceso.
 * 
 * CARACTERÍSTICAS:
 * - ✅ Diseño World Class con ResponsiveModal
 * - ✅ Sistema de nomenclatura única (EV-XXX-2025)
 * - ✅ Categorías de evidencia predefinidas
 * - ✅ Integración con ModalSubirDocumento
 * - ✅ Visor de documentos integrado
 * - ✅ Filtros por categoría
 * - ✅ Diseño corporativo ESAP
 * - ✅ Responsive Mobile First
 * 
 * @version 2.0.0 (World Class)
 * @date 10 de Febrero de 2026
 */

import { useState } from 'react';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { ModalButtonPrimary, ModalButtonCancel, ModalButtonGroup } from '@/components/ui/ModalButtons';
import {
  Archive, FileText, MessageSquare, Package, FileCheck, Eye, Download,
  Plus, Upload, Info, Tag
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import { BadgeNomenclatura } from './components/BadgeNomenclatura';
import { previsualizarNomenclatura } from './utils/nomenclaturaDocumentos';
import { ModalSubirDocumento } from './ModalSubirDocumento';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Proceso {
  numeroProceso: string;
  denunciado: Persona;
  denunciante: Persona;
  profesionalAsignado: Persona;
  cedula: string;
  noticiaOrigen: string;
  etapaActual: string;
}

interface Evidencia {
  id: string;
  nomenclatura: string;
  nombre: string;
  tipo: string;
  fecha: string;
  tamaño: string;
  categoria: string;
}

interface ModalGestionEvidenciasProps {
  isOpen: boolean;
  proceso: Proceso;
  onClose: () => void;
  onSubirEvidencia: () => void;
}

interface Categoria {
  id: string;
  nombre: string;
  icon: any;
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORIAS: Categoria[] = [
  { id: 'documental', nombre: 'Documental', icon: FileText, color: '#3B82F6' },
  { id: 'testimonial', nombre: 'Testimonial', icon: MessageSquare, color: '#10B981' },
  { id: 'fotografica', nombre: 'Fotográfica', icon: Archive, color: '#F59E0B' },
  { id: 'audiovisual', nombre: 'Audiovisual', icon: Archive, color: '#8B5CF6' },
  { id: 'digital', nombre: 'Digital', icon: Package, color: '#06B6D4' },
  { id: 'pericial', nombre: 'Pericial', icon: FileCheck, color: '#DC2626' }
];

// Mock data - En producción vendría del backend
const EVIDENCIAS_MOCK: Evidencia[] = [
  {
    id: 'e1',
    nomenclatura: 'EV-001-2025',
    nombre: 'Declaración Testigo 1.pdf',
    tipo: 'Documento',
    fecha: '2025-01-10',
    tamaño: '2.3 MB',
    categoria: 'Testimonial'
  },
  {
    id: 'e2',
    nomenclatura: 'EV-002-2025',
    nombre: 'Fotografías del lugar.zip',
    tipo: 'Archivo',
    fecha: '2025-01-09',
    tamaño: '15.7 MB',
    categoria: 'Fotográfica'
  },
  {
    id: 'e3',
    nomenclatura: 'EV-003-2025',
    nombre: 'Video_incidente.mp4',
    tipo: 'Video',
    fecha: '2025-01-08',
    tamaño: '45.2 MB',
    categoria: 'Audiovisual'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ModalGestionEvidenciasWorldClass({
  isOpen,
  proceso,
  onClose,
  onSubirEvidencia
}: ModalGestionEvidenciasProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // STATES
  // ─────────────────────────────────────────────────────────────────────────

  const [evidencias, setEvidencias] = useState<Evidencia[]>(EVIDENCIAS_MOCK);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: Evidencia | null }>({
    show: false,
    documento: null
  });
  const [mostrarModalSubir, setMostrarModalSubir] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubirEvidencia = () => {
    setMostrarModalSubir(true);
  };

  const handleConfirmarDocumentos = (documentos: any[]) => {
    // Agregar documentos a la lista local
    const nuevasEvidencias = documentos.map((doc, index) => ({
      id: `e-${Date.now()}-${index}`,
      nomenclatura: previsualizarNomenclatura('EVIDENCIA'),
      nombre: doc.nombreEvidencia || doc.archivo.name,
      tipo: doc.archivo.type.includes('pdf') ? 'Documento' : 'Archivo',
      fecha: new Date().toISOString().split('T')[0],
      tamaño: `${(doc.archivo.size / 1024 / 1024).toFixed(1)} MB`,
      categoria: 'Documental'
    }));

    setEvidencias([...evidencias, ...nuevasEvidencias]);
    setMostrarModalSubir(false);
    
    toast.success('Evidencias Cargadas', {
      description: `${documentos.length} evidencia(s) agregada(s) con nombre y descripción`
    });
  };

  const handleDescargarEvidencia = (evidencia: Evidencia) => {
    toast.success('Descarga iniciada', {
      description: `${evidencia.nomenclatura} - ${evidencia.nombre} se está descargando`
    });
  };

  const handleReset = () => {
    setCategoriaFiltro(null);
    setVisorDocumento({ show: false, documento: null });
    setMostrarModalSubir(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED
  // ─────────────────────────────────────────────────────────────────────────

  const evidenciasFiltradas = categoriaFiltro
    ? evidencias.filter(e => e.categoria === categoriaFiltro)
    : evidencias;

  const proximaNomenclatura = previsualizarNomenclatura('EVIDENCIA');

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      <ResponsiveModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Gestión de Evidencias"
        subtitle={`${proceso.numeroProceso} - Material Probatorio`}
        size="xl"
        footer={
          <ModalButtonGroup>
            <ModalButtonCancel onClick={handleClose}>
              Cerrar
            </ModalButtonCancel>
            <ModalButtonPrimary onClick={handleSubirEvidencia}>
              <Upload className="w-4 h-4 mr-2" />
              Subir Evidencia
            </ModalButtonPrimary>
          </ModalButtonGroup>
        }
      >
        <div className="space-y-6">
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* BANNER INFORMATIVO */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <Card className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-orange-900 mb-2">
                  Material Probatorio del Proceso
                </p>
                <p className="text-xs text-orange-700 mb-3">
                  Todas las evidencias cuentan con nomenclatura única y trazabilidad completa
                </p>
                
                {/* Vista previa de nomenclatura */}
                <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-orange-200">
                  <Tag className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-orange-900 font-medium">
                    Próxima nomenclatura:
                  </span>
                  <BadgeNomenclatura
                    nomenclatura={proximaNomenclatura}
                    tipo="EVIDENCIA"
                    size="sm"
                    showIcon={false}
                    showCopy={false}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* FILTROS POR CATEGORÍA */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={categoriaFiltro === null ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => setCategoriaFiltro(null)}
            >
              Todas ({evidencias.length})
            </Badge>
            {CATEGORIAS.map((cat) => (
              <Badge
                key={cat.id}
                variant={categoriaFiltro === cat.nombre ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => setCategoriaFiltro(cat.nombre)}
              >
                {cat.nombre}
              </Badge>
            ))}
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* LISTA DE EVIDENCIAS */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="space-y-3">
            {evidenciasFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 font-semibold">
                  {categoriaFiltro ? 'No hay evidencias en esta categoría' : 'No hay evidencias cargadas'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {!categoriaFiltro && 'Sube tu primera evidencia usando el botón "Subir Evidencia"'}
                </p>
              </div>
            ) : (
              evidenciasFiltradas.map((evidencia) => (
                <Card key={evidencia.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-orange-100 flex-shrink-0">
                        <Archive className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Badge de Nomenclatura */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <BadgeNomenclatura
                            nomenclatura={evidencia.nomenclatura}
                            tipo="EVIDENCIA"
                            size="sm"
                            showIcon={true}
                            showCopy={true}
                          />
                        </div>
                        
                        <h3 className="font-bold text-gray-900 mb-2 truncate">{evidencia.nombre}</h3>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600 text-xs">Tipo:</p>
                            <p className="font-bold text-gray-900">{evidencia.tipo}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Categoría:</p>
                            <p className="font-bold text-gray-900">{evidencia.categoria}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Fecha:</p>
                            <p className="font-bold text-gray-900">{evidencia.fecha}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Tamaño:</p>
                            <p className="font-bold text-gray-900">{evidencia.tamaño}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setVisorDocumento({ show: true, documento: evidencia })}
                        title="Ver evidencia"
                        className="border-orange-600 text-orange-600 hover:bg-orange-50"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDescargarEvidencia(evidencia)}
                        title="Descargar evidencia"
                        className="border-orange-600 text-orange-600 hover:bg-orange-50"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </ResponsiveModal>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL VISOR DE EVIDENCIA */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {visorDocumento.show && visorDocumento.documento && (
        <ResponsiveModal
          isOpen={visorDocumento.show}
          onClose={() => setVisorDocumento({ show: false, documento: null })}
          title="Visor de Evidencia"
          subtitle={visorDocumento.documento.nomenclatura}
          size="xl"
          footer={
            <ModalButtonGroup>
              <ModalButtonCancel onClick={() => setVisorDocumento({ show: false, documento: null })}>
                Cerrar
              </ModalButtonCancel>
              <ModalButtonPrimary onClick={() => handleDescargarEvidencia(visorDocumento.documento!)}>
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </ModalButtonPrimary>
            </ModalButtonGroup>
          }
        >
          <div className="bg-gray-100 rounded-lg p-8 min-h-[500px] flex items-center justify-center">
            <div className="text-center">
              <Archive className="w-24 h-24 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 font-semibold text-lg mb-2">
                Vista Previa de Evidencia
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {visorDocumento.documento.nomenclatura}
              </p>
              <p className="text-xs text-gray-700 font-medium mb-4">
                {visorDocumento.documento.nombre}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Tipo: {visorDocumento.documento.tipo}</p>
                <p>Categoría: {visorDocumento.documento.categoria}</p>
                <p>Fecha: {visorDocumento.documento.fecha}</p>
                <p>Tamaño: {visorDocumento.documento.tamaño}</p>
              </div>
            </div>
          </div>
        </ResponsiveModal>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL SUBIR DOCUMENTO */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      <ModalSubirDocumento
        isOpen={mostrarModalSubir}
        proceso={proceso}
        onClose={() => setMostrarModalSubir(false)}
        onConfirm={handleConfirmarDocumentos}
      />
    </>
  );
}
