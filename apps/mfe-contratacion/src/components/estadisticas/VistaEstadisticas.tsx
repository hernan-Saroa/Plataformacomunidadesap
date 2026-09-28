import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CircleDashed,
  Clock,
  Download,
  FileCheck2,
  FilePen,
  FileSignature,
  Landmark,
  PauseCircle,
  PlayCircle,
  Receipt,
  Scale,
  Search,
  Square,
  Timer,
  UserX,
  Users,
  X,
} from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Cargando } from '../shared/PiezasPanel';
import { ModuleHeader } from '../shared/ModuleHeader';
import {
  ConteoValor,
  ContratoDelReporte,
  EstadisticasGestion,
  EstadoDeGestion,
  Modalidad,
  ResumenDias,
  SituacionContrato,
  TipologiaConfigurable,
} from '../../types';
import { momentoConHora } from '../shared/fechas';

const COLOR = '#0891B2';

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
export function pesosCortos(valor: number): string {
  if (Math.abs(valor) >= 1_000_000_000) {
    return `$ ${(valor / 1_000_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} mil M`;
  }
  if (Math.abs(valor) >= 1_000_000) {
    return `$ ${(valor / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  }
  return formatoPesos.format(valor);
}

const numero = (n: number) => n.toLocaleString('es-CO');

/** «2026-03-10» → «10 mar 2026», sin pasar por `Date` para que la zona no corra el día. */
function fechaCorta(ymd: string | null): string {
  if (!ymd) return '—';
  const [a, m, d] = ymd.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${Number(d)} ${meses[Number(m) - 1] ?? m} ${a}`;
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
    color: '#059669',
    ayuda: 'Corriendo hoy, incluidos los suspendidos',
  },
  TERMINADO: {
    icono: Square,
    color: '#B45309',
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
 * Cómo se ve cada situación.
 *
 * Con ícono y texto y no solo con color: son estados de alerta, y quien no
 * distingue el rojo del ámbar tiene que poder leerlos igual.
 */
const SITUACIONES: Record<
  SituacionContrato,
  { icono: typeof AlertTriangle; color: string; corto: string }
> = {
  PLAZO_VENCIDO: { icono: AlertTriangle, color: '#B91C1C', corto: 'Plazo vencido' },
  LIQUIDACION_VENCIDA: { icono: Scale, color: '#B91C1C', corto: 'Liquidación vencida' },
  SIN_SUPERVISOR: { icono: UserX, color: '#B45309', corto: 'Sin supervisor' },
  POR_VENCER: { icono: CalendarClock, color: '#B45309', corto: 'Por vencer' },
  SUSPENDIDO: { icono: PauseCircle, color: '#475569', corto: 'Suspendido' },
  POR_LIQUIDAR: { icono: Clock, color: '#475569', corto: 'Por liquidar' },
};

/** Cuántos contratos se pintan antes de pedir «ver todos». */
const FILAS_INICIALES = 25;

interface Props {
  /** Abre el proceso del contrato. Sin él, el listado se lee pero no navega. */
  onAbrir?: (procesoId: string) => void;
}

/**
 * Estadísticas y reportes de gestión — tab propio (EFDS-1189, numeral 3.1.a).
 *
 * Va en el menú y no dentro de un proceso porque quien rinde cuentas mira toda
 * la contratación junta: llegar a los indicadores entrando proceso por proceso
 * es exactamente lo contrario de lo que necesita.
 */
export function VistaEstadisticas({ onAbrir }: Props = {}) {
  const [datos, setDatos] = useState<EstadisticasGestion | null>(null);
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [tipologias, setTipologias] = useState<TipologiaConfigurable[]>([]);
  const [vigencia, setVigencia] = useState<number | null>(null);
  const [modalidad, setModalidad] = useState<string | null>(null);
  const [tipologia, setTipologia] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [situacion, setSituacion] = useState<SituacionContrato | null>(null);

  useEffect(() => {
    // Si un catálogo no carga, su filtro se queda vacío pero el reporte se ve
    // igual: es un selector, no un requisito.
    contratacionService
      .modalidades()
      .then(setModalidades)
      .catch(() => setModalidades([]));
    contratacionService
      .tipologias()
      .then(setTipologias)
      .catch(() => setTipologias([]));
  }, []);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    contratacionService
      .estadisticas({ vigencia, modalidad, tipologia })
      .then((e) => {
        if (!vigente) return;
        setDatos(e);
        setError(null);
      })
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    // Si el usuario cambia dos filtros seguidos, la respuesta vieja no pisa la nueva.
    return () => {
      vigente = false;
    };
  }, [vigencia, modalidad, tipologia]);

  const urlCsv = useMemo(
    () => contratacionService.urlEstadisticasCsv({ vigencia, modalidad, tipologia }),
    [vigencia, modalidad, tipologia],
  );

  // Las vigencias las dice el reporte, no un rango inventado: ofrecer 2020
  // cuando el primer contrato es de 2025 lleva a cuatro consultas vacías.
  const vigencias = datos?.vigenciasDisponibles ?? [];
  const hayFiltros = vigencia !== null || modalidad !== null || tipologia !== null;

  const limpiar = () => {
    setVigencia(null);
    setModalidad(null);
    setTipologia(null);
    setSituacion(null);
  };

  /** Desde el panel de atención: lleva al listado ya filtrado. */
  const verSituacion = (s: SituacionContrato) => {
    setSituacion(s);
    document.getElementById('listado-contratos')?.scrollIntoView?.({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="Estadísticas y reportes"
        subtitle="Indicadores de gestión de la contratación"
        icon={<BarChart3 className="w-5 h-5" />}
        color={COLOR}
      />

      <div className="est-tarjeta p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-500">Vigencia</span>
            <select
              value={vigencia ?? ''}
              onChange={(e) => setVigencia(e.target.value ? Number(e.target.value) : null)}
              className="est-selector"
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
            <span className="text-xs font-bold text-slate-500">Modalidad</span>
            <select
              value={modalidad ?? ''}
              onChange={(e) => setModalidad(e.target.value || null)}
              className="est-selector"
            >
              <option value="">Todas</option>
              {modalidades.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-500">Tipología</span>
            <select
              value={tipologia ?? ''}
              onChange={(e) => setTipologia(e.target.value || null)}
              className="est-selector"
            >
              <option value="">Todas</option>
              {tipologias.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>

          {hayFiltros && (
            <button type="button" onClick={limpiar} className="est-boton es-sutil">
              <X className="w-4 h-4" aria-hidden="true" />
              Quitar filtros
            </button>
          )}

          <div className="flex-1" />

          {/* Un enlace y no un botón con `fetch`: así el navegador nombra el
              archivo con lo que dice el Content-Disposition y muestra su propia
              barra de descarga. */}
          <a href={urlCsv} className="est-boton">
            <Download className="w-4 h-4" aria-hidden="true" />
            Descargar CSV
          </a>
        </div>

        {datos && (
          <p className="text-xs text-slate-400 m-0 mt-3 pt-3 border-t border-gray-100">
            Corte del {momentoConHora(datos.generadoEn)}. Las cifras se calculan al consultar,
            así que siempre reflejan el expediente en este momento. La vigencia es el año de la
            firma del contrato y, para los procesos, el de su radicación.
          </p>
        )}
      </div>

      {cargando && !datos ? (
        <div className="est-tarjeta overflow-hidden">
          <Cargando filas={4} />
        </div>
      ) : error ? (
        <p className="text-xs text-red-600 m-0 px-4 py-6 text-center est-tarjeta">{error}</p>
      ) : !datos ? null : (
        <div className="space-y-4" aria-busy={cargando}>
          <Resumen datos={datos} />

          {datos.contratos.total === 0 ? (
            <div className="est-tarjeta px-4 py-10 text-center">
              <BarChart3 className="w-8 h-8 mx-auto text-slate-300 mb-2" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-700 m-0">Sin contratos que informar</p>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                No hay contratos suscritos con los filtros elegidos.
              </p>
            </div>
          ) : (
            <>
              <div className="est-rejilla-estados">
                {datos.contratos.porEstado.map((c) => (
                  <TarjetaEstado key={c.clave} corte={c} total={datos.contratos.total} />
                ))}
              </div>

              <Atencion datos={datos} onVer={verSituacion} />

              <div className="est-rejilla-2">
                <Presupuesto datos={datos} />
                <Barras
                  titulo="Cuentas de cobro"
                  ayuda={`${pesosCortos(datos.presupuesto.enTramite)} radicados o avalados, por salir`}
                  icono={Receipt}
                  cortes={datos.presupuesto.cuentasPorEstado}
                  color="#059669"
                />
              </div>

              <SuscripcionesPorMes cortes={datos.contratos.porMes} />

              <div className="est-rejilla-2">
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
                  color={COLOR}
                />
              </div>

              <div className="est-rejilla-2">
                <Barras
                  titulo="Principales contratistas"
                  ayuda={`Los diez con más valor contratado, de ${numero(
                    datos.contratos.contratistasDistintos,
                  )} contratistas distintos`}
                  icono={Users}
                  cortes={datos.contratos.principalesContratistas}
                  color="#003DA5"
                />
                <Barras
                  titulo="Por tipo de persona"
                  ayuda="Personas naturales y jurídicas contratadas"
                  cortes={datos.contratos.porTipoPersona}
                  color="#0F766E"
                />
              </div>

              <Modificaciones datos={datos} />
              <Tiempos datos={datos} />
            </>
          )}

          <div className="est-rejilla-3">
            <Barras
              titulo="Procesos de selección por desenlace"
              ayuda={`${numero(datos.procesos.total)} procesos radicados; un desierto también es gestión`}
              cortes={datos.procesos.porDesenlace}
              color="#B45309"
              medida="cuantos"
            />
            <Barras
              titulo="Procesos en curso por etapa"
              ayuda="Dónde están los que todavía no terminan"
              cortes={datos.procesos.enCursoPorEtapa}
              color="#475569"
              medida="cuantos"
              enOrden
            />
            <Barras
              titulo="Procesos por modalidad"
              ayuda="Cuántos procesos se abrieron con cada modalidad"
              cortes={datos.procesos.porModalidad}
              color="#7C3AED"
              medida="cuantos"
            />
          </div>

          {datos.contratos.total > 0 && (
            <ListadoContratos
              contratos={datos.contratosDelReporte}
              situacion={situacion}
              onSituacion={setSituacion}
              onAbrir={onAbrir}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Las cifras de cabecera: lo que se pregunta primero. */
function Resumen({ datos }: { datos: EstadisticasGestion }) {
  const { contratos, procesos } = datos;
  return (
    <div className="est-rejilla-kpi">
      <Indicador
        etiqueta="Contratos suscritos"
        valor={numero(contratos.total)}
        detalle={`${pesosCortos(contratos.valorTotal)} en total`}
      />
      <Indicador
        etiqueta="Valor promedio por contrato"
        valor={pesosCortos(contratos.valorPromedio)}
        detalle={`Valor inicial ${pesosCortos(contratos.valorInicial)}`}
      />
      <Indicador
        etiqueta="Contratistas distintos"
        valor={numero(contratos.contratistasDistintos)}
        detalle="Personas naturales y jurídicas"
      />
      <Indicador
        etiqueta="Procesos de selección"
        valor={numero(procesos.total)}
        detalle={`${pesosCortos(procesos.valorEstimado)} estimados`}
      />
    </div>
  );
}

const Indicador = ({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
}) => (
  <div className="est-tarjeta px-4 py-3.5">
    <span className="block text-xs font-bold text-slate-500">{etiqueta}</span>
    <span className="block text-2xl font-bold leading-none mt-2 text-slate-800 tabular-nums">
      {valor}
    </span>
    <span className="block text-xs text-slate-500 mt-1.5 tabular-nums">{detalle}</span>
  </div>
);

function TarjetaEstado({ corte, total }: { corte: ConteoValor; total: number }) {
  const rasgo = RASGOS[corte.clave as EstadoDeGestion];
  const color = rasgo?.color ?? '#64748B';
  const Icono = rasgo?.icono ?? FileSignature;
  const parte = total === 0 ? 0 : Math.round((corte.cuantos / total) * 100);

  return (
    <div className="est-tarjeta px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icono className="w-4 h-4" style={{ color }} aria-hidden="true" />
        </span>
        <span className="text-xs font-bold text-slate-600">{corte.etiqueta}</span>
      </div>

      <span className="block text-2xl font-bold leading-none mt-3 text-slate-800">
        {corte.cuantos}
      </span>
      <span className="block text-xs text-slate-500 mt-1 tabular-nums">
        {pesosCortos(corte.valor)} · {parte}%
      </span>
      {rasgo && (
        <span className="block text-xs text-slate-400 mt-1.5 leading-snug">{rasgo.ayuda}</span>
      )}
    </div>
  );
}

/**
 * Los contratos que hay que mirar ya.
 *
 * Cada situación lleva al listado filtrado: quien ve «3 con el plazo vencido»
 * lo siguiente que pregunta es cuáles.
 */
function Atencion({
  datos,
  onVer,
}: {
  datos: EstadisticasGestion;
  onVer: (s: SituacionContrato) => void;
}) {
  const { porSituacion, incumplimientosAbiertos, contratosConIncumplimiento, diasDeAnticipacion } =
    datos.seguimiento;
  const conAlgo = porSituacion.filter((s) => s.cuantos > 0);

  return (
    <div className="est-tarjeta p-5">
      <div className="flex items-start gap-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#B4530915' }}
        >
          <AlertTriangle className="w-4 h-4" style={{ color: '#B45309' }} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-slate-800 m-0">Contratos que requieren atención</h3>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            «Por vencer» es dentro de los próximos {diasDeAnticipacion} días. La liquidación de
            común acuerdo se cuenta a cuatro meses de la terminación.
          </p>
        </div>
      </div>

      {conAlgo.length === 0 && incumplimientosAbiertos === 0 ? (
        <p className="text-xs text-emerald-700 m-0 mt-4">
          Ningún contrato del corte está vencido, sin supervisor ni pendiente de liquidar.
        </p>
      ) : (
        <ul className="m-0 mt-4 p-0 est-lista grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {porSituacion.map((s) => {
            const rasgo = SITUACIONES[s.clave as SituacionContrato];
            const Icono = rasgo?.icono ?? AlertTriangle;
            const vacia = s.cuantos === 0;
            return (
              <li key={s.clave}>
                <button
                  type="button"
                  disabled={vacia}
                  onClick={() => onVer(s.clave as SituacionContrato)}
                  className="est-fila est-situacion w-full text-left flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 bg-white"
                  title={vacia ? undefined : 'Ver estos contratos en el listado'}
                >
                  <Icono
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: vacia ? '#94A3B8' : rasgo?.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-slate-600 leading-snug">{s.etiqueta}</span>
                    {!vacia && (
                      <span className="block text-xs text-slate-400 tabular-nums">
                        {pesosCortos(s.valor)}
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-bold text-slate-800 tabular-nums">{s.cuantos}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {incumplimientosAbiertos > 0 && (
        <p className="text-xs text-slate-600 m-0 mt-3 flex items-center gap-2">
          <Scale className="w-4 h-4 text-red-700 flex-shrink-0" aria-hidden="true" />
          {incumplimientosAbiertos}{' '}
          {incumplimientosAbiertos === 1 ? 'caso' : 'casos'} de presunto incumplimiento sin
          cerrar en {contratosConIncumplimiento}{' '}
          {contratosConIncumplimiento === 1 ? 'contrato' : 'contratos'}. El detalle está bajo
          reserva y se consulta en el expediente.
        </p>
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
    <div className="est-tarjeta p-5">
      <div className="flex items-start gap-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#05966915' }}
        >
          <Landmark className="w-4 h-4" style={{ color: '#059669' }} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-slate-800 m-0">Ejecución presupuestal</h3>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Solo cuentan las cuentas de cobro ya tramitadas: una radicada o avalada todavía no
            es plata que salió.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Cifra etiqueta="Contratado" valor={contratado} color="#003DA5" />
        <Cifra etiqueta="Pagado" valor={pagado} color="#059669" />
        <Cifra etiqueta="Por pagar" valor={porPagar} color="#B45309" />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-bold text-slate-500">Ejecutado</span>
          <span className="text-sm font-bold text-emerald-700 tabular-nums">
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
            className="h-full rounded-full bg-emerald-500 est-crece"
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
  <div className="rounded-lg border border-gray-100 bg-slate-50 px-3 py-2.5 min-w-0">
    <span className="block text-xs text-slate-500">{etiqueta}</span>
    <span
      className="block text-sm font-bold mt-0.5 tabular-nums truncate"
      style={{ color }}
      title={formatoPesos.format(valor)}
    >
      {formatoPesos.format(valor)}
    </span>
  </div>
);

/**
 * La serie mensual como columnas.
 *
 * Columnas y no una línea: son meses sueltos, no un continuo, y con tres o
 * cuatro puntos una línea sugiere una tendencia que no hay.
 */
function SuscripcionesPorMes({ cortes }: { cortes: ConteoValor[] }) {
  const mayor = Math.max(...cortes.map((c) => c.cuantos), 1);

  return (
    <div className="est-tarjeta p-5">
      <h3 className="text-[13px] font-bold text-slate-800 m-0">Contratos suscritos por mes</h3>
      <p className="text-xs text-slate-500 m-0 mt-0.5">
        Cuántos se firmaron cada mes; pase el cursor sobre una columna para ver el valor.
      </p>

      {cortes.length === 0 ? (
        <p className="text-xs text-slate-400 m-0 mt-4">Sin datos con estos filtros.</p>
      ) : (
        <div className="mt-3">
          <div className="est-meses" role="list" aria-label="Contratos suscritos por mes">
            {cortes.map((c) => (
              <div
                key={c.clave}
                className="est-mes"
                role="listitem"
                title={`${c.etiqueta}: ${c.cuantos} ${c.cuantos === 1 ? 'contrato' : 'contratos'} · ${formatoPesos.format(c.valor)}`}
                aria-label={`${c.etiqueta}: ${c.cuantos} contratos por ${pesosCortos(c.valor)}`}
              >
                <span className="est-mes-cifra">{c.cuantos}</span>
                <div
                  className="est-mes-barra"
                  style={{ height: `${(c.cuantos / mayor) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="est-meses-etiquetas" aria-hidden="true">
            {cortes.map((c) => (
              <span key={c.clave}>{c.etiqueta}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Modificaciones({ datos }: { datos: EstadisticasGestion }) {
  const m = datos.modificaciones;
  return (
    <div className="est-rejilla-2">
      <div className="est-tarjeta p-5">
        <div className="flex items-start gap-3">
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#7C3AED15' }}
          >
            <FilePen className="w-4 h-4" style={{ color: '#7C3AED' }} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[13px] font-bold text-slate-800 m-0">Modificaciones contractuales</h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Solo las aprobadas: una en trámite todavía no cambió el contrato.
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 m-0">
          <Dato etiqueta="Modificaciones" valor={numero(m.total)} />
          <Dato
            etiqueta="Contratos modificados"
            valor={`${numero(m.contratosModificados)} de ${numero(datos.contratos.total)}`}
          />
          <Dato
            etiqueta="Valor adicionado"
            valor={pesosCortos(m.valorAdicionado)}
            nota={`${m.porcentajeAdicionado}% sobre el valor inicial`}
          />
          <Dato etiqueta="Días prorrogados" valor={numero(m.diasProrrogados)} />
        </dl>
      </div>
      <Barras
        titulo="Modificaciones por tipo"
        ayuda="Adiciones, prórrogas, cesiones, suspensiones y demás"
        cortes={m.porTipo}
        color="#7C3AED"
        medida="cuantos"
        enOrden
      />
    </div>
  );
}

const Dato = ({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) => (
  <div className="rounded-lg border border-gray-100 bg-slate-50 px-3 py-2.5 min-w-0">
    <dt className="text-xs text-slate-500">{etiqueta}</dt>
    <dd className="m-0 text-sm font-bold text-slate-800 mt-0.5 tabular-nums">{valor}</dd>
    {nota && <dd className="m-0 text-xs text-slate-400">{nota}</dd>}
  </div>
);

/** Cuánto tarda el ciclo. Promedio y mediana: un proceso quieto un año dispara el primero. */
function Tiempos({ datos }: { datos: EstadisticasGestion }) {
  return (
    <div className="est-tarjeta p-5">
      <div className="flex items-start gap-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#0891B215' }}
        >
          <Timer className="w-4 h-4" style={{ color: COLOR }} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-slate-800 m-0">Tiempos del ciclo</h3>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            En días calendario. La mediana dice cuánto tarda un contrato típico aunque alguno se
            haya quedado quieto meses.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Tramo
          titulo="De la radicación del proceso a la firma"
          resumen={datos.tiempos.radicacionASuscripcion}
        />
        <Tramo titulo="De la firma al acta de inicio" resumen={datos.tiempos.suscripcionAInicio} />
      </div>
    </div>
  );
}

const Tramo = ({ titulo, resumen }: { titulo: string; resumen: ResumenDias }) => (
  <div className="rounded-lg border border-gray-100 bg-slate-50 px-3 py-2.5">
    <span className="block text-xs text-slate-500">{titulo}</span>
    {resumen.muestras === 0 ? (
      <span className="block text-sm text-slate-400 mt-1">Sin contratos para medirlo</span>
    ) : (
      <>
        <span className="block text-lg font-bold text-slate-800 mt-0.5 tabular-nums">
          {numero(resumen.mediana ?? 0)} días
          <span className="text-xs font-normal text-slate-500"> de mediana</span>
        </span>
        <span className="block text-xs text-slate-500 tabular-nums">
          Promedio {numero(resumen.promedio ?? 0)} días · {resumen.muestras}{' '}
          {resumen.muestras === 1 ? 'contrato medido' : 'contratos medidos'}
        </span>
      </>
    )}
  </div>
);

/**
 * Un corte del reporte como barras proporcionales.
 *
 * Barras y no una tabla: los cortes por modalidad y tipología se miran para
 * comparar —«en qué se nos va la plata»—, y una columna de cifras obliga a
 * hacer esa comparación de cabeza.
 *
 * `medida` decide qué mide el largo: el valor para lo que es plata, la cantidad
 * para lo que no la tiene —una prórroga no suma pesos, y medirla por valor la
 * dejaría sin barra—.
 */
function Barras({
  titulo,
  ayuda,
  cortes,
  color,
  icono: Icono,
  medida = 'valor',
  enOrden = false,
}: {
  titulo: string;
  ayuda: string;
  cortes: ConteoValor[];
  color: string;
  icono?: typeof Users;
  medida?: 'valor' | 'cuantos';
  /** El orden ya viene dado (etapas, tipos): no reordenar por tamaño. */
  enOrden?: boolean;
}) {
  const largo = (c: ConteoValor) => (medida === 'valor' ? c.valor : c.cuantos);
  // Sobre el mayor y no sobre el total: con quince tipologías todas las barras
  // saldrían del ancho de un pelo y no se compararían con nada.
  const mayor = Math.max(...cortes.map(largo), 1);
  const filas = enOrden ? cortes : [...cortes].sort((a, b) => largo(b) - largo(a));

  return (
    <div className="est-tarjeta p-5">
      <div className="flex items-center gap-2">
        {Icono && <Icono className="w-4 h-4 text-slate-400" aria-hidden="true" />}
        <h3 className="text-[13px] font-bold text-slate-800 m-0">{titulo}</h3>
      </div>
      <p className="text-xs text-slate-500 m-0 mt-0.5">{ayuda}</p>

      {filas.length === 0 ? (
        <p className="text-xs text-slate-400 m-0 mt-4">Sin datos con estos filtros.</p>
      ) : (
        <ul className="m-0 mt-4 p-0 est-lista space-y-3">
          {filas.map((c) => (
            <li key={c.clave} title={`${c.etiqueta}: ${c.cuantos} · ${formatoPesos.format(c.valor)}`}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-xs font-semibold text-slate-700 truncate">{c.etiqueta}</span>
                <span className="text-xs text-slate-500 tabular-nums flex-shrink-0">
                  {medida === 'valor' || c.valor > 0
                    ? `${c.cuantos} · ${pesosCortos(c.valor)}`
                    : c.cuantos}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full est-crece"
                  style={{ width: `${(largo(c) / mayor) * 100}%`, backgroundColor: color }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Los contratos del corte, uno por fila.
 *
 * Es lo que el organismo de control pide para cruzar las cifras de arriba, y
 * lo que permite pasar de «hay tres vencidos» a cuáles son.
 */
function ListadoContratos({
  contratos,
  situacion,
  onSituacion,
  onAbrir,
}: {
  contratos: ContratoDelReporte[];
  situacion: SituacionContrato | null;
  onSituacion: (s: SituacionContrato | null) => void;
  onAbrir?: (procesoId: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [todos, setTodos] = useState(false);

  const filtrados = useMemo(() => {
    const busqueda = texto.trim().toLowerCase();
    return contratos.filter(
      (c) =>
        (!situacion || c.situaciones.includes(situacion)) &&
        (!busqueda ||
          [c.numero, c.radicado, c.contratista, c.objeto, c.supervisor ?? '']
            .join(' ')
            .toLowerCase()
            .includes(busqueda)),
    );
  }, [contratos, situacion, texto]);

  const visibles = todos ? filtrados : filtrados.slice(0, FILAS_INICIALES);
  const cuantasHay = (s: SituacionContrato) =>
    contratos.filter((c) => c.situaciones.includes(s)).length;

  return (
    <div id="listado-contratos" className="est-tarjeta overflow-hidden">
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-[13px] font-bold text-slate-800 m-0">Listado de contratos</h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              {filtrados.length === contratos.length
                ? `${numero(contratos.length)} contratos del corte`
                : `${numero(filtrados.length)} de ${numero(contratos.length)} contratos`}
              {onAbrir ? '. Clic en una fila para abrir el proceso.' : '.'}
            </p>
          </div>
          <label className="relative block w-full sm:w-auto">
            <span className="sr-only">Buscar contrato</span>
            <Search
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Número, contratista, objeto…"
              className="est-buscador pl-8"
            />
          </label>
        </div>

        <div className="flex gap-2 flex-wrap mt-3" role="group" aria-label="Filtrar por situación">
          <button
            type="button"
            className="est-chip"
            aria-pressed={situacion === null}
            onClick={() => onSituacion(null)}
          >
            Todos
          </button>
          {(Object.keys(SITUACIONES) as SituacionContrato[]).map((s) => {
            const n = cuantasHay(s);
            const Icono = SITUACIONES[s].icono;
            return (
              <button
                key={s}
                type="button"
                className="est-chip"
                aria-pressed={situacion === s}
                disabled={n === 0 && situacion !== s}
                onClick={() => onSituacion(situacion === s ? null : s)}
              >
                <Icono className="w-3.5 h-3.5" aria-hidden="true" />
                {SITUACIONES[s].corto}
                <span className="tabular-nums">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="text-xs text-slate-400 m-0 px-5 pb-5">Ningún contrato coincide.</p>
      ) : (
        <div className="est-tabla-marco">
          <table className="est-tabla">
            <thead>
              <tr>
                <th scope="col">Contrato</th>
                <th scope="col">Contratista</th>
                <th scope="col">Estado</th>
                <th scope="col" className="es-cifra">
                  Valor
                </th>
                <th scope="col" className="es-cifra">
                  Pagado
                </th>
                <th scope="col" className="est-col-detalle">
                  Modalidad
                </th>
                <th scope="col" className="est-col-detalle">
                  Suscrito
                </th>
                <th scope="col">Fin del plazo</th>
                <th scope="col" className="est-col-detalle">
                  Supervisor
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <FilaContrato key={`${c.procesoId}-${c.numero}`} contrato={c} onAbrir={onAbrir} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!todos && filtrados.length > FILAS_INICIALES && (
        <div className="px-5 py-3 border-t border-gray-100">
          <button type="button" className="est-boton es-sutil" onClick={() => setTodos(true)}>
            Ver los {numero(filtrados.length)} contratos
          </button>
        </div>
      )}
    </div>
  );
}

function FilaContrato({
  contrato: c,
  onAbrir,
}: {
  contrato: ContratoDelReporte;
  onAbrir?: (procesoId: string) => void;
}) {
  const rasgo = RASGOS[c.estado];
  const abrir = onAbrir ? () => onAbrir(c.procesoId) : undefined;

  return (
    <tr
      className={`est-fila${abrir ? ' es-abrible' : ''}`}
      onClick={abrir}
      tabIndex={abrir ? 0 : undefined}
      onKeyDown={
        abrir
          ? (e) => {
              if (e.key === 'Enter') abrir();
            }
          : undefined
      }
    >
      <td>
        <span className="block font-bold text-slate-800 whitespace-nowrap">{c.numero}</span>
        <span className="block text-slate-400 whitespace-nowrap">{c.radicado}</span>
        <span className="est-objeto text-slate-500" title={c.objeto}>
          {c.objeto}
        </span>
      </td>
      <td>
        <span className="block">{c.contratista}</span>
        <span className="block text-slate-400">{c.tipoPersona}</span>
      </td>
      <td>
        <span className="font-semibold whitespace-nowrap" style={{ color: rasgo?.color }}>
          {c.estadoCiclo === 'SUSPENDIDO' ? 'Suspendido' : NOMBRE_CORTO[c.estado]}
        </span>
        {c.situaciones
          .filter((s) => s !== 'SUSPENDIDO')
          .map((s) => {
            const Icono = SITUACIONES[s].icono;
            return (
              <span
                key={s}
                className="flex items-center gap-1 mt-1 whitespace-nowrap"
                style={{ color: SITUACIONES[s].color }}
              >
                <Icono className="w-3.5 h-3.5" aria-hidden="true" />
                {SITUACIONES[s].corto}
              </span>
            );
          })}
      </td>
      <td className="es-cifra">
        {formatoPesos.format(c.valor)}
        {c.valor !== c.valorInicial && (
          <span className="block text-slate-400" title="Valor con que se suscribió">
            Inicial {pesosCortos(c.valorInicial)}
          </span>
        )}
      </td>
      <td className="es-cifra">
        {c.porcentajePagado}%
        <span className="block text-slate-400">{pesosCortos(c.pagado)}</span>
      </td>
      <td className="est-col-detalle">
        <span className="block">{c.modalidad ?? '—'}</span>
        <span className="block text-slate-400">{c.tipologia ?? ''}</span>
      </td>
      <td className="est-col-detalle whitespace-nowrap">{fechaCorta(c.suscritoEl)}</td>
      <td className="whitespace-nowrap">
        {fechaCorta(c.finDelPlazo)}
        {c.diasParaVencer !== null && (
          <span className="block text-slate-400">
            {c.diasParaVencer < 0
              ? `Hace ${-c.diasParaVencer} días`
              : c.diasParaVencer === 0
                ? 'Vence hoy'
                : `Faltan ${c.diasParaVencer} días`}
          </span>
        )}
        {c.modificaciones > 0 && (
          <span className="block text-slate-400">
            {c.modificaciones} {c.modificaciones === 1 ? 'modificación' : 'modificaciones'}
          </span>
        )}
      </td>
      <td className="est-col-detalle">{c.supervisor ?? '—'}</td>
    </tr>
  );
}

/** El estado en singular, para una fila que habla de un solo contrato. */
const NOMBRE_CORTO: Record<EstadoDeGestion, string> = {
  SUSCRITO: 'Suscrito',
  EJECUCION: 'En ejecución',
  TERMINADO: 'Terminado',
  LIQUIDADO: 'Liquidado',
  CERRADO: 'Cerrado',
};
