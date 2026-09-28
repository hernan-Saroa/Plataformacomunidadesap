import React, { useEffect, useState } from 'react';
import { CalendarCheck, Eye, FileSignature, PlayCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DatosActaInicio, EstadoActaInicio, EvidenciaFirmaOtp } from '../../types';
import { Aviso, Ayuda, Boton, campo, Marco, Pendiente, Titulo } from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';
import { useFirma } from '../shared/useFirma';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const NUMERAL = '9.1';

const VACIO = {
  fechaInicio: hoyEnBogota(),
  temasTratados: '',
  asistentes: '',
};

/**
 * Actividad 9.1 · Reunión de inicio (EFDS-1167).
 *
 * Lo que arranca la ejecución es la reunión, no el papel. El acta de inicio ya
 * no se carga aquí: tiene su propia actividad, la 8.7 (migración 089), y la
 * reunión la toma de allá. Si la modalidad no suscribe acta —lo dice la matriz
 * SÍ/NO—, la reunión se registra sin ella; ya no hay casilla de «el contrato la
 * pactó» que decidir en la pantalla.
 */
export function PanelActaInicio({ procesoId, onCambio }: Props) {
  const firma = useFirma(NUMERAL, 'Suscribir el acta de inicio');
  const [estado, setEstado] = useState<EstadoActaInicio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [registrando, setRegistrando] = useState(false);
  const [datos, setDatos] = useState(VACIO);

  const leer = () =>
    contratacionService
      .actaInicio(procesoId)
      .then((respuesta) => {
        setEstado(respuesta);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const limpiar = () => {
    setDatos(VACIO);
    setRegistrando(false);
  };

  const suscribir = async (firmaOtp?: EvidenciaFirmaOtp) => {
    const cuerpo: DatosActaInicio = {
      fechaInicio: datos.fechaInicio,
      temasTratados: datos.temasTratados.trim(),
      ...(datos.asistentes.trim() ? { asistentes: datos.asistentes.trim() } : {}),
      firma: firmaOtp,
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.suscribirActaInicio(procesoId, cuerpo));
      limpiar();
      toast.success('Reunión de inicio registrada; el contrato queda en ejecución');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la reunión de inicio…</p>
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

  const completo = datos.fechaInicio && datos.temasTratados.trim().length >= 10;

  /**
   * Dónde se resuelve lo que falta. Con el contrato legalizado y con
   * supervisor, lo único que puede faltar es el acta de la 8.7.
   */
  const falta = !estado.legalizado
    ? estado.requiereArl
      ? '8.5'
      : '8.4'
    : !estado.tieneSupervisor
      ? '8.2'
      : '8.7';

  return (
    <Marco>
      <Titulo>Reunión de inicio</Titulo>
      <Ayuda>
        Las partes socializan alcance, cronograma y entregables. Con la reunión registrada el
        contrato queda en ejecución y empieza a correr su plazo.
      </Ayuda>

      {/* Qué falta y en qué paso se resuelve, en vez de un botón apagado. */}
      {!estado.acta && estado.motivoNoPuede ? (
        <Pendiente
          // Las garantías (8.4) aplican siempre; la ARL (8.5) solo a persona
          // natural. Mandar a la 8.5 en un contrato que no la exige deja al
          // gestor sin saber qué hacer: ahí siempre es la 8.4 la que falta.
          falta={falta}
          texto={`La ejecución empieza sobre un contrato legalizado, con supervisor y con su acta de inicio cuando la modalidad la suscribe: ${estado.motivoNoPuede}.`}
        />
      ) : null}

      {estado.supervisor ? (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-2.5 flex items-start gap-2.5">
          <Eye className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
            Supervisa {estado.supervisor.nombre}
            {estado.supervisor.cargo ? ` · ${estado.supervisor.cargo}` : ''}
          </p>
        </div>
      ) : null}

      {estado.acta ? (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <PlayCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-emerald-900 m-0">
                  En ejecución desde el {fechaLarga(estado.acta.fechaInicio)}
                </p>
                <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed">
                  {/* El acta es de la 8.7: aquí se dice de dónde, sin repetir el documento. */}
                  {estado.suscripcion
                    ? `Acta de inicio suscrita el ${fechaLarga(estado.suscripcion.fechaSuscripcion)}, en la actividad 8.7`
                    : 'Sin acta de inicio'}
                  {estado.acta.registradoPor ? ` · registró ${estado.acta.registradoPor}` : ''}
                  {estado.acta.createdAt ? ` el ${momento(estado.acta.createdAt)}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
            <p className="text-[12.5px] font-bold text-slate-800 m-0">Lo que se socializó</p>
            <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed whitespace-pre-line">
              {estado.acta.temasTratados}
            </p>
            {estado.acta.asistentes ? (
              <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
                <Users className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11.5px] text-slate-500 m-0 leading-relaxed">
                  {estado.acta.asistentes}
                </p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {estado.puedeIniciar && !registrando ? (
        <Boton
          icono={<CalendarCheck className="w-3.5 h-3.5" />}
          onClick={() => setRegistrando(true)}
        >
          Registrar reunión de inicio
        </Boton>
      ) : null}

      {estado.puedeIniciar && registrando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Reunión celebrada</p>

          {/* El acta viene de la 8.7: se dice de dónde, en vez de pedirla otra vez. */}
          {estado.suscripcion ? (
            <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2">
              <FileSignature className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
                Acta de inicio suscrita el {fechaLarga(estado.suscripcion.fechaSuscripcion)}, registrada
                en la actividad 8.7.
              </p>
            </div>
          ) : !estado.actaAplica ? (
            <Aviso tono="aviso" titulo="Sin acta de inicio">
              Esta modalidad no suscribe acta de inicio: la reunión queda como soporte del arranque.
            </Aviso>
          ) : null}

          <div>
            <label htmlFor="acta-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
              Fecha de la reunión <span className="text-red-600">*</span>
            </label>
            <input
              id="acta-fecha"
              type="date"
              value={datos.fechaInicio}
              max={hoyEnBogota()}
              onChange={(e) => setDatos((p) => ({ ...p, fechaInicio: e.target.value }))}
              className={campo}
            />
          </div>

          <div>
            <label htmlFor="acta-temas" className="block text-xs font-bold text-gray-600 mb-1.5">
              Qué se socializó <span className="text-red-600">*</span>
            </label>
            <textarea
              id="acta-temas"
              rows={4}
              value={datos.temasTratados}
              onChange={(e) => setDatos((p) => ({ ...p, temasTratados: e.target.value }))}
              placeholder="Alcance, cronograma y entregables acordados con el contratista"
              className={campo}
            />
          </div>

          <div>
            <label
              htmlFor="acta-asistentes"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Asistentes
            </label>
            <input
              id="acta-asistentes"
              type="text"
              value={datos.asistentes}
              onChange={(e) => setDatos((p) => ({ ...p, asistentes: e.target.value }))}
              placeholder="Por la entidad y por el contratista"
              className={campo}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Boton
              icono={<CalendarCheck className="w-3.5 h-3.5" />}
              disabled={!completo || guardando}
              onClick={() => firma.conFirma(suscribir)}
            >
              {guardando ? 'Registrando…' : 'Registrar e iniciar ejecución'}
            </Boton>
            <button
              type="button"
              onClick={limpiar}
              className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      {firma.modal}
    </Marco>
  );
}
