import React, { useEffect, useRef, useState } from 'react';
import { FileText, Paperclip, Scale, Trash2, UserPlus, Users, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoComite, MiembroPropuesto, Persona, RolEvaluador } from '../../types';
import { Aviso, Ayuda, Boton, campo, Marco, Pendiente, Titulo } from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota } from '../shared/fechas';
import { SelectorPersona } from '../estudio-previo/SelectorPersona';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const ETIQUETA_ROL: Record<RolEvaluador, string> = {
  JURIDICO: 'Jurídica',
  FINANCIERO: 'Financiera',
  TECNICO: 'Técnica',
};

/**
 * Actividad 6.2 · Designación del comité evaluador (EFDS-1156).
 *
 * La lista de miembros se arma en pantalla y se envía junto al memorando en una
 * sola petición, porque una designación a medias no existe: son los nombres y
 * el acto que los nombra, o no hay comité.
 */
export function PanelComite({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoComite | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [designando, setDesignando] = useState(false);

  const [propuestos, setPropuestos] = useState<MiembroPropuesto[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [rol, setRol] = useState<RolEvaluador>('JURIDICO');
  const [fecha, setFecha] = useState(hoyEnBogota());
  const [memorando, setMemorando] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .comite(procesoId)
      .then((datos) => {
        setEstado(datos);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const limpiar = () => {
    setPropuestos([]);
    setPersona(null);
    setRol('JURIDICO');
    setFecha(hoyEnBogota());
    setMemorando(null);
    setDesignando(false);
  };

  const agregar = () => {
    if (!persona) return;

    // La misma persona puede evaluar dos dimensiones, pero no repetir una: es
    // la misma regla que aplica el servidor, dicha aquí antes de enviar.
    const repetido = propuestos.some((m) => m.personaId === persona.id && m.rol === rol);
    if (repetido) {
      toast.error(`${persona.nombre} ya está como evaluador en ${ETIQUETA_ROL[rol].toLowerCase()}`);
      return;
    }

    setPropuestos((lista) => [...lista, { personaId: persona.id, nombre: persona.nombre, rol }]);
    setPersona(null);
  };

  const quitar = (indice: number) =>
    setPropuestos((lista) => lista.filter((_, i) => i !== indice));

  const designar = async () => {
    if (propuestos.length === 0 || !memorando || !fecha) return;

    setGuardando(true);
    try {
      setEstado(
        await contratacionService.designarComite(
          procesoId,
          { fechaDesignacion: fecha, miembros: propuestos },
          memorando,
        ),
      );
      limpiar();
      toast.success('Comité evaluador designado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const revocar = async () => {
    const motivo = window.prompt('¿Por qué se revoca la designación del comité?')?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.revocarComite(procesoId, motivo));
      toast.success('Designación revocada; el proceso queda sin comité');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el comité evaluador…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la actividad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  if (!estado.aplica) {
    return (
      <Marco>
        <Titulo>Comité evaluador</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no designa comité">
          {estado.motivoNoAplica ?? 'La modalidad del proceso no evalúa ofertas por comité.'}
        </Aviso>
      </Marco>
    );
  }

  return (
    <Marco>
      <Titulo>Comité evaluador</Titulo>
      <Ayuda>
        El Ordenador del Gasto designa por memorando a quienes evaluarán las ofertas. Sin comité
        designado, la evaluación no puede iniciarse.
      </Ayuda>

      {/* Quien consulta sabe de entrada si le toca evaluar y en qué. */}
      {estado.soyEvaluador ? (
        <Aviso tono="ok" titulo="Evalúas en este proceso">
          Fuiste designado para la evaluación{' '}
          {estado.misDimensiones.map((d) => ETIQUETA_ROL[d].toLowerCase()).join(' y ')}.
        </Aviso>
      ) : null}

      {/* Las dos condiciones de la actividad anterior, dichas por separado: sin
          esto el usuario ve un botón apagado y no sabe qué le falta. */}
      {!estado.recepcionCerrada ? (
        <Pendiente
          falta="6.1"
          texto="La recepción de ofertas todavía no se ha cerrado: el comité se designa sobre una lista de oferentes en firme."
        />
      ) : estado.totalOferentes === 0 ? (
        <Aviso tono="aviso" titulo="El proceso cerró sin ofertas">
          No se recibió ninguna oferta, así que no hay nada que evaluar ni comité que designar.
        </Aviso>
      ) : null}

      {estado.designado && estado.comite ? (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <Users className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-emerald-900 m-0">
                  Comité designado el {fechaLarga(estado.comite.fechaDesignacion)}
                </p>
                <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed break-words">
                  {estado.comite.designadoPor ? `Por ${estado.comite.designadoPor}. ` : ''}
                  {estado.comite.memorando
                    ? `Memorando: ${estado.comite.memorando.nombre}`
                    : 'Sin memorando registrado'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {estado.miembros.map((miembro) => (
              <div
                key={miembro.id}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 flex items-start gap-2.5"
              >
                <Scale className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-slate-800 m-0 break-words">
                    {miembro.nombre}
                  </p>
                  <p className="text-[11.5px] text-slate-600 m-0 mt-0.5">
                    Evaluación {ETIQUETA_ROL[miembro.rol].toLowerCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={guardando}
            onClick={revocar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Revocar la designación
          </button>
        </>
      ) : null}

      {estado.puedeDesignar && !designando ? (
        <Boton icono={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setDesignando(true)}>
          Designar el comité
        </Boton>
      ) : null}

      {estado.puedeDesignar && designando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Nuevo comité evaluador</p>

          <div>
            <label htmlFor="comite-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
              Fecha del memorando <span className="text-red-600">*</span>
            </label>
            <input
              id="comite-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={campo}
            />
          </div>

          <div>
            <label htmlFor="comite-persona" className="block text-xs font-bold text-gray-600 mb-1.5">
              Agregar evaluador
            </label>
            <SelectorPersona
              id="comite-persona"
              value={persona?.nombre ?? ''}
              onChange={(nombre) => {
                if (!nombre) setPersona(null);
              }}
              onSeleccionar={setPersona}
              placeholder="Busca a la persona en el directorio…"
            />

            <div className="flex items-center gap-2 mt-2">
              <select
                aria-label="Dimensión que evalúa"
                value={rol}
                onChange={(e) => setRol(e.target.value as RolEvaluador)}
                className={campo}
              >
                <option value="JURIDICO">Evaluación jurídica</option>
                <option value="FINANCIERO">Evaluación financiera</option>
                <option value="TECNICO">Evaluación técnica</option>
              </select>
              <button
                type="button"
                disabled={!persona}
                onClick={agregar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] disabled:opacity-50 transition-all flex-shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Agregar
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
              Una misma persona puede evaluar dos dimensiones distintas.
            </p>
          </div>

          {propuestos.length > 0 ? (
            <div className="space-y-2">
              {propuestos.map((miembro, indice) => (
                <div
                  key={`${miembro.personaId}-${miembro.rol}`}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 flex items-center gap-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-bold text-slate-800 m-0 break-words">
                      {miembro.nombre}
                    </p>
                    <p className="text-[11px] text-slate-500 m-0">
                      Evaluación {ETIQUETA_ROL[miembro.rol].toLowerCase()}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Quitar a ${miembro.nombre}`}
                    onClick={() => quitar(indice)}
                    className="p-1 rounded text-gray-400 hover:text-red-600 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11.5px] text-slate-500 m-0">
              Todavía no has agregado a nadie al comité.
            </p>
          )}

          <SelectorArchivo
            etiqueta="Memorando de designación"
            archivo={memorando}
            onElegir={setMemorando}
          />

          <div className="flex items-center gap-2">
            <Boton
              icono={<UserPlus className="w-3.5 h-3.5" />}
              disabled={guardando || propuestos.length === 0 || !memorando || !fecha}
              onClick={designar}
            >
              {guardando ? 'Designando…' : 'Designar comité'}
            </Boton>
            <button
              type="button"
              onClick={limpiar}
              className="text-[11.5px] font-bold text-slate-500 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </Marco>
  );
}

/** Adjunto obligatorio, con su nombre cuando ya está elegido. */
function SelectorArchivo({
  etiqueta,
  archivo,
  onElegir,
}: {
  etiqueta: string;
  archivo: File | null;
  onElegir: (archivo: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 space-y-2 ${
        archivo ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
      }`}
    >
      <p
        className={`text-xs font-bold m-0 flex items-start gap-1.5 ${
          archivo ? 'text-emerald-900' : 'text-slate-700'
        }`}
      >
        <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        {etiqueta} <span className="text-red-600">*</span>
      </p>
      <p
        className={`text-[11.5px] m-0 leading-relaxed break-words ${
          archivo ? 'text-emerald-900' : 'text-slate-600'
        }`}
      >
        {archivo ? archivo.name : 'Sin archivo seleccionado.'}
      </p>

      <input
        ref={input}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        onChange={(e) => {
          const elegido = e.target.files?.[0];
          e.target.value = '';
          if (elegido) onElegir(elegido);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {archivo ? 'Cambiar archivo' : 'Seleccionar archivo'}
      </button>
    </div>
  );
}
