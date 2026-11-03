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
  EvidenciaFirmaOtp,
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
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';
import { useFirma } from '../shared/useFirma';
import { useDialogo } from '../shared/useDialogo';
import { IrALaRevision, useLugarDeDecision } from '../shared/LugarDeDecision';

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
  // Las pólizas se aprueban solo en la pantalla de revisión.
  const { enLaRevision } = useLugarDeDecision();
  const firma = useFirma(numeral, numeral === '8.5' ? 'Registrar la ARL' : 'Aprobar la póliza');
  const dialogo = useDialogo();
  const [estado, setEstado] = useState<EstadoLegalizacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [creando, setCreando] = useState(false);
  const [garantia, setGarantia] = useState(GARANTIA_VACIA);
  const [amparos, setAmparos] = useState<AmparoDeGarantia[]>([]);
  const [amparo, setAmparo] = useState(AMPARO_VACIO);
  const [poliza, setPoliza] = useState<File | null>(null);
  /** La aprobación que se dio en SECOP II, con su evidencia (EFDS-1164). */
  const [fechaSecop, setFechaSecop] = useState('');
  const [evidencia, setEvidencia] = useState<File | null>(null);
  /** La póliza registrada a la que se le está agregando un amparo. */
  const [ampliando, setAmpliando] = useState<string | null>(null);
  /** Qué campos del amparo se marcan en rojo tras una validación fallida. */
  const [erroresAmparo, setErroresAmparo] = useState<Record<string, boolean>>({});

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

  /** La clase del campo, con borde rojo si esa validación falló. */
  const campoAmparo = (nombre: string) =>
    erroresAmparo[nombre] ? `${campo} border-red-500 focus:border-red-500 focus:ring-red-500/20` : campo;

  /** Al editar un campo marcado, se le quita la marca: el usuario ya está corrigiendo. */
  const editarAmparo = (cambio: Partial<typeof AMPARO_VACIO>) => {
    setAmparo((p) => ({ ...p, ...cambio }));
    setErroresAmparo((e) => {
      const limpio = { ...e };
      for (const k of Object.keys(cambio)) delete limpio[k];
      // El rango lo marcan las dos fechas: tocar cualquiera limpia ambas.
      if (cambio.vigenciaDesde !== undefined || cambio.vigenciaHasta !== undefined) {
        delete limpio.vigenciaHasta;
      }
      return limpio;
    });
  };

  const limpiarGarantia = () => {
    setGarantia(GARANTIA_VACIA);
    setAmparos([]);
    setAmparo(AMPARO_VACIO);
    setErroresAmparo({});
    setPoliza(null);
    setFechaSecop('');
    setEvidencia(null);
    setCreando(false);
  };

  /** Las reglas del amparo, dichas antes de enviar; null si no pasa. */
  const amparoValido = (yaIncluidos: AmparoDeGarantia[]): AmparoDeGarantia | null => {
    if (!amparo.tipo || !amparo.vigenciaDesde || !amparo.vigenciaHasta) return null;
    if (yaIncluidos.some((a) => a.tipo === amparo.tipo)) {
      toast.error(`La póliza ya incluye el amparo de ${nombreAmparo(amparo.tipo).toLowerCase()}`);
      setErroresAmparo({ tipo: true });
      return null;
    }
    if (amparo.vigenciaHasta <= amparo.vigenciaDesde) {
      toast.error('La vigencia del amparo debe terminar después de empezar');
      setErroresAmparo({ vigenciaHasta: true });
      return null;
    }
    const valor = Number(amparo.valorAsegurado);
    if (!(valor > 0)) {
      toast.error('El valor asegurado debe ser mayor que cero');
      setErroresAmparo({ valorAsegurado: true });
      return null;
    }
    setErroresAmparo({});
    return {
      tipo: amparo.tipo,
      valorAsegurado: valor,
      vigenciaDesde: amparo.vigenciaDesde,
      vigenciaHasta: amparo.vigenciaHasta,
    };
  };

  /** Agrega el amparo a una póliza ya registrada. */
  const ampliar = async (g: GarantiaDelContrato) => {
    const nuevo = amparoValido(g.amparos);
    if (!nuevo) return;
    setGuardando(true);
    try {
      setEstado(await contratacionService.agregarAmparo(procesoId, g.id, nuevo));
      setAmparo(AMPARO_VACIO);
      setAmpliando(null);
      toast.success(`Amparo agregado a la póliza ${g.numeroPoliza}`);
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const agregarAmparo = () => {
    if (!amparo.tipo || !amparo.vigenciaDesde || !amparo.vigenciaHasta) return;

    // Las mismas reglas que aplica el servidor, dichas antes de enviar. Cada
    // fallo marca en rojo el campo que lo causa, no solo un toast: el toast se
    // va y el usuario tiene que adivinar cuál de las tres fechas corregir.
    if (amparos.some((a) => a.tipo === amparo.tipo)) {
      toast.error(`La póliza ya incluye el amparo de ${nombreAmparo(amparo.tipo).toLowerCase()}`);
      setErroresAmparo({ tipo: true });
      return;
    }
    if (amparo.vigenciaHasta <= amparo.vigenciaDesde) {
      toast.error('La vigencia del amparo debe terminar después de empezar');
      setErroresAmparo({ vigenciaHasta: true });
      return;
    }
    const valor = Number(amparo.valorAsegurado);
    if (!(valor > 0)) {
      toast.error('El valor asegurado debe ser mayor que cero');
      setErroresAmparo({ valorAsegurado: true });
      return;
    }

    setErroresAmparo({});

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
    if (!poliza || !evidencia || !fechaSecop || amparos.length === 0) return;

    setGuardando(true);
    try {
      setEstado(
        await contratacionService.cargarGarantia(
          procesoId,
          {
            aseguradora: garantia.aseguradora.trim(),
            numeroPoliza: garantia.numeroPoliza.trim(),
            amparos,
            fechaAprobacionSecop: fechaSecop,
          },
          poliza,
          evidencia,
        ),
      );
      limpiarGarantia();
      toast.success('Póliza registrada con su aprobación en SECOP II');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const aprobar = async (g: GarantiaDelContrato, firmaOtp?: EvidenciaFirmaOtp) => {
    setGuardando(true);
    try {
      const respuesta = await contratacionService.aprobarGarantia(procesoId, g.id, firmaOtp);
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
    // Era el último `window.prompt` de la etapa 8, con el cuadro del navegador
    // («localhost dice…») en vez del diálogo del módulo.
    const motivo = await dialogo.pedirMotivo({
      titulo: `Devolver la póliza ${g.numeroPoliza}`,
      descripcion: 'El contratista verá este motivo y podrá cargar la póliza corregida.',
      etiqueta: 'Por qué se devuelve',
      confirmar: 'Devolver la póliza',
      tono: 'peligro',
    });
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

  const registrarArl = async (firmaOtp?: EvidenciaFirmaOtp) => {
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
          firma: firmaOtp,
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
          : 'Registra cada póliza con sus amparos y la fecha en que se aprobó en SECOP II, con la evidencia. Una póliza de cumplimiento puede traer varios amparos, y el contrato puede tener varias pólizas (por ejemplo, la de responsabilidad civil extracontractual).'}
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
                      {g.estado === 'APROBADA' && g.fechaAprobacionSecop ? (
                        <p className="text-[11.5px] text-slate-600 m-0 mt-1 leading-relaxed">
                          Aprobada en SECOP II el {fechaLarga(g.fechaAprobacionSecop)}
                          {g.revisadaPor ? ` · registrada por ${g.revisadaPor}` : ''}
                        </p>
                      ) : g.estado === 'APROBADA' && g.revisadaPor ? (
                        <p className="text-[11.5px] text-slate-600 m-0 mt-1 leading-relaxed">
                          Aprobada por {g.revisadaPor}
                          {g.revisadaAt ? ` el ${momento(g.revisadaAt)}` : ''}
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

                  {/* Aprobar es de quien tiene el rol, haya cargado o no la
                      póliza: sin él se dice quién puede, en vez de un botón que dará 403. */}
                  {/* Y solo en la pantalla de revisión: aquí se lleva a ella. */}
                  {g.estado === 'CARGADA' && estado.puedeAprobar && !enLaRevision ? (
                    <IrALaRevision numeral="8.4" que="aprobarla" />
                  ) : g.estado === 'CARGADA' && estado.puedeAprobar ? (
                    <div className="flex flex-wrap gap-2">
                      <Boton
                        decision
                        icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
                        disabled={guardando}
                        onClick={() => firma.conFirma((firmaOtp) => aprobar(g, firmaOtp))}
                      >
                        Aprobar la póliza
                      </Boton>
                      <BotonSecundario
                        decision
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

                  {/* «Agregar amparo» suma una cobertura a ESTA póliza; una
                      póliza distinta va por «Agregar póliza». */}
                  {g.estado !== 'RECHAZADA' && estado.puedeCargar && !creando ? (
                    ampliando === g.id ? (
                      <FormularioAmparo
                        tipos={estado.tiposAmparo}
                        amparo={amparo}
                        campoAmparo={campoAmparo}
                        onEditar={editarAmparo}
                        boton="Agregar el amparo a esta póliza"
                        ocupado={guardando}
                        onAgregar={() => ampliar(g)}
                        onCancelar={() => {
                          setAmpliando(null);
                          setAmparo(AMPARO_VACIO);
                          setErroresAmparo({});
                        }}
                      />
                    ) : (
                      <BotonSecundario
                        icono={<Plus className="w-3.5 h-3.5" />}
                        disabled={guardando}
                        onClick={() => {
                          setAmpliando(g.id);
                          setAmparo(AMPARO_VACIO);
                          setErroresAmparo({});
                        }}
                      >
                        Agregar amparo
                      </BotonSecundario>
                    )
                  ) : null}
                </div>
              ))}

              {!creando && estado.puedeCargar ? (
                <Boton
                  icono={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setAmpliando(null);
                    setAmparo(AMPARO_VACIO);
                    setCreando(true);
                  }}
                >
                  Agregar póliza
                </Boton>
              ) : !creando ? null : (
                <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
                  <p className="text-[12.5px] font-bold text-slate-800 m-0">Nueva póliza</p>

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
                    <p className="text-xs font-bold text-gray-600 m-0">
                      Amparos de esta póliza (puede tener varios)
                    </p>
                    <div>
                      <label htmlFor="amp-tipo" className="block text-xs font-bold text-gray-600 mb-1.5">
                        Cobertura <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="amp-tipo"
                        value={amparo.tipo}
                        onChange={(e) => editarAmparo({ tipo: e.target.value })}
                        className={campoAmparo('tipo')}
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
                          onChange={(e) => editarAmparo({ valorAsegurado: e.target.value })}
                          className={campoAmparo('valorAsegurado')}
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
                          onChange={(e) => editarAmparo({ vigenciaDesde: e.target.value })}
                          className={campoAmparo('vigenciaHasta')}
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
                          onChange={(e) => editarAmparo({ vigenciaHasta: e.target.value })}
                          className={campoAmparo('vigenciaHasta')}
                        />
                      </div>
                    </div>
                    <BotonSecundario
                      icono={<Plus className="w-3.5 h-3.5" />}
                      disabled={!amparo.tipo || !amparo.valorAsegurado || !amparo.vigenciaDesde || !amparo.vigenciaHasta}
                      onClick={agregarAmparo}
                    >
                      Agregar amparo
                    </BotonSecundario>
                  </div>

                  <SelectorArchivo
                    id="gar-poliza"
                    etiqueta="Póliza expedida"
                    ayuda="El documento que expide la aseguradora."
                    archivo={poliza}
                    onElegir={setPoliza}
                  />

                  {/* La aprobación ya se dio en SECOP II: aquí no se aprueba otra
                      vez, se deja la fecha y la evidencia (EFDS-1164). */}
                  <div>
                    <label htmlFor="gar-secop" className="block text-xs font-bold text-gray-600 mb-1.5">
                      Fecha de aprobación en SECOP II <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="gar-secop"
                      type="date"
                      max={hoyEnBogota()}
                      value={fechaSecop}
                      onChange={(e) => setFechaSecop(e.target.value)}
                      className={campo}
                    />
                  </div>
                  <SelectorArchivo
                    id="gar-evidencia"
                    etiqueta="Evidencia de la aprobación en SECOP II"
                    ayuda="Pantallazo o PDF de SECOP II donde consta la aprobación."
                    archivo={evidencia}
                    onElegir={setEvidencia}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Boton
                      icono={<ShieldCheck className="w-3.5 h-3.5" />}
                      disabled={
                        guardando ||
                        !garantia.aseguradora.trim() ||
                        !garantia.numeroPoliza.trim() ||
                        amparos.length === 0 ||
                        !poliza ||
                        !fechaSecop ||
                        !evidencia
                      }
                      onClick={cargar}
                    >
                      Registrar la póliza
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
                    onClick={() => firma.conFirma(registrarArl)}
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
      {firma.modal}
      {dialogo.elemento}
    </Marco>
  );
}

/** El formulario de un amparo suelto, para sumarlo a una póliza ya registrada. */
function FormularioAmparo({
  tipos,
  amparo,
  campoAmparo,
  onEditar,
  boton,
  ocupado,
  onAgregar,
  onCancelar,
}: {
  tipos: { codigo: string; nombre: string }[];
  amparo: { tipo: string; valorAsegurado: string; vigenciaDesde: string; vigenciaHasta: string };
  campoAmparo: (nombre: string) => string;
  onEditar: (cambio: Partial<{ tipo: string; valorAsegurado: string; vigenciaDesde: string; vigenciaHasta: string }>) => void;
  boton: string;
  ocupado: boolean;
  onAgregar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 px-3 py-2.5 space-y-2.5">
      <select
        aria-label="Cobertura del amparo"
        value={amparo.tipo}
        onChange={(e) => onEditar({ tipo: e.target.value })}
        className={campoAmparo('tipo')}
      >
        <option value="">Elige la cobertura</option>
        {tipos.map((t) => (
          <option key={t.codigo} value={t.codigo}>
            {t.nombre}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-3 gap-2.5">
        <input
          type="number"
          min={1}
          aria-label="Valor asegurado"
          placeholder="Valor asegurado"
          value={amparo.valorAsegurado}
          onChange={(e) => onEditar({ valorAsegurado: e.target.value })}
          className={campoAmparo('valorAsegurado')}
        />
        <input
          type="date"
          aria-label="Vigente desde"
          value={amparo.vigenciaDesde}
          onChange={(e) => onEditar({ vigenciaDesde: e.target.value })}
          className={campoAmparo('vigenciaHasta')}
        />
        <input
          type="date"
          aria-label="Vigente hasta"
          value={amparo.vigenciaHasta}
          onChange={(e) => onEditar({ vigenciaHasta: e.target.value })}
          className={campoAmparo('vigenciaHasta')}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <BotonSecundario
          icono={<Plus className="w-3.5 h-3.5" />}
          disabled={
            ocupado || !amparo.tipo || !amparo.valorAsegurado || !amparo.vigenciaDesde || !amparo.vigenciaHasta
          }
          onClick={onAgregar}
        >
          {boton}
        </BotonSecundario>
        <BotonSecundario icono={<Undo2 className="w-3.5 h-3.5" />} disabled={ocupado} onClick={onCancelar}>
          Cancelar
        </BotonSecundario>
      </div>
    </div>
  );
}
