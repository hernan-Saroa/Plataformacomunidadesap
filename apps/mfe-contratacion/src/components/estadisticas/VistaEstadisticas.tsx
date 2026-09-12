import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CircleDashed,
  Download,
  FileCheck2,
  FileSignature,
  Landmark,
  PlayCircle,
  Square,
} from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Cargando } from '../shared/PiezasPanel';
import { ModuleHeader } from '../shared/ModuleHeader';
import { ConteoValor, EstadisticasGestion, EstadoDeGestion, Modalidad } from '../../types';
import { momentoConHora } from '../shared/fechas';

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Los valores del reporte se abrevian.
 *
 * Un informe de gestión maneja miles de millones, y `$ 1.234.567.890` en una
 * tarjeta obliga a contar los dígitos para saber si son millones o miles de
 * millones. El valor exacto queda en el CSV, que es donde se cita.
 */
function pesosCortos(valor: number): string {
  if (Math.abs(valor) >= 1_000_000_000) {
    return `$ ${(valor / 1_000_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} mil M`;
  }
  if (Math.abs(valor) >= 1_000_000) {
    return `$ ${(valor / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  }
  return formatoPesos.format(valor);
}

/** Un color y un ícono por estado del ciclo, en su orden. */
const RASGOS: Record<
  EstadoDeGestion,
  { icono: typeof FileSignature; color: string; ayuda: string }
> = {
  SUSCRITO: {
    icono: FileSignature,
    color: '#003DA5',
    ayuda: 'Firmados por las dos partes, aún sin acta de inicio',
  },
  EJECUCION: {
    icono: PlayCircle,
    color: '#10B981',
    ayuda: 'Corriendo hoy, incluidos los suspendidos',
  },
  TERMINADO: {
    icono: Square,
    color: '#D97706',
    ayuda: 'Ejecución acabada, pendientes de liquidar',
  },
  LIQUIDADO: {
    icono: FileCheck2,
    color: '#7C3AED',
    ayuda: 'Con acta de liquidación suscrita',
  },
  CERRADO: {
    icono: CircleDashed,
    color: '#64748B',
    ayuda: 'Vencidos los amparos de estabilidad y calidad',
  },
};

/**
 * Estadísticas y reportes de gestión — tab propio (EFDS-1189, numeral 3.1.a).
 *
 * Va en el menú y no dentro de un proceso porque quien rinde cuentas mira toda
 * la contratación junta: llegar a los indicadores entrando proceso por proceso
 * es exactamente lo contrario de lo que necesita.
 */
export function VistaEstadisticas() {
  const [datos, setDatos] = useState<EstadisticasGestion | null>(null);
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [vigencia, setVigencia] = useState<number | null>(null);
  const [modalidad, setModalidad] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si el catálogo no carga, los filtros se quedan sin modalidades pero el
    // reporte se ve igual: es un selector, no un requisito.
    contratacionService
      .modalidades()
      .then(setModalidades)
      .catch(() => setModalidades([]));
  }, []);

  useEffect(() => {
    setCargando(true);
    contratacionService
      .estadisticas({ vigencia, modalidad })
      .then((e) => {
        setDatos(e);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [vigencia, modalidad]);

  const urlCsv = useMemo(
    () => contratacionService.urlEstadisticasCsv({ vigencia, modalidad }),
    [vigencia, modalidad],
  );

  // Las vigencias las dice el reporte, no un rango inventado: ofrecer 2020
  // cuando el primer contrato es de 2025 lleva a cuatro consultas vacías.
  const vigencias = datos?.vigenciasDisponibles ?? [];

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="Estadísticas y reportes"
        subtitle="Indicadores de gestión de la contratación"
        icon={<BarChart3 className="w-5 h-5" />}
        color="#0891B2"
      />

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-end gap-4 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500">Vigencia</span>
            <select
              value={vigencia ?? ''}
              onChange={(e) => setVigencia(e.target.value ? Number(e.target.value) : null)}
              className="px-2.5 py-1.5 rounded-lg text-[12.5px] border border-gray-200 bg-white
                text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/40"
            >
              <option value="">Todas</option>
              {vigencias.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500">Modalidad</span>
            <select
              value={modalidad ?? ''}
              onChange={(e) => setModalidad(e.target.value || null)}
              className="px-2.5 py-1.5 rounded-lg text-[12.5px] border border-gray-200 bg-white
                text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/40"
            >
              <option value="">Todas</option>
              {modalidades.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="flex-1" />

          {/* Un enlace y no un botón con `fetch`: así el navegador nombra el
              archivo con lo que dice el Content-Disposition y muestra su propia
              barra de descarga. */}
          <a
            href={urlCsv}
            className="px-3 py-2 rounded-lg text-[12px] font-bold flex items-center gap-2
              border border-[#0891B2]/30 bg-[#0891B2]/10 text-[#0891B2] hover:bg-[#0891B2]/15
              transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/40"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Descargar CSV
          </a>
        </div>

        {datos && (
          <p className="text-[11px] text-slate-400 m-0 mt-3 pt-3 border-t border-gray-100">
            Corte del {momentoConHora(datos.generadoEn)}. Las cifras se calculan al consultar,
            así que siempre reflejan el expediente en este momento.
          </p>
        )}
      </div>

      {cargando ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <Cargando filas={4} />
        </div>
      ) : error ? (
        <p className="text-xs text-red-600 m-0 px-4 py-6 text-center bg-white border border-gray-200 rounded-xl">
          {error}
        </p>
      ) : !datos || datos.contratos.total === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-10 text-center">
          <BarChart3 className="w-8 h-8 mx-auto text-slate-300 mb-2" aria-hidden="true" />
          <p className="text-[12.5px] font-bold text-slate-700 m-0">Sin contratos que informar</p>
          <p className="text-[11.5px] text-slate-500 m-0 mt-0.5">
            No hay contratos suscritos con los filtros elegidos.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {datos.contratos.porEstado.map((c) => (
              <TarjetaEstado key={c.clave} corte={c} />
            ))}
          </div>

          <Presupuesto datos={datos} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Barras
              titulo="Por modalidad de selección"
              ayuda="Cuánto se contrató bajo cada modalidad"
              cortes={datos.contratos.porModalidad}
              color="#7C3AED"
            />
            <Barras
              titulo="Por tipología de contrato"
              ayuda="Qué clase de contratos firmó la entidad"
              cortes={datos.contratos.porTipologia}
              color="#0891B2"
            />
          </div>

          <Barras
            titulo="Procesos de selección por desenlace"
            ayuda={`${datos.procesos.total} procesos radicados; un desierto también es gestión`}
            cortes={datos.procesos.porDesenlace}
            color="#B45309"
          />
        </>
      )}
    </div>
  );
}

function TarjetaEstado({ corte }: { corte: ConteoValor }) {
  const rasgo = RASGOS[corte.clave as EstadoDeGestion];
  const color = rasgo?.color ?? '#64748B';
  const Icono = rasgo?.icono ?? FileSignature;

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icono className="w-4 h-4" style={{ color }} aria-hidden="true" />
        </span>
        <span className="text-[11.5px] font-bold text-slate-600">{corte.etiqueta}</span>
      </div>

      <span className="block text-2xl font-bold leading-none mt-3" style={{ color }}>
        {corte.cuantos}
      </span>
      <span className="block text-[11.5px] text-slate-500 mt-1 tabular-nums">
        {pesosCortos(corte.valor)}
      </span>
      {rasgo && (
        <span className="block text-[10.5px] text-slate-400 mt-1.5 leading-snug">
          {rasgo.ayuda}
        </span>
      )}
    </div>
  );
}

function Presupuesto({ datos }: { datos: EstadisticasGestion }) {
  const { contratado, pagado, porPagar, porcentajeEjecutado } = datos.presupuesto;
  // La barra se recorta al 100% aunque el porcentaje se informe tal cual: si se
  // pagó de más hay que verlo en el número, no que la barra desborde la caja.
  const ancho = Math.min(100, Math.max(0, porcentajeEjecutado));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#05966915' }}
        >
          <Landmark className="w-4 h-4" style={{ color: '#059669' }} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-slate-800 m-0">Ejecución presupuestal</h3>
          <p className="text-[11.5px] text-slate-500 m-0 mt-0.5">
            Solo cuentan las cuentas de cobro ya tramitadas: una radicada o avalada todavía no
            es plata que salió.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Cifra etiqueta="Contratado" valor={contratado} color="#003DA5" />
        <Cifra etiqueta="Pagado" valor={pagado} color="#059669" />
        <Cifra etiqueta="Por pagar" valor={porPagar} color="#D97706" />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[11px] font-bold text-slate-500">Ejecutado</span>
          <span className="text-[12.5px] font-bold text-emerald-600 tabular-nums">
            {porcentajeEjecutado}%
          </span>
        </div>
        <div
          className="h-2 rounded-full bg-slate-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={porcentajeEjecutado}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Porcentaje del valor contratado que ya se pagó"
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
            style={{ width: `${ancho}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const Cifra = ({
  etiqueta,
  valor,
  color,
}: {
  etiqueta: string;
  valor: number;
  color: string;
}) => (
  <div className="rounded-lg border border-gray-100 bg-slate-50/60 px-3 py-2.5">
    <span className="block text-[11px] text-slate-500">{etiqueta}</span>
    <span className="block text-[15px] font-bold mt-0.5 tabular-nums" style={{ color }}>
      {formatoPesos.format(valor)}
    </span>
  </div>
);

/**
 * Un corte del reporte como barras proporcionales.
 *
 * Barras y no una tabla: los cortes por modalidad y tipología se miran para
 * comparar —«en qué se nos va la plata»—, y una columna de cifras obliga a
 * hacer esa comparación de cabeza.
 */
function Barras({
  titulo,
  ayuda,
  cortes,
  color,
}: {
  titulo: string;
  ayuda: string;
  cortes: ConteoValor[];
  color: string;
}) {
  // Sobre el mayor y no sobre el total: con quince tipologías todas las barras
  // saldrían del ancho de un pelo y no se compararían con nada.
  const mayor = Math.max(...cortes.map((c) => c.valor), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h3 className="text-[13px] font-bold text-slate-800 m-0">{titulo}</h3>
      <p className="text-[11.5px] text-slate-500 m-0 mt-0.5">{ayuda}</p>

      {cortes.length === 0 ? (
        <p className="text-[11.5px] text-slate-400 m-0 mt-4">Sin datos con estos filtros.</p>
      ) : (
        <ul className="m-0 mt-4 p-0 list-none space-y-3">
          {cortes.map((c) => (
            <li key={c.clave}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-[12px] font-semibold text-slate-700 truncate">
                  {c.etiqueta}
                </span>
                <span className="text-[11.5px] text-slate-500 tabular-nums flex-shrink-0">
                  {c.cuantos} · {pesosCortos(c.valor)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${(c.valor / mayor) * 100}%`, backgroundColor: color }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
