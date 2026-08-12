import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  Gavel,
  HelpCircle,
  Paperclip,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CondicionMipyme, DecisionMipyme, EstadoMipyme } from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  SinPermiso,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Actividad 5.4 · Limitación de la convocatoria a MIPYME (EFDS-1151).
 *
 * El sistema calcula las condiciones y las pone delante de quien decide; la
 * limitación la resuelve la entidad. La pantalla está construida sobre esa
 * diferencia: muestra el cálculo, no lo impone, y deja registrar una decisión
 * que se aparte de él siempre que se motive.
 */
export function PanelMipyme({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoMipyme | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [rectificando, setRectificando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      setEstado(await contratacionService.mipyme(procesoId));
    } catch (err: any) {
      toast.error('No se pudo cargar la limitación a MIPYME', {
        id: 'mipyme-carga',
        description: err.message,
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [procesoId]);

  const ejecutar = async (accion: () => Promise<unknown>, exito: string): Promise<boolean> => {
    setTrabajando(true);
    try {
      await accion();
      toast.success(exito);
      await cargar();
      onCambio?.();
      return true;
    } catch (err: any) {
      toast.error('No se pudo completar la acción', { description: err.message });
      return false;
    } finally {
      setTrabajando(false);
    }
  };

  if (cargando) {
    return <p className="text-xs text-slate-500 m-0 px-4 py-3">Cargando…</p>;
  }
  if (!estado) {
    return (
      <p className="text-xs text-red-600 m-0 px-4 py-3">
        No se pudo cargar la limitación a MIPYME
      </p>
    );
  }

  if (!estado.aplica || !estado.condiciones) {
    return (
      <Marco>
        <Aviso tono="ok" titulo="Esta modalidad no admite limitar la convocatoria a MIPYME">
          No hay convocatoria que restringir en este flujo, así que no hay condiciones que evaluar.
        </Aviso>
      </Marco>
    );
  }

  const { condiciones, decision } = estado;
  const decidido = decision !== null;

  return (
    <Marco>
      {estado.advertencia && (
        <Aviso tono="aviso" titulo="El cálculo corre sobre parámetros provisionales">
          {estado.advertencia}
        </Aviso>
      )}

      <Condiciones condiciones={condiciones} />

      <Manifestaciones estado={estado} />

      {!decidido && estado.puedeGestionar && !registrando && (
        <BotonSecundario
          disabled={trabajando}
          onClick={() => setRegistrando(true)}
          icono={<Building2 className="w-3.5 h-3.5" />}
        >
          Registrar una manifestación de interés
        </BotonSecundario>
      )}

      {registrando && (
        <FormularioManifestacion
          trabajando={trabajando}
          onCancelar={() => setRegistrando(false)}
          onRegistrar={async (datos, soporte) => {
            const ok = await ejecutar(
              () => contratacionService.registrarManifestacionMipyme(procesoId, datos, soporte),
              'Manifestación registrada',
            );
            if (ok) setRegistrando(false);
            return ok;
          }}
        />
      )}

      {decidido && <DecisionTomada decision={decision} />}

      {!estado.puedeGestionar ? (
        <SinPermiso quien="el gestor o la Dirección de Contratación" />
      ) : decidido && !rectificando ? (
        <div className="pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setRectificando(true)}
            className="text-xs font-bold text-slate-500 hover:text-amber-700"
          >
            ¿La decisión quedó mal? Rectificarla
          </button>
        </div>
      ) : (
        <div className="pt-2 border-t border-gray-200">
          <FormularioDecision
            condiciones={condiciones}
            rectifica={decidido}
            trabajando={trabajando}
            onCancelar={decidido ? () => setRectificando(false) : undefined}
            onDecidir={async (datos, acto) => {
              const ok = await ejecutar(
                () => contratacionService.decidirMipyme(procesoId, datos, acto),
                decidido ? 'Decisión rectificada' : 'Decisión registrada',
              );
              if (ok) setRectificando(false);
              return ok;
            }}
          />
        </div>
      )}
    </Marco>
  );
}

// ------------------------------------------------------------- piezas ------

/**
 * Las dos condiciones, con lo que se comparó en cada una.
 *
 * Se muestran las dos siempre, cumplidas o no: lo que necesita quien decide no
 * es un veredicto sino saber qué falta y contra qué se midió.
 */
function Condiciones({ condiciones }: { condiciones: NonNullable<EstadoMipyme['condiciones']> }) {
  const evaluables =
    condiciones.valor.cumple !== null && condiciones.manifestaciones.cumple !== null;

  return (
    <div className="space-y-2">
      <Titulo>Condiciones para limitar la convocatoria</Titulo>

      <ul className="list-none m-0 p-0 space-y-1.5">
        <Condicion titulo="Valor del proceso dentro del tope" condicion={condiciones.valor} />
        <Condicion
          titulo="Manifestaciones de interés de MIPYME"
          condicion={condiciones.manifestaciones}
        />
      </ul>

      {!evaluables ? (
        // Colapsar "no se pudo evaluar" con "no se cumple" le haría creer a
        // quien decide que la regla ya se comprobó.
        <Aviso tono="aviso" titulo="Falta un dato para evaluar las condiciones">
          Mientras no se pueda evaluar, el cálculo no dice si la limitación procede. La entidad
          puede decidir igual, pero motivándolo.
        </Aviso>
      ) : condiciones.cumplidas ? (
        <Aviso tono="ok" titulo="Se cumplen las dos condiciones">
          El cálculo indica que la convocatoria puede limitarse a MIPYME. La decisión sigue siendo
          de la entidad.
        </Aviso>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
          <p className="text-xs text-slate-700 m-0">
            No se cumplen las condiciones, así que el cálculo no respalda limitar la convocatoria.
            La entidad puede hacerlo igual si lo motiva.
          </p>
        </div>
      )}
    </div>
  );
}

/** Una condición: si se cumple dicho con palabras, y contra qué se comparó. */
function Condicion({ titulo, condicion }: { titulo: string; condicion: CondicionMipyme }) {
  const marca =
    condicion.cumple === true
      ? {
          icono: <Check className="w-3.5 h-3.5 text-emerald-700" strokeWidth={3} />,
          etiqueta: 'Se cumple',
          color: 'text-emerald-700',
        }
      : condicion.cumple === false
        ? {
            icono: <X className="w-3.5 h-3.5 text-red-700" strokeWidth={3} />,
            etiqueta: 'No se cumple',
            color: 'text-red-700',
          }
        : {
            icono: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />,
            etiqueta: 'No se puede evaluar',
            color: 'text-slate-600',
          };

  return (
    <li className="rounded-lg border border-gray-200 bg-white px-3.5 py-2.5">
      <p className="text-xs font-bold text-slate-800 m-0">{titulo}</p>
      <p className={`text-xs m-0 mt-1 flex items-start gap-1.5 ${marca.color}`}>
        <span className="flex-shrink-0 mt-px">{marca.icono}</span>
        <span>
          <span className="font-bold">{marca.etiqueta}</span> · {condicion.detalle}
        </span>
      </p>
    </li>
  );
}

/** Quiénes manifestaron interés. Del conteo depende una de las condiciones. */
function Manifestaciones({ estado }: { estado: EstadoMipyme }) {
  const { manifestaciones } = estado;

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-700 m-0 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        Manifestaciones de interés recibidas ({manifestaciones.length})
      </p>

      {manifestaciones.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
          <p className="text-xs text-slate-700 m-0">
            Ninguna MIPYME ha manifestado interés todavía.
          </p>
        </div>
      ) : (
        <ul className="list-none m-0 p-0 space-y-1">
          {manifestaciones.map((manifestacion) => (
            <li
              key={manifestacion.id}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 flex items-start justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-800">
                  {manifestacion.nombre}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {manifestacion.identificacion} · {fechaLarga(manifestacion.fechaPresentacion)}
                </span>
              </span>
              {manifestacion.documentoId && (
                <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              )}
            </li>
          ))}
        </ul>
      )}

      {estado.decision !== null && (
        <p className="text-xs text-slate-500 m-0 leading-relaxed">
          La decisión ya se tomó: no se admiten más manifestaciones, porque cambiarían el conteo
          con el que se decidió.
        </p>
      )}
    </div>
  );
}

/** La decisión registrada, con las condiciones que regían ese día. */
function DecisionTomada({ decision }: { decision: DecisionMipyme }) {
  const difiere = decision.limitado !== decision.condicionesCumplidas;

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 space-y-2 ${
        decision.limitado
          ? 'border-[#003DA5]/30 bg-[#E0EDFF]'
          : 'border-gray-200 bg-slate-50'
      }`}
    >
      <p className="text-sm font-bold text-slate-800 m-0 flex items-center gap-1.5">
        <Gavel className="w-4 h-4 flex-shrink-0" />
        {decision.limitado
          ? 'La convocatoria quedó limitada a MIPYME'
          : 'La convocatoria no se limitó a MIPYME'}
      </p>

      <p className="text-xs text-slate-600 m-0">
        {decision.decididoPor ?? 'Sin registrar'} · {momento(decision.decididoAt)}
      </p>

      {difiere && (
        <p className="text-xs text-amber-800 m-0 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          La decisión se apartó de lo que arrojaba el cálculo.
        </p>
      )}

      {decision.motivo && (
        <p className="text-xs text-slate-700 m-0 leading-relaxed">
          <span className="font-bold">Motivo:</span> {decision.motivo}
        </p>
      )}

      {/* Congelado: si mañana se corrigen los parámetros, esta decisión debe
          seguir explicándose con los que regían el día en que se tomó. */}
      <div className="pt-2 border-t border-gray-200">
        <p className="text-xs text-slate-500 m-0 leading-relaxed">
          Evaluada con {decision.manifestacionesContadas}{' '}
          {decision.manifestacionesContadas === 1 ? 'manifestación' : 'manifestaciones'}
          {decision.minimoManifestaciones !== null
            ? ` frente a un mínimo de ${decision.minimoManifestaciones}`
            : ''}
          {decision.valorProceso !== null
            ? ` · valor del proceso ${pesos.format(decision.valorProceso)}`
            : ''}
          {decision.topeValorAplicado !== null
            ? ` · tope aplicado ${decision.topeValorAplicado.toLocaleString('es-CO')} ${
                decision.unidadTopeAplicada ?? ''
              }`
            : ''}
          .
        </p>
      </div>

      {decision.documentoId && (
        <p className="text-xs text-slate-500 m-0 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          Acto administrativo cargado en el expediente
        </p>
      )}
    </div>
  );
}

/** Registro de una manifestación de interés. */
function FormularioManifestacion({
  trabajando,
  onCancelar,
  onRegistrar,
}: {
  trabajando: boolean;
  onCancelar: () => void;
  onRegistrar: (
    datos: { nombre: string; identificacion: string; fechaPresentacion: string },
    soporte: File | null,
  ) => Promise<boolean>;
}) {
  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [fecha, setFecha] = useState(hoyEnBogota);
  const [soporte, setSoporte] = useState<File | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-2">
      <Titulo>Registrar una manifestación de interés</Titulo>
      <Ayuda>
        La identificación es obligatoria: sin ella no hay forma de saber si dos manifestaciones son
        de la misma empresa, y el conteo inflado cambiaría la decisión.
      </Ayuda>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">Razón social</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            aria-label="Razón social de la MIPYME"
            className={campo}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">NIT</span>
          <input
            value={identificacion}
            onChange={(e) => setIdentificacion(e.target.value)}
            placeholder="900123456-1"
            aria-label="NIT de la MIPYME"
            className={campo}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">
            Fecha de presentación
          </span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-label="Fecha en que se presentó la manifestación"
            className={campo}
          />
        </label>
      </div>

      <input
        ref={inputArchivo}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        onChange={(e) => e.target.files?.[0] && setSoporte(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => inputArchivo.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {soporte ? soporte.name : 'Adjuntar soporte (opcional)'}
      </button>

      <div className="flex items-center gap-2">
        <Boton
          disabled={trabajando || !nombre.trim() || !identificacion.trim() || !fecha}
          onClick={() =>
            onRegistrar(
              {
                nombre: nombre.trim(),
                identificacion: identificacion.trim(),
                fechaPresentacion: fecha,
              },
              soporte,
            )
          }
          icono={<Building2 className="w-3.5 h-3.5" />}
        >
          Registrar manifestación
        </Boton>
        <button
          type="button"
          onClick={onCancelar}
          className="text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/**
 * La decisión de la entidad.
 *
 * El motivo se exige cuando lo resuelto difiere del cálculo, y el acto
 * administrativo cuando se limita: restringir quién puede presentarse a un
 * proceso público no se sostiene solo en un clic. Las dos reglas las valida el
 * backend; aquí se anticipan para no ofrecer un botón que va a fallar.
 */
function FormularioDecision({
  condiciones,
  rectifica,
  trabajando,
  onCancelar,
  onDecidir,
}: {
  condiciones: NonNullable<EstadoMipyme['condiciones']>;
  rectifica: boolean;
  trabajando: boolean;
  onCancelar?: () => void;
  onDecidir: (datos: { limitado: boolean; motivo?: string }, acto: File | null) => Promise<boolean>;
}) {
  const [limitado, setLimitado] = useState<boolean | null>(null);
  const [motivo, setMotivo] = useState('');
  const [acto, setActo] = useState<File | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const difiere = limitado !== null && limitado !== condiciones.cumplidas;
  const faltaMotivo = difiere && !motivo.trim();
  const faltaActo = limitado === true && !acto;

  return (
    <div className="space-y-2">
      <Titulo>
        {rectifica ? 'Rectificar la decisión' : 'Registrar la decisión sobre la limitación'}
      </Titulo>
      <Ayuda>
        La limitación la decide la entidad, no el sistema. El cálculo es una ayuda: puedes
        apartarte de él dejando constancia del motivo.
      </Ayuda>

      <fieldset className="m-0 p-0 border-0">
        <legend className="text-xs font-bold text-slate-600 mb-1 p-0">
          ¿La convocatoria queda limitada a MIPYME?
        </legend>
        <div className="flex items-center gap-4">
          {[
            { valor: true, etiqueta: 'Sí, se limita' },
            { valor: false, etiqueta: 'No se limita' },
          ].map((opcion) => (
            <label
              key={String(opcion.valor)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-700"
            >
              <input
                type="radio"
                name="limitacion-mipyme"
                checked={limitado === opcion.valor}
                onChange={() => setLimitado(opcion.valor)}
              />
              {opcion.etiqueta}
            </label>
          ))}
        </div>
      </fieldset>

      {difiere && (
        <>
          <Aviso tono="aviso" titulo="La decisión se aparta del cálculo">
            {condiciones.cumplidas
              ? 'Las condiciones se cumplen y la convocatoria no se limita: indica el motivo.'
              : 'Las condiciones no se cumplen y la convocatoria se limita: indica el motivo.'}
          </Aviso>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Motivo de la decisión"
            aria-label="Motivo de la decisión"
            className={campo}
          />
        </>
      )}

      {limitado === true && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 space-y-2">
          <p className="text-xs font-bold text-amber-900 m-0">
            Acto administrativo que sustenta la limitación (obligatorio)
          </p>
          <p className="text-xs text-amber-900 m-0">
            {acto
              ? acto.name
              : 'Limitar restringe quién puede presentarse al proceso, así que exige el acto que lo sustente.'}
          </p>
          <input
            ref={inputArchivo}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={(e) => e.target.files?.[0] && setActo(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => inputArchivo.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {acto ? 'Cambiar archivo' : 'Seleccionar archivo'}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Boton
          disabled={trabajando || limitado === null || faltaMotivo || faltaActo}
          onClick={() =>
            onDecidir({ limitado: limitado!, motivo: motivo.trim() || undefined }, acto)
          }
          icono={<Gavel className="w-3.5 h-3.5" />}
        >
          {rectifica ? 'Rectificar decisión' : 'Registrar decisión'}
        </Boton>
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
