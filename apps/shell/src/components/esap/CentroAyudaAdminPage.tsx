/**
 * Administración de los recursos del Centro de Ayuda (EFDS-2399).
 *
 * Aquí se cargan y actualizan manuales, videos, documentación, cursos, atajos y
 * mejores prácticas sin intervención de desarrollo. La entrada del menú y los
 * endpoints exigen el permiso centro-ayuda.recursos.gestionar, que se asigna
 * desde Roles y Permisos.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  LifeBuoy,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CATEGORIAS_CENTRO_AYUDA,
  centroAyudaService,
  type CategoriaCentroAyuda,
  type DatosRecurso,
  type RecursoCentroAyuda,
} from '../../services/api/centroAyuda.service';
import { VisorRecurso } from './centro-ayuda/VisorRecurso';

// Mismo límite que auth-service (TAMANO_MAXIMO_ARCHIVO).
const TAMANO_MAXIMO_ARCHIVO = 500 * 1024 * 1024;

const nombreCategoria = (categoria: CategoriaCentroAyuda) =>
  CATEGORIAS_CENTRO_AYUDA.find((c) => c.id === categoria)?.nombre || categoria;

const ACEPTA: Record<CategoriaCentroAyuda, string> = {
  manual: '.pdf',
  videos: '.mp4,.webm,.ogg,.ogv',
  atajos: '',
  documentacion: '.pdf,.doc,.docx,.odt,.rtf,.txt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp',
  cursos: '.pdf,.doc,.docx,.odt,.rtf,.txt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.mp4,.webm,.ogg,.ogv',
  practicas: '.pdf,.doc,.docx,.odt,.rtf,.txt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp',
};

const AYUDA_CATEGORIA: Record<CategoriaCentroAyuda, string> = {
  documentacion: 'Guía de un módulo: archivo, enlace o texto. Se agrupa por el módulo que indique.',
  videos: 'Archivo de video (MP4, WebM u OGG) o enlace al video publicado.',
  atajos: 'Combinación de teclas, por ejemplo: Ctrl + K.',
  manual: 'PDF del manual. Solo hay un manual vigente: al activar uno, el anterior se desactiva.',
  cursos: 'Programa de capacitación: enlace a la plataforma del curso, archivo o texto.',
  practicas: 'Recomendación de uso: texto, archivo o enlace.',
};

function tamanoLegible(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const datosDe = (r: RecursoCentroAyuda): DatosRecurso => ({
  categoria: r.categoria,
  titulo: r.titulo,
  descripcion: r.descripcion ?? '',
  modulo: r.modulo ?? '',
  contenido: r.contenido ?? '',
  enlace: r.enlace ?? '',
  version: r.version ?? '',
  orden: r.orden,
  activo: r.activo,
});

const campo =
  'w-full rounded-lg border-2 border-[--esap-gray-200] px-3 py-2 text-sm focus:border-[--esap-primary] focus:outline-none';
const etiqueta = 'mb-1 block text-xs font-medium text-[--esap-gray-700]';

interface FormularioProps {
  recurso: RecursoCentroAyuda | null;
  categoriaInicial: CategoriaCentroAyuda;
  onCerrar: () => void;
  onGuardado: () => void;
}

function FormularioRecurso({ recurso, categoriaInicial, onCerrar, onGuardado }: FormularioProps) {
  const [datos, setDatos] = useState<DatosRecurso>(
    recurso ? datosDe(recurso) : { categoria: categoriaInicial, titulo: '', orden: 0, activo: true },
  );
  const [archivo, setArchivo] = useState<File | null>(null);
  const [quitarArchivo, setQuitarArchivo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (cambios: Partial<DatosRecurso>) => setDatos((d) => ({ ...d, ...cambios }));
  const categoria = datos.categoria;
  const admiteArchivo = categoria !== 'atajos';

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datos.titulo.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    if (archivo && archivo.size > TAMANO_MAXIMO_ARCHIVO) {
      toast.error('El archivo supera el máximo permitido de 500 MB');
      return;
    }
    setGuardando(true);
    try {
      const envio: DatosRecurso = {
        ...datos,
        archivo: admiteArchivo ? archivo : null,
        quitarArchivo: !archivo && (quitarArchivo || (!admiteArchivo && Boolean(recurso?.archivo))),
      };
      if (recurso) {
        await centroAyudaService.actualizar(recurso.id, envio);
        toast.success('Recurso actualizado');
      } else {
        await centroAyudaService.crear(envio);
        toast.success('Recurso creado');
      }
      onGuardado();
    } catch {
      // apiClient ya muestra el mensaje del servidor
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <form
        onSubmit={guardar}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[--esap-gray-200] px-5 py-4">
          <h2 className="text-base font-semibold text-[--esap-gray-900]">
            {recurso ? 'Editar recurso' : 'Nuevo recurso'}
          </h2>
          <button type="button" onClick={onCerrar} className="rounded-lg p-1.5 hover:bg-[--esap-gray-100]" aria-label="Cerrar">
            <X className="h-5 w-5 text-[--esap-gray-600]" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className={etiqueta} htmlFor="ca-categoria">Opción del Centro de Ayuda</label>
            <select
              id="ca-categoria"
              className={campo}
              value={categoria}
              onChange={(e) => cambiar({ categoria: e.target.value as CategoriaCentroAyuda })}
            >
              {CATEGORIAS_CENTRO_AYUDA.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[--esap-gray-500]">{AYUDA_CATEGORIA[categoria]}</p>
          </div>

          <div>
            <label className={etiqueta} htmlFor="ca-titulo">Título *</label>
            <input id="ca-titulo" className={campo} maxLength={200} value={datos.titulo} onChange={(e) => cambiar({ titulo: e.target.value })} />
          </div>

          <div>
            <label className={etiqueta} htmlFor="ca-descripcion">Descripción</label>
            <textarea id="ca-descripcion" className={campo} rows={2} value={datos.descripcion ?? ''} onChange={(e) => cambiar({ descripcion: e.target.value })} />
          </div>

          {categoria === 'documentacion' && (
            <div>
              <label className={etiqueta} htmlFor="ca-modulo">Módulo del sistema</label>
              <input id="ca-modulo" className={campo} maxLength={100} placeholder="Ej.: Contratación" value={datos.modulo ?? ''} onChange={(e) => cambiar({ modulo: e.target.value })} />
            </div>
          )}

          {categoria === 'manual' && (
            <div>
              <label className={etiqueta} htmlFor="ca-version">Versión del sistema *</label>
              <input id="ca-version" className={campo} maxLength={30} placeholder="Ej.: 2.1" value={datos.version ?? ''} onChange={(e) => cambiar({ version: e.target.value })} />
            </div>
          )}

          {categoria === 'atajos' ? (
            <div>
              <label className={etiqueta} htmlFor="ca-contenido">Combinación de teclas *</label>
              <input id="ca-contenido" className={campo} placeholder="Ctrl + K" value={datos.contenido ?? ''} onChange={(e) => cambiar({ contenido: e.target.value })} />
            </div>
          ) : categoria !== 'manual' && (
            <div>
              <label className={etiqueta} htmlFor="ca-contenido">Texto</label>
              <textarea id="ca-contenido" className={campo} rows={4} value={datos.contenido ?? ''} onChange={(e) => cambiar({ contenido: e.target.value })} />
            </div>
          )}

          {categoria !== 'atajos' && categoria !== 'manual' && (
            <div>
              <label className={etiqueta} htmlFor="ca-enlace">Enlace</label>
              <input id="ca-enlace" type="url" className={campo} placeholder="https://" value={datos.enlace ?? ''} onChange={(e) => cambiar({ enlace: e.target.value })} />
            </div>
          )}

          {admiteArchivo && (
            <div>
              <label className={etiqueta} htmlFor="ca-archivo">
                {categoria === 'manual' ? 'Archivo PDF *' : 'Archivo'}
              </label>
              <input
                id="ca-archivo"
                type="file"
                accept={ACEPTA[categoria]}
                className="block w-full text-xs text-[--esap-gray-700] file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-[--esap-primary]"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
              {recurso?.archivo && !archivo && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-[--esap-gray-50] px-3 py-2 text-xs">
                  <span className={`truncate ${quitarArchivo ? 'line-through text-[--esap-gray-400]' : 'text-[--esap-gray-700]'}`}>
                    Actual: {recurso.archivo.nombre}
                  </span>
                  {categoria !== 'manual' && (
                    <label className="flex flex-shrink-0 items-center gap-1 text-[--esap-gray-600]">
                      <input type="checkbox" checked={quitarArchivo} onChange={(e) => setQuitarArchivo(e.target.checked)} />
                      Quitar
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-6">
            <div className="w-28">
              <label className={etiqueta} htmlFor="ca-orden">Orden</label>
              <input id="ca-orden" type="number" min={0} className={campo} value={datos.orden ?? 0} onChange={(e) => cambiar({ orden: Number(e.target.value) || 0 })} />
            </div>
            <label className="mt-5 flex items-center gap-2 text-sm text-[--esap-gray-700]">
              <input type="checkbox" checked={datos.activo ?? true} onChange={(e) => cambiar({ activo: e.target.checked })} />
              Visible para los usuarios
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[--esap-gray-200] px-5 py-3">
          <button type="button" onClick={onCerrar} className="rounded-lg border border-[--esap-gray-200] px-4 py-2 text-sm hover:bg-[--esap-gray-50]">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex items-center gap-2 rounded-lg bg-[--esap-primary] px-4 py-2 text-sm font-medium text-white hover:bg-[--esap-primary-dark] disabled:opacity-60"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function ConfirmarEliminar({ recurso, onCancelar, onConfirmar }: {
  recurso: RecursoCentroAyuda;
  onCancelar: () => void;
  onConfirmar: () => Promise<void>;
}) {
  const [eliminando, setEliminando] = useState(false);
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
        <h2 className="text-base font-semibold text-[--esap-gray-900]">¿Eliminar este recurso?</h2>
        <p className="mt-2 text-sm text-[--esap-gray-700]">
          «{recurso.titulo}» dejará de aparecer en el Centro de Ayuda{recurso.archivo ? ' y su archivo se borrará' : ''}.
          Si solo quiere ocultarlo, desactívelo.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancelar} disabled={eliminando} className="rounded-lg border border-[--esap-gray-200] px-4 py-2 text-sm hover:bg-[--esap-gray-50]">
            Cancelar
          </button>
          <button
            disabled={eliminando}
            onClick={async () => {
              setEliminando(true);
              try {
                await onConfirmar();
              } finally {
                setEliminando(false);
              }
            }}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {eliminando && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function CentroAyudaAdminPage() {
  const [recursos, setRecursos] = useState<RecursoCentroAyuda[] | null>(null);
  const [filtro, setFiltro] = useState<CategoriaCentroAyuda>('documentacion');
  const [editando, setEditando] = useState<RecursoCentroAyuda | 'nuevo' | null>(null);
  const [porEliminar, setPorEliminar] = useState<RecursoCentroAyuda | null>(null);
  const [enVisor, setEnVisor] = useState<RecursoCentroAyuda | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);

  const cargar = async () => {
    setErrorCarga(false);
    try {
      setRecursos(await centroAyudaService.listarParaAdministrar());
    } catch {
      setErrorCarga(true);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const conteo = useMemo(() => {
    const total: Record<string, number> = {};
    (recursos || []).forEach((r) => {
      total[r.categoria] = (total[r.categoria] || 0) + 1;
    });
    return total;
  }, [recursos]);

  const visibles = (recursos || []).filter((r) => r.categoria === filtro);

  const alternarActivo = async (recurso: RecursoCentroAyuda) => {
    try {
      await centroAyudaService.actualizar(recurso.id, { ...datosDe(recurso), activo: !recurso.activo });
      toast.success(recurso.activo ? 'El recurso quedó oculto' : 'El recurso quedó visible');
      cargar();
    } catch {
      // apiClient ya muestra el mensaje del servidor
    }
  };

  return (
    <div className="flex h-full flex-col" style={{ minHeight: '100%', backgroundColor: '#F8FAFC' }}>
      <header className="border-b px-6 py-5 shadow-sm" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex-shrink-0 rounded-xl p-2.5 text-white shadow-sm" style={{ backgroundColor: '#003DA5' }}>
              <LifeBuoy className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl" style={{ color: '#0F172A' }}>
                Centro de Ayuda
              </h1>
              <p className="mt-0.5 text-xs font-medium" style={{ color: '#64748B' }}>
                Manuales, videos, documentación, cursos, atajos y mejores prácticas que ven los usuarios en el botón de ayuda.
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditando('nuevo')}
            className="flex items-center gap-2 rounded-lg bg-[--esap-primary] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[--esap-primary-dark]"
          >
            <Plus className="h-4 w-4" />
            Nuevo recurso
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex flex-wrap gap-2" role="tablist">
            {CATEGORIAS_CENTRO_AYUDA.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={filtro === c.id}
                onClick={() => setFiltro(c.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  filtro === c.id
                    ? 'border-[--esap-primary] bg-[--esap-primary] text-white'
                    : 'border-[--esap-gray-200] bg-white text-[--esap-gray-700] hover:border-[--esap-primary]'
                }`}
              >
                {c.nombre} <span className="opacity-70">({conteo[c.id] || 0})</span>
              </button>
            ))}
          </div>

          <p className="mb-4 text-xs text-[--esap-gray-600]">{AYUDA_CATEGORIA[filtro]}</p>

          {recursos === null ? (
            errorCarga ? (
              <div className="rounded-xl border bg-white p-8 text-center text-sm text-[--esap-gray-700]">
                No se pudieron cargar los recursos.{' '}
                <button onClick={cargar} className="font-medium text-[--esap-primary] underline">Reintentar</button>
              </div>
            ) : (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[--esap-primary]" />
              </div>
            )
          ) : visibles.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-[--esap-gray-200] bg-white p-10 text-center">
              <p className="text-sm text-[--esap-gray-700]">
                Aún no hay contenido en «{nombreCategoria(filtro)}». Los usuarios ven «Contenido no disponible por el momento».
              </p>
              <button
                onClick={() => setEditando('nuevo')}
                className="mt-3 text-sm font-medium text-[--esap-primary] hover:underline"
              >
                Cargar el primero
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {visibles.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white px-4 py-3" style={{ borderColor: '#E2E8F0' }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[--esap-gray-900]">{r.titulo}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          r.activo ? 'bg-green-100 text-green-700' : 'bg-[--esap-gray-100] text-[--esap-gray-600]'
                        }`}
                      >
                        {r.activo ? 'Visible' : 'Oculto'}
                      </span>
                      {r.version && <span className="text-[11px] text-[--esap-gray-600]">Versión {r.version}</span>}
                      {r.modulo && <span className="text-[11px] text-[--esap-gray-600]">· {r.modulo}</span>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[--esap-gray-600]">
                      {[
                        r.categoria === 'atajos' ? r.contenido : null,
                        r.archivo ? `${r.archivo.nombre} (${tamanoLegible(r.archivo.tamano)})` : null,
                        r.enlace,
                        r.categoria !== 'atajos' && r.contenido ? 'Con texto' : null,
                      ].filter(Boolean).join(' · ') || r.descripcion || 'Sin contenido'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {r.activo && r.archivo && (r.archivo.esVideo || r.archivo.previsualizable) && (
                      <button onClick={() => setEnVisor(r)} className="rounded-lg p-2 text-[--esap-gray-600] hover:bg-blue-50 hover:text-[--esap-primary]" title="Ver" aria-label={`Ver ${r.titulo}`}>
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => alternarActivo(r)} className="rounded-lg p-2 text-[--esap-gray-600] hover:bg-blue-50 hover:text-[--esap-primary]" title={r.activo ? 'Ocultar' : 'Mostrar'} aria-label={`${r.activo ? 'Ocultar' : 'Mostrar'} ${r.titulo}`}>
                      <Power className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditando(r)} className="rounded-lg p-2 text-[--esap-gray-600] hover:bg-blue-50 hover:text-[--esap-primary]" title="Editar" aria-label={`Editar ${r.titulo}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setPorEliminar(r)} className="rounded-lg p-2 text-[--esap-gray-600] hover:bg-red-50 hover:text-red-600" title="Eliminar" aria-label={`Eliminar ${r.titulo}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {editando && (
        <FormularioRecurso
          recurso={editando === 'nuevo' ? null : editando}
          categoriaInicial={filtro}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}

      {porEliminar && (
        <ConfirmarEliminar
          recurso={porEliminar}
          onCancelar={() => setPorEliminar(null)}
          onConfirmar={async () => {
            try {
              await centroAyudaService.eliminar(porEliminar.id);
              toast.success('Recurso eliminado');
              setPorEliminar(null);
              cargar();
            } catch {
              // apiClient ya muestra el mensaje del servidor
            }
          }}
        />
      )}

      {enVisor && <VisorRecurso recurso={enVisor} onCerrar={() => setEnVisor(null)} />}
    </div>
  );
}
