import React, { useEffect, useState } from 'react';
import {
  Check,
  CalendarClock,
  HeartPulse,
  Plus,
  ShieldCheck,
  Trash2,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  AmparoDeGarantia,
  DatosArl,
  EstadoLegalizacion,
  GarantiaDelContrato,
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
  SinPermiso,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota } from '../shared/fechas';

interface Props {
  procesoId: string;
  /** 8.4 muestra las garantías; 8.5 abre directo en la ARL. */
  numeral: '8.4' | '8.5';
  onCambio?: () => void;
}

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const GARANTIA_VACIA = { aseguradora: '', numeroPoliza: '' };
const AMPARO_VACIO = { tipo: '', valorAsegurado: '', vigenciaDesde: '', vigenciaHasta: '' };
const ARL_VACIA = {
  afiliadoPor: 'CONTRATISTA' as DatosArl['afiliadoPor'],
  administradora: '',
  numeroAfiliacion: '',
  fechaAfiliacion: hoyEnBogota(),
};

const COLOR_ESTADO: Record<GarantiaDelContrato['estado'], string> = {
  CARGADA: 'border-amber-200 bg-amber-50 text-amber-900',
  APROBADA: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  RECHAZADA: 'border-red-200 bg-red-50 text-red-900',
};

const ETIQUETA_ESTADO: Record<GarantiaDelContrato['estado'], string> = {
  CARGADA: 'Pendiente de revisión',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Devuelta',
};

/**
 * Actividades 8.4 y 8.5 · Pólizas, garantías y ARL (EFDS-1164).
 *
 * Los amparos se arman en pantalla y viajan con la póliza en una sola petición,
 * porque una garantía sin coberturas no existe: son la póliza y lo que ampara,
 * o no hay garantía. Mismo patrón que los miembros del comité (EFDS-1156).
 */
export function PanelLegalizacion({ procesoId, numeral, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoLegalizacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [creando, setCreando] = useState(false);
  const [garantia, setGarantia] = useState(GARANTIA_VACIA);
  const [amparos, setAmparos] = useState<AmparoDeGarantia[]>([]);
  const [amparo, setAmparo] = useState(AMPARO_VACIO);
  const [poliza, setPoliza] = useState<File | null>(null);

  const [registrandoArl, setRegistrandoArl] = useState(false);
  const [arl, setArl] = useState(ARL_VACIA);
  const [soporteArl, setSoporteArl] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .legalizacion(procesoId)
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

  const nombreAmparo = (codigo: string) =>
    estado?.tiposAmparo.find((t) => t.codigo === codigo)?.nombre ?? codigo;

  const limpiarGarantia = () => {
    setGarantia(GARANTIA_VACIA);
    setAmparos([]);
    setAmparo(AMPARO_VACIO);
    setPoliza(null);
    setCreando(false);
  };

  const agregarAmparo = () => {
    if (!amparo.tipo || !amparo.vigenciaDesde || !amparo.vigenciaHasta) return;

    // Las mismas reglas que aplica el servidor, dichas antes de enviar.
    if (amparos.some((a) => a.tipo === amparo.tipo)) {
      toast.error(`La póliza ya incluye el amparo de ${nombreAmparo(amparo.tipo).toLowerCase()}`);
      return;
    }
    if (amparo.vigenciaHasta <= amparo.vigenciaDesde) {
      toast.error('La vigencia del amparo debe terminar después de empezar');
      return;
    }
    const valor = Number(amparo.valorAsegurado);
    if (!(valor > 0)) {
      toast.error('El valor asegurado debe ser mayor que cero');
      return;
    }

    setAmparos((lista) => [
      ...lista,
      {
        tipo: amparo.tipo,
        valorAsegurado: valor,
        vigenciaDesde: amparo.vigenciaDesde,
        vigenciaHasta: amparo.vigenciaHasta,
      },
    ]);
    setAmparo(AMPARO_VACIO);
  };

  const quitarAmparo = (indice: number) =>
    setAmparos((lista) => lista.filter((_, i) => i !== indice));

  const cargar = async () => {
    if (!poliza || amparos.length === 0) return;

    setGuardando(true);
    try {
      setEstado(
        await contratacionService.cargarGarantia(
          procesoId,
          {
            aseguradora: garantia.aseguradora.trim(),
            numeroPoliza: garantia.numeroPoliza.trim(),
            amparos,
          },
          poliza,
        ),
      );
      limpiarGarantia();
      toast.success('Póliza cargada; queda pendiente de revisión');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const aprobar = async (g: GarantiaDelContrato) => {
    setGuardando(true);
    try {
      const respuesta = await contratacionService.aprobarGarantia(procesoId, g.id);
      setEstado(respuesta);
      toast.success(
        respuesta.legalizado
          ? 'Póliza aprobada: el contrato queda legalizado'
          : 'Póliza aprobada',
      );
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const devolver = async (g: GarantiaDelContrato) => {
    const motivo = window
      .prompt(`¿Por qué se devuelve la póliza ${g.numeroPoliza}? El contratista verá este motivo.`)
      ?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.rechazarGarantia(procesoId, g.id, motivo));
      toast.success('Póliza devuelta; puede cargarse la corregida');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const limpiarArl = () => {
    setArl(ARL_VACIA);
    setSoporteArl(null);
    setRegistrandoArl(false);
  };

  const registrarArl = async () => {
    if (!soporteArl) return;

    setGuardando(true);
    try {
      const respuesta = await contratacionService.registrarArl(
        procesoId,
        {
          afiliadoPor: arl.afiliadoPor,
          administradora: arl.administradora.trim(),
          fechaAfiliacion: arl.fechaAfiliacion,
          ...(arl.numeroAfiliacion.trim() ? { numeroAfiliacion: arl.numeroAfiliacion.trim() } : {}),
        },
        soporteArl,
      );
      setEstado(respuesta);
      limpiarArl();
      toast.success(
        respuesta.legalizado
          ? 'ARL registrada: el contrato queda legalizado'
          : 'Afiliación a la ARL registrada',
      );
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la legalización…</p>
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

  const esArl = numeral === '8.5';

  // La 8.5 en contrato con persona jurídica no aplica, y se dice por qué.
  if (esArl && estado.suscrito && !estado.requiereArl) {
    return (
      <Marco>
        <Titulo>Afiliación a la ARL</Titulo>
        <Aviso tono="aviso" titulo="Este contrato no exige ARL">
          La afiliación se exige a los contratistas persona natural
          {estado.contratista ? `, y ${estado.contratista.nombre} es persona jurídica` : ''}.
        </Aviso>
      </Marco>
    );
  }

  return (
    <Marco>
      <Titulo>{esArl ? 'Afiliación a la ARL' : 'Pólizas y garantías'}</Titulo>
      <Ayuda>
        {esArl
          ? 'El contratista persona natural debe quedar afiliado a riesgos laborales antes de iniciar. La afiliación puede hacerla la entidad o el propio contratista.'
          : 'El contratista constituye las garantías con sus amparos desglosados y la entidad las revisa. Con todo aprobado el contrato queda legalizado.'}
      </Ayuda>

      {!estado.suscrito ? (
        <Pendiente
          falta="8.1"
          texto={`La legalización trabaja sobre un contrato suscrito: ${
            estado.motivoNoSuscrito ?? 'todavía no lo está'
          }.`}
        />
      ) : (
        <>
          {estado.legalizado ? (
            <Aviso tono="ok" titulo="Contrato legalizado">
              Las garantías están aprobadas
              {estado.requiereArl ? ' y la afiliación a la ARL registrada' : ''}. El contrato
              tiene las coberturas exigidas.
            </Aviso>
          ) : estado.pendientes.length > 0 ? (
            <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
              <p className="text-[12.5px] font-bold text-slate-700 m-0">
                Para legalizar el contrato
              </p>
              {estado.pendientes.map((falta) => (
                <p key={falta} className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
                  {falta}
                </p>
              ))}
            </div>
          ) : null}

          {/* ------------------------------- garantías (8.4) ------------------ */}
          {!esArl ? (
            <>
              {estado.garantias.map((g) => (
                <div key={g.id} className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold text-slate-800 m-0 break-words">
                        Póliza {g.numeroPoliza} · {g.aseguradora}
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${COLOR_ESTADO[g.estado]}`}
                      >
                        {ETIQUETA_ESTADO[g.estado]}
                      </span>
                      {g.estado === 'RECHAZADA' && g.motivoRechazo ? (
                        <p className="text-[11.5px] text-red-900 m-0 mt-1 leading-relaxed break-words">
                          {g.motivoRechazo}
                        </p>
                      ) : null}
                      {g.estado === 'APROBADA' && g.revisadaPor ? (
                        <p className="text-[11.5px] text-slate-600 m-0 mt-1 leading-relaxed">
                          Aprobada por {g.revisadaPor}
                          {g.revisadaAt ? ` el ${fechaLarga(g.revisadaAt)}` : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Los amparos con su vencimiento: el desglose que pide la matriz. */}
                  <div className="space-y-1.5">
                    {g.amparos.map((a) => (
                      <div
                        key={a.tipo}
                        className="rounded-md border border-gray-100 bg-slate-50 px-3 py-2 flex items-start gap-2"
                      >
                        <CalendarClock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] font-bold text-slate-700 m-0 break-words">
                            {nombreAmparo(a.tipo)} · {pesos.format(a.valorAsegurado)}
                          </p>
                          <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                            Vigente del {fechaLarga(a.vigenciaDesde)} al {fechaLarga(a.vigenciaHasta)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Aprobar es de la revisión, no de quien carga: sin el rol
                      se dice quién puede, en vez de un botón que dará 403. */}
                  {g.estado === 'CARGADA' && estado.puedeAprobar ? (
                    <div className="flex flex-wrap gap-2">
                      <Boton
                        icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
                        disabled={guardando}
                        onClick={() => aprobar(g)}
                      >
                        Aprobar la póliza
                      </Boton>
                      <BotonSecundario
                        icono={<Undo2 className="w-3.5 h-3.5" />}
                        disabled={guardando}
                        onClick={() => devolver(g)}
                      >
                        Devolver con motivo
                      </BotonSecundario>
                    </div>
                  ) : g.estado === 'CARGADA' ? (
                    <SinPermiso quien="la Dirección de Contratación, que revisa las coberturas" />
                  ) : null}
                </div>
              ))}

              {!creando && estado.puedeCargar ? (
                <Boton icono={<Plus className="w-3.5 h-3.5" />} onClick={() => setCreando(true)}>
                  Cargar una garantía
                </Boton>
              ) : !creando ? null : (
                <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
                  <p className="text-[12.5px] font-bold text-slate-800 m-0">Nueva garantía</p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="gar-aseguradora" className="block text-xs font-bold text-gray-600 mb-1.5">
                        Aseguradora <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="gar-aseguradora"
                        type="text"
                        value={garantia.aseguradora}
                        onChange={(e) => setGarantia((p) => ({ ...p, aseguradora: e.target.value }))}
                        className={campo}
                      />
                    </div>
                    <div>
                      <label htmlFor="gar-numero" className="block text-xs font-bold text-gray-600 mb-1.5">
                        Número de póliza <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="gar-numero"
                        type="text"
                        value={garantia.numeroPoliza}
                        onChange={(e) => setGarantia((p) => ({ ...p, numeroPoliza: e.target.value }))}
                        className={campo}
                      />
                    </div>
                  </div>

                  {/* Amparos ya agregados a la póliza en construcción. */}
                  {amparos.length > 0 ? (
                    <div className="space-y-1.5">
                      {amparos.map((a, indice) => (
                        <div
                          key={a.tipo}
                          className="rounded-md border border-gray-100 bg-slate-50 px-3 py-2 flex items-center gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[11.5px] font-bold text-slate-700 m-0 break-words">
                              {nombreAmparo(a.tipo)} · {pesos.format(a.valorAsegurado)}
                            </p>
                            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                              Del {fechaLarga(a.vigenciaDesde)} al {fechaLarga(a.vigenciaHasta)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => quitarAmparo(indice)}
                            aria-label={`Quitar el amparo de ${nombreAmparo(a.tipo)}`}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-dashed border-gray-300 px-3 py-2.5 space-y-2.5">
                    <p className="text-xs font-bold text-gray-600 m-0">Agregar amparo</p>
                    <div>
                      <label htmlFor="amp-tipo" className="block text-xs font-bold text-gray-600 mb-1.5">
                        Cobertura <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="amp-tipo"
                        value={amparo.tipo}
                        onChange={(e) => setAmparo((p) => ({ ...p, tipo: e.target.value }))}
                        className={campo}
                      >
                        <option value="">Elige la cobertura</option>
                        {estado.tiposAmparo.map((t) => (
                          <option key={t.codigo} value={t.codigo}>
                            {t.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label htmlFor="amp-valor" className="block text-xs font-bold text-gray-600 mb-1.5">
                          Valor asegurado <span className="text-red-600">*</span>
                        </label>
                        <input
                          id="amp-valor"
                          type="number"
                          min={1}
                          value={amparo.valorAsegurado}
                          onChange={(e) => setAmparo((p) => ({ ...p, valorAsegurado: e.target.value }))}
                          className={campo}
                        />
                      </div>
                      <div>
                        <label htmlFor="amp-desde" className="block text-xs font-bold text-gray-600 mb-1.5">
                          Vigente desde <span className="text-red-600">*</span>
                        </label>
                        <input
                          id="amp-desde"
                          type="date"
                          value={amparo.vigenciaDesde}
                          onChange={(e) => setAmparo((p) => ({ ...p, vigenciaDesde: e.target.value }))}
                          className={campo}
                        />
                      </div>
                      <div>
                        <label htmlFor="amp-hasta" className="block text-xs font-bold text-gray-600 mb-1.5">
                          Vigente hasta <span className="text-red-600">*</span>
                        </label>
                        <input
                          id="amp-hasta"
                          type="date"
                          value={amparo.vigenciaHasta}
                          onChange={(e) => setAmparo((p) => ({ ...p, vigenciaHasta: e.target.value }))}
                          className={campo}
                        />
                      </div>
                    </div>
                    <BotonSecundario
                      icono={<Plus className="w-3.5 h-3.5" />}
                      disabled={!amparo.tipo || !amparo.valorAsegurado || !amparo.vigenciaDesde || !amparo.vigenciaHasta}
                      onClick={agregarAmparo}
                    >
                      Agregar a la póliza
                    </BotonSecundario>
                  </div>

                  <SelectorArchivo
                    id="gar-poliza"
                    etiqueta="Póliza expedida"
                    ayuda="El documento que expide la aseguradora."
                    archivo={poliza}
                    onElegir={setPoliza}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Boton
                      icono={<ShieldCheck className="w-3.5 h-3.5" />}
                      disabled={
                        guardando ||
                        !garantia.aseguradora.trim() ||
                        !garantia.numeroPoliza.trim() ||
                        amparos.length === 0 ||
                        !poliza
                      }
                      onClick={cargar}
                    >
                      Cargar la garantía
                    </Boton>
                    <BotonSecundario
                      icono={<Undo2 className="w-3.5 h-3.5" />}
                      disabled={guardando}
                      onClick={limpiarGarantia}
                    >
                      Cancelar
                    </BotonSecundario>
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* --------------------------------- ARL (8.5) ---------------------- */}
          {esArl && estado.requiereArl ? (
            estado.arl ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 flex items-start gap-2.5">
                <HeartPulse className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-emerald-900 m-0">
                    Afiliado a {estado.arl.administradora}
                  </p>
                  <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed">
                    Desde el {fechaLarga(estado.arl.fechaAfiliacion)} · afilió{' '}
                    {estado.arl.afiliadoPor === 'ENTIDAD' ? 'la entidad' : 'el contratista'}
                    {estado.arl.numeroAfiliacion ? ` · Nº ${estado.arl.numeroAfiliacion}` : ''}
                  </p>
                </div>
              </div>
            ) : !registrandoArl && estado.puedeCargar ? (
              <Boton icono={<HeartPulse className="w-3.5 h-3.5" />} onClick={() => setRegistrandoArl(true)}>
                Registrar la afiliación
              </Boton>
            ) : !registrandoArl ? (
              <SinPermiso quien="el gestor que lleva el contrato" />
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
                <p className="text-[12.5px] font-bold text-slate-800 m-0">Afiliación a la ARL</p>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="arl-quien" className="block text-xs font-bold text-gray-600 mb-1.5">
                      Quién afilió <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="arl-quien"
                      value={arl.afiliadoPor}
                      onChange={(e) =>
                        setArl((p) => ({ ...p, afiliadoPor: e.target.value as DatosArl['afiliadoPor'] }))
                      }
                      className={campo}
                    >
                      <option value="CONTRATISTA">El contratista</option>
                      <option value="ENTIDAD">La entidad</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="arl-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
                      Fecha de afiliación <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="arl-fecha"
                      type="date"
                      value={arl.fechaAfiliacion}
                      onChange={(e) => setArl((p) => ({ ...p, fechaAfiliacion: e.target.value }))}
                      className={campo}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="arl-admin" className="block text-xs font-bold text-gray-600 mb-1.5">
                      Administradora <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="arl-admin"
                      type="text"
                      value={arl.administradora}
                      onChange={(e) => setArl((p) => ({ ...p, administradora: e.target.value }))}
                      placeholder="Positiva, Sura, Colmena…"
                      className={campo}
                    />
                  </div>
                  <div>
                    <label htmlFor="arl-numero" className="block text-xs font-bold text-gray-600 mb-1.5">
                      Número de afiliación
                    </label>
                    <input
                      id="arl-numero"
                      type="text"
                      value={arl.numeroAfiliacion}
                      onChange={(e) => setArl((p) => ({ ...p, numeroAfiliacion: e.target.value }))}
                      className={campo}
                    />
                  </div>
                </div>

                <SelectorArchivo
                  id="arl-soporte"
                  etiqueta="Soporte de la afiliación"
                  ayuda="El certificado o la constancia que expide la administradora."
                  archivo={soporteArl}
                  onElegir={setSoporteArl}
                />

                <div className="flex flex-wrap gap-2">
                  <Boton
                    icono={<HeartPulse className="w-3.5 h-3.5" />}
                    disabled={
                      guardando || !arl.administradora.trim() || !arl.fechaAfiliacion || !soporteArl
                    }
                    onClick={registrarArl}
                  >
                    Registrar la afiliación
                  </Boton>
                  <BotonSecundario
                    icono={<Undo2 className="w-3.5 h-3.5" />}
                    disabled={guardando}
                    onClick={limpiarArl}
                  >
                    Cancelar
                  </BotonSecundario>
                </div>
              </div>
            )
          ) : null}
        </>
      )}
    </Marco>
  );
}
