import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Plane,
  Search,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  Comisionado,
  DocumentoFormItem,
  DocumentoSoporte,
  FormNuevaSolicitud,
  Geopolitica,
  SolicitudComisionResponse,
} from '../types/viaticos';
import { ConfigTipoComisionado } from '../types/parametrizacion';
import viaticosService from '../services/api/viaticosService';
import { authService } from '../services/api/authService';
import SearchableSelect, { SearchableSelectOption } from './SearchableSelect';
import {
  AYUDA_OBJETO_SIIF,
  calcularDiasComision,
  contarDiasHabilesEntre,
  esDiaHabil,
  esPdfMime,
  formatearMoneda,
  formatearNombreComisionado,
  hoyISO,
  inferirTipoMime,
  formInicialNuevaSolicitud,
  mapearARequestCreacion,
  sanitizeObjetoComision,
  soloNumeros,
  validarAnticipacionRadicacion,
  validarFechasSolicitud,
} from '../utils/viaticosUtils';

interface Props {
  abierta: boolean;
  onCerrar: () => void;
  onSolicitudCreada: (solicitud: SolicitudComisionResponse) => void;
  solicitudAResumir?: SolicitudComisionResponse | null;
}

const PASOS = ['Comisionado', 'Objeto y Destino', 'Documentos', 'Confirmación'];

export default function NuevaSolicitudModal({ abierta, onCerrar, onSolicitudCreada, solicitudAResumir }: Props) {
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState<FormNuevaSolicitud>(formInicialNuevaSolicitud());
  const [comisionado, setComisionado] = useState<Comisionado | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [habeasPendiente, setHabeasPendiente] = useState(false);
  const [habeasMarcado, setHabeasMarcado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [alertaAnticipacion, setAlertaAnticipacion] = useState<{
    extemporanea: boolean;
    diasHabiles: number;
    radicadoFueraJornada: boolean;
  } | null>(null);
  const [departamentos, setDepartamentos] = useState<Geopolitica[]>([]);
  const [ciudades, setCiudades] = useState<Geopolitica[]>([]);
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(false);
  const [cargandoCiudades, setCargandoCiudades] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<{ userId: string; username: string } | null>(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(false);
  const [parametrizacion, setParametrizacion] = useState<ConfigTipoComisionado | null>(null);
  const [cargandoParametrizacion, setCargandoParametrizacion] = useState(false);
  const [documentosFaltantes, setDocumentosFaltantes] = useState<string[]>([]);
  const [solicitudBorrador, setSolicitudBorrador] = useState<SolicitudComisionResponse | null>(null);
  const [checklist, setChecklist] = useState<{ obligatorios: Array<{ codigo: string; nombre: string; descripcion: string | null }>; opcionales: Array<{ codigo: string; nombre: string; descripcion: string | null }> } | null>(null);
  const [cargandoChecklist, setCargandoChecklist] = useState(false);
  const [subiendoDocs, setSubiendoDocs] = useState(false);
  const [errorDocumentos, setErrorDocumentos] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const refTokenCiudades = useRef(0);

  const cargarDepartamentos = async () => {
    setCargandoDepartamentos(true);
    try {
      const data = await viaticosService.obtenerDepartamentos();
      const unicos = new Map<string, Geopolitica>();
      (data || []).forEach((d) => {
        if (d.tipDivision === 'DEPTO' && d.nomDivGeopolitica?.trim()) {
          const nombre = d.nomDivGeopolitica.trim();
          const existente = unicos.get(nombre);
          if (!existente || (existente.codDepartamento == null && d.codDepartamento != null)) {
            unicos.set(nombre, d);
          }
        }
      });
      setDepartamentos([...unicos.values()]);
    } catch (e) {
      console.error('Error cargando departamentos:', e);
      setDepartamentos([]);
    } finally {
      setCargandoDepartamentos(false);
    }
  };

  const cargarUsuarioActual = async () => {
    setCargandoUsuario(true);
    try {
      const usuario = await authService.getCurrentUser();
      if (usuario) {
        setUsuarioActual({ userId: usuario.userId, username: usuario.username });
      }
    } catch (e) {
      console.error('Error cargando usuario actual:', e);
    } finally {
      setCargandoUsuario(false);
    }
  };

  const cargarParametrizacion = async () => {
    setCargandoParametrizacion(true);
    try {
      const data = await viaticosService.obtenerParametrizacionFormulario();
      if (data && comisionado?.tipoComisionado) {
        const config = data.configuraciones?.[comisionado.tipoComisionado];
        setParametrizacion(config ?? data.configuraciones?.DEFAULT ?? null);
      }
    } catch (e) {
      console.error('Error cargando parametrización:', e);
    } finally {
      setCargandoParametrizacion(false);
    }
  };

  const cargarParametrizacionPorCodigo = async (codigoFormulario: string) => {
    setCargandoParametrizacion(true);
    try {
      const config = await viaticosService.obtenerParametrizacionPorCodigoFormulario(codigoFormulario);
      setParametrizacion(config);
    } catch (e) {
      console.error('Error cargando parametrización por código:', e);
    } finally {
      setCargandoParametrizacion(false);
    }
  };

  const cargarChecklist = async (tipoComisionado: string) => {
    if (!tipoComisionado) {
      setChecklist(null);
      return;
    }
    setCargandoChecklist(true);
    setErrorDocumentos(null);
    try {
      const checklistRes = await viaticosService.obtenerChecklistDocumentos(tipoComisionado);
      setChecklist(checklistRes);
    } catch (e) {
      console.error('Error cargando checklist de documentos:', e);
      setChecklist(null);
    } finally {
      setCargandoChecklist(false);
    }
  };

  const cargarSolicitudAResumir = async (solicitud: SolicitudComisionResponse) => {
    setSolicitudBorrador(solicitud as SolicitudComisionResponse & { documentosSoporte?: DocumentoSoporte[] });
    setForm({
      documentoComisionado: solicitud.comisionado?.numeroDocumento || '',
      comisionadoId: solicitud.comisionadoId || solicitud.comisionado?.id || '',
      objetoComision: solicitud.objetoComision || '',
      destinoCiudad: solicitud.destinoCiudad || '',
      destinoDepartamento: solicitud.destinoDepartamento || '',
      fechaInicio: solicitud.fechaInicio ? new Date(solicitud.fechaInicio).toISOString().slice(0, 10) : '',
      fechaFin: solicitud.fechaFin ? new Date(solicitud.fechaFin).toISOString().slice(0, 10) : '',
      rubroPresupuestal: solicitud.rubroPresupuestal || '',
      prioridad: (solicitud.prioridad as any) || 'MEDIA',
      requiereTiquetes: Boolean(solicitud.requiereTiquetes),
      montoViaticos: Number(solicitud.montoViaticos || 0),
      montoGastosViaje: Number(solicitud.montoGastosViaje || 0),
      diasComision: solicitud.diasComision ?? 1,
      aceptaHabeasData: true,
      tipoComision: solicitud.tipoComision || 'TERRESTRE',
      esInternacional: Boolean(solicitud.esInternacional),
      documentos: (solicitud.documentosSoporte || []).map((d) => ({
        tipoDocumento: d.tipoDocumento,
        nombreArchivoOriginal: d.nombreArchivoOriginal,
        nombreArchivoSeguro: d.nombreArchivoSeguro,
        urlRepositorio: d.urlRepositorio,
        tipoMime: d.tipoMime,
      })),
    });
    if (solicitud.comisionado) {
      setComisionado(solicitud.comisionado);
      await cargarChecklist(
        solicitud.esInternacional ? 'INTERNACIONAL' : solicitud.comisionado.tipoComisionado,
      );
    }
    setPaso(PASOS.length - 1);
  };

  useEffect(() => {
    if (abierta) {
      setPaso(1);
      setForm(formInicialNuevaSolicitud());
      setComisionado(null);
      setConsultando(false);
      setErrorConsulta(null);
      setErrorValidacion(null);
      setHabeasPendiente(false);
      setHabeasMarcado(false);
      setEnviando(false);
      setAlertaAnticipacion(null);
      setDepartamentos([]);
      setCiudades([]);
      setUsuarioActual(null);
      setCargandoUsuario(false);
      setParametrizacion(null);
      setDocumentosFaltantes([]);
      setSolicitudBorrador(null);
      setChecklist(null);
      setSubiendoDocs(false);
      setFinalizando(false);
      void cargarDepartamentos();
      void cargarUsuarioActual();
      if (solicitudAResumir) {
        void cargarSolicitudAResumir(solicitudAResumir);
      }
    }
  }, [abierta, solicitudAResumir]);

  useEffect(() => {
    if (comisionado?.tipoComisionado) {
      void cargarParametrizacion();
    } else {
      setParametrizacion(null);
    }
  }, [comisionado?.tipoComisionado]);

  if (!abierta) return null;

  const actualizar = (campo: keyof FormNuevaSolicitud, valor: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const esCampoObligatorio = (clave: string): boolean => {
    if (!parametrizacion) return true;
    return parametrizacion.camposObligatorios.includes(clave);
  };

  const esCampoOpcional = (clave: string): boolean => {
    if (!parametrizacion) return false;
    return parametrizacion.camposOpcionales.includes(clave);
  };

  const esCampoOculto = (clave: string): boolean => {
    if (!parametrizacion) return false;
    return parametrizacion.camposOcultos.includes(clave);
  };

  const documentosObligatoriosLista = (parametrizacion?.documentos ?? [])
    .filter((d) => d.tipoRequisito === 'OBLIGATORIO')
    .map((d) => d.tipoDocumentoSoporte?.codigo)
    .filter((codigo): codigo is string => Boolean(codigo));

  const manejarCambioDepartamento = (nombre: string) => {
    actualizar('destinoDepartamento', nombre);
    actualizar('destinoCiudad', '');
    setCiudades([]);
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;
    const depto = departamentos.find((d) => d.nomDivGeopolitica.trim() === nombreLimpio);
    if (!depto) return;
    const codigoDepto = Number(depto.codDepartamento ?? depto.codGeopolitica ?? depto.idGeopolitica);
    const token = ++refTokenCiudades.current;
    setCargandoCiudades(true);
    void viaticosService
      .obtenerCiudadesPorDepartamento(codigoDepto)
      .then((data) => {
        if (token === refTokenCiudades.current) {
          setCiudades(data || []);
        }
      })
      .catch((e) => {
        if (token === refTokenCiudades.current) {
          console.error('Error cargando ciudades:', e);
          setCiudades([]);
        }
      })
      .finally(() => {
        if (token === refTokenCiudades.current) {
          setCargandoCiudades(false);
        }
      });
  };

  const consultarComisionado = async () => {
    const documento = form.documentoComisionado.trim();
    if (!documento) {
      setErrorConsulta('Ingrese el número de documento del funcionario.');
      return;
    }
    setConsultando(true);
    setErrorConsulta(null);
    setComisionado(null);
    setHabeasPendiente(false);
    setHabeasMarcado(false);
    try {
      const resultado = await viaticosService.consultarComisionado(documento);
      if (!resultado) {
        setErrorConsulta('No se encontró un comisionado con ese documento.');
        return;
      }
      setComisionado(resultado);
      setForm((prev) => ({ ...prev, comisionadoId: resultado.id }));
      if (!resultado.autorizacionHabeasData) {
        setHabeasPendiente(true);
      }
    } catch (e) {
      console.error('Error consultando comisionado:', e);
      setErrorConsulta('Ocurrió un error al consultar el comisionado.');
    } finally {
      setConsultando(false);
    }
  };

  const aceptarHabeasData = () => {
    setForm((prev) => ({ ...prev, aceptaHabeasData: true }));
    setHabeasPendiente(false);
    setHabeasMarcado(false);
  };

  const tieneComisionadoAutorizado = Boolean(
    comisionado && (comisionado.autorizacionHabeasData || form.aceptaHabeasData),
  );

  useEffect(() => {
    if (paso === PASOS.length && form.fechaInicio) {
      const validacion = validarAnticipacionRadicacion(form.fechaInicio);
      setAlertaAnticipacion(validacion);
    } else {
      setAlertaAnticipacion(null);
    }
  }, [paso, form.fechaInicio]);

  useEffect(() => {
    if (form.fechaInicio && form.fechaFin) {
      const dias = calcularDiasComision(form.fechaInicio, form.fechaFin);
      actualizar('diasComision', dias);
    }
  }, [form.fechaInicio, form.fechaFin]);

  const documentosObligatoriosActuales = (): string[] => {
    if (checklist?.obligatorios) return checklist.obligatorios.map((d) => d.codigo);
    return documentosObligatoriosLista;
  };

  const documentosCargados = (codigo: string): DocumentoFormItem[] =>
    (form.documentos || []).filter((d) => d.tipoDocumento === codigo);

  const documentosFaltantesActuales = (): string[] =>
    documentosObligatoriosActuales().filter((codigo) => documentosCargados(codigo).length === 0);

  const documentosNoPdf = (): string[] =>
    documentosObligatoriosActuales().filter((codigo) =>
      documentosCargados(codigo).some((d) => !esPdfMime(d.tipoMime || ''),
      ),
    );

  const checklistCompleto = (): boolean =>
    documentosFaltantesActuales().length === 0 && documentosNoPdf().length === 0;

  const irPaso = (siguiente: number) => {
    if (siguiente === 2 && !tieneComisionadoAutorizado) return;
    if (siguiente === 3) {
      const error = validarFechasSolicitud(form.fechaInicio, form.fechaFin);
      if (error) {
        setErrorValidacion(error);
        return;
      }
      if (comisionado && parametrizacion) {
        const documentosObligatorios = parametrizacion.documentos
          .filter((d) => d.tipoRequisito === 'OBLIGATORIO')
          .map((d) => d.tipoDocumentoSoporte?.codigo)
          .filter((codigo): codigo is string => Boolean(codigo));

        const faltantes = documentosObligatorios.filter(
          (doc) => !(form.documentos || []).some((d) => d.tipoDocumento === doc),
        );
        setDocumentosFaltantes(faltantes);
      }
    }
    setErrorValidacion(null);
    setPaso(siguiente);
  };

  const guardarYBorrador = async () => {
    const error = validarFechasSolicitud(form.fechaInicio, form.fechaFin);
    if (error) {
      setErrorValidacion(error);
      return;
    }
    if (!comisionado) {
      setErrorValidacion('Debe consultar el comisionado antes de guardar.');
      return;
    }
    setEnviando(true);
    setErrorValidacion(null);
    try {
      if (!solicitudBorrador) {
        const payload = mapearARequestCreacion(
          form,
          comisionado,
          usuarioActual?.userId || '',
          true,
          form.tipoComision || 'TERRESTRE',
        );
        const creada = await viaticosService.crearSolicitudComision(payload);
      setSolicitudBorrador({
        ...creada,
        documentosSoporte: (creada.documentosSoporte || []) as DocumentoSoporte[],
      });
    }
    const tipoChecklist = form.esInternacional ? 'INTERNACIONAL' : comisionado.tipoComisionado;
    await cargarChecklist(tipoChecklist);
    setPaso(3);
    } catch (e) {
      console.error('Error guardando borrador:', e);
      setErrorValidacion('No fue posible guardar el borrador. Verifique e intente nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  const subirDocumentoEspecifico = async (codigo: string, archivo: File) => {
    if (!solicitudBorrador) {
      setErrorDocumentos('No hay una solicitud activa para cargar documentos.');
      return;
    }
    if (!esPdfMime(archivo.type) && !esPdfMime(inferirTipoMime(archivo.name))) {
      setErrorDocumentos(`El documento "${archivo.name}" debe estar en formato PDF.`);
      return;
    }
    const tipoMime = inferirTipoMime(archivo.name);
    setSubiendoDocs(true);
    setErrorDocumentos(null);
    try {
      const doc = await viaticosService.subirDocumento(
        solicitudBorrador.id,
        codigo,
        archivo,
        tipoMime,
      );
      setForm((prev) => ({
        ...prev,
        documentos: [...(prev.documentos || []), doc],
      }));
    } catch (e) {
      console.error('Error subiendo documento:', e);
      setErrorDocumentos('No fue posible cargar el documento. Intente nuevamente.');
    } finally {
      setSubiendoDocs(false);
    }
  };

  const finalizarSolicitud = async () => {
    const error = validarFechasSolicitud(form.fechaInicio, form.fechaFin);
    if (error) {
      setErrorValidacion(error);
      return;
    }
    if (!comisionado) {
      setErrorValidacion('Debe consultar el comisionado antes de radicar.');
      return;
    }
    if (!solicitudBorrador) {
      setErrorValidacion('Debe guardar el borrador antes de radicar.');
      return;
    }
    if (!checklistCompleto()) {
      setErrorValidacion(
        'Faltan cargar algunos soportes obligatorios en PDF. Complete el checklist antes de radicar.',
      );
      return;
    }
    setFinalizando(true);
    setErrorValidacion(null);
    try {
      const radicada = await viaticosService.finalizarSolicitud(solicitudBorrador.id);
      onSolicitudCreada(radicada as unknown as SolicitudComisionResponse);
      onCerrar();
    } catch (e: any) {
      console.error('Error radicando solicitud:', e);
      const mensaje =
        e?.response?.data?.message ||
        e?.message ||
        'No fue posible radicar la solicitud. Verifique e intente nuevamente.';
      setErrorValidacion(
        Array.isArray(mensaje) ? mensaje.join(' ') : mensaje,
      );
    } finally {
      setFinalizando(false);
    }
  };

  const onSubmitFormulario = (e: FormEvent) => {
    e.preventDefault();
    void finalizarSolicitud();
  };

  const inputCls =
    'w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white';
  const labelCls = 'text-xs font-bold text-slate-700 block mb-1';

  const renderLabel = (clave: string, etiquetaBase: string) => {
    const obligatorio = esCampoObligatorio(clave);
    const opcional = esCampoOpcional(clave);
    if (obligatorio) {
      return (
        <>
          {etiquetaBase} <span className="text-red-500">*</span>
        </>
      );
    }
    if (opcional) {
      return (
        <>
          {etiquetaBase} <span className="text-slate-400">(opcional)</span>
        </>
      );
    }
    return etiquetaBase;
  };

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-[#003DA5] rounded-xl">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Nueva Solicitud de Comisión de Servicios</h3>
                <p className="text-xs text-slate-400">
                   Paso {paso} de {PASOS.length}
                {comisionado && (
                  <span className="ml-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {comisionado.tipoComisionado}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2 mb-5">
          {PASOS.map((nombre, idx) => {
            const n = idx + 1;
            const activo = n === paso;
            const completado = n < paso;
            return (
              <div key={nombre} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                    activo
                      ? 'bg-[#003DA5] text-white'
                      : completado
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {completado ? '✓' : n}
                </div>
                <span className={`text-[10px] font-bold hidden sm:block ${activo ? 'text-slate-800' : 'text-slate-400'}`}>
                  {nombre}
                </span>
                {idx < PASOS.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
              </div>
            );
          })}
        </div>

        {cargandoParametrizacion && (
          <div className="mb-4 text-xs text-slate-400 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Cargando configuración del formulario...
          </div>
        )}

        <form onSubmit={onSubmitFormulario} className="space-y-4">
          {paso === 1 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                1. Datos del Funcionario Comisionado
              </h4>
              <div>
                <label className={labelCls} htmlFor="documentoComisionado">
                  {renderLabel('documentoComisionado', 'Documento de Identidad')}
                </label>
                <div className="flex gap-2">
                  <input
                    id="documentoComisionado"
                    type="text"
                    inputMode="numeric"
                    required={esCampoObligatorio('documentoComisionado')}
                    placeholder="Ej. 1019283746"
                    value={form.documentoComisionado}
                    onChange={(e) => actualizar('documentoComisionado', soloNumeros(e.target.value))}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={consultarComisionado}
                    disabled={consultando}
                    className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 shrink-0 transition-colors disabled:opacity-50"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {consultando ? 'Consultando...' : 'Consultar'}
                  </button>
                </div>
                {errorConsulta && (
                  <p className="text-xs text-red-600 font-semibold mt-2" role="alert">
                    {errorConsulta}
                  </p>
                )}
              </div>

              {comisionado && !habeasPendiente && (
                <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{formatearNombreComisionado(comisionado)}</p>
                      <p className="text-[11px] text-slate-500">
                        {comisionado.tipoComisionado} · {comisionado.email}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 font-bold block">Documento</span>
                      {comisionado.numeroDocumento}
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Teléfono</span>
                      {comisionado.telefonoContacto}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => irPaso(2)}
                  disabled={!tieneComisionadoAutorizado}
                  className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                2. Objeto y Destino de la Comisión
              </h4>
              {!esCampoOculto('objetoComision') && (
                <div>
                  <label className={labelCls} htmlFor="objetoComision">
                    {renderLabel('objetoComision', 'Objeto / Justificación de la comisión')}
                  </label>
                  <textarea
                    id="objetoComision"
                    required={esCampoObligatorio('objetoComision')}
                    rows={3}
                    placeholder="Describa el objetivo institucional de la comisión..."
                    value={form.objetoComision}
                    onChange={(e) => actualizar('objetoComision', sanitizeObjetoComision(e.target.value))}
                    className={inputCls}
                  />
                  <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {AYUDA_OBJETO_SIIF}
                  </p>
                </div>
              )}

              {!esCampoOculto('destinoDepartamento') && !esCampoOculto('destinoCiudad') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="destinoDepartamento">
                      {renderLabel('destinoDepartamento', 'Departamento')}
                    </label>
                    <SearchableSelect
                      id="destinoDepartamento"
                      options={departamentos.map((d) => ({ value: d.nomDivGeopolitica, label: d.nomDivGeopolitica }))}
                      value={form.destinoDepartamento}
                      onChange={(nombre) => manejarCambioDepartamento(nombre)}
                      placeholder="Seleccione un departamento..."
                      disabled={cargandoDepartamentos}
                      loading={cargandoDepartamentos}
                      emptyText="No hay departamentos"
                    />
                    {cargandoDepartamentos && (
                      <p className="text-[11px] text-slate-400 mt-1">Cargando departamentos...</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="destinoCiudad">
                      {renderLabel('destinoCiudad', 'Ciudad')}
                    </label>
                    <SearchableSelect
                      id="destinoCiudad"
                      options={ciudades.map((c) => ({ value: c.nomDivGeopolitica, label: c.nomDivGeopolitica }))}
                      value={form.destinoCiudad}
                      onChange={(nombre) => actualizar('destinoCiudad', nombre)}
                      placeholder="Seleccione una ciudad..."
                      disabled={!form.destinoDepartamento || cargandoCiudades}
                      loading={cargandoCiudades}
                      emptyText="Primero seleccione un departamento"
                    />
                    {cargandoCiudades && (
                      <p className="text-[11px] text-slate-400 mt-1">Cargando ciudades...</p>
                    )}
                  </div>
                </div>
              )}

              {!esCampoOculto('fechaInicio') && !esCampoOculto('fechaFin') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="fechaInicio">
                      {renderLabel('fechaInicio', 'Fecha Inicio')}
                    </label>
                    <input
                      id="fechaInicio"
                      type="date"
                      required={esCampoObligatorio('fechaInicio')}
                      min={hoyISO()}
                      value={form.fechaInicio}
                      onChange={(e) => actualizar('fechaInicio', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="fechaFin">
                      {renderLabel('fechaFin', 'Fecha Fin')}
                    </label>
                    <input
                      id="fechaFin"
                      type="date"
                      required={esCampoObligatorio('fechaFin')}
                      value={form.fechaFin}
                      onChange={(e) => actualizar('fechaFin', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {!esCampoOculto('rubroPresupuestal') && (
                <div>
                  <label className={labelCls} htmlFor="rubroPresupuestal">
                    {renderLabel('rubroPresupuestal', 'Rubro Presupuestal')}
                  </label>
                  <input
                    id="rubroPresupuestal"
                    type="text"
                    required={esCampoObligatorio('rubroPresupuestal')}
                    placeholder="Ej. Rubro 01"
                    value={form.rubroPresupuestal}
                    onChange={(e) => actualizar('rubroPresupuestal', e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}

              {!esCampoOculto('prioridad') && (
                <div>
                  <label className={labelCls} htmlFor="prioridad">
                    {renderLabel('prioridad', 'Prioridad')}
                  </label>
                  <SearchableSelect
                    id="prioridad"
                    options={[
                      { value: 'ALTA', label: 'Alta' },
                      { value: 'MEDIA', label: 'Media' },
                      { value: 'BAJA', label: 'Baja' },
                    ]}
                    value={form.prioridad}
                    onChange={(valor) => actualizar('prioridad', valor)}
                    placeholder="Seleccione prioridad"
                  />
                </div>
              )}

              {(!esCampoOculto('montoViaticos') || !esCampoOculto('montoGastosViaje') || !esCampoOculto('diasComision')) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Valores estimados (COP)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {!esCampoOculto('montoViaticos') && (
                      <div>
                        <label className={labelCls} htmlFor="montoViaticos">
                          {renderLabel('montoViaticos', 'Viáticos')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                          <input
                            id="montoViaticos"
                            type="text"
                            inputMode="numeric"
                            required={esCampoObligatorio('montoViaticos')}
                            value={formatearMoneda(form.montoViaticos)}
                            onChange={(e) => actualizar('montoViaticos', Number(soloNumeros(e.target.value)) || 0)}
                            className={`${inputCls} pl-7 text-right font-bold`}
                          />
                        </div>
                      </div>
                    )}
                    {!esCampoOculto('montoGastosViaje') && (
                      <div>
                        <label className={labelCls} htmlFor="montoGastosViaje">
                          {renderLabel('montoGastosViaje', 'Gastos de viaje')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                          <input
                            id="montoGastosViaje"
                            type="text"
                            inputMode="numeric"
                            required={esCampoObligatorio('montoGastosViaje')}
                            value={formatearMoneda(form.montoGastosViaje)}
                            onChange={(e) => actualizar('montoGastosViaje', Number(soloNumeros(e.target.value)) || 0)}
                            className={`${inputCls} pl-7 text-right font-bold`}
                          />
                        </div>
                      </div>
                    )}
                    {!esCampoOculto('diasComision') && (
                      <div>
                        <label className={labelCls} htmlFor="diasComision">
                          {renderLabel('diasComision', 'Días')}
                        </label>
                        <input
                          id="diasComision"
                          type="text"
                          inputMode="numeric"
                          required={esCampoObligatorio('diasComision')}
                          value={form.diasComision || calcularDiasComision(form.fechaInicio, form.fechaFin)}
                          onChange={(e) => actualizar('diasComision', Number(soloNumeros(e.target.value)) || 0)}
                          className={`${inputCls} text-right font-bold`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

               {!esCampoOculto('requiereTiquetes') && (
                 <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                   <input
                     type="checkbox"
                     checked={form.requiereTiquetes}
                     onChange={(e) => actualizar('requiereTiquetes', e.target.checked)}
                     className="w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
                   />
                   {esCampoObligatorio('requiereTiquetes') ? 'La comisión requiere tiquetes aéreos / pasajes *' : 'La comisión requiere tiquetes aéreos / pasajes'}
                 </label>
               )}

               <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                 <input
                   type="checkbox"
                   checked={Boolean(form.esInternacional)}
                   onChange={(e) => {
                     const internacional = e.target.checked;
                     actualizar('esInternacional', internacional);
                     actualizar('tipoComision', internacional ? 'INTERNACIONAL' : 'TERRESTRE');
                   }}
                   className="w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
                 />
                 <span>
                   Comisión internacional / acto administrativo{' '}
                   <span className="text-slate-400 font-normal">(exige pasaporte, carta de invitación y resolución)</span>
                 </span>
               </label>

               {errorValidacion && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                  {errorValidacion}
                </p>
              )}

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => irPaso(1)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => void guardarYBorrador()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" /> {enviando ? 'Guardando...' : 'Guardar y continuar'}
                </button>
              </div>
            </div>
          )}

          {paso === 3 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                3. Documentos de la Comisión
              </h4>
              {cargandoChecklist && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" /> Cargando checklist de documentos...
                </p>
              )}
              {checklist && checklist.obligatorios.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Soportes obligatorios (PDF)
                  </p>
                  {checklist.obligatorios.map((doc) => {
                    const cargados = documentosCargados(doc.codigo);
                    const faltan = cargados.length === 0;
                    const noPdf = cargados.some((d) => !esPdfMime(d.tipoMime || ''));
                    return (
                      <div key={doc.codigo} className="border border-slate-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{doc.nombre}</p>
                            <p className="text-[10px] text-slate-400">{doc.codigo}</p>
                            {doc.descripcion && (
                              <p className="text-[10px] text-slate-400">{doc.descripcion}</p>
                            )}
                          </div>
                          {faltan ? (
                            <label className="px-3 py-1.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors">
                              <input
                                type="file"
                                accept="application/pdf"
                                hidden
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void subirDocumentoEspecifico(doc.codigo, file);
                                }}
                              />
                              Subir
                            </label>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> Cargado
                              {noPdf && (
                                <span className="text-red-600">(no PDF)</span>
                              )}
                            </span>
                          )}
                        </div>
                        {cargados.map((d) => (
                          <p key={d.id} className="text-[10px] text-slate-500 mt-1 truncate">
                            {d.nombreArchivoOriginal} · {d.tipoMime}
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
              {checklist && checklist.opcionales.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Soportes opcionales
                  </p>
                  {checklist.opcionales.map((doc) => {
                    const cargados = documentosCargados(doc.codigo);
                    const faltan = cargados.length === 0;
                    return (
                      <div key={doc.codigo} className="border border-slate-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{doc.nombre}</p>
                            <p className="text-[10px] text-slate-400">{doc.codigo}</p>
                          </div>
                          {faltan ? (
                            <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors">
                              <input
                                type="file"
                                accept="application/pdf"
                                hidden
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void subirDocumentoEspecifico(doc.codigo, file);
                                }}
                              />
                              Subir
                            </label>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> Cargado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {subiendoDocs && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" /> Subiendo documento...
                </p>
              )}
              {errorDocumentos && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                  {errorDocumentos}
                </p>
              )}

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => irPaso(2)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
                <button
                  type="button"
                  onClick={() => irPaso(4)}
                  className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {paso === 4 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                4. Confirmación de la Solicitud
              </h4>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-400 font-bold">Comisionado</span>
                  <span className="font-semibold text-slate-800">
                    {comisionado ? formatearNombreComisionado(comisionado) : '-'}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-400 font-bold">Tipo</span>
                  <span className="font-semibold text-slate-800">{comisionado?.tipoComisionado || '-'}</span>
                </div>
                {!esCampoOculto('destinoCiudad') && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Destino</span>
                    <span className="font-semibold text-slate-800">
                      {form.destinoCiudad} ({form.destinoDepartamento})
                    </span>
                  </div>
                )}
                {!esCampoOculto('fechaInicio') && !esCampoOculto('fechaFin') && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Fechas</span>
                    <span className="font-semibold text-slate-800">
                      {form.fechaInicio} al {form.fechaFin} ·{' '}
                      {form.diasComision || calcularDiasComision(form.fechaInicio, form.fechaFin)} días
                    </span>
                  </div>
                )}
                {!esCampoOculto('rubroPresupuestal') && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Rubro</span>
                    <span className="font-semibold text-slate-800">{form.rubroPresupuestal}</span>
                  </div>
                )}
                {!esCampoOculto('prioridad') && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Prioridad</span>
                    <span className="font-semibold text-slate-800">{form.prioridad}</span>
                  </div>
                )}
                {!esCampoOculto('montoViaticos') && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Viáticos</span>
                    <span className="font-semibold text-slate-800">{formatearMoneda(form.montoViaticos)}</span>
                  </div>
                )}
                {!esCampoOculto('montoGastosViaje') && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Gastos de viaje</span>
                    <span className="font-semibold text-slate-800">{formatearMoneda(form.montoGastosViaje)}</span>
                  </div>
                )}
                {!esCampoOculto('montoViaticos') && !esCampoOculto('montoGastosViaje') && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Total estimado</span>
                    <span className="font-semibold text-slate-800">
                      {formatearMoneda(form.montoViaticos + form.montoGastosViaje)}
                    </span>
                  </div>
                )}
                {!esCampoOculto('requiereTiquetes') && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Requiere tiquetes</span>
                    <span className="font-semibold text-slate-800">{form.requiereTiquetes ? 'Sí' : 'No'}</span>
                  </div>
                )}
                {!esCampoOculto('objetoComision') && (
                  <div className="px-4 py-2.5">
                    <span className="text-slate-400 font-bold block mb-1">Objeto</span>
                    <p className="bg-slate-50 rounded-lg p-2.5 text-slate-700 leading-relaxed">{form.objetoComision}</p>
                  </div>
                )}
                <div className="px-4 py-2.5">
                  <span className="text-slate-400 font-bold block mb-1">Soportes obligatorios</span>
                  <div className="flex flex-wrap gap-1.5">
                    {documentosObligatoriosActuales().map((doc) => {
                      const cargados = documentosCargados(doc);
                      const completo =
                        cargados.length > 0 && cargados.every((d) => esPdfMime(d.tipoMime || ''));
                      return (
                        <span
                          key={doc}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            completo
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {doc} {completo ? '✓' : '✗'}
                        </span>
                      );
                    })}
                  </div>
                  {documentosFaltantesActuales().length > 0 && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">
                      Faltan por cargar en PDF: {documentosFaltantesActuales().join(', ')}
                    </p>
                  )}
                  {documentosNoPdf().length > 0 && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">
                      En formato incorrecto (deben ser PDF): {documentosNoPdf().join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {alertaAnticipacion && (
                <div className="space-y-2">
                  {alertaAnticipacion.extemporanea && (
                    <p className="text-xs text-red-700 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      La solicitud se radicará como <strong>Comisión Extemporánea</strong> porque faltan menos de 14 días hábiles para el inicio ({alertaAnticipacion.diasHabiles} días hábiles).
                    </p>
                  )}
                  {alertaAnticipacion.radicadoFueraJornada && (
                    <p className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Radicación fuera de horario laboral: el trámite iniciará formalmente el siguiente día hábil.
                    </p>
                  )}
                </div>
              )}

              {errorValidacion && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                  {errorValidacion}
                </p>
              )}

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => irPaso(2)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
                <button
                  type="button"
                  disabled={!checklistCompleto() || finalizando}
                  onClick={() => void finalizarSolicitud()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> {finalizando ? 'Radicando...' : 'Finalizar y Radicar'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {habeasPendiente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <div className="p-2 bg-blue-50 text-[#003DA5] rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">Autorización de Tratamiento de Datos</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              El comisionado no cuenta con autorización vigente para el tratamiento de datos semiprivados (correo
              electrónico y teléfono de contacto) conforme a la Ley 1581 de 2012 y la Sentencia T-254 de 2024.
            </p>
            <label className="flex items-start gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={habeasMarcado}
                onChange={(e) => setHabeasMarcado(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
              />
              Autorizo el tratamiento de los datos semiprivados del comisionado para la gestión de la comisión.
            </label>
            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setHabeasPendiente(false);
                  setHabeasMarcado(false);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!habeasMarcado}
                onClick={aceptarHabeasData}
                className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40"
              >
                Aceptar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
