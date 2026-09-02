import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Folder,
  FolderOpen,
  Search,
} from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Cargando } from '../shared/PiezasPanel';
import { ProcesoResumen } from '../../types';
import { PanelAuditoria } from '../auditoria/PanelAuditoria';

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Expedientes electrónicos — tab propio del módulo (EFDS-1186).
 *
 * Va en el menú y no dentro del detalle del proceso porque el expediente se
 * consulta también sin estar trabajando un proceso: es lo que abre un
 * organismo de control, y llegar a él pasando por la lista, el detalle y un
 * botón lo escondía. Es el mismo lugar que ocupa en control interno y en
 * gestión legal.
 *
 * La forma —cabecera con conteos, filtros por estado y tarjeta que se despliega—
 * es la de los expedientes de esos dos módulos: quien audita contratación audita
 * también auditoría y gestión legal, y encontrarse tres lecturas distintas del
 * mismo objeto obliga a reaprender la pantalla cada vez.
 */

/**
 * El estado del expediente se deriva de la etapa: no hay un campo propio, y
 * hacerlo aquí evita que la lista pida el expediente completo de cada proceso
 * solo para pintar una etiqueta.
 */
type EstadoExpediente = 'ABIERTO' | 'EN_PROCESO' | 'CERRADO';

const ETAPA_FINAL = 10;

function estadoDe(p: ProcesoResumen): EstadoExpediente {
  if (p.etapa >= ETAPA_FINAL) return 'CERRADO';
  if (p.etapa > 1) return 'EN_PROCESO';
  return 'ABIERTO';
}

const ESTADOS: Record<EstadoExpediente, { label: string; bg: string; text: string }> = {
  ABIERTO: { label: 'Abierto', bg: 'bg-green-100', text: 'text-green-700' },
  EN_PROCESO: { label: 'En proceso', bg: 'bg-amber-100', text: 'text-amber-700' },
  CERRADO: { label: 'Cerrado', bg: 'bg-gray-100', text: 'text-gray-700' },
};

type Filtro = 'TODOS' | EstadoExpediente;

export function VistaExpedientes() {
  const [procesos, setProcesos] = useState<ProcesoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(() => {
    contratacionService
      .listarProcesos()
      .then((p) => setProcesos(p))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  const estadisticas = useMemo(() => {
    const conEstado = procesos.map(estadoDe);
    return {
      total: procesos.length,
      abiertos: conEstado.filter((e) => e === 'ABIERTO').length,
      enProceso: conEstado.filter((e) => e === 'EN_PROCESO').length,
      cerrados: conEstado.filter((e) => e === 'CERRADO').length,
      conExpediente: procesos.filter((p) => p.expediente).length,
    };
  }, [procesos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return procesos.filter((p) => {
      if (filtro !== 'TODOS' && estadoDe(p) !== filtro) return false;
      if (!q) return true;
      return (
        p.radicado.toLowerCase().includes(q) ||
        p.objeto.toLowerCase().includes(q) ||
        (p.expediente?.numeroExpediente.toLowerCase().includes(q) ?? false)
      );
    });
  }, [procesos, busqueda, filtro]);

  return (
    <div className="space-y-4">
      {/* Cabecera con los conteos */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-start gap-3 mb-3">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#0891B215' }}
          >
            <FolderOpen className="w-5 h-5" style={{ color: '#0891B2' }} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold m-0" style={{ color: '#0891B2' }}>
              Expedientes electrónicos
            </h2>
            <p className="text-[12.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
              El expediente de cada proceso, completo y sin editar. Trae las actividades
              trabajadas, los documentos con su huella de integridad, el historial de
              supervisión, las modificaciones y toda la trazabilidad.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Conteo
            icono={<Folder className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />}
            fondo="bg-blue-50"
            valor={estadisticas.total}
            tono="text-gray-900"
            etiqueta="Total expedientes"
          />
          <Conteo
            icono={<FolderOpen className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />}
            fondo="bg-green-50"
            valor={estadisticas.abiertos}
            tono="text-green-700"
            etiqueta="Abiertos"
          />
          <Conteo
            icono={<Clock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />}
            fondo="bg-amber-50"
            valor={estadisticas.enProceso}
            tono="text-amber-700"
            etiqueta="En proceso"
          />
          <Conteo
            icono={<CheckCircle2 className="w-3.5 h-3.5 text-gray-600" aria-hidden="true" />}
            fondo="bg-gray-100"
            valor={estadisticas.cerrados}
            tono="text-gray-700"
            etiqueta="Cerrados"
          />
          <Conteo
            icono={<Archive className="w-3.5 h-3.5 text-purple-600" aria-hidden="true" />}
            fondo="bg-purple-50"
            valor={estadisticas.conExpediente}
            tono="text-purple-700"
            etiqueta="Con expediente"
          />
        </div>
      </div>

      {/* Búsqueda y filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <label className="relative block flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por radicado, objeto o número de expediente"
              aria-label="Buscar expedientes"
              className="w-full text-[12.5px] rounded-lg border border-gray-200 bg-white
                pl-9 pr-3 py-2 text-slate-700 placeholder:text-slate-400
                focus:outline-none focus:border-[#0891B2] focus:ring-2 focus:ring-[#0891B2]/20"
            />
          </label>

          <div className="flex gap-2 flex-wrap">
            <BotonFiltro
              activo={filtro === 'TODOS'}
              onClick={() => setFiltro('TODOS')}
              label="Todos"
              conteo={estadisticas.total}
            />
            <BotonFiltro
              activo={filtro === 'ABIERTO'}
              onClick={() => setFiltro('ABIERTO')}
              label="Abiertos"
              conteo={estadisticas.abiertos}
            />
            <BotonFiltro
              activo={filtro === 'EN_PROCESO'}
              onClick={() => setFiltro('EN_PROCESO')}
              label="En proceso"
              conteo={estadisticas.enProceso}
            />
            <BotonFiltro
              activo={filtro === 'CERRADO'}
              onClick={() => setFiltro('CERRADO')}
              label="Cerrados"
              conteo={estadisticas.cerrados}
            />
          </div>
        </div>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Cargando filas={4} />
        </div>
      ) : error ? (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-red-600 m-0">{error}</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-[13px] font-bold text-slate-700 m-0">No hay expedientes</p>
          <p className="text-[11.5px] text-slate-500 m-0 mt-1">
            {busqueda || filtro !== 'TODOS'
              ? 'Ningún expediente coincide con los filtros seleccionados'
              : 'No hay procesos registrados aún'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((p) => (
            <TarjetaExpediente
              key={p.id}
              proceso={p}
              expandido={abierto === p.id}
              onToggle={() => setAbierto((v) => (v === p.id ? null : p.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Conteo({
  icono,
  fondo,
  valor,
  tono,
  etiqueta,
}: {
  icono: React.ReactNode;
  fondo: string;
  valor: number;
  tono: string;
  etiqueta: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
      <span className={`w-7 h-7 rounded-lg ${fondo} flex items-center justify-center flex-shrink-0`}>
        {icono}
      </span>
      <div className="min-w-0">
        <p className={`text-lg font-black ${tono} leading-none m-0 tabular-nums`}>{valor}</p>
        <p className="text-[10px] text-gray-500 m-0 mt-0.5 truncate">{etiqueta}</p>
      </div>
    </div>
  );
}

function BotonFiltro({
  activo,
  onClick,
  label,
  conteo,
}: {
  activo: boolean;
  onClick: () => void;
  label: string;
  conteo: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`px-3 py-2 rounded-lg text-[11.5px] font-bold border transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/40 ${
          activo
            ? 'bg-[#0891B2]/10 border-[#0891B2]/30 text-[#0891B2]'
            : 'bg-white border-gray-200 text-slate-600 hover:border-[#0891B2]/30 hover:text-[#0891B2]'
        }`}
    >
      {label} ({conteo})
    </button>
  );
}

function TarjetaExpediente({
  proceso,
  expandido,
  onToggle,
}: {
  proceso: ProcesoResumen;
  expandido: boolean;
  onToggle: () => void;
}) {
  const estado = estadoDe(proceso);
  const config = ESTADOS[estado];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Toda la fila abre el expediente, no solo el botón: es el gesto que se
          intenta primero, y con la tarjeta ancha el botón queda lejos del texto
          que se acaba de leer. */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0891B2, #0891B2dd)' }}
            >
              <FolderOpen className="w-5 h-5 text-white" aria-hidden="true" />
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h3 className="text-[14px] font-bold text-slate-800 m-0">{proceso.radicado}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${config.bg} ${config.text}`}
                >
                  {config.label}
                </span>
                {proceso.expediente && (
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {proceso.expediente.numeroExpediente}
                  </span>
                )}
              </div>

              <p className="text-[12.5px] text-slate-700 m-0 mb-2.5">{proceso.objeto}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11.5px]">
                <Dato etiqueta="Modalidad" valor={proceso.modalidadNombre ?? '—'} />
                <Dato
                  etiqueta="Valor"
                  valor={
                    proceso.valorEstimado ? formatoPesos.format(proceso.valorEstimado) : '—'
                  }
                />
                <Dato etiqueta="Etapa" valor={`${proceso.etapa} de ${ETAPA_FINAL}`} />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              // La tarjeta entera ya escucha el clic; sin esto se abriría y
              // se volvería a cerrar en el mismo gesto.
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={expandido}
            className="px-3.5 py-2 rounded-lg text-[11.5px] font-bold text-white flex items-center
              gap-1.5 flex-shrink-0 transition-colors bg-[#0891B2] hover:bg-[#0e7490]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/40"
          >
            {expandido ? (
              <>
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
                Ocultar
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
                Ver expediente
              </>
            )}
          </button>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-gray-200 bg-slate-50/60">
          <div className="px-4 pt-4">
            <h4 className="text-[12.5px] font-bold text-slate-800 m-0 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" aria-hidden="true" />
              Contenido del expediente
            </h4>
          </div>
          <PanelAuditoria procesoId={proceso.id} />
        </div>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <span className="text-slate-500">{etiqueta}:</span>{' '}
      <span className="text-slate-800 font-medium">{valor}</span>
    </div>
  );
}
