import React, { useEffect, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  FilePlus2,
  Globe,
  Landmark,
  Lock,
  Paperclip,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  DatosAdicion,
  EstadoModificaciones,
  MargenDeAdicion,
  CausalTerminacion,
  ModificacionRegistrada,
  RespaldoDeAdicion,
  TipoModificacion,
} from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Pendiente,
  SelectorArchivo,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const pesos = (valor: number | null | undefined) =>
  valor == null
    ? '—'
    : new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(valor);

const NOMBRE_CAUSAL: Record<CausalTerminacion, string> = {
  MUTUO_ACUERDO: 'por mutuo acuerdo',
  UNILATERAL: 'por decisión unilateral motivada',
};

const NOMBRE_TIPO: Record<string, string> = {
  ADICION: 'Adición en dinero',
  PRORROGA: 'Prórroga',
  CESION: 'Cesión',
  ACLARATORIO: 'Aclaratorio',
  SUSPENSION: 'Suspensión',
  REANUDACION: 'Reanudación',
  TERMINACION_ANTICIPADA: 'Terminación anticipada',
};

const VACIO = {
  justificacion: '',
  // adicion
  valorAdicionado: '',
  // prorroga
  diasProrroga: '',
  // cesion
  cesionarioDocumento: '',
  cesionarioNombre: '',
  cesionarioTipo: 'JURIDICA' as 'NATURAL' | 'JURIDICA',
  // suspension y reanudacion
  suspensionDesde: hoyEnBogota(),
  suspensionHasta: '',
  reanudadaEl: hoyEnBogota(),
  // terminacion anticipada
  terminacionCausal: 'MUTUO_ACUERDO' as CausalTerminacion,
  terminacionEl: hoyEnBogota(),
};
const APROBACION_VACIA = { numero: '', fechaSuscripcion: hoyEnBogota() };

/**
 * Actividad 9.5 · Modificaciones contractuales (EFDS-1176 a EFDS-1178).
 *
 * Los siete tipos de la matriz cuelgan de un mismo listado: adición, prórroga,
 * cesión, aclaratorio, suspensión, reanudación y terminación anticipada.
 *
 * **Qué tipo cabe ahora lo decide el servidor**, no la pantalla: un contrato
 * suspendido solo admite reanudarse, y esa regla vive en un sitio. Aquí solo se
 * muestra, con el motivo a la vista cuando el botón no sirve.
 *
 * Lo que el gestor necesita ver antes de adicionar es **cuánto cabe todavía**:
 * el tope se cuenta acumulado sobre el valor inicial, y calcular eso a mano es
 * justo lo que la pantalla debe evitar.
 */
export function PanelModificaciones({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoModificaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  /** Qué tipo se está solicitando; nulo cuando no hay formulario abierto. */
  const [tipoNuevo, setTipoNuevo] = useState<TipoModificacion | null>(null);
  const [datos, setDatos] = useState(VACIO);

  const [aprobando, setAprobando] = useState<string | null>(null);
  const [aprobacion, setAprobacion] = useState(APROBACION_VACIA);
  const [acto, setActo] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .modificaciones(procesoId)
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

  const conError = async (accion: () => Promise<EstadoModificaciones>, exito: string) => {
    setGuardando(true);
    try {
      setEstado(await accion());
      toast.success(exito);
      onCambio?.();
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    } finally {
      setGuardando(false);
    }
  };

  /** Cada tipo manda lo suyo; la justificación es de todos. */
  const solicitar = async () => {
    if (!tipoNuevo) return;
    const justificacion = datos.justificacion.trim();

    const envios: Record<string, () => Promise<EstadoModificaciones>> = {
      ADICION: () =>
        contratacionService.solicitarAdicion(procesoId, {
          valorAdicionado: Number(datos.valorAdicionado),
          justificacion,
        } as DatosAdicion),
      PRORROGA: () =>
        contratacionService.solicitarProrroga(procesoId, {
          diasProrroga: Number(datos.diasProrroga),
          justificacion,
        }),
      CESION: () =>
        contratacionService.solicitarCesion(procesoId, {
          cesionarioDocumento: datos.cesionarioDocumento.trim(),
          cesionarioNombre: datos.cesionarioNombre.trim(),
          cesionarioTipo: datos.cesionarioTipo,
          justificacion,
        }),
      ACLARATORIO: () => contratacionService.solicitarAclaratorio(procesoId, { justificacion }),
      SUSPENSION: () =>
        contratacionService.solicitarSuspension(procesoId, {
          suspensionDesde: datos.suspensionDesde,
          ...(datos.suspensionHasta ? { suspensionHasta: datos.suspensionHasta } : {}),
          justificacion,
        }),
      REANUDACION: () =>
        contratacionService.solicitarReanudacion(procesoId, {
          reanudadaEl: datos.reanudadaEl,
          justificacion,
        }),
      TERMINACION_ANTICIPADA: () =>
        contratacionService.solicitarTerminacion(procesoId, {
          terminacionCausal: datos.terminacionCausal,
          terminacionEl: datos.terminacionEl,
          justificacion,
        }),
    };

    const ok = await conError(envios[tipoNuevo], `${NOMBRE_TIPO[tipoNuevo]} registrada en trámite`);
    if (ok) {
      setDatos(VACIO);
      setTipoNuevo(null);
    }
  };

  /** Si lo escrito alcanza para enviar. La justificación la piden todos. */
  const completo = () => {
    if (datos.justificacion.trim().length < 20) return false;
    switch (tipoNuevo) {
      case 'ADICION':
        return Number(datos.valorAdicionado || 0) > 0 && cabeLoEscrito;
      case 'PRORROGA':
        return Number(datos.diasProrroga || 0) > 0;
      case 'CESION':
        return (
          datos.cesionarioDocumento.trim().length > 0 && datos.cesionarioNombre.trim().length > 0
        );
      case 'SUSPENSION':
        return (
          !!datos.suspensionDesde &&
          (!datos.suspensionHasta || datos.suspensionHasta >= datos.suspensionDesde)
        );
      case 'REANUDACION':
        return !!datos.reanudadaEl;
      case 'TERMINACION_ANTICIPADA':
        return !!datos.terminacionEl && datos.terminacionEl <= hoyEnBogota();
      default:
        return true;
    }
  };

  const aprobar = async (modificacionId: string) => {
    if (!acto) return;

    const ok = await conError(
      () =>
        contratacionService.aprobarModificacion(
          procesoId,
          modificacionId,
          { numero: aprobacion.numero.trim(), fechaSuscripcion: aprobacion.fechaSuscripcion },
          acto,
        ),
      'Modificación aprobada',
    );
    if (ok) {
      setAprobacion(APROBACION_VACIA);
      setActo(null);
      setAprobando(null);
    }
  };

  const revocar = (modificacionId: string) => {
    const motivo = window.prompt('¿Por qué se revoca la modificación?')?.trim();
    if (!motivo) return;

    return conError(
      () => contratacionService.revocarModificacion(procesoId, modificacionId, motivo),
      'Modificación revocada',
    );
  };

  const rechazar = (modificacionId: string) => {
    const motivo = window.prompt('¿Por qué se rechaza la modificación?')?.trim();
    if (!motivo) return;

    return conError(
      () => contratacionService.rechazarModificacion(procesoId, modificacionId, motivo),
      'Modificación rechazada',
    );
  };

  if (cargando) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando las modificaciones…</p>
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

  const solicitado = Number(datos.valorAdicionado || 0);
  const cabeLoEscrito =
    !estado.margen || solicitado <= 0 || solicitado <= estado.margen.margenDisponible;

  return (
    <Marco>
      <Titulo>Modificaciones contractuales</Titulo>
      <Ayuda>
        En ejecución, el contrato puede adicionarse, prorrogarse, cederse, aclararse,
        suspenderse y terminarse antes de tiempo. Solo la adición aumenta el presupuesto y por eso
        es la única que exige un CDP y un RP nuevos. Todas se publican en SECOP II.
      </Ayuda>

      {/* La regla del objeto (RF-MOD-04). Va arriba y con el objeto a la vista
          porque es la pregunta previa a cualquier modificación: si lo que hay
          que cambiar es esto, no cabe un otrosí sino otro contrato. Ningún
          formulario lo ofrece, y decirlo evita que se intente por el campo de
          justificación. */}
      {estado.contrato ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
          <p className="text-[11.5px] font-bold text-slate-700 m-0 inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Objeto del contrato · no se modifica
          </p>
          <p className="text-[11.5px] text-slate-600 m-0 mt-1 leading-relaxed break-words">
            {estado.contrato.objeto}
          </p>
          <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
            Ninguna modificación cambia qué se contrató: eso exigiría un contrato nuevo, con su
            propia selección. Se puede adicionar, prorrogar, ceder, aclarar, suspender o terminar.
          </p>
        </div>
      ) : null}

      {/* Que el contrato esté detenido manda sobre todo lo demás, así que se
          dice arriba y no se deduce de los botones apagados. */}
      {estado.suspension ? (
        <Aviso
          tono="aviso"
          titulo={`Contrato suspendido desde el ${fechaLarga(estado.suspension.desde ?? '')}`}
        >
          {estado.suspension.hastaPrevista
            ? `Prevista hasta el ${fechaLarga(estado.suspension.hastaPrevista)}. `
            : 'Sin fecha prevista de reanudación. '}
          Mientras dure no admite pagos ni liquidación, y lo único que cabe es reanudarlo o
          terminarlo anticipadamente.
        </Aviso>
      ) : null}

      {/* El tope sin confirmar se advierte con su fundamento: la cifra es de la
          ley, pero ninguna fuente del proyecto la ratifica. */}
      {!estado.tope.confirmado ? (
        <Aviso tono="aviso" titulo={`Tope tentativo: ${estado.tope.porcentaje}% del valor inicial`}>
          {estado.tope.fundamento ?? 'Pendiente de ratificar con la Dirección de Contratación.'}
        </Aviso>
      ) : null}

      {estado.margen ? <Margen margen={estado.margen} /> : null}

      {!estado.puedeSolicitar && estado.motivoNoPuede ? (
        <Pendiente falta="9.1" texto={`No se puede modificar: ${estado.motivoNoPuede}.`} />
      ) : null}

      {estado.modificaciones.length > 0 ? (
        <div className="space-y-2">
          {estado.modificaciones.map((m) => (
            <Modificacion
              key={m.id}
              modificacion={m}
              guardando={guardando}
              aprobando={aprobando === m.id}
              aprobacion={aprobacion}
              acto={acto}
              onAprobacion={setAprobacion}
              onActo={setActo}
              onAbrirAprobacion={() => {
                setAprobacion(APROBACION_VACIA);
                setActo(null);
                setAprobando(m.id);
              }}
              onCancelarAprobacion={() => setAprobando(null)}
              onAprobar={() => aprobar(m.id)}
              onRechazar={() => rechazar(m.id)}
              onRevocar={() => revocar(m.id)}
            />
          ))}
        </div>
      ) : null}

      {/* Qué tipo cabe ahora lo resuelve el servidor: la pantalla solo lo
          muestra, y el que no cabe dice por qué en vez de estar apagado y ya. */}
      {tipoNuevo === null ? (
        <div className="flex flex-wrap gap-2">
          {estado.tipos.map((t) => (
            <BotonSecundario
              key={t.tipo}
              icono={<FilePlus2 className="w-3.5 h-3.5" />}
              disabled={!t.puede || guardando}
              title={t.motivo ?? undefined}
              onClick={() => {
                setDatos(VACIO);
                setTipoNuevo(t.tipo);
              }}
            >
              {NOMBRE_TIPO[t.tipo]}
            </BotonSecundario>
          ))}
        </div>
      ) : null}

      {tipoNuevo !== null ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-xs font-bold text-slate-800 m-0">{NOMBRE_TIPO[tipoNuevo]}</p>

          {tipoNuevo === 'ADICION' ? (
            <div>
              <label htmlFor="ad-valor" className="block text-xs font-bold text-gray-600 mb-1.5">
                Valor de la adición <span className="text-red-600">*</span>
              </label>
              <input
                id="ad-valor"
                type="number"
                min={0}
                value={datos.valorAdicionado}
                onChange={(e) => setDatos((p) => ({ ...p, valorAdicionado: e.target.value }))}
                className={campo}
              />
              {/* Se dice antes de enviar, no después del error del servidor. */}
              {!cabeLoEscrito && estado.margen ? (
                <p className="text-[11px] text-amber-700 m-0 mt-1 leading-relaxed tabular-nums">
                  Se pasa del tope: solo caben {pesos(estado.margen.margenDisponible)}.
                </p>
              ) : null}
            </div>
          ) : null}

          {tipoNuevo === 'PRORROGA' ? (
            <div>
              <label htmlFor="pr-dias" className="block text-xs font-bold text-gray-600 mb-1.5">
                Días de prórroga <span className="text-red-600">*</span>
              </label>
              <input
                id="pr-dias"
                type="number"
                min={1}
                value={datos.diasProrroga}
                onChange={(e) => setDatos((p) => ({ ...p, diasProrroga: e.target.value }))}
                className={campo}
              />
              <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed tabular-nums">
                {estado.contrato?.plazoDias != null
                  ? 'El plazo pasa de ' +
                    estado.contrato.plazoDias +
                    ' a ' +
                    (estado.contrato.plazoDias + Number(datos.diasProrroga || 0)) +
                    ' días. La prórroga no toca el presupuesto.'
                  : 'El contrato no tiene plazo registrado, así que la prórroga queda como constancia sin recalcularlo.'}
              </p>
            </div>
          ) : null}

          {tipoNuevo === 'CESION' ? (
            <>
              <div>
                <label htmlFor="ce-nom" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Cesionario <span className="text-red-600">*</span>
                </label>
                <input
                  id="ce-nom"
                  value={datos.cesionarioNombre}
                  onChange={(e) => setDatos((p) => ({ ...p, cesionarioNombre: e.target.value }))}
                  className={campo}
                />
                <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
                  Sustituye a {estado.contrato?.contratistaNombre ?? 'el contratista actual'}.
                </p>
              </div>
              <div>
                <label htmlFor="ce-doc" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Documento del cesionario <span className="text-red-600">*</span>
                </label>
                <input
                  id="ce-doc"
                  value={datos.cesionarioDocumento}
                  onChange={(e) => setDatos((p) => ({ ...p, cesionarioDocumento: e.target.value }))}
                  className={campo}
                />
              </div>
              <div>
                <label htmlFor="ce-tipo" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Tipo de persona
                </label>
                <select
                  id="ce-tipo"
                  value={datos.cesionarioTipo}
                  onChange={(e) =>
                    setDatos((p) => ({
                      ...p,
                      cesionarioTipo: e.target.value as 'NATURAL' | 'JURIDICA',
                    }))
                  }
                  className={campo}
                >
                  <option value="JURIDICA">Jurídica</option>
                  <option value="NATURAL">Natural</option>
                </select>
                <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
                  De esto depende si el contrato exige ARL.
                </p>
              </div>
            </>
          ) : null}

          {tipoNuevo === 'SUSPENSION' ? (
            <>
              <div>
                <label htmlFor="su-desde" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Suspendido desde <span className="text-red-600">*</span>
                </label>
                <input
                  id="su-desde"
                  type="date"
                  value={datos.suspensionDesde}
                  onChange={(e) => setDatos((p) => ({ ...p, suspensionDesde: e.target.value }))}
                  className={campo}
                />
              </div>
              <div>
                <label htmlFor="su-hasta" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Hasta (prevista)
                </label>
                <input
                  id="su-hasta"
                  type="date"
                  min={datos.suspensionDesde}
                  value={datos.suspensionHasta}
                  onChange={(e) => setDatos((p) => ({ ...p, suspensionHasta: e.target.value }))}
                  className={campo}
                />
                <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
                  Se deja en blanco si la suspensión es indefinida. La fecha real es la que se
                  registre al reanudar.
                </p>
              </div>
            </>
          ) : null}

          {tipoNuevo === 'REANUDACION' ? (
            <div>
              <label htmlFor="re-el" className="block text-xs font-bold text-gray-600 mb-1.5">
                Reanudado desde <span className="text-red-600">*</span>
              </label>
              <input
                id="re-el"
                type="date"
                min={estado.suspension?.desde ?? undefined}
                max={hoyEnBogota()}
                value={datos.reanudadaEl}
                onChange={(e) => setDatos((p) => ({ ...p, reanudadaEl: e.target.value }))}
                className={campo}
              />
              <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
                Los días que el contrato estuvo detenido se le devuelven al plazo.
              </p>
            </div>
          ) : null}

          {tipoNuevo === 'TERMINACION_ANTICIPADA' ? (
            <>
              <div>
                <label htmlFor="te-causal" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Causal <span className="text-red-600">*</span>
                </label>
                <select
                  id="te-causal"
                  value={datos.terminacionCausal}
                  onChange={(e) =>
                    setDatos((p) => ({
                      ...p,
                      terminacionCausal: e.target.value as CausalTerminacion,
                    }))
                  }
                  className={campo}
                >
                  <option value="MUTUO_ACUERDO">Mutuo acuerdo</option>
                  <option value="UNILATERAL">Decisión unilateral motivada</option>
                </select>
                <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
                  Terminar por incumplimiento no se registra aquí: eso es el proceso
                  sancionatorio, con su propia reserva legal.
                </p>
              </div>
              <div>
                <label htmlFor="te-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Deja de ejecutarse el <span className="text-red-600">*</span>
                </label>
                <input
                  id="te-fecha"
                  type="date"
                  max={hoyEnBogota()}
                  value={datos.terminacionEl}
                  onChange={(e) => setDatos((p) => ({ ...p, terminacionEl: e.target.value }))}
                  className={campo}
                />
                <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
                  Es la fecha del hecho, no la de la firma. Al aprobarse, lo que sigue es el
                  informe final y la liquidación de lo ejecutado.
                </p>
              </div>
            </>
          ) : null}

          {tipoNuevo === 'ACLARATORIO' ? (
            <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
              El aclaratorio precisa lo que el contrato ya dice: corrige cláusulas no esenciales,
              y no cambia el objeto, ni el plazo, ni el valor, ni las partes. Lo que lo sustenta
              es el acto que se adjunta al aprobarlo.
            </p>
          ) : null}

          <div>
            <label htmlFor="ad-just" className="block text-xs font-bold text-gray-600 mb-1.5">
              Justificación <span className="text-red-600">*</span>
            </label>
            <textarea
              id="ad-just"
              rows={3}
              value={datos.justificacion}
              onChange={(e) => setDatos((p) => ({ ...p, justificacion: e.target.value }))}
              className={campo}
            />
            <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
              Una modificación sin sustento es lo primero que un ente de control pregunta.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<FilePlus2 className="w-3.5 h-3.5" />}
              disabled={guardando || !completo()}
              onClick={solicitar}
            >
              Solicitar
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={() => {
                setDatos(VACIO);
                setTipoNuevo(null);
              }}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
    </Marco>
  );
}

/**
 * Cuánto cabe todavía.
 *
 * El margen va destacado y no como una fila más: es la cifra que decide si la
 * adición procede, y el tope se cuenta acumulado sobre el valor inicial —no
 * sobre el valor vigente, que ya incluye las anteriores—.
 */
function Margen({ margen }: { margen: MargenDeAdicion }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
      <p className="text-[12.5px] font-bold text-slate-800 m-0 mb-2">Margen de adición</p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 m-0">
        <dt className="text-[11.5px] text-slate-500 m-0">Valor inicial</dt>
        <dd className="text-[11.5px] font-bold text-slate-800 m-0 text-right tabular-nums">
          {pesos(margen.valorInicial)}
        </dd>
        <dt className="text-[11.5px] text-slate-500 m-0">Ya adicionado</dt>
        <dd className="text-[11.5px] font-bold text-slate-800 m-0 text-right tabular-nums">
          {pesos(margen.yaAdicionado)}
        </dd>
        <dt className="text-[11.5px] text-slate-500 m-0">
          Tope del {margen.topePorcentaje}%
        </dt>
        <dd className="text-[11.5px] font-bold text-slate-800 m-0 text-right tabular-nums">
          {pesos(margen.topeValor)}
        </dd>
      </dl>

      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-bold text-slate-700 inline-flex items-center gap-1.5">
          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
          Cabe todavía
        </span>
        <span className="text-[13px] font-black text-slate-900 tabular-nums">
          {pesos(margen.margenDisponible)}
        </span>
      </div>
    </div>
  );
}

/** Una modificación con su respaldo presupuestal y su publicación. */
function Modificacion({
  modificacion: m,
  guardando,
  aprobando,
  aprobacion,
  acto,
  onAprobacion,
  onActo,
  onAbrirAprobacion,
  onCancelarAprobacion,
  onAprobar,
  onRechazar,
  onRevocar,
}: {
  modificacion: ModificacionRegistrada;
  guardando: boolean;
  aprobando: boolean;
  aprobacion: { numero: string; fechaSuscripcion: string };
  acto: File | null;
  onAprobacion: (v: { numero: string; fechaSuscripcion: string }) => void;
  onActo: (f: File | null) => void;
  onAbrirAprobacion: () => void;
  onCancelarAprobacion: () => void;
  onAprobar: () => void;
  onRechazar: () => void;
  onRevocar: () => void;
}) {
  const enTramite = m.estado === 'EN_TRAMITE';
  const aprobada = m.estado === 'APROBADA';

  // Qué falta para poder aprobar, dicho en palabras: es lo que el gestor
  // necesita para saber a quién pedirle qué.
  //
  // **Solo la adición compromete presupuesto.** Pedírselo a los demás tipos
  // dejaba su botón de aprobar apagado para siempre, esperando un CDP que nadie
  // iba a tramitar: la prórroga no toca el presupuesto y el aclaratorio no
  // cambia nada.
  const faltantes =
    m.tipo === 'ADICION'
      ? ([
          m.cdp?.estado === 'EXPEDIDO' ? null : 'el CDP',
          m.rp?.estado === 'EXPEDIDO' ? null : 'el RP',
        ].filter(Boolean) as string[])
      : [];

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 space-y-2 ${
        aprobada ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[12.5px] font-bold m-0 break-words ${
              aprobada ? 'text-emerald-900' : 'text-slate-800'
            }`}
          >
            {NOMBRE_TIPO[m.tipo] ?? m.tipo}
            {m.valorAdicionado != null ? ` · ${pesos(m.valorAdicionado)}` : ''}
          </p>
          <p
            className={`text-[11px] m-0 mt-0.5 leading-relaxed break-words ${
              aprobada ? 'text-emerald-900' : 'text-slate-500'
            }`}
          >
            {m.numero ? `${m.numero} · ` : ''}
            {m.fechaSuscripcion ? `${fechaLarga(m.fechaSuscripcion)} · ` : ''}
            {m.estado.toLowerCase().replace('_', ' ')}
            {m.solicitadaPor ? ` · solicitada por ${m.solicitadaPor}` : ''}
          </p>
        </div>
      </div>

      <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed whitespace-pre-line break-words">
        {m.justificacion}
      </p>

      {aprobada && m.valorContratoAntes != null ? (
        <p className="text-[11.5px] text-emerald-900 m-0 tabular-nums">
          El contrato pasó de {pesos(m.valorContratoAntes)} a {pesos(m.valorContratoDespues)}.
        </p>
      ) : null}

      {m.tipo === 'TERMINACION_ANTICIPADA' && m.terminacionEl ? (
        <p
          className={`text-[11.5px] m-0 ${aprobada ? 'text-emerald-900' : 'text-slate-600'}`}
        >
          Deja de ejecutarse el {fechaLarga(m.terminacionEl)}
          {m.terminacionCausal ? ` · ${NOMBRE_CAUSAL[m.terminacionCausal]}` : ''}.
        </p>
      ) : null}

      {m.tipo === 'ADICION' ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Respaldo titulo="CDP" respaldo={m.cdp} />
          <Respaldo titulo="RP" respaldo={m.rp} />
        </div>
      ) : null}

      {enTramite && faltantes.length > 0 ? (
        <p className="text-[11px] text-amber-700 m-0 leading-relaxed">
          Falta que la Dirección Financiera expida {faltantes.join(' y ')} antes de aprobar.
        </p>
      ) : null}

      {m.documento?.url ? (
        <a
          href={contratacionService.urlDescarga(m.documento.url)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline break-words"
        >
          <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
          {m.documento.nombre}
        </a>
      ) : null}

      {m.publicacion ? (
        <p className="text-[11px] text-slate-500 m-0 leading-relaxed break-words inline-flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
          Publicada en SECOP II el {fechaLarga(m.publicacion.fechaPublicacion)}
          {m.publicacion.secopNumero ? ` · ${m.publicacion.secopNumero}` : ''}
        </p>
      ) : null}

      {m.revocadaAt ? (
        <p className="text-[11px] text-slate-500 m-0 leading-relaxed break-words">
          Revocada el {momento(m.revocadaAt)}
          {m.revocadaPor ? ` por ${m.revocadaPor}` : ''}
          {m.motivoRevocacion ? ` · ${m.motivoRevocacion}` : ''}
        </p>
      ) : null}

      {enTramite && !aprobando ? (
        <div className="flex flex-wrap gap-2">
          <Boton
            icono={<CheckCircle2 className="w-3.5 h-3.5" />}
            disabled={guardando || faltantes.length > 0}
            onClick={onAbrirAprobacion}
          >
            Aprobar
          </Boton>
          <BotonSecundario
            icono={<Undo2 className="w-3.5 h-3.5" />}
            disabled={guardando}
            onClick={onRechazar}
          >
            Rechazar
          </BotonSecundario>
        </div>
      ) : null}

      {aprobando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="mo-num" className="block text-xs font-bold text-gray-600 mb-1.5">
                Número <span className="text-red-600">*</span>
              </label>
              <input
                id="mo-num"
                type="text"
                value={aprobacion.numero}
                onChange={(e) => onAprobacion({ ...aprobacion, numero: e.target.value })}
                placeholder="OTROSI-2026-001"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="mo-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
                Fecha de suscripción <span className="text-red-600">*</span>
              </label>
              <input
                id="mo-fecha"
                type="date"
                value={aprobacion.fechaSuscripcion}
                onChange={(e) => onAprobacion({ ...aprobacion, fechaSuscripcion: e.target.value })}
                className={campo}
              />
            </div>
          </div>

          <SelectorArchivo
            id="mo-acto"
            etiqueta="Otrosí o acto administrativo firmado *"
            ayuda="Aprobar sin documento dejaría al expediente afirmando algo que no puede probar."
            archivo={acto}
            onElegir={onActo}
          />

          <p className="text-[11.5px] text-slate-600 m-0">{queHaceAlAprobar(m)}</p>

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<CheckCircle2 className="w-3.5 h-3.5" />}
              disabled={guardando || !acto || !aprobacion.numero.trim()}
              onClick={onAprobar}
            >
              Aprobar la modificación
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={onCancelarAprobacion}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}

      {aprobada ? (
        <BotonSecundario
          icono={<Undo2 className="w-3.5 h-3.5" />}
          disabled={guardando}
          onClick={onRevocar}
        >
          Revocar
        </BotonSecundario>
      ) : null}
    </div>
  );
}

/**
 * Qué le hace al contrato aprobar esta modificación, dicho antes de firmarla.
 *
 * Una frase por tipo y no la de la adición para todos: lo que el gestor está a
 * punto de hacer cambia por completo según el tipo, y anunciarle un aumento de
 * valor cuando lo que va a hacer es detener el contrato es peor que no decir
 * nada.
 */
function queHaceAlAprobar(m: ModificacionRegistrada): string {
  switch (m.tipo) {
    case 'ADICION':
      return `Al aprobar, el valor del contrato aumenta en ${pesos(m.valorAdicionado)}.`;
    case 'PRORROGA':
      return `Al aprobar, el plazo del contrato crece en ${m.diasProrroga ?? 0} días.`;
    case 'CESION':
      return `Al aprobar, el contratista pasa a ser ${m.cesionarioNombre ?? 'el cesionario'}.`;
    case 'SUSPENSION':
      return 'Al aprobar, el contrato queda suspendido: no admite pagos ni liquidación hasta que se reanude.';
    case 'REANUDACION':
      return 'Al aprobar, el contrato vuelve a ejecución y se le devuelven al plazo los días que estuvo detenido.';
    case 'TERMINACION_ANTICIPADA':
      return 'Al aprobar, el contrato queda terminado: lo que sigue es el informe final y la liquidación de lo ejecutado.';
    default:
      return 'Al aprobar queda el acto en el expediente; el contrato no cambia.';
  }
}

/**
 * El CDP o el RP de la adición, con su estado del ciclo de la Financiera.
 *
 * Se muestra el estado y no solo si existe: entre solicitado y expedido hay dos
 * pasos, y saber en cuál va es lo que le dice al gestor si tiene que esperar o
 * si tiene que reclamar.
 */
function Respaldo({ titulo, respaldo }: { titulo: string; respaldo: RespaldoDeAdicion | null }) {
  const expedido = respaldo?.estado === 'EXPEDIDO';

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
      <p className="text-[11.5px] font-bold text-slate-700 m-0 inline-flex items-center gap-1.5">
        <Landmark className={`w-3.5 h-3.5 ${expedido ? 'text-emerald-600' : 'text-slate-400'}`} />
        {titulo}
      </p>
      {respaldo ? (
        <>
          <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
            {respaldo.estado.toLowerCase()}
            {respaldo.numero ? ` · ${respaldo.numero}` : ''}
          </p>
          {respaldo.valor != null ? (
            <p className="text-[11.5px] font-bold text-slate-800 m-0 tabular-nums">
              {pesos(respaldo.valor)}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-[11px] text-slate-400 m-0 mt-0.5 leading-relaxed">Sin solicitar</p>
      )}
    </div>
  );
}
