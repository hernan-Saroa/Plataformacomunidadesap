/**
 * Contenido de una opción de la pestaña Recursos del Centro de Ayuda.
 */
import { ArrowLeft, Download, ExternalLink, Eye, Info, Play } from 'lucide-react';
import {
  urlArchivoRecurso,
  type CategoriaCentroAyuda,
  type RecursoCentroAyuda,
} from '../../../services/api/centroAyuda.service';

interface Props {
  titulo: string;
  categoria: CategoriaCentroAyuda;
  recursos: RecursoCentroAyuda[];
  onVolver: () => void;
  onVer: (recurso: RecursoCentroAyuda) => void;
}

export function ContenidoNoDisponible() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[--esap-gray-200] px-4 py-10 text-center">
      <Info className="h-8 w-8 text-[--esap-gray-400]" />
      <p className="text-sm text-[--esap-gray-700]">Contenido no disponible por el momento</p>
    </div>
  );
}

function Teclas({ combinacion }: { combinacion: string }) {
  const teclas = combinacion.split('+').map((t) => t.trim()).filter(Boolean);
  return (
    <span className="flex flex-shrink-0 items-center gap-1">
      {teclas.map((tecla, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-xs text-[--esap-gray-400]">+</span>}
          <kbd className="rounded-md border border-[--esap-gray-300] bg-[--esap-gray-50] px-2 py-1 font-mono text-xs font-semibold text-[--esap-gray-700] shadow-sm">
            {tecla}
          </kbd>
        </span>
      ))}
    </span>
  );
}

function Acciones({ recurso, onVer }: { recurso: RecursoCentroAyuda; onVer: (r: RecursoCentroAyuda) => void }) {
  const boton =
    'flex items-center gap-1.5 rounded-lg border border-[--esap-gray-200] px-3 py-1.5 text-xs font-medium text-[--esap-primary] hover:border-[--esap-primary] hover:bg-blue-50 transition-colors';
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {recurso.archivo?.esVideo && (
        <button className={boton} onClick={() => onVer(recurso)}>
          <Play className="h-3.5 w-3.5" />
          Reproducir
        </button>
      )}
      {recurso.archivo?.previsualizable && (
        <button className={boton} onClick={() => onVer(recurso)}>
          <Eye className="h-3.5 w-3.5" />
          Ver
        </button>
      )}
      {recurso.archivo && (
        <a className={boton} href={urlArchivoRecurso(recurso.id, true)}>
          <Download className="h-3.5 w-3.5" />
          Descargar
        </a>
      )}
      {recurso.enlace && (
        <a className={boton} href={recurso.enlace} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir enlace
        </a>
      )}
    </div>
  );
}

function Tarjeta({ recurso, categoria, onVer }: { recurso: RecursoCentroAyuda; categoria: CategoriaCentroAyuda; onVer: (r: RecursoCentroAyuda) => void }) {
  if (categoria === 'atajos') {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border-2 border-[--esap-gray-200] p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[--esap-gray-900]">{recurso.titulo}</p>
          {recurso.descripcion && <p className="mt-0.5 text-xs text-[--esap-gray-600]">{recurso.descripcion}</p>}
        </div>
        {recurso.contenido && <Teclas combinacion={recurso.contenido} />}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-[--esap-gray-200] p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-[--esap-gray-900]">{recurso.titulo}</h4>
        {recurso.version && (
          <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-[--esap-primary]">
            Versión {recurso.version}
          </span>
        )}
      </div>
      {recurso.descripcion && <p className="mt-1 text-xs text-[--esap-gray-600]">{recurso.descripcion}</p>}
      {recurso.contenido && (
        <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[--esap-gray-700]">{recurso.contenido}</p>
      )}
      <Acciones recurso={recurso} onVer={onVer} />
    </div>
  );
}

export function ListaRecursos({ titulo, categoria, recursos, onVolver, onVer }: Props) {
  // La documentación se agrupa por módulo del sistema.
  const grupos =
    categoria === 'documentacion'
      ? recursos.reduce<Record<string, RecursoCentroAyuda[]>>((acc, r) => {
          const modulo = r.modulo?.trim() || 'General';
          (acc[modulo] ||= []).push(r);
          return acc;
        }, {})
      : { '': recursos };

  return (
    <div className="p-4">
      <button
        onClick={onVolver}
        className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[--esap-primary] hover:text-[--esap-primary-dark]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Recursos
      </button>
      <h3 className="mb-3 text-base font-semibold text-[--esap-gray-900]">{titulo}</h3>

      {recursos.length === 0 ? (
        <ContenidoNoDisponible />
      ) : (
        <div className="space-y-4">
          {Object.entries(grupos).map(([modulo, lista]) => (
            <div key={modulo || 'todos'} className="space-y-3">
              {modulo && (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[--esap-gray-500]">{modulo}</p>
              )}
              {lista.map((recurso) => (
                <Tarjeta key={recurso.id} recurso={recurso} categoria={categoria} onVer={onVer} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
