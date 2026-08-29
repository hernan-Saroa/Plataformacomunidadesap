import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  FileText,
  Hash,
  History,
  ShieldCheck,
  UserCog,
} from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { ExpedienteAuditoria } from '../../types';
import { Ayuda, Titulo } from '../shared/PiezasPanel';
import { fechaLarga, momento, momentoConHora } from '../shared/fechas';

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

/**
 * Expediente electrónico único para auditoría (EFDS-1186).
 *
 * Todo en una pantalla y solo lectura: quien audita necesita ver el proceso
 * entero de una vez, no reconstruirlo actividad por actividad.
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

  if (cargando) {
    return <p className="text-xs text-slate-500 m-0 px-4 py-3">Cargando el expediente…</p>;
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
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Dato etiqueta="Radicado" valor={proceso.radicado} />
          <Dato etiqueta="Modalidad" valor={proceso.modalidad ?? '—'} />
          <Dato etiqueta="Valor estimado" valor={pesos(proceso.valor_estimado)} />
          <Dato etiqueta="Radicado el" valor={momento(proceso.fecha_radicacion)} />
          <div className="col-span-2">
            <Dato etiqueta="Objeto" valor={proceso.objeto} />
          </div>
        </div>
      </div>

      {contrato && (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
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

      <Bloque
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
      </Bloque>

      <Bloque
        icono={<FileText className="w-4 h-4 text-slate-400" />}
        titulo="Documentos del expediente"
        cuantos={datos.documentos.length}
      >
        <ul className="m-0 p-0 list-none space-y-1.5">
          {datos.documentos.map((d, i) => (
            <li key={i} className="text-[11.5px] text-slate-600">
              <div className="flex items-baseline gap-2">
                {d.numeral && (
                  <span className="font-bold text-slate-500 w-8 flex-shrink-0">{d.numeral}</span>
                )}
                <span className="flex-1 min-w-0 truncate">
                  {d.archivo_nombre_original ?? d.nombre}
                </span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  {momento(d.created_at)}
                </span>
              </div>
              {d.hash_sha256 && (
                <div className="flex items-center gap-1 pl-10 mt-0.5">
                  <Hash className="w-2.5 h-2.5 text-slate-300 flex-shrink-0" />
                  <code className="text-[9.5px] text-slate-400 font-mono truncate">
                    {d.hash_sha256}
                  </code>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Bloque>

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
        <ul className="m-0 p-0 list-none space-y-1">
          {datos.trazabilidad.map((t, i) => (
            <li key={i} className="flex items-baseline gap-2 text-[11px] text-slate-500">
              {/* Con hora: en una auditoría importa el orden dentro del día. */}
              <span className="text-[10px] text-slate-400 w-36 flex-shrink-0 tabular-nums">
                {momentoConHora(t.created_at)}
              </span>
              <span className="font-bold text-slate-600 w-20 flex-shrink-0">{t.accion}</span>
              <span className="flex-1 min-w-0 truncate">{t.entidad}</span>
              <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
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
