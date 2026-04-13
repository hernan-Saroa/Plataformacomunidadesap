/**
 * PlantillasDocumentos - Gestión de plantillas Word por categoría
 * Permite subir, listar y eliminar plantillas .docx para cada tipo de documento
 */

import { useState, useEffect, useRef } from 'react';
import {
  FileText, Upload, Trash2, Download, AlertCircle, Loader2,
  BookOpen, Stamp,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../../services/api/apiClient';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Categoria =
  | 'actas'
  | 'autos'
  | 'oficios';

interface PlantillaItem {
  id: string;
  nombre: string;
  categoria: string;
  nombreOriginal: string;
  mimeType: string;
  tamano: number;
  subidoPor?: string;
  createdAt: string;
}

// ─── Configuración de categorías ──────────────────────────────────────────────

const CATEGORIAS: { key: Categoria; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'actas',   label: 'Actas',    icon: <BookOpen className="w-4 h-4" />, color: '#7C3AED' },
  { key: 'autos',   label: 'Autos',    icon: <Stamp className="w-4 h-4" />,    color: '#DC2626' },
  { key: 'oficios', label: 'Oficios',  icon: <FileText className="w-4 h-4" />, color: '#003DA5' },
];

const WORD_ACCEPT = '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEGAL_API = '/legal/api/v1';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PlantillasDocumentos() {
  const [categoriaActiva, setCategoriaActiva] = useState<Categoria>('actas');
  const [plantillas, setPlantillas] = useState<Record<Categoria, PlantillaItem[]>>({
    actas: [], autos: [], oficios: []
  });
  const [cargando, setCargando] = useState<Partial<Record<Categoria, boolean>>>({});
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = tabsScrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, []);

  const scrollTabs = (dir: 'left' | 'right') => {
    tabsScrollRef.current?.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' });
  };

  // Scroll al tab activo cuando cambia la categoría
  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const idx = CATEGORIAS.findIndex(c => c.key === categoriaActiva);
    const tab = el.children[idx] as HTMLElement | undefined;
    if (tab) tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [categoriaActiva]);

  useEffect(() => {
    cargarPlantillas(categoriaActiva);
  }, [categoriaActiva]);

  async function cargarPlantillas(categoria: Categoria) {
    setCargando(prev => ({ ...prev, [categoria]: true }));
    try {
      const data: PlantillaItem[] = await apiClient.get(`${LEGAL_API}/plantillas`, { categoria });
      setPlantillas(prev => ({ ...prev, [categoria]: data }));
    } catch {
      toast.error('No se pudieron cargar las plantillas');
    } finally {
      setCargando(prev => ({ ...prev, [categoria]: false }));
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(doc|docx)$/i)) {
      toast.error('Solo se permiten archivos Word (.doc, .docx)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 250 * 1024 * 1024) {
      toast.error('El archivo no puede superar 250 MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('categoria', categoriaActiva);
      formData.append('nombre', file.name);

      await apiClient.upload(`${LEGAL_API}/plantillas`, formData);

      toast.success('Plantilla subida correctamente');
      await cargarPlantillas(categoriaActiva);
    } catch (err: any) {
      toast.error(err.message || 'Error al subir la plantilla');
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(plantilla: PlantillaItem) {
    if (!confirm(`¿Eliminar la plantilla "${plantilla.nombre}"?`)) return;
    try {
      await apiClient.delete(`${LEGAL_API}/plantillas/${plantilla.id}`);
      toast.success('Plantilla eliminada');
      setPlantillas(prev => ({
        ...prev,
        [categoriaActiva]: prev[categoriaActiva].filter(p => p.id !== plantilla.id)
      }));
    } catch {
      toast.error('No se pudo eliminar la plantilla');
    }
  }

  async function handleDownload(plantilla: PlantillaItem) {
    try {
      const blob = await apiClient.getBlob(`${LEGAL_API}/plantillas/${plantilla.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = plantilla.nombreOriginal;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo descargar la plantilla');
    }
  }

  const catConfig = CATEGORIAS.find(c => c.key === categoriaActiva)!;
  const lista = plantillas[categoriaActiva] ?? [];
  const cargandoActual = cargando[categoriaActiva];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-50 flex-shrink-0">
            <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Plantillas</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Sube plantillas Word (.docx) para cada tipo de documento. Se almacenan en la base de datos y están disponibles en todos los entornos.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs de categorías con controles de scroll */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="relative border-b border-gray-200">
          {/* Botón izquierda */}
          {canScrollLeft && (
            <button
              onClick={() => scrollTabs('left')}
              className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-1.5 bg-gradient-to-r from-white via-white to-transparent"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white shadow border border-gray-200 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
              </span>
            </button>
          )}

          {/* Tabs scrollables */}
          <div
            ref={tabsScrollRef}
            className="flex overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', paddingLeft: canScrollLeft ? '2rem' : 0, paddingRight: canScrollRight ? '2rem' : 0 }}
          >
            {CATEGORIAS.map((cat, idx) => (
              <button
                key={cat.key}
                onClick={() => { setCategoriaActiva(cat.key); }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                  categoriaActiva === cat.key
                    ? 'border-current bg-gray-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                style={categoriaActiva === cat.key ? { color: cat.color, borderColor: cat.color } : {}}
              >
                <span style={categoriaActiva === cat.key ? { color: cat.color } : {}}>{cat.icon}</span>
                {cat.label}
                {plantillas[cat.key]?.length > 0 && (
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: categoriaActiva === cat.key ? cat.color : '#9CA3AF' }}
                  >
                    {plantillas[cat.key].length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Botón derecha */}
          {canScrollRight && (
            <button
              onClick={() => scrollTabs('right')}
              className="absolute right-0 top-0 bottom-0 z-10 flex items-center px-1.5 bg-gradient-to-l from-white via-white to-transparent"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white shadow border border-gray-200 hover:bg-gray-50 transition-colors">
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              </span>
            </button>
          )}
        </div>

        {/* Contenido del tab activo */}
        <div className="p-4 sm:p-6">
          {/* Zona de carga */}
          <div className="mb-5">
            <div
              onClick={() => !subiendo && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                subiendo
                  ? 'border-blue-300 bg-blue-50 cursor-wait'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer active:bg-blue-100'
              }`}
            >
              {subiendo ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm font-semibold text-blue-700">Subiendo plantilla...</p>
                </div>
              ) : (
                <>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${catConfig.color}15` }}
                  >
                    <Upload className="w-6 h-6" style={{ color: catConfig.color }} />
                  </div>
                  <p className="text-sm font-bold text-gray-700 mb-1">
                    Subir plantilla de{' '}
                    <span style={{ color: catConfig.color }}>{catConfig.label}</span>
                  </p>
                  <p className="text-xs text-gray-500">Formato Word (.doc, .docx) • Máximo 250 MB</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={WORD_ACCEPT}
              onChange={handleUpload}
              className="hidden"
              disabled={subiendo}
            />
          </div>

          {/* Lista de plantillas */}
          {cargandoActual ? (
            <div className="flex items-center justify-center py-10 gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando plantillas...</span>
            </div>
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${catConfig.color}10` }}
              >
                {catConfig.icon && (
                  <span style={{ color: catConfig.color, fontSize: '1.5rem' }}>
                    {catConfig.icon}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-500">
                No hay plantillas de {catConfig.label} aún
              </p>
              <p className="text-xs text-gray-400">
                Sube un archivo Word para empezar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {lista.map(plantilla => (
                <div
                  key={plantilla.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
                >
                  {/* Icono Word */}
                  <div className="flex-shrink-0 w-9 h-9 rounded bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-700" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{plantilla.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(plantilla.tamano)} · {formatDate(plantilla.createdAt)}
                      {plantilla.subidoPor && ` · ${plantilla.subidoPor}`}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleDownload(plantilla)}
                      title="Descargar"
                      className="p-2 rounded-lg text-gray-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plantilla)}
                      title="Eliminar"
                      className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nota informativa */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-bold text-amber-900">Sobre las plantillas</p>
            <p>Las plantillas se guardan en la base de datos y están disponibles en todos los entornos (desarrollo, pruebas, producción).</p>
            <p>Solo se aceptan archivos Word (.doc, .docx). Cada plantilla queda asociada a su categoría (Actas, Autos u Oficios).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
