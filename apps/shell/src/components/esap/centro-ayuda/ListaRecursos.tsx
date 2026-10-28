/**
 * Contenido de una sección de la pestaña Recursos del Centro de Ayuda.
 */
import { motion, type Variants } from 'motion/react';
import { ArrowLeft, Download, ExternalLink, Eye, Inbox, Play, SearchX } from 'lucide-react';
import {
  urlArchivoRecurso,
  type RecursoCentroAyuda,
  type SeccionCentroAyuda,
} from '../../../services/api/centroAyuda.service';
import { IconoRecurso, tamanoLegible, tipoDeRecurso } from './IconoRecurso';
import { SIN_TRANSICION_CSS, SOLO_TRANSICION_DE_COLOR } from './estilosAnimacion';

interface Props {
  seccion: SeccionCentroAyuda;
  recursos: RecursoCentroAyuda[];
  onVolver: () => void;
  onVer: (recurso: RecursoCentroAyuda) => void;
}

const entrada: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

export function ContenidoNoDisponible() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center"
      style={SIN_TRANSICION_CSS}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200">
        <Inbox className="h-6 w-6 text-slate-400" />
      </span>
      <div>
        <p className="text-sm font-medium text-slate-800">Contenido no disponible por el momento</p>
        <p className="mt-1 text-xs text-slate-500">Cuando se publique material aquí, lo verás de inmediato.</p>
      </div>
    </motion.div>
  );
}

function Teclas({ combinacion }: { combinacion: string }) {
  const teclas = combinacion.split('+').map((t) => t.trim()).filter(Boolean);
  return (
    <span className="flex flex-shrink-0 items-center gap-1" aria-label={combinacion}>
      {teclas.map((tecla, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-xs text-slate-400">+</span>}
          <kbd className="min-w-[20px] rounded-md border border-slate-300 bg-gradient-to-b from-white to-slate-50 px-2 py-1 text-center font-mono text-xs font-semibold text-slate-700 shadow-sm">
            {tecla}
          </kbd>
        </span>
      ))}
    </span>
  );
}

const botonPrimario =
  'inline-flex items-center gap-1.5 rounded-lg bg-[#1e5da8] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-[#174a87] hover:shadow active:scale-[0.98]';
const botonSecundario =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:border-[#1e5da8] hover:text-[#1e5da8] active:scale-[0.98]';

function Acciones({ recurso, onVer }: { recurso: RecursoCentroAyuda; onVer: (r: RecursoCentroAyuda) => void }) {
  const archivo = recurso.archivo;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {archivo?.esVideo && (
        <button className={botonPrimario} onClick={() => onVer(recurso)}>
          <Play className="h-3.5 w-3.5" />
          Reproducir
        </button>
      )}
      {archivo?.previsualizable && (
        <button className={botonPrimario} onClick={() => onVer(recurso)}>
          <Eye className="h-3.5 w-3.5" />
          Ver
        </button>
      )}
      {archivo && (
        <a className={botonSecundario} href={urlArchivoRecurso(recurso.id, true)}>
          <Download className="h-3.5 w-3.5" />
          Descargar
        </a>
      )}
      {recurso.enlace && (
        <a className={archivo ? botonSecundario : botonPrimario} href={recurso.enlace} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir enlace
        </a>
      )}
    </div>
  );
}

function Tarjeta({ recurso, seccion, onVer, indice }: {
  recurso: RecursoCentroAyuda;
  seccion: SeccionCentroAyuda;
  onVer: (r: RecursoCentroAyuda) => void;
  indice: number;
}) {
  if (seccion.tipo === 'atajos') {
    return (
      <motion.div
        custom={indice}
        variants={entrada}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300"
        style={SOLO_TRANSICION_DE_COLOR}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">{recurso.titulo}</p>
          {recurso.descripcion && <p className="mt-0.5 text-xs text-slate-600">{recurso.descripcion}</p>}
        </div>
        {recurso.contenido && <Teclas combinacion={recurso.contenido} />}
      </motion.div>
    );
  }

  const tipo = tipoDeRecurso(recurso, seccion);
  const detalle = [tipo.etiqueta, recurso.archivo ? tamanoLegible(recurso.archivo.tamano) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <motion.div
      custom={indice}
      variants={entrada}
      initial="hidden"
      animate="visible"
      className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
      style={SOLO_TRANSICION_DE_COLOR}
    >
      <div className="flex items-start gap-3">
        <IconoRecurso recurso={recurso} seccion={seccion} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium leading-snug text-slate-900">{recurso.titulo}</h4>
            {recurso.version && (
              <span className="flex-shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#1e5da8] border border-blue-100">
                v{recurso.version}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">{detalle}</p>
          {recurso.descripcion && <p className="mt-1.5 text-xs text-slate-600">{recurso.descripcion}</p>}
          {recurso.contenido && (
            <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
              {recurso.contenido}
            </p>
          )}
          <Acciones recurso={recurso} onVer={onVer} />
        </div>
      </div>
    </motion.div>
  );
}

/** Resultados de la búsqueda del panel, agrupados por sección del Centro de Ayuda. */
export function ResultadosBusqueda({ consulta, secciones, resultados, onVer }: {
  consulta: string;
  secciones: SeccionCentroAyuda[];
  resultados: RecursoCentroAyuda[];
  onVer: (recurso: RecursoCentroAyuda) => void;
}) {
  if (resultados.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200">
          <SearchX className="h-6 w-6 text-slate-400" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-800">No encontramos recursos para «{consulta.trim()}»</p>
          <p className="mt-1 text-xs text-slate-500">Pruebe con otra palabra o revise las preguntas frecuentes.</p>
        </div>
      </div>
    );
  }

  let indice = 0;
  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500">
        {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'} para «{consulta.trim()}»
      </p>
      {secciones.map((seccion) => {
        const lista = resultados.filter((r) => r.idSeccion === seccion.id);
        if (lista.length === 0) return null;
        return (
          <div key={seccion.id} className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{seccion.nombre}</p>
            {lista.map((recurso) => (
              <Tarjeta key={recurso.id} recurso={recurso} seccion={seccion} onVer={onVer} indice={indice++} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function ListaRecursos({ seccion, recursos, onVolver, onVer }: Props) {
  // Si los recursos indican el módulo del sistema, se agrupan por él.
  const grupos =
    seccion.tipo !== 'atajos' && recursos.some((r) => r.modulo?.trim())
      ? recursos.reduce<Record<string, RecursoCentroAyuda[]>>((acc, r) => {
          const modulo = r.modulo?.trim() || 'General';
          (acc[modulo] ||= []).push(r);
          return acc;
        }, {})
      : { '': recursos };

  let indice = 0;

  return (
    <div className="p-4">
      <button
        onClick={onVolver}
        className="group mb-3 inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 text-xs font-medium text-[#1e5da8] transition-colors hover:text-[#174a8a]"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Todos los recursos
      </button>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{seccion.nombre}</h3>
        {recursos.length > 0 && (
          <span className="text-xs text-slate-500">
            {recursos.length} {recursos.length === 1 ? 'elemento' : 'elementos'}
          </span>
        )}
      </div>

      {recursos.length === 0 ? (
        <ContenidoNoDisponible />
      ) : (
        <div className="space-y-5">
          {Object.entries(grupos).map(([modulo, lista]) => (
            <div key={modulo || 'todos'} className="space-y-2.5">
              {modulo && (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{modulo}</p>
              )}
              {lista.map((recurso) => (
                <Tarjeta key={recurso.id} recurso={recurso} seccion={seccion} onVer={onVer} indice={indice++} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
