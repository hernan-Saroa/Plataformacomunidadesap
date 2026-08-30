import React, { useEffect, useState } from 'react';
import { CalendarPlus, Check, PauseCircle, PlayCircle, Users, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoModificaciones, ModificacionContrato, TipoModificacion } from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Pendiente,
  SelectorArchivo,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

/** Qué se puede pedir, y qué mueve cada una. */
const TRAMITES = [
  {
    tipo: 'PRORROGA' as const,
    etiqueta: 'Prorrogar el plazo',
    ayuda: 'Extiende los días de ejecución. No toca el valor del contrato.',
    icono: CalendarPlus,
    color: '#003DA5',
  },
  {
    tipo: 'SUSPENSION' as const,
    etiqueta: 'Suspender',
    ayuda: 'Detiene el plazo mientras dura la causa. La vigilancia continúa.',
    icono: PauseCircle,
    color: '#D97706',
  },
  {
    tipo: 'REANUDACION' as const,
    etiqueta: 'Reanudar',
    ayuda: 'Levanta la suspensión y el contrato vuelve a correr.',
    icono: PlayCircle,
    color: '#059669',
  },
  {
    tipo: 'CESION' as const,
    etiqueta: 'Ceder el contrato',
    ayuda: 'Otro contratista asume la ejecución en las mismas condiciones.',
    icono: Users,
    color: '#7C3AED',
  },
];

const ETIQUETA_TIPO: Record<TipoModificacion, string> = {
  PRORROGA: 'Prórroga',
  ADICION: 'Adición',
  CESION: 'Cesión',
  ACLARACION: 'Aclaración',
  SUSPENSION: 'Suspensión',
  REANUDACION: 'Reanudación',
  TERMINACION_ANTICIPADA: 'Terminación anticipada',
};

/**
 * Modificaciones contractuales — actividad 9.5 (EFDS-1177, EFDS-1178).
 *
 * Se entra por lo que el gestor quiere hacer —prorrogar, suspender, ceder— y
 * no por un selector de «tipo de modificación»: quien abre esta pantalla ya
 * sabe qué necesita, y obligarlo a traducirlo a una categoría es trabajo que
 * la pantalla puede ahorrarle.
 */
export function PanelModificaciones({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoModificaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tramite, setTramite] = useState<TipoModificacion | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [dias, setDias] = useState('30');
  const [justificacion, setJustificacion] = useState('');
  const [fechaEfecto, setFechaEfecto] = useState(hoyEnBogota());
  const [cesionarioNombre, setCesionarioNombre] = useState('');
  const [cesionarioDocumento, setCesionarioDocumento] = useState('');

  /** Cuál se está resolviendo, y con qué acto. */
  const [resolviendo, setResolviendo] = useState<string | null>(null);
  const [acto, setActo] = useState<File | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const cargar = () =>
    contratacionService
      .modificaciones(procesoId)
      .then((d) => {
        setEstado(d);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    cargar();
  }, [procesoId]);

  const limpiar = () => {
    setTramite(null);
    setDias('30');
    setJustificacion('');
    setFechaEfecto(hoyEnBogota());
    setCesionarioNombre('');
    setCesionarioDocumento('');
  };

  const solicitar = async () => {
    if (!tramite) return;
    setEnviando(true);
    try {
      if (tramite === 'PRORROGA') {
        const d = await contratacionService.solicitarProrroga(procesoId, {
          diasProrroga: Number(dias),
          justificacion: justificacion.trim(),
          fechaEfecto,
        });
        setEstado(d);
      } else {
        const d = await contratacionService.solicitarModificacion(procesoId, {
          tipo: tramite as 'CESION' | 'SUSPENSION' | 'REANUDACION' | 'ACLARACION',
          justificacion: justificacion.trim(),
          fechaEfecto,
          ...(tramite === 'CESION'
            ? {
                cesionarioNombre: cesionarioNombre.trim(),
                cesionarioDocumento: cesionarioDocumento.trim(),
              }
            : {}),
        });
        setEstado(d);
      }
      toast.success('Solicitud registrada', {
        description: 'Queda pendiente de aprobación con su acto administrativo.',
      });
      limpiar();
      onCambio?.();
    } catch (e: any) {
      toast.error('No se pudo registrar', { description: e.message });
    } finally {
      setEnviando(false);
    }
  };

  const aprobar = async (id: string) => {
    if (!acto) return;
    setEnviando(true);
    try {
      const d = await contratacionService.aprobarModificacion(procesoId, id, acto);
      setEstado(d);
      toast.success('Modificación aprobada');
      setResolviendo(null);
      setActo(null);
      onCambio?.();
    } catch (e: any) {
      toast.error('No se pudo aprobar', { description: e.message });
    } finally {
      setEnviando(false);
    }
  };

  const rechazar = async (id: string) => {
    setEnviando(true);
    try {
      const d = await contratacionService.rechazarModificacion(procesoId, id, motivoRechazo.trim());
      setEstado(d);
      toast.success('Modificación negada');
      setResolviendo(null);
      setMotivoRechazo('');
      onCambio?.();
    } catch (e: any) {
      toast.error('No se pudo negar', { description: e.message });
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return <p className="text-xs text-slate-500 m-0 px-4 py-3">Cargando…</p>;
  }
  if (error || !estado) {
    return <p className="text-xs text-red-600 m-0 px-4 py-3">{error ?? 'No se pudo cargar'}</p>;
  }

  const { contrato, puedeSolicitar, motivoNoPuede, modificaciones } = estado;
  const suspendido = contrato?.estado === 'SUSPENDIDO';

  // Lo que cabe en el estado en que está el contrato: uno suspendido no se
  // vuelve a suspender, y uno corriendo no se reanuda.
  const disponibles = TRAMITES.filter((t) => {
    if (t.tipo === 'SUSPENSION') return !suspendido;
    if (t.tipo === 'REANUDACION') return suspendido;
    return true;
  });

  const completo =
    justificacion.trim().length >= 20 &&
    fechaEfecto &&
    (tramite !== 'PRORROGA' || Number(dias) > 0) &&
    (tramite !== 'CESION' || (cesionarioNombre.trim() && cesionarioDocumento.trim()));

  return (
    <div className="space-y-4 p-4">
      <div>
        <Titulo>Modificaciones del contrato</Titulo>
        <Ayuda>
          Se solicita, alguien la aprueba con su acto administrativo, y solo entonces produce
          efectos. Ninguna modificación cambia el objeto del contrato.
        </Ayuda>
      </div>

      {!puedeSolicitar ? (
        <Pendiente falta="9.1" texto={`No se puede modificar: ${motivoNoPuede}.`} />
      ) : (
        <>
          {/* El plazo vigente arriba: es contra lo que se decide si prorrogar. */}
          {contrato && (
            <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 flex items-center gap-6 flex-wrap">
              <Cifra etiqueta="Plazo vigente" valor={`${contrato.plazoDias ?? '—'} días`} />
              {contrato.diasProrrogados > 0 && (
                <Cifra etiqueta="De los cuales prorrogados" valor={`${contrato.diasProrrogados}`} />
              )}
              <Cifra
                etiqueta="Estado"
                valor={suspendido ? 'Suspendido' : 'En ejecución'}
                destacado={suspendido}
              />
            </div>
          )}

          {!tramite ? (
            <div className="grid grid-cols-2 gap-2.5">
              {disponibles.map((t) => (
                <button
                  key={t.tipo}
                  type="button"
                  onClick={() => setTramite(t.tipo)}
                  className="text-left rounded-lg border border-gray-200 bg-white px-3.5 py-3
                    hover:border-slate-300 hover:shadow-sm transition-all
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003DA5]/40"
                >
                  <span className="flex items-center gap-2">
                    <t.icono className="w-4 h-4 flex-shrink-0" style={{ color: t.color }} />
                    <span className="text-[12.5px] font-bold text-slate-800">{t.etiqueta}</span>
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {t.ayuda}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold text-slate-800">
                  {TRAMITES.find((t) => t.tipo === tramite)?.etiqueta}
                </span>
                <button
                  type="button"
                  onClick={limpiar}
                  aria-label="Cancelar la solicitud"
                  className="text-slate-400 hover:text-slate-600 p-1 rounded
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {tramite === 'PRORROGA' && (
                <label className="block">
                  <span className="block text-xs font-bold text-slate-600 mb-1">
                    Días adicionales
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={1095}
                    value={dias}
                    onChange={(e) => setDias(e.target.value)}
                    className={campo}
                  />
                  {contrato?.plazoDias != null && Number(dias) > 0 && (
                    <span className="block text-[11px] text-slate-500 mt-1">
                      El plazo pasaría de {contrato.plazoDias} a{' '}
                      <strong>{contrato.plazoDias + Number(dias)} días</strong>.
                    </span>
                  )}
                </label>
              )}

              {tramite === 'CESION' && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-600 mb-1">
                      Quién recibe el contrato
                    </span>
                    <input
                      value={cesionarioNombre}
                      onChange={(e) => setCesionarioNombre(e.target.value)}
                      placeholder="Nombre o razón social"
                      className={campo}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-600 mb-1">
                      NIT o cédula
                    </span>
                    <input
                      value={cesionarioDocumento}
                      onChange={(e) => setCesionarioDocumento(e.target.value)}
                      placeholder="900123456-1"
                      className={campo}
                    />
                  </label>
                </div>
              )}

              <label className="block">
                <span className="block text-xs font-bold text-slate-600 mb-1">
                  Justificación técnica
                </span>
                <textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  rows={3}
                  placeholder="Por qué se necesita la modificación"
                  className={campo}
                />
                <span className="block text-[11px] text-slate-500 mt-1">
                  Es lo que lee quien aprueba
                  {justificacion.trim().length > 0 && justificacion.trim().length < 20
                    ? ` · faltan ${20 - justificacion.trim().length} caracteres`
                    : ''}
                </span>
              </label>

              <label className="block">
                <span className="block text-xs font-bold text-slate-600 mb-1">
                  Desde cuándo rige
                </span>
                <input
                  type="date"
                  value={fechaEfecto}
                  onChange={(e) => setFechaEfecto(e.target.value)}
                  className={campo}
                />
              </label>

              <div className="flex items-center gap-2">
                <Boton icono={<Check className="w-3.5 h-3.5" />} onClick={solicitar} disabled={!completo || enviando}>
                  {enviando ? 'Registrando…' : 'Registrar solicitud'}
                </Boton>
                <BotonSecundario icono={<X className="w-3.5 h-3.5" />} onClick={limpiar}>Cancelar</BotonSecundario>
              </div>
            </div>
          )}
        </>
      )}

      {modificaciones.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700 m-0">
            Historial <span className="text-slate-400">{modificaciones.length}</span>
          </p>
          <ul className="m-0 p-0 list-none space-y-2">
            {modificaciones.map((m) => (
              <Fila
                key={m.id}
                m={m}
                resolviendo={resolviendo === m.id}
                enviando={enviando}
                acto={acto}
                motivoRechazo={motivoRechazo}
                onResolver={() => setResolviendo(resolviendo === m.id ? null : m.id)}
                onActo={setActo}
                onMotivo={setMotivoRechazo}
                onAprobar={() => aprobar(m.id)}
                onRechazar={() => rechazar(m.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const Cifra = ({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) => (
  <div>
    <span className="block text-[10.5px] font-bold text-slate-400">{etiqueta}</span>
    <span
      className={`block text-[13px] font-bold ${destacado ? 'text-amber-700' : 'text-slate-800'}`}
    >
      {valor}
    </span>
  </div>
);

function Fila({
  m,
  resolviendo,
  enviando,
  acto,
  motivoRechazo,
  onResolver,
  onActo,
  onMotivo,
  onAprobar,
  onRechazar,
}: {
  m: ModificacionContrato;
  resolviendo: boolean;
  enviando: boolean;
  acto: File | null;
  motivoRechazo: string;
  onResolver: () => void;
  onActo: (f: File | null) => void;
  onMotivo: (v: string) => void;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  const pendiente = m.estado === 'SOLICITADA';

  return (
    <li className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] font-bold text-slate-800">
              {ETIQUETA_TIPO[m.tipo]}
            </span>
            <Etiqueta estado={m.estado} />
            {m.diasProrroga !== null && m.plazoAnteriorDias !== null && (
              <span className="text-[11px] text-slate-500 tabular-nums">
                {m.plazoAnteriorDias} → {m.plazoAnteriorDias + m.diasProrroga} días
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-slate-600 m-0 mt-1 leading-relaxed">
            {m.justificacion}
          </p>
          <p className="text-[10.5px] text-slate-400 m-0 mt-1">
            Rige desde {fechaLarga(m.fechaEfecto.slice(0, 10))}
            {m.solicitadaPor ? ` · solicitada por ${m.solicitadaPor}` : ''}
            {m.resueltaPor ? ` · resuelta por ${m.resueltaPor}` : ''}
          </p>
          {m.motivoRechazo && (
            <p className="text-[11px] text-red-700 m-0 mt-1">Negada: {m.motivoRechazo}</p>
          )}
        </div>

        {pendiente && (
          <BotonSecundario icono={null} onClick={onResolver}>
            {resolviendo ? 'Cerrar' : 'Resolver'}
          </BotonSecundario>
        )}
      </div>

      {resolviendo && pendiente && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <Aviso tono="aviso" titulo="La aprobación necesita el acto administrativo">
            Sin él, el contrato quedaría modificado por un acuerdo verbal.
          </Aviso>

          <SelectorArchivo
            etiqueta="Acto administrativo"
            archivo={acto}
            onElegir={onActo}
            ayuda="Resolución o acta motivada que soporta la modificación"
          />

          <div className="flex items-center gap-2">
            <Boton icono={<Check className="w-3.5 h-3.5" />} onClick={onAprobar} disabled={!acto || enviando}>
              <Check className="w-3.5 h-3.5" /> Aprobar
            </Boton>
          </div>

          <label className="block pt-2 border-t border-gray-100">
            <span className="block text-xs font-bold text-slate-600 mb-1">
              O negarla, diciendo por qué
            </span>
            <input
              value={motivoRechazo}
              onChange={(e) => onMotivo(e.target.value)}
              placeholder="Quien la pidió tiene que saber qué corregir"
              className={campo}
            />
          </label>
          <BotonSecundario
            icono={<X className="w-3.5 h-3.5" />}
            onClick={onRechazar}
            disabled={motivoRechazo.trim().length < 10 || enviando}
          >
            Negar la solicitud
          </BotonSecundario>
        </div>
      )}
    </li>
  );
}

const Etiqueta = ({ estado }: { estado: ModificacionContrato['estado'] }) => {
  const estilo =
    estado === 'APROBADA'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : estado === 'RECHAZADA'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';

  const texto =
    estado === 'APROBADA' ? 'Aprobada' : estado === 'RECHAZADA' ? 'Negada' : 'Pendiente';

  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${estilo}`}>
      {texto}
    </span>
  );
};
