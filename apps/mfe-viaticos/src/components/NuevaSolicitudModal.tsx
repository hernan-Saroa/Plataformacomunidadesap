import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Calculator,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  DollarSign,
  Eye,
  FileText,
  Plane,
  PlaneTakeoff,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import {
  Comisionado,
  Dependencia,
  DocumentoFormItem,
  DocumentoSoporte,
  FormNuevaSolicitud,
  Geopolitica,
  SolicitudComisionResponse,
  TicketValidationResult,
  TipoTransporteTiquete,
} from '../types/viaticos';
import { ConfigTipoComisionado } from '../types/parametrizacion';
import viaticosService from '../services/api/viaticosService';
import { authService } from '../services/api/authService';
import SearchableSelect, { SearchableSelectOption } from './SearchableSelect';
import LiquidacionPanel from './LiquidacionPanel';
import TicketBudgetWidget from './TicketBudgetWidget';
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
  /** Usuario elevado según el backend de viáticos (mismo flag que usa
   * `ViaticosModulePremium` desde `obtenerSolicitudes()`). Si se entrega,
   * es la fuente autoritativa para decidir si se muestra el catálogo
   * completo de dependencias. */
  esSuperAdmin?: boolean;
}

interface UsuarioContexto {
  esSuperAdmin: boolean;
  dependencia: {
    idDependencia?: number;
    codDependencia?: string;
    nomDependencia?: string;
  } | null;
}

const PASOS = ['Comisionado', 'Objeto y Destino', 'Documentos', 'Confirmación'];

/**
 * Detecta por rol si el usuario es SUPER_ADMIN (o variantes normalizadas
 * como SUPERADMIN / SUPER_ADMINISTRADOR). Es un respaldo cuando el shell
 * no ha entregado aún el flag `esSuperAdmin` del backend de viáticos.
 */
const tieneRolSuperAdmin = (roles: string[] = []): boolean =>
  roles.some((r) => {
    const limpio = String(r).replace(/[^a-zA-Z]/g, '').toUpperCase();
    return limpio.includes('SUPER') && limpio.includes('ADMIN');
  });

export default function NuevaSolicitudModal({ abierta, onCerrar, onSolicitudCreada, solicitudAResumir, esSuperAdmin }: Props) {
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
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [cargandoDependencias, setCargandoDependencias] = useState(false);
  // Departamento al que pertenecen las ciudades cargadas (evita recargarlas al
  // navegar de vuelta o reanudar; garantiza que se carguen cuando hacen falta).
  const [ciudadesDepto, setCiudadesDepto] = useState('');
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(false);
  const [cargandoCiudades, setCargandoCiudades] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<{
    userId: string;
    username: string;
    roles?: string[];
    dependencia?: {
      idDependencia?: number;
      codDependencia?: string;
      nomDependencia?: string;
    } | null;
  } | null>(null);
  const [esSuperAdminViaticos, setEsSuperAdminViaticos] = useState(false);
  const [cargandoUsuario, setCargandoUsuario] = useState(false);
  const [parametrizacion, setParametrizacion] = useState<ConfigTipoComisionado | null>(null);
  const [cargandoParametrizacion, setCargandoParametrizacion] = useState(false);
  const [documentosFaltantes, setDocumentosFaltantes] = useState<string[]>([]);
  const [solicitudBorrador, setSolicitudBorrador] = useState<SolicitudComisionResponse | null>(null);
  const [checklist, setChecklist] = useState<{ obligatorios: Array<{ codigo: string; nombre: string; descripcion: string | null }>; opcionales: Array<{ codigo: string; nombre: string; descripcion: string | null }> } | null>(null);
  const [cargandoChecklist, setCargandoChecklist] = useState(false);
  const [subiendoDocs, setSubiendoDocs] = useState(false);
  const [errorDocumentos, setErrorDocumentos] = useState<string | null>(null);
  const [eliminandoDoc, setEliminandoDoc] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    nombre: string;
  } | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [categoriaInvestigador, setCategoriaInvestigador] = useState<string>('ASOCIADO');
  const [aplicaExcepcionRegional, setAplicaExcepcionRegional] = useState(false);
  const [asignacionesBasicasText, setAsignacionesBasicasText] = useState('');
  const [asignacionesBasicas, setAsignacionesBasicas] = useState<number[]>([]);
  const refTokenCiudades = useRef(0);

  // ========== Estado RF-LIQ-003 / RF-LIQ-004 (tiquetes y presupuesto) ==========
  const [tipoTransporte, setTipoTransporte] = useState<TipoTransporteTiquete>('AEREO');
  const [montoEstimadoTiquete, setMontoEstimadoTiquete] = useState<number>(0);
  const [origenCiudad, setOrigenCiudad] = useState<string>('Bogotá');
  const [dependenciaId, setDependenciaId] = useState<string>('');
  const [validacionTiquete, setValidacionTiquete] = useState<TicketValidationResult | null>(null);
  const [validandoTiquete, setValidandoTiquete] = useState(false);
  const [numeroActoExcepcion, setNumeroActoExcepcion] = useState('');
  const [soporteExcepcionPdf, setSoporteExcepcionPdf] = useState<{
    nombre: string;
    tamano: number;
    base64: string;
  } | null>(null);
  const [subiendoExcepcion, setSubiendoExcepcion] = useState(false);
  const [errorExcepcion, setErrorExcepcion] = useState<string | null>(null);
  const refTokenValidacionTiquete = useRef(0);

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

  const cargarDependencias = async (ctx: UsuarioContexto) => {
    // Usuario elevado (superadmin según el backend de viáticos): ve el
    // catálogo completo de dependencias para elegir la solicitante.
    if (ctx.esSuperAdmin) {
      setCargandoDependencias(true);
      try {
        const data = await viaticosService.obtenerDependencias();
        setDependencias(data);
        // Si el valor actual no existe en el catálogo (caso normal al abrir
        // el modal vacío o al reanudar), seleccionamos la primera activa.
        if (data.length > 0) {
          const existe = data.some((d) => d.codDependencia === dependenciaId);
          if (!existe) {
            setDependenciaId(data[0].codDependencia);
          }
        }
      } catch (e) {
        console.error('Error cargando dependencias:', e);
        setDependencias([]);
      } finally {
        setCargandoDependencias(false);
      }
      return;
    }

    // Cualquier otro rol: el campo queda bloqueado a la dependencia asociada
    // a su persona. Nunca se muestra el catálogo ni se permite cambiarla.
    setDependencias([]);
    setCargandoDependencias(false);
    let codPropio = ctx.dependencia?.codDependencia || '';
    let nomPropio = ctx.dependencia?.nomDependencia || '';
    const idPropio = ctx.dependencia?.idDependencia;

    // Si la sesión sólo trajo idDependencia numérica (sin el objeto anidado
    // con codDependencia), la resolvemos contra el catálogo para poder
    // mostrarla y enviarla al validar tiquetes.
    if (!codPropio && idPropio != null) {
      setCargandoDependencias(true);
      try {
        const catalogo = await viaticosService.obtenerDependencias();
        const match = catalogo.find(
          (d) => Number(d.idDependencia) === Number(idPropio),
        );
        if (match) {
          codPropio = match.codDependencia;
          nomPropio = match.nomDependencia;
        }
      } catch (e) {
        console.error('Error resolviendo la dependencia del usuario:', e);
      } finally {
        setCargandoDependencias(false);
      }
    }

    if (codPropio) {
      setDependenciaId(codPropio);
      // Refleja el código/nombre resuelto para el campo bloqueado.
      setUsuarioActual((prev) =>
        prev
          ? {
              ...prev,
              dependencia: {
                ...(prev.dependencia || {}),
                codDependencia: codPropio,
                nomDependencia: nomPropio || prev.dependencia?.nomDependencia || '',
              },
            }
          : prev,
      );
    }
  };

  const cargarUsuarioActual = async (): Promise<UsuarioContexto> => {
    setCargandoUsuario(true);
    try {
      const usuario = await authService.getCurrentUser();
      if (usuario) {
        const dependencia = usuario.person?.dependencia
          ? {
            idDependencia: usuario.person.dependencia.idDependencia,
            codDependencia: usuario.person.dependencia.codDependencia,
            nomDependencia: usuario.person.dependencia.nomDependencia,
          }
          : null;
        // Respaldo por rol (se complementa con el flag del backend de
        // viáticos en el efecto de apertura del modal).
        const superAdmin = tieneRolSuperAdmin(usuario.roles);
        setUsuarioActual({
          userId: usuario.userId,
          username: usuario.username,
          roles: usuario.roles,
          dependencia,
        });
        return { esSuperAdmin: superAdmin, dependencia };
      }
      setUsuarioActual(null);
      return { esSuperAdmin: false, dependencia: null };
    } catch (e) {
      console.error('Error cargando usuario actual:', e);
      setUsuarioActual(null);
      return { esSuperAdmin: false, dependencia: null };
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
        id: d.id,
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
      setCiudadesDepto('');
      setUsuarioActual(null);
      setEsSuperAdminViaticos(false);
      setCargandoUsuario(false);
      setParametrizacion(null);
      setDocumentosFaltantes([]);
      setSolicitudBorrador(null);
      setChecklist(null);
      setSubiendoDocs(false);
      setEliminandoDoc(false);
      setPreviewDoc(null);
      setFinalizando(false);
      setCategoriaInvestigador('ASOCIADO');
      setAplicaExcepcionRegional(false);
      setAsignacionesBasicasText('');
      setAsignacionesBasicas([]);
      setTipoTransporte('AEREO');
      setMontoEstimadoTiquete(0);
      setOrigenCiudad('Bogotá');
      setDependenciaId('');
      setValidacionTiquete(null);
      setValidandoTiquete(false);
      setNumeroActoExcepcion('');
      setSoporteExcepcionPdf(null);
      setErrorExcepcion(null);
      void cargarDepartamentos();
      // La carga de dependencias depende del rol: primero resolvemos el
      // usuario y su dependencia asociada. El usuario elevado —superadmin
      // según el backend de viáticos (el mismo flag que usa
      // `ViaticosModulePremium` desde `obtenerSolicitudes()`) o por rol
      // SUPER_ADMIN— ve el catálogo completo; el resto queda bloqueado a la
      // dependencia de su persona. El contexto resuelto se pasa directo a
      // `cargarDependencias` para evitar lecturas de estado ajenas a su
      // render (stale closure) que todavía están en null/false la primera
      // vez que se abre el modal.
      void (async () => {
        const ctx = await cargarUsuarioActual();
        const superAdmin = ctx.esSuperAdmin || esSuperAdmin === true;
        setEsSuperAdminViaticos(superAdmin);
        await cargarDependencias({ ...ctx, esSuperAdmin: superAdmin });
      })();
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

  const actualizarAsignacionBasica = (indice: number, valor: number) => {
    setAsignacionesBasicas((prev) => {
      const nueva = [...prev];
      nueva[indice] = valor;
      return nueva;
    });
  };

  const agregarAsignacionBasica = () => {
    setAsignacionesBasicas((prev) => [...prev, 0]);
  };

  const eliminarAsignacionBasica = (indice: number) => {
    setAsignacionesBasicas((prev) => prev.filter((_, i) => i !== indice));
  };

  const obtenerAsignacionesBasicasValidas = (): number[] => {
    return asignacionesBasicas.filter((v) => Number.isFinite(v) && v > 0);
  };

  const documentosObligatoriosLista = (parametrizacion?.documentos ?? [])
    .filter((d) => d.tipoRequisito === 'OBLIGATORIO')
    .map((d) => d.tipoDocumentoSoporte?.codigo)
    .filter((codigo): codigo is string => Boolean(codigo));

  const manejarCambioDepartamento = (nombre: string) => {
    actualizar('destinoDepartamento', nombre);
    actualizar('destinoCiudad', '');
    // La carga de ciudades la centraliza el efecto sobre destinoDepartamento.
    setCiudades([]);
    setCiudadesDepto('');
  };

  // Carga las ciudades del departamento seleccionado cuando hace falta (al
  // cambiar de departamento, al reanudar una solicitud o al volver atrás con el
  // departamento ya definido). No recarga si ya están cargadas para ese depto.
  useEffect(() => {
    const nombreDepto = (form.destinoDepartamento || '').trim();
    if (!nombreDepto) {
      setCiudades([]);
      setCiudadesDepto('');
      return;
    }
    if (ciudadesDepto === nombreDepto) return;

    const depto = departamentos.find((d) => d.nomDivGeopolitica.trim() === nombreDepto);
    if (!depto) return;

    const codigoDepto = Number(depto.codDepartamento ?? depto.codGeopolitica ?? depto.idGeopolitica);
    const token = ++refTokenCiudades.current;
    setCargandoCiudades(true);
    void viaticosService
      .obtenerCiudadesPorDepartamento(codigoDepto)
      .then((data) => {
        if (token === refTokenCiudades.current) {
          setCiudades(data || []);
          setCiudadesDepto(nombreDepto);
        }
      })
      .catch((e) => {
        if (token === refTokenCiudades.current) {
          console.error('Error cargando ciudades:', e);
          setCiudades([]);
          setCiudadesDepto(nombreDepto);
        }
      })
      .finally(() => {
        if (token === refTokenCiudades.current) {
          setCargandoCiudades(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.destinoDepartamento, departamentos, ciudadesDepto]);

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

  // RF-LIQ-003/004 — Validación reactiva de ruta restringida y saldo
  // presupuestal de tiquetes. Se ejecuta cada vez que el usuario cambia
  // algún dato que pueda alterar la decisión (ruta, transporte, monto,
  // dependencia). Sólo se dispara si requiere tiquetes.
  useEffect(() => {
    if (!form.requiereTiquetes) {
      setValidacionTiquete(null);
      return;
    }
    if (!form.destinoCiudad || !origenCiudad || !dependenciaId) {
      return;
    }
    if (!Number.isFinite(montoEstimadoTiquete) || montoEstimadoTiquete <= 0) {
      // Sin monto estimado no podemos calcular la reserva con holgura.
      return;
    }
    const token = ++refTokenValidacionTiquete.current;
    setValidandoTiquete(true);
    void viaticosService
      .validarTiquete({
        dependenciaId,
        origenCiudad,
        destinoCiudad: form.destinoCiudad,
        tipoTransporte,
        montoEstimadoTiquete,
      })
      .then((res) => {
        if (token === refTokenValidacionTiquete.current) {
          setValidacionTiquete(res);
          // Regla: si el saldo está en cero y el usuario eligió aéreo,
          // forzamos terrestre. Para desactivar el bloqueo el usuario
          // debe aportar una excepción firmada por Dirección Nacional.
          if (res.force_land_transport && tipoTransporte === 'AEREO') {
            setTipoTransporte('TERRESTRE');
          }
        }
      })
      .finally(() => {
        if (token === refTokenValidacionTiquete.current) {
          setValidandoTiquete(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.requiereTiquetes,
    form.destinoCiudad,
    origenCiudad,
    dependenciaId,
    tipoTransporte,
    montoEstimadoTiquete,
  ]);

  useEffect(() => {
    if (!previewDoc) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [previewDoc]);

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
      // RF-LIQ-003/004 — Bloquea avance si requiere excepción y no se
      // aportó el PDF firmado por Dirección Nacional o Sindicato.
      if (
        form.requiereTiquetes &&
        validacionTiquete &&
        (validacionTiquete.requires_route_exception ||
          validacionTiquete.requires_budget_exception) &&
        (!numeroActoExcepcion.trim() || !soporteExcepcionPdf)
      ) {
        setErrorValidacion(
          'Debe registrar el número de acto de excepción y adjuntar el PDF firmado por Dirección Nacional o Sindicato antes de continuar.',
        );
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
      const payload = mapearARequestCreacion(
        form,
        comisionado,
        usuarioActual?.userId || '',
        true,
        form.tipoComision || 'TERRESTRE',
      );
      if (solicitudBorrador) {
        // Ya existe un borrador: actualizar los campos editables (fechas,
        // destino, montos, etc.) para no perder los cambios al volver atrás.
        const actualizada = await viaticosService.actualizarSolicitud(
          solicitudBorrador.id,
          {
            objetoComision: form.objetoComision,
            destinoCiudad: form.destinoCiudad,
            destinoDepartamento: form.destinoDepartamento,
            fechaInicio: form.fechaInicio,
            fechaFin: form.fechaFin,
            rubroPresupuestal: form.rubroPresupuestal,
            prioridad: form.prioridad,
            requiereTiquetes: form.requiereTiquetes,
            montoViaticos: form.montoViaticos,
            montoGastosViaje: form.montoGastosViaje,
            diasComision: form.diasComision,
            tipoComision: form.esInternacional ? 'INTERNACIONAL' : (form.tipoComision || 'TERRESTRE'),
            esInternacional: Boolean(form.esInternacional),
          },
        );
        setSolicitudBorrador({
          ...actualizada,
          comisionado: solicitudBorrador.comisionado,
          documentosSoporte: (actualizada.documentosSoporte ||
            solicitudBorrador.documentosSoporte ||
            []) as DocumentoSoporte[],
        });
      } else {
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

  const abrirPrevisualizacion = (doc: DocumentoFormItem) => {
    const url = viaticosService.obtenerUrlArchivo(doc.urlRepositorio);
    if (!url) {
      setErrorDocumentos('No hay una URL de acceso para este documento.');
      return;
    }
    setPreviewDoc({
      url,
      nombre: doc.nombreArchivoOriginal || doc.tipoDocumento,
    });
  };

  /**
   * RF-LIQ-003 — Carga el PDF de excepción firmado por Dirección Nacional
   * o Sindicato. Convierte el archivo a base64 para transportarlo dentro
   * del formulario y poder enviarlo al backend cuando se radique la
   * solicitud.
   */
  const cargarSoporteExcepcion = async (archivo: File) => {
    setErrorExcepcion(null);
    if (!esPdfMime(archivo.type) && !esPdfMime(inferirTipoMime(archivo.name))) {
      setErrorExcepcion('El soporte de excepción debe estar en formato PDF.');
      return;
    }
    if (archivo.size > 50 * 1024 * 1024) {
      setErrorExcepcion('El archivo excede el tamaño máximo permitido (50 MB).');
      return;
    }
    setSubiendoExcepcion(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(archivo);
      });
      setSoporteExcepcionPdf({
        nombre: archivo.name,
        tamano: archivo.size,
        base64,
      });
    } catch (e) {
      console.error('Error leyendo PDF de excepción:', e);
      setErrorExcepcion('No fue posible leer el archivo. Intente nuevamente.');
    } finally {
      setSubiendoExcepcion(false);
    }
  };

  const eliminarDocumentoEspecifico = async (doc: DocumentoFormItem) => {
    if (!solicitudBorrador) {
      setErrorDocumentos('No hay una solicitud activa para gestionar documentos.');
      return;
    }
    if (!doc.id) {
      // Sin id persistido: solo se quita del estado local.
      setForm((prev) => ({
        ...prev,
        documentos: (prev.documentos || []).filter((d) => d !== doc),
      }));
      return;
    }
    setEliminandoDoc(true);
    setErrorDocumentos(null);
    try {
      await viaticosService.eliminarDocumento(solicitudBorrador.id, doc.id);
      setForm((prev) => ({
        ...prev,
        documentos: (prev.documentos || []).filter((d) => d.id !== doc.id),
      }));
    } catch (e) {
      console.error('Error eliminando documento:', e);
      setErrorDocumentos('No fue posible eliminar el documento. Intente nuevamente.');
    } finally {
      setEliminandoDoc(false);
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
    if (
      form.requiereTiquetes &&
      validacionTiquete &&
      (validacionTiquete.requires_route_exception ||
        validacionTiquete.requires_budget_exception) &&
      (!numeroActoExcepcion.trim() || !soporteExcepcionPdf)
    ) {
      setErrorValidacion(
        'Debe registrar el número de acto de excepción y adjuntar el PDF firmado por Dirección Nacional o Sindicato antes de radicar.',
      );
      return;
    }
    setFinalizando(true);
    setErrorValidacion(null);
    try {
      // RF-LIQ-003/004 — Registra la excepción firmada antes de radicar
      // para que la trazabilidad quede asociada a la solicitud.
      if (
        form.requiereTiquetes &&
        validacionTiquete &&
        (validacionTiquete.requires_route_exception ||
          validacionTiquete.requires_budget_exception)
      ) {
        await viaticosService.registrarExcepcionTiquete({
          solicitudId: solicitudBorrador.id,
          tipoExcepcion: validacionTiquete.requires_route_exception
            ? 'RUTA_CORTA'
            : 'PRESUPUESTO_AGOTADO',
          autorizadoPor: 'DIRECTOR_NACIONAL',
          numeroDocumentoSoporte: numeroActoExcepcion.trim(),
          documentoSoporteUrl: soporteExcepcionPdf?.base64,
          comentarios: `Generada automáticamente al radicar la solicitud ${solicitudBorrador.consecutivoUnico}`,
        });
      }
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
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Valores de la Comisión
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <p className="text-[10px] text-slate-400 mt-1">Valor total estimado de viáticos</p>
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
                        <p className="text-[10px] text-slate-400 mt-1">Tiquetes, alojamiento, alimentación, etc.</p>
                      </div>
                    )}
                  </div>

                  {!esCampoOculto('diasComision') && (
                    <div className="max-w-[200px]">
                      <label className={labelCls} htmlFor="diasComision">
                        {renderLabel('diasComision', 'Días de comisión')}
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                        <input
                          id="diasComision"
                          type="text"
                          inputMode="numeric"
                          required={esCampoObligatorio('diasComision')}
                          value={form.diasComision || calcularDiasComision(form.fechaInicio, form.fechaFin)}
                          onChange={(e) => actualizar('diasComision', Number(soloNumeros(e.target.value)) || 0)}
                          className={`${inputCls} pl-9 text-right font-bold`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Se calcula automáticamente desde las fechas</p>
                    </div>
                  )}

                  {(form.montoViaticos > 0 || form.montoGastosViaje > 0) && (
                    <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                      <span className="text-xs font-bold text-slate-600">Total estimado</span>
                      <span className="text-sm font-black text-slate-800">
                        {formatearMoneda(form.montoViaticos + form.montoGastosViaje)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {comisionado?.tipoComisionado === 'INVESTIGADOR' && (
                <div>
                  <label className={labelCls} htmlFor="categoriaInvestigador">
                    Categoría de Investigador
                  </label>
                  <SearchableSelect
                    id="categoriaInvestigador"
                    options={[
                      { value: 'JUNIOR', label: 'Junior' },
                      { value: 'ASOCIADO', label: 'Asociado' },
                      { value: 'SENIOR', label: 'Senior' },
                    ]}
                    value={categoriaInvestigador}
                    onChange={(valor) => setCategoriaInvestigador(valor)}
                    placeholder="Seleccione categoría"
                  />
                </div>
              )}

              {comisionado?.tipoComisionado && !esCampoOculto('destinoDepartamento') && (
                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicaExcepcionRegional}
                    onChange={(e) => setAplicaExcepcionRegional(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
                  />
                  Aplica excepción regional (Art. 5 Decreto 314 de 2026)
                </label>
              )}

              {comisionado?.tipoComisionado && !esCampoOculto('montoViaticos') && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-4 h-4 text-slate-500" />
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Asignaciones Básicas Mensuales
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Ingrese los salarios del comisionado. Para liquidación de doble rol, agregue ambos salarios. Se usará el mayor para el cálculo.
                  </p>

                  <div className="space-y-2">
                    {asignacionesBasicas.length === 0 && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Salario básico mensual</label>
                        <div className="relative max-w-xs">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value=""
                            onChange={(e) => {
                              const val = Number(soloNumeros(e.target.value)) || 0;
                              setAsignacionesBasicas([val]);
                            }}
                            className={`${inputCls} pl-7 text-right font-bold`}
                          />
                        </div>
                      </div>
                    )}

                    {asignacionesBasicas.length > 0 && (
                      <div className="space-y-2">
                        {asignacionesBasicas.map((valor, idx) => (
                          <div key={idx} className="max-w-xs">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                              {idx === 0 ? 'Salario básico mensual' : `Salario ${idx + 1} (doble rol)`}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={valor ? formatearMoneda(valor) : ''}
                                onChange={(e) => {
                                  const val = Number(soloNumeros(e.target.value)) || 0;
                                  actualizarAsignacionBasica(idx, val);
                                }}
                                className={`${inputCls} pl-7 pr-8 text-right font-bold`}
                              />
                              {asignacionesBasicas.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => eliminarAsignacionBasica(idx)}
                                  className="absolute right-2 top-2 text-slate-400 hover:text-red-500"
                                  title="Eliminar salario"
                                  aria-label="Eliminar salario"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={agregarAsignacionBasica}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg text-[11px] font-bold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar salario (doble rol)
                      </button>

                      {obtenerAsignacionesBasicasValidas().length > 1 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                          <Calculator className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Mayor salario: <strong>{formatearMoneda(Math.max(...obtenerAsignacionesBasicasValidas()))}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <LiquidacionPanel
                fechaInicio={form.fechaInicio}
                fechaFin={form.fechaFin}
                tipoComisionado={comisionado?.tipoComisionado || ''}
                destinoCiudad={form.destinoCiudad}
                destinoDepartamento={form.destinoDepartamento}
                aplicaExcepcionRegional={aplicaExcepcionRegional}
                categoriaInvestigador={categoriaInvestigador}
                asignacionesBasicas={obtenerAsignacionesBasicasValidas()}
                onAplicarValor={(monto, dias) => {
                  actualizar('montoViaticos', monto);
                  actualizar('diasComision', dias);
                }}
              />

               {!esCampoOculto('requiereTiquetes') && (
                 <div className="space-y-3">
                   <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                     <input
                       type="checkbox"
                       checked={form.requiereTiquetes}
                       onChange={(e) => actualizar('requiereTiquetes', e.target.checked)}
                       className="w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
                     />
                     {esCampoObligatorio('requiereTiquetes') ? 'La comisión requiere tiquetes aéreos / pasajes *' : 'La comisión requiere tiquetes aéreos / pasajes'}
                   </label>

                   {form.requiereTiquetes && (
                     <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                       <div className="flex items-center gap-2">
                         <PlaneTakeoff className="w-4 h-4 text-slate-500" />
                         <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                           Tiquetes y disponibilidad presupuestal (RF-LIQ-003/004)
                         </p>
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         <div>
                           <label className={labelCls} htmlFor="origenCiudad">
                             Ciudad de origen
                           </label>
                           <input
                             id="origenCiudad"
                             type="text"
                             value={origenCiudad}
                             onChange={(e) => setOrigenCiudad(e.target.value)}
                             placeholder="Bogotá"
                             className={inputCls}
                           />
                         </div>
                          <div>
                            <label className={labelCls} htmlFor="dependenciaId">
                              Dependencia solicitante
                            </label>
                            {esSuperAdminViaticos ? (
                              <>
                                <SearchableSelect
                                  id="dependenciaId"
                                  options={dependencias.map((dep) => ({
                                    value: dep.codDependencia,
                                    label: `${dep.codDependencia} — ${dep.nomDependencia}`,
                                  }))}
                                  value={dependenciaId}
                                  onChange={(valor) => setDependenciaId(valor)}
                                  placeholder="Seleccione dependencia..."
                                  disabled={cargandoDependencias}
                                  loading={cargandoDependencias}
                                  emptyText={cargandoDependencias ? 'Cargando...' : 'No hay dependencias disponibles'}
                                />
                                {cargandoDependencias && (
                                  <p className="text-[11px] text-slate-400 mt-1">Cargando dependencias...</p>
                                )}
                              </>
                            ) : (
                              <>
                                <div
                                  id="dependenciaId"
                                  className={`${inputCls} bg-slate-50 cursor-not-allowed flex items-center justify-between`}
                                  aria-readonly="true"
                                >
                                  <span className="truncate">
                                    {dependenciaId
                                      ? `${dependenciaId}${usuarioActual?.dependencia?.nomDependencia ? ` — ${usuarioActual.dependencia.nomDependencia}` : ''}`
                                      : 'Sin dependencia asignada a su usuario'}
                                  </span>
                                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-2">
                                    Automática
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  Su dependencia se asigna automáticamente desde su perfil y no puede modificarse.
                                </p>
                              </>
                            )}
                          </div>
                         <div>
                           <label className={labelCls} htmlFor="tipoTransporte">
                             Tipo de transporte
                           </label>
                           <SearchableSelect
                             id="tipoTransporte"
                             options={[
                               { value: 'AEREO', label: 'Aéreo' },
                               { value: 'TERRESTRE', label: 'Terrestre' },
                             ]}
                             value={tipoTransporte}
                             onChange={(valor) => setTipoTransporte(valor as TipoTransporteTiquete)}
                             placeholder="Seleccione transporte"
                           />
                           {validacionTiquete?.force_land_transport && (
                             <p className="text-[10px] text-red-600 font-semibold mt-1 flex items-start gap-1">
                               <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                               Transporte aéreo bloqueado: el saldo de la dependencia está en cero. Aporte excepción firmada por Dirección Nacional para reactivar la opción aérea.
                             </p>
                           )}
                         </div>
                         <div>
                           <label className={labelCls} htmlFor="montoEstimadoTiquete">
                             Costo estimado del tiquete (COP)
                           </label>
                           <div className="relative">
                             <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                             <input
                               id="montoEstimadoTiquete"
                               type="text"
                               inputMode="numeric"
                               placeholder="450000"
                               value={montoEstimadoTiquete ? formatearMoneda(montoEstimadoTiquete) : ''}
                               onChange={(e) =>
                                 setMontoEstimadoTiquete(Number(soloNumeros(e.target.value)) || 0)
                               }
                               className={`${inputCls} pl-7 text-right font-bold`}
                             />
                           </div>
                         </div>
                       </div>

                       <TicketBudgetWidget
                         validacion={validacionTiquete}
                         cargando={validandoTiquete}
                         montoEstimadoDisplay={formatearMoneda(montoEstimadoTiquete)}
                       />

                       {(validacionTiquete?.requires_route_exception ||
                         validacionTiquete?.requires_budget_exception) && (
                         <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                           <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                             Soporte de excepción requerido
                           </p>
                           <p className="text-[11px] text-amber-800 leading-relaxed">
                             {validacionTiquete.requires_route_exception
                               ? 'La ruta seleccionada es restringida. Adjunte el PDF de excepción firmado por Dirección Nacional o Sindicato.'
                               : 'El saldo de la dependencia no alcanza para cubrir el tiquete con la holgura de mercado. Adjunte el PDF de excepción firmado por Dirección Nacional.'}
                           </p>
                           <div>
                             <label className={labelCls} htmlFor="numeroActoExcepcion">
                               Número de acto / resolución de excepción *
                             </label>
                             <input
                               id="numeroActoExcepcion"
                               type="text"
                               required
                               value={numeroActoExcepcion}
                               onChange={(e) => setNumeroActoExcepcion(e.target.value.toUpperCase())}
                               placeholder="Resolución 023-2026"
                               className={inputCls}
                             />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                               PDF de soporte firmado por Dirección Nacional o Sindicato *
                             </label>
                             {soporteExcepcionPdf ? (
                               <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-lg px-3 py-2">
                                 <div className="min-w-0">
                                   <p className="text-xs font-bold text-emerald-700 truncate">
                                     {soporteExcepcionPdf.nombre}
                                   </p>
                                   <p className="text-[10px] text-slate-500">
                                     {(soporteExcepcionPdf.tamano / 1024).toFixed(1)} KB · PDF
                                   </p>
                                 </div>
                                 <button
                                   type="button"
                                   onClick={() => setSoporteExcepcionPdf(null)}
                                   className="text-red-500 hover:text-red-700"
                                   title="Quitar soporte"
                                 >
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             ) : (
                               <label className="px-3 py-1.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors">
                                 <input
                                   type="file"
                                   accept="application/pdf"
                                   hidden
                                   onChange={(e) => {
                                     const file = e.target.files?.[0];
                                     if (file) void cargarSoporteExcepcion(file);
                                   }}
                                 />
                                 {subiendoExcepcion ? 'Cargando…' : 'Adjuntar PDF'}
                               </label>
                             )}
                           </div>
                           {errorExcepcion && (
                             <p className="text-[11px] text-red-700 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                               {errorExcepcion}
                             </p>
                           )}
                         </div>
                       )}
                     </div>
                   )}
                 </div>
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
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-xs">{doc.nombre}</p>
                            <p className="text-[10px] text-slate-400">{doc.codigo}</p>
                            {doc.descripcion && (
                              <p className="text-[10px] text-slate-400">{doc.descripcion}</p>
                            )}
                          </div>
                          {faltan ? (
                            <label className="px-3 py-1.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0">
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
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="w-3 h-3" /> Cargado
                                {noPdf && (
                                  <span className="text-red-600">(no PDF)</span>
                                )}
                              </span>
                              <button
                                type="button"
                                title="Eliminar y volver a subir"
                                aria-label="Eliminar documento"
                                disabled={eliminandoDoc}
                                onClick={() => cargados[0] && void eliminarDocumentoEspecifico(cargados[0])}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        {cargados.map((d) => (
                          <div key={d.id} className="flex items-center justify-between gap-2 mt-1">
                            <p className="text-[10px] text-slate-500 truncate">
                              {d.nombreArchivoOriginal} · {d.tipoMime}
                            </p>
                            <button
                              type="button"
                              title="Previsualizar PDF"
                              aria-label="Previsualizar documento"
                              onClick={() => abrirPrevisualizacion(d)}
                              className="p-1 rounded-md text-[#003DA5] hover:bg-blue-50 transition-colors shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-xs">{doc.nombre}</p>
                            <p className="text-[10px] text-slate-400">{doc.codigo}</p>
                          </div>
                          {faltan ? (
                            <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0">
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
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="w-3 h-3" /> Cargado
                              </span>
                              <button
                                type="button"
                                title="Eliminar y volver a subir"
                                aria-label="Eliminar documento"
                                disabled={eliminandoDoc}
                                onClick={() => cargados[0] && void eliminarDocumentoEspecifico(cargados[0])}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        {cargados.map((d) => (
                          <div key={d.id} className="flex items-center justify-between gap-2 mt-1">
                            <p className="text-[10px] text-slate-500 truncate">
                              {d.nombreArchivoOriginal} · {d.tipoMime}
                            </p>
                            <button
                              type="button"
                              title="Previsualizar PDF"
                              aria-label="Previsualizar documento"
                              onClick={() => abrirPrevisualizacion(d)}
                              className="p-1 rounded-md text-[#003DA5] hover:bg-blue-50 transition-colors shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
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

      {previewDoc &&
        createPortal(
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-3 sm:p-6">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{previewDoc.nombre}</p>
                    <p className="text-xs text-slate-400">Previsualización de documento PDF</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 hover:bg-slate-50"
                  >
                    <Download className="w-4 h-4" /> Abrir
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    aria-label="Cerrar previsualización"
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 bg-slate-100 overflow-hidden">
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.nombre}
                  className="w-full border-0 bg-white"
                  style={{ flex: '1 1 0', minHeight: 0 }}
                  tabIndex={0}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
