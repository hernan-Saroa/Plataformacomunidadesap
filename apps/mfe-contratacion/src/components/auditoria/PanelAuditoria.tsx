import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Hash,
  History,
  ShieldCheck,
  UserCog,
} from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { ExpedienteAuditoria } from '../../types';
import { Ayuda, Cargando, Titulo } from '../shared/PiezasPanel';
import { fechaLarga, momento, momentoConHora } from '../shared/fechas';
import { CicloContrato } from '../shared/CicloContrato';
import { ETAPAS } from '../proceso/Etapas';

interface Props {
  procesoId: string;
}

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const pesos = (valor: string | null) =>
  valor === null ? '—' : formatoPesos.format(Number(valor));

/**
 * Las columnas `date` llegan como timestamp ISO, no como AAAA-MM-DD.
 *
 * `fechaLarga` espera lo segundo y devuelve «Invalid Date» con lo primero, así
 * que aquí se recorta antes de pasárselo.
 */
const soloFecha = (valor: string) => fechaLarga(valor.slice(0, 10));

/** Cabecera de cada bloque, con su conteo. */
const Bloque = ({
  icono,
  titulo,
  cuantos,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  cuantos: number;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      {icono}
      <span className="text-xs font-bold text-slate-700">{titulo}</span>
      <span className="text-[11px] font-bold text-slate-400">{cuantos}</span>
    </div>
    {cuantos === 0 ? (
      <p className="text-[11px] text-slate-400 m-0 pl-6">Sin registros</p>
    ) : (
      children
    )}
  </div>
);

type DocumentoExpediente = ExpedienteAuditoria['documentos'][number];

/**
 * La etapa de un documento sale del numeral de la actividad que lo produjo:
 * el «4» de «4.3». Es la única pista que trae el registro, y basta porque la
 * matriz numera toda actividad como «etapa.orden».
 */
function etapaDe(doc: DocumentoExpediente): number | null {
  if (!doc.numeral) return null;
  const n = Number.parseInt(doc.numeral.split('.')[0], 10);
  return Number.isNaN(n) ? null : n;
}

/** Bytes a algo legible; el backend manda el bigint como texto. */
function peso(bytes: number | string | null): string | null {
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (n === null || n === undefined || Number.isNaN(n) || n <= 0) return null;
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

/**
 * Un archivo del expediente, en una sola línea.
 *
 * El hash ocupaba un renglón bajo cada documento y hacía la lista el doble de
 * larga por un dato que casi nunca se lee: ahora se copia con el botón, y el
 * valor completo sigue disponible en el `title` para quien lo quiera ver.
 */
function ArchivoFila({ doc }: { doc: DocumentoExpediente }) {
  const [copiado, setCopiado] = useState(false);
  const descargable = doc.tipo === 'ADJUNTO' && !!doc.archivo_url;
  const tamano = peso(doc.archivo_tamano);

  const copiarHash = async () => {
    if (!doc.hash_sha256) return;
    try {
      await navigator.clipboard.writeText(doc.hash_sha256);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin portapapeles (contexto no seguro) el hash sigue en el title.
    }
  };

  return (
    <li className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-white/70 group">
      {doc.numeral && (
        <span className="text-[10.5px] font-bold text-slate-400 w-7 flex-shrink-0 tabular-nums">
          {doc.numeral}
        </span>
      )}

      <FileText className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" aria-hidden="true" />

      <span
        className="flex-1 min-w-0 truncate text-[11.5px] text-slate-700"
        title={doc.archivo_nombre_original ?? doc.nombre}
      >
        {doc.archivo_nombre_original ?? doc.nombre}
      </span>

      {tamano && (
        <span className="text-[10px] text-slate-400 flex-shrink-0 tabular-nums hidden sm:inline">
          {tamano}
        </span>
      )}

      <span className="text-[10px] text-slate-400 flex-shrink-0 tabular-nums">
        {momento(doc.created_at)}
      </span>

      {doc.hash_sha256 && (
        <button
          type="button"
          onClick={copiarHash}
          title={`SHA-256: ${doc.hash_sha256}`}
          aria-label="Copiar huella de integridad"
          className="p-1 rounded flex-shrink-0 text-slate-300 hover:text-[#0891B2] hover:bg-[#0891B2]/10
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/40"
        >
          {copiado ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
          ) : (
            <Hash className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>
      )}

      {descargable ? (
        <a
          href={contratacionService.urlDescarga(doc.archivo_url!)}
          target="_blank"
          rel="noopener noreferrer"
          title="Descargar"
          aria-label={`Descargar ${doc.archivo_nombre_original ?? doc.nombre}`}
          className="p-1 rounded flex-shrink-0 text-slate-400 hover:text-[#0891B2] hover:bg-[#0891B2]/10
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/40"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      ) : (
        // Los snapshots del formulario son contenido guardado, no un archivo:
        // decirlo evita buscar una descarga que no existe.
        <span
          title="Contenido del formulario, sin archivo adjunto"
          className="p-1 flex-shrink-0 text-slate-200"
        >
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      )}
    </li>
  );
}

/**
 * Carpeta de una etapa, con sus documentos dentro.
 *
 * Se despliega en el sitio en vez de abrir un modal: el auditor recorre varias
 * etapas seguidas y un modal por carpeta le costaría un cierre por cada una.
 */
function CarpetaEtapa({
  numero,
  nombre,
  documentos,
}: {
  numero: number | null;
  nombre: string;
  documentos: DocumentoExpediente[];
}) {
  const [abierta, setAbierta] = useState(false);
  const vacia = documentos.length === 0;

  return (
    <div
      className={`rounded-lg border transition-colors ${
        abierta ? 'border-[#0891B2]/30 bg-[#0891B2]/[0.04]' : 'border-gray-200 bg-white'
      }`}
    >
      <button
        type="button"
        onClick={() => !vacia && setAbierta((v) => !v)}
        aria-expanded={abierta}
        disabled={vacia}
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left rounded-lg
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/40
          ${vacia ? 'cursor-default' : 'cursor-pointer hover:bg-[#0891B2]/[0.06]'}`}
      >
        {abierta ? (
          <FolderOpen className="w-4 h-4 text-[#0891B2] flex-shrink-0" aria-hidden="true" />
        ) : (
          <Folder
            className={`w-4 h-4 flex-shrink-0 ${vacia ? 'text-slate-300' : 'text-slate-400'}`}
            aria-hidden="true"
          />
        )}

        <span className="flex-1 min-w-0">
          <span
            className={`block text-[12.5px] font-bold truncate ${
              vacia ? 'text-slate-400' : 'text-slate-800'
            }`}
          >
            {numero === null ? nombre : `Etapa ${numero} · ${nombre}`}
          </span>
        </span>

        <span
          className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-md flex-shrink-0 ${
            vacia ? 'text-slate-400 bg-slate-100' : 'text-[#0891B2] bg-[#0891B2]/10'
          }`}
        >
          {documentos.length}
        </span>

        {!vacia &&
          (abierta ? (
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
          ))}
      </button>

      {abierta && (
        <ul className="m-0 px-2 pb-2 pt-0 list-none border-t border-[#0891B2]/15">
          {documentos.map((d, i) => (
            <ArchivoFila key={d.id ?? i} doc={d} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Bloque que arranca plegado: trazabilidad que no se lee de entrada. */
const BloqueColapsable = ({
  icono,
  titulo,
  cuantos,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  cuantos: number;
  children: React.ReactNode;
}) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex items-center gap-2 w-full text-left rounded
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/40"
      >
        {icono}
        <span className="text-xs font-bold text-slate-700">{titulo}</span>
        <span className="text-[11px] font-bold text-slate-400">{cuantos}</span>
        {abierto ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
        )}
      </button>
      {abierto &&
        (cuantos === 0 ? (
          <p className="text-[11px] text-slate-400 m-0 pl-6">Sin registros</p>
        ) : (
          children
        ))}
    </div>
  );
};

/**
 * Expediente electrónico único para auditoría (EFDS-1186).
 *
 * Todo en una pantalla y solo lectura: quien audita necesita ver el proceso
 * entero de una vez, no reconstruirlo actividad por actividad.
 *
 * Los documentos van primero y en carpetas por etapa, como en gestión legal y
 * control interno: lo que se abre de un expediente son los archivos, y dejarlos
 * bajo una lista de sesenta y tres actividades los escondía. La trazabilidad
 * sigue completa, un clic más abajo.
 */
export function PanelAuditoria({ procesoId }: Props) {
  const [datos, setDatos] = useState<ExpedienteAuditoria | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    contratacionService
      .auditoria(procesoId)
      .then((d) => {
        setDatos(d);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [procesoId]);

  /**
   * Una carpeta por cada etapa del catálogo, aunque esté vacía: el auditor debe
   * poder afirmar que en una etapa no se archivó nada, y una carpeta ausente no
   * distingue «sin documentos» de «no existe esa etapa».
   */
  const carpetas = useMemo(() => {
    const docs = datos?.documentos ?? [];
    const porEtapa = ETAPAS.map((e) => ({
      numero: e.numero as number | null,
      nombre: e.nombre,
      documentos: docs.filter((d) => etapaDe(d) === e.numero),
    }));

    // Los documentos sin numeral —o con uno fuera del catálogo— no pueden
    // desaparecer del expediente: van a una carpeta final.
    const numeros = new Set(ETAPAS.map((e) => e.numero));
    const sueltos = docs.filter((d) => {
      const n = etapaDe(d);
      return n === null || !numeros.has(n);
    });

    return sueltos.length > 0
      ? [...porEtapa, { numero: null, nombre: 'Sin etapa asignada', documentos: sueltos }]
      : porEtapa;
  }, [datos]);

  if (cargando) {
    return <Cargando filas={6} />;
  }

  if (error) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs text-red-600 m-0">{error}</p>
      </div>
    );
  }

  if (!datos?.proceso) {
    return <p className="text-xs text-slate-500 m-0 px-4 py-3">El proceso no existe</p>;
  }

  const { proceso, contrato } = datos;

  return (
    <div className="space-y-4 p-4">
      <div>
        <Titulo>Expediente electrónico del proceso</Titulo>
        <Ayuda>
          Todo lo que el proceso ha producido, en orden y sin editar. Cada documento trae su
          huella para verificar que el archivado es el mismo que se subió.
        </Ayuda>
      </div>

      {/* Identificación */}
      <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          <Dato etiqueta="Radicado" valor={proceso.radicado} />
          <Dato etiqueta="Modalidad" valor={proceso.modalidad ?? '—'} />
          <Dato etiqueta="Valor estimado" valor={pesos(proceso.valor_estimado)} />
          <Dato etiqueta="Radicado el" valor={momento(proceso.fecha_radicacion)} />
          <div className="sm:col-span-2">
            <Dato etiqueta="Objeto" valor={proceso.objeto} />
          </div>
        </div>
      </div>

      {contrato && (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-3">
          <CicloContrato estado={contrato.estado} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <Dato etiqueta="Contrato" valor={contrato.numero} />
            <Dato etiqueta="Estado" valor={contrato.estado} />
            <Dato etiqueta="Contratista" valor={contrato.contratista_nombre ?? '—'} />
            <Dato etiqueta="Valor" valor={pesos(contrato.valor)} />
            <Dato
              etiqueta="Plazo"
              valor={contrato.plazo_dias === null ? '—' : `${contrato.plazo_dias} días`}
            />
            <Dato
              etiqueta="En ejecución desde"
              valor={contrato.ejecucion_desde ? soloFecha(contrato.ejecucion_desde) : '—'}
            />
          </div>
        </div>
      )}

      {/* Documentos por etapa: lo primero que se abre de un expediente. */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <span className="text-xs font-bold text-slate-700">Documentos por etapa</span>
          <span className="text-[11px] font-bold text-slate-400">
            {datos.documentos.length}
          </span>
        </div>
        <div className="space-y-1.5">
          {carpetas.map((c) => (
            <CarpetaEtapa
              key={c.numero ?? 'sin-etapa'}
              numero={c.numero}
              nombre={c.nombre}
              documentos={c.documentos}
            />
          ))}
        </div>
      </div>

      <BloqueColapsable
        icono={<CheckCircle2 className="w-4 h-4 text-slate-400" />}
        titulo="Actividades trabajadas"
        cuantos={datos.actividades.length}
      >
        <ul className="m-0 p-0 list-none space-y-1">
          {datos.actividades.map((a) => (
            <li
              key={a.numeral}
              className="flex items-baseline gap-2 text-[11.5px] text-slate-600"
            >
              <span className="font-bold text-slate-500 w-8 flex-shrink-0">{a.numeral}</span>
              <span className="flex-1 min-w-0 truncate">{a.nombre}</span>
              <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">
                {a.estado}
              </span>
            </li>
          ))}
        </ul>
      </BloqueColapsable>

      <Bloque
        icono={<UserCog className="w-4 h-4 text-slate-400" />}
        titulo="Supervisión"
        cuantos={datos.supervisiones.length}
      >
        <ul className="m-0 p-0 list-none space-y-1.5">
          {datos.supervisiones.map((s, i) => (
            <li key={i} className="text-[11.5px]">
              <div className="flex items-baseline gap-2">
                <span
                  className={
                    s.estado === 'VIGENTE'
                      ? 'font-bold text-slate-700'
                      : 'text-slate-400 line-through'
                  }
                >
                  {s.nombre}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{s.estado}</span>
              </div>
              {s.motivo_relevo && (
                <p className="text-[10.5px] text-slate-400 m-0 mt-0.5">{s.motivo_relevo}</p>
              )}
            </li>
          ))}
        </ul>
      </Bloque>

      <Bloque
        icono={<Activity className="w-4 h-4 text-slate-400" />}
        titulo="Modificaciones contractuales"
        cuantos={datos.modificaciones.length}
      >
        <ul className="m-0 p-0 list-none space-y-1.5">
          {datos.modificaciones.map((m, i) => (
            <li key={i} className="text-[11.5px]">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-slate-700">{m.tipo}</span>
                <span className="text-[10px] font-bold text-slate-400">{m.estado}</span>
                {m.dias_prorroga !== null && (
                  <span className="text-[10.5px] text-slate-500">
                    {m.plazo_anterior_dias} → {(m.plazo_anterior_dias ?? 0) + m.dias_prorroga} días
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 m-0 mt-0.5">{m.justificacion}</p>
            </li>
          ))}
        </ul>
      </Bloque>

      {/* El detalle está bajo reserva legal: aquí solo el conteo. */}
      {datos.casosIncumplimiento > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[12px] font-bold text-amber-800 m-0">
              {datos.casosIncumplimiento} caso
              {datos.casosIncumplimiento === 1 ? '' : 's'} de presunto incumplimiento
            </p>
            <p className="text-[11px] text-amber-900 m-0 mt-0.5">
              El detalle está bajo reserva legal y se consulta desde su propio módulo.
            </p>
          </div>
        </div>
      )}

      <Bloque
        icono={<History className="w-4 h-4 text-slate-400" />}
        titulo="Trazabilidad"
        cuantos={datos.trazabilidad.length}
      >
        {/* Los anchos fijos (13rem para la fecha, w-24, w-48) abrían huecos de
            media pantalla entre columnas. Ahora cada celda ocupa lo suyo y el
            usuario, que es lo más largo y menos consultado, se lleva el resto. */}
        <ul className="m-0 p-0 list-none divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden">
          {datos.trazabilidad.map((t, i) => (
            <li
              key={i}
              className="flex items-baseline gap-2.5 px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
            >
              {/* Con hora: en una auditoría importa el orden dentro del día. */}
              <span className="text-[10px] text-slate-400 flex-shrink-0 tabular-nums whitespace-nowrap">
                {momentoConHora(t.created_at)}
              </span>
              <span
                className="text-[9.5px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded
                  bg-slate-100 text-slate-600 uppercase tracking-wide"
              >
                {t.accion}
              </span>
              <span className="flex-shrink-0 text-slate-600 truncate max-w-[9rem]">
                {t.entidad}
              </span>
              <span className="flex-1 min-w-0 truncate text-[10px] text-slate-400 text-right">
                {t.usuario_nombre ?? '—'}
              </span>
            </li>
          ))}
        </ul>
      </Bloque>
    </div>
  );
}

const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div className="min-w-0">
    <span className="block text-[10.5px] font-bold text-slate-400 mb-0.5">{etiqueta}</span>
    <span className="block text-[12px] text-slate-700 break-words">{valor}</span>
  </div>
);
