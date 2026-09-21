import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CampoConfigurable, CeldaMatriz, FilaMatriz, Modalidad } from '../../types';
import { ACTIVIDADES_CON_REGISTRO, TIENEN_PANEL } from '../proceso/DetalleProceso';

import { AprobacionActividad } from './AprobacionActividad';
import { FirmaActividad } from './FirmaActividad';
import { NotificacionesActividad } from './NotificacionesActividad';
import { FormatosActividad } from './FormatosActividad';
import { QueSePide } from './QueSePide';
import { VistaPrevia } from './VistaPrevia';
import { Peticion } from './peticiones';

type Pestana = 'entrega' | 'archivos' | 'aprobacion' | 'firma' | 'avisos' | 'previa';

/** La única actividad cuyo formulario se arma con campos configurables. */
const NUMERAL_FORMULARIO_CONFIGURABLE = '3.1';

interface Props {
  fila: FilaMatriz;
  modalidades: Modalidad[];
  /** La columna desde la que se abrió, para señalarla entre las modalidades. */
  resaltada: string | null;
  campos: CampoConfigurable[];
  cargandoCampos: boolean;
  onCambioFila: (fila: FilaMatriz) => void;
  onAgregarCampo: (peticion: Peticion) => Promise<void>;
  onRenombrarCampo: (campo: CampoConfigurable, etiqueta: string) => Promise<void>;
  onExigirCampo: (campo: CampoConfigurable, obligatorio: boolean) => Promise<void>;
  onQuitarCampo: (campo: CampoConfigurable) => Promise<void>;
}

/**
 * La ficha de una actividad, en una sola página (EFDS-1183).
 *
 * Antes se abría desde una celda, decía «En Licitación Pública» y repartía la
 * configuración en cinco pestañas. Engañaba en lo más importante: casi todo lo
 * de adentro —lo que se pide, la aprobación— rige para las once modalidades,
 * así que quien creía ajustar una sola las cambiaba todas.
 *
 * Ahora arriba va lo que define la actividad —qué es y en qué modalidades se
 * hace, lo único que cambia entre ellas— y debajo, en pestañas, qué entrega el
 * gestor, sus archivos y quién la aprueba.
 *
 * Todo se guarda al momento: no hay nada pendiente al cerrar.
 */
export function DetalleActividad({
  fila,
  modalidades,
  resaltada,
  campos,
  cargandoCampos,
  onCambioFila,
  onAgregarCampo,
  onRenombrarCampo,
  onExigirCampo,
  onQuitarCampo,
}: Props) {
  const esFormulario = fila.numeral === NUMERAL_FORMULARIO_CONFIGURABLE;
  const registro = ACTIVIDADES_CON_REGISTRO[fila.numeral];
  const tienePanel = TIENEN_PANEL(fila.numeral);
  const [pestana, setPestana] = useState<Pestana>('entrega');

  // La vista previa solo donde es cierta: el formulario configurable es el de
  // la 3.1. En las demás el gestor ve su propio panel, y dibujar aquí un
  // formulario genérico mostraría una pantalla que no existe.
  const pestanas: [Pestana, string][] = [
    ['entrega', 'Qué entrega'],
    ['archivos', 'Archivos'],
    ['aprobacion', 'Aprobación'],
    ['firma', 'Firma'],
    ['avisos', 'Notificaciones'],
    ...(esFormulario ? ([['previa', 'Vista previa']] as [Pestana, string][]) : []),
  ];

  return (
    <div className="space-y-4">
      {/* Arriba, siempre a la vista, lo que define la actividad: qué es y en qué
          modalidades se hace. El detalle va en pestañas, para no tener que
          recorrer una página larga buscando una sola cosa. */}
      <Seccion primera titulo="Qué es">
        <TextoActividad fila={fila} onCambio={onCambioFila} />
        <PlazoActividad fila={fila} onCambio={onCambioFila} />
      </Seccion>

      <Seccion
        titulo="En qué modalidades se hace"
        ayuda={`Pulsa una para quitarla o volver a ponerla. Las tachadas se saltan esta actividad.${
          resaltada ? ' En ámbar, la columna desde la que abriste la ficha.' : ''
        }`}
      >
        <Modalidades fila={fila} modalidades={modalidades} resaltada={resaltada} onCambio={onCambioFila} />
      </Seccion>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {pestanas.map(([id, texto]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPestana(id)}
              aria-pressed={pestana === id}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                pestana === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>

        {pestana === 'entrega' &&
          (esFormulario ? (
            <QueSePide
              numeral={fila.numeral}
              campos={campos}
              cargando={cargandoCampos}
              onAgregar={onAgregarCampo}
              onRenombrar={onRenombrarCampo}
              onExigir={onExigirCampo}
              onQuitar={onQuitarCampo}
            />
          ) : (
            <p className="text-xs text-slate-700 m-0 leading-relaxed">
              {registro
                ? 'Registra la fecha en que ocurrió, una nota de lo que se hizo y el soporte.'
                : tienePanel
                  ? 'Se trabaja en su propia pantalla, que ya le pide lo que la actividad necesita.'
                  : 'Todavía no tiene pantalla en la plataforma, así que el flujo la salta.'}
            </p>
          ))}

        {pestana === 'archivos' && (
          <FormatosActividad numeral={fila.numeral} modalidad="" modalidades={modalidades} />
        )}

        {pestana === 'aprobacion' && <AprobacionActividad numeral={fila.numeral} />}
        {pestana === 'firma' && <FirmaActividad numeral={fila.numeral} />}
        {pestana === 'avisos' && <NotificacionesActividad numeral={fila.numeral} />}

        {pestana === 'previa' && esFormulario && <VistaPrevia actividad={fila} campos={campos} />}
      </div>
    </div>
  );
}

/** Un bloque de la ficha, con su rótulo en el estilo de las tablas del módulo. */
function Seccion({
  titulo,
  ayuda,
  primera,
  children,
}: {
  titulo: string;
  ayuda?: string;
  primera?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`space-y-2.5 ${primera ? '' : 'border-t border-gray-100 pt-4'}`}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 m-0">{titulo}</p>
        {ayuda && <p className="text-xs text-slate-600 m-0 mt-0.5 leading-relaxed">{ayuda}</p>}
      </div>
      {children}
    </section>
  );
}

/** El nombre y la descripción, que se escriben directamente y se guardan al salir. */
function TextoActividad({ fila, onCambio }: { fila: FilaMatriz; onCambio: (fila: FilaMatriz) => void }) {
  const [nombre, setNombre] = useState(fila.nombre);
  const [descripcion, setDescripcion] = useState(fila.descripcion ?? '');

  useEffect(() => {
    setNombre(fila.nombre);
    setDescripcion(fila.descripcion ?? '');
  }, [fila.numeral, fila.nombre, fila.descripcion]);

  const guardar = async () => {
    const limpio = nombre.trim();
    const desc = descripcion.trim();
    if (!limpio) {
      setNombre(fila.nombre);
      return;
    }
    if (limpio === fila.nombre && desc === (fila.descripcion ?? '')) return;

    try {
      // Sin plazo ni aviso: ausentes, el servicio conserva lo que hubiera.
      await contratacionService.actualizarActividad(fila.numeral, {
        nombre: limpio,
        descripcion: desc || undefined,
      });
      onCambio({ ...fila, nombre: limpio, descripcion: desc || null });
      toast.success('Guardado');
    } catch (err: any) {
      setNombre(fila.nombre);
      setDescripcion(fila.descripcion ?? '');
      toast.error(err.message ?? 'No se pudo guardar');
    }
  };

  const clase =
    'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 transition-colors hover:border-gray-300 focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none';

  return (
    <div className="space-y-1.5">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setNombre(fila.nombre);
            e.currentTarget.blur();
          }
        }}
        maxLength={200}
        aria-label="Nombre de la actividad"
        className={`${clase} text-sm font-bold text-slate-800`}
      />
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        onBlur={guardar}
        rows={2}
        placeholder="Qué debe saber el gestor de esta actividad"
        aria-label="Descripción de la actividad"
        className={`${clase} text-xs leading-relaxed text-slate-600 resize-none`}
      />
    </div>
  );
}

/**
 * El plazo de la actividad, en días hábiles (EFDS-1183).
 *
 * Se acordó en la reunión de validación: por actividad, sin fines de semana ni
 * festivos. Cuenta desde que le toca a alguien, y con él la actividad aparece
 * en Alertas cuando está por vencer o vencida, y sale el aviso de «se vence el
 * plazo». Vacío, la actividad no tiene plazo.
 */
function PlazoActividad({ fila, onCambio }: { fila: FilaMatriz; onCambio: (fila: FilaMatriz) => void }) {
  const [plazo, setPlazo] = useState(fila.plazoDias?.toString() ?? '');
  const [antes, setAntes] = useState(fila.alertaDiasAntes?.toString() ?? '');

  useEffect(() => {
    setPlazo(fila.plazoDias?.toString() ?? '');
    setAntes(fila.alertaDiasAntes?.toString() ?? '');
  }, [fila.numeral, fila.plazoDias, fila.alertaDiasAntes]);

  /** Entero dentro del rango, o null si está vacío; undefined si no es válido. */
  const leer = (texto: string, minimo: number, maximo: number): number | null | undefined => {
    const limpio = texto.trim();
    if (!limpio) return null;
    if (!/^\d+$/.test(limpio)) return undefined;
    const n = Number(limpio);
    return n >= minimo && n <= maximo ? n : undefined;
  };

  const guardar = async () => {
    const plazoDias = leer(plazo, 1, 999);
    const alertaDiasAntes = leer(antes, 0, 365);
    if (plazoDias === undefined || alertaDiasAntes === undefined) {
      toast.error('El plazo va de 1 a 999 días hábiles, y el aviso de 0 a 365');
      setPlazo(fila.plazoDias?.toString() ?? '');
      setAntes(fila.alertaDiasAntes?.toString() ?? '');
      return;
    }
    if (plazoDias === (fila.plazoDias ?? null) && alertaDiasAntes === (fila.alertaDiasAntes ?? null)) return;

    try {
      await contratacionService.actualizarActividad(fila.numeral, { nombre: fila.nombre, plazoDias, alertaDiasAntes });
      onCambio({ ...fila, plazoDias, alertaDiasAntes });
      toast.success(plazoDias === null ? 'La actividad quedó sin plazo' : 'Plazo guardado');
    } catch (err: any) {
      setPlazo(fila.plazoDias?.toString() ?? '');
      setAntes(fila.alertaDiasAntes?.toString() ?? '');
      toast.error(err.message ?? 'No se pudo guardar el plazo');
    }
  };

  const numero =
    'w-14 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-center text-slate-800 hover:border-gray-300 focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none';
  const alSalir = {
    onBlur: guardar,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') e.currentTarget.blur();
    },
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <span className="font-bold text-slate-700">Plazo</span>
      <input
        value={plazo}
        onChange={(e) => setPlazo(e.target.value)}
        inputMode="numeric"
        placeholder="—"
        aria-label="Plazo en días hábiles"
        className={numero}
        {...alSalir}
      />
      <span>días hábiles desde que le toca a alguien</span>
      {plazo.trim() && (
        <>
          <span className="text-slate-400">·</span>
          <span>avisar</span>
          <input
            value={antes}
            onChange={(e) => setAntes(e.target.value)}
            inputMode="numeric"
            placeholder="2"
            aria-label="Días hábiles antes del plazo para avisar"
            className={numero}
            {...alSalir}
          />
          <span>días antes</span>
        </>
      )}
      {!plazo.trim() && <span className="text-slate-400">· vacío, la actividad no tiene plazo</span>}
    </div>
  );
}

/** Las once modalidades en una fila: lo único de la ficha que cambia entre ellas. */
function Modalidades({
  fila,
  modalidades,
  resaltada,
  onCambio,
}: {
  fila: FilaMatriz;
  modalidades: Modalidad[];
  resaltada: string | null;
  onCambio: (fila: FilaMatriz) => void;
}) {
  const [excluyendo, setExcluyendo] = useState<Modalidad | null>(null);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState<string | null>(null);

  const celdaDe = (codigo: string): CeldaMatriz | undefined =>
    fila.celdas.find((c) => c.modalidad === codigo);
  const aplica = (codigo: string) => celdaDe(codigo)?.estado !== 'NO_APLICA';

  const cambiar = async (modalidad: Modalidad, nuevo: boolean, razon?: string) => {
    setGuardando(modalidad.codigo);
    try {
      await contratacionService.cambiarAplicabilidad(fila.numeral, {
        modalidad: modalidad.codigo,
        aplica: nuevo,
        motivo: razon,
      });
      onCambio({
        ...fila,
        celdas: fila.celdas.map((c) =>
          c.modalidad === modalidad.codigo
            ? { ...c, estado: nuevo ? 'APLICA' : 'NO_APLICA', motivo: nuevo ? null : razon ?? null }
            : c,
        ),
      });
      toast.success(nuevo ? `Se exige en ${modalidad.nombre}` : `Ya no se exige en ${modalidad.nombre}`);
      setExcluyendo(null);
      setMotivo('');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo cambiar');
    } finally {
      setGuardando(null);
    }
  };

  const conNota = modalidades
    .map((m) => ({ m, celda: celdaDe(m.codigo) }))
    .filter(({ celda }) => celda && (celda.variante || celda.motivo));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {modalidades.map((m) => {
          const si = aplica(m.codigo);
          const celda = celdaDe(m.codigo);
          const conSalvedad = celda?.estado === 'CON_SALVEDAD' || !!celda?.variante;
          return (
            <button
              key={m.codigo}
              type="button"
              disabled={guardando === m.codigo}
              aria-pressed={si}
              title={si ? `Se exige en ${m.nombre}: pulsa para quitarla` : `${m.nombre} se la salta: pulsa para volver a ponerla`}
              onClick={() => (si ? setExcluyendo(m) : cambiar(m, true))}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                si ? '' : 'line-through'
              } ${
                resaltada === m.codigo
                  ? `border-amber-300 bg-amber-50 ${si ? 'text-[#003DA5]' : 'text-slate-400'}`
                  : si
                    ? 'border-blue-200 bg-blue-50 text-[#003DA5] hover:border-[#003DA5]'
                    : 'border-gray-200 bg-white text-slate-400 hover:border-gray-300'
              }`}
            >
              {m.nombre}
              {conSalvedad && <AlertTriangle className="w-3 h-3 text-amber-600" aria-label="con salvedad" />}
            </button>
          );
        })}
      </div>

      {/* El motivo se pide en el sitio: queda en el expediente de los procesos de
          esa modalidad, así que merece un campo, pero no otra ventana. */}
      {excluyendo && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            cambiar(excluyendo, false, motivo.trim() || undefined);
          }}
          className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
        >
          <label className="block">
            <span className="block text-xs font-bold text-slate-700 mb-1">
              ¿Por qué {excluyendo.nombre} se la salta?
            </span>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              autoFocus
              maxLength={300}
              placeholder="Queda escrito en el expediente de los procesos de esa modalidad"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={guardando !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002D7A] shadow-sm disabled:opacity-50"
            >
              Ya no se exige
            </button>
            <button
              type="button"
              onClick={() => {
                setExcluyendo(null);
                setMotivo('');
              }}
              className="text-xs font-bold text-slate-500 hover:text-gray-700 px-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lo que la matriz del área dejó anotado. Se ve pero no se edita aquí: lo
          aclara Contratación, no esta pantalla. */}
      {conNota.length > 0 && (
        <div className="space-y-1">
          {conNota.map(({ m, celda }) => (
            <p key={m.codigo} className="text-[11px] text-slate-500 leading-relaxed m-0">
              <strong className="font-bold text-slate-600">{m.nombre}:</strong>{' '}
              {[celda?.variante, celda?.motivo].filter(Boolean).join(' · ')}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
