import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  Calculator,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  DollarSign,
  Eye,
  FileText,
  MapPin,
  Plane,
  PlaneTakeoff,
  Bus,
  Plus,
  Route,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Clock,
  User,
  Building2,
  BadgeCheck,
  IdCard,
  Briefcase,
  Mail,
  Phone,
  Wallet,
  Landmark,
  CreditCard,
  Coins,
  Check,
  Upload,
  ArrowLeftRight,
  X,
} from 'lucide-react';
import {
  Cargo,
  CargoComisionado,
  Comisionado,
  CuentaBancariaComisionado,
  Dependencia,
  DocumentoFormItem,
  DocumentoSoporte,
  ESTADOS_CONSOLIDABLES,
  FormNuevaSolicitud,
  Geopolitica,
  ResultadoConsolidacion,
  RutaItinerario,
  SaldoTiquete,
  SolicitudComisionResponse,
  SolicitudPendiente023,
  TicketValidationResult,
  TipoTransporteTiquete,
} from '../types/viaticos';
import { ConfigTipoComisionado, CampoFormulario } from '../types/parametrizacion';
import viaticosService from '../services/api/viaticosService';
import { authService } from '../services/api/authService';
import SearchableSelect, { SearchableSelectOption } from './SearchableSelect';
import VisorDocumentosFlotante, { useVisorDocumentos } from './VisorDocumentosFlotante';
import LiquidacionPanel from './LiquidacionPanel';
import TicketBudgetWidget from './TicketBudgetWidget';
import ConsolidacionExpediente from './ConsolidacionExpediente';
import ItinerarioBuilder from './ItinerarioBuilder';
import FirmaDigitalViaticosModal, { FirmaDigitalData } from './FirmaDigitalViaticosModal';
import { useFestivos } from '../hooks/useFestivos';
import {
  AYUDA_OBJETO_SIIF,
  calcularDiasComision,
  construirRutaGeneral,
  contarDiasHabilesEntre,
  esDiaHabil,
  esPdfMime,
  formatearDiasComision,
  formatearMoneda,
  formatearNombreComisionado,
  getConfigEstado,
  hoyISO,
  inferirTipoMime,
  formInicialNuevaSolicitud,
  mapearARequestCreacion,
  obtenerAyudaValidacionDocumento,
  sanitizeObjetoComision,
  soloNumeros,
  sincronizarItinerarioFormulario,
  validarAnticipacionRadicacion,
  validarFechasSolicitud,
  validarSecuenciaItinerario,
  siguienteDiaISO,
} from '../utils/viaticosUtils';

interface Props {
  abierta: boolean;
  onCerrar: () => void;
  onSolicitudCreada: (solicitud: SolicitudComisionResponse) => void;
  /**
   * Callback de consolidación (RF-LIQ-004): se dispara cuando un expediente en
   * estado RADICADA/EXTEMPORANEA/DEVUELTA se consolida con éxito (→ SOLICITADO).
   * El padre refresca la bandeja y muestra el mensaje de éxito.
   */
  onSolicitudConsolidada?: (resultado: ResultadoConsolidacion) => void;
  solicitudAResumir?: SolicitudComisionResponse | null;
  /** Usuario elevado según el backend de viáticos (mismo flag que usa
   * `ViaticosModulePremium` desde `obtenerSolicitudes()`). Si se entrega,
   * es la fuente autoritativa para decidir si se muestra el catálogo
   * completo de dependencias. */
  esSuperAdmin?: boolean;
}

interface UsuarioContexto {
  dependencia: {
    idDependencia?: number;
    codDependencia?: string;
    nomDependencia?: string;
  } | null;
  esSuperAdmin?: boolean;
}

const PASOS = ['Comisionado', 'Objeto y Destino', 'Documentos', 'Confirmación'];

const camposEstandar = new Set([
  'documentoComisionado',
  'objetoComision',
  'destinoCiudad',
  'destinoDepartamento',
  'fechaInicio',
  'fechaFin',
  'prioridad',
  'rubroPresupuestal',
  'numeroCdp',
  'fechaCdp',
  'requiereTiquetes',
  'montoViaticos',
  'montoGastosViaje',
  'diasComision',
  'salarioBasico',
  'costoEstimadoTiquete',
  'tipoComision',
  'esInternacional',
]);

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

const puedeElegirDependencia = (): boolean => {
  const usuario = authService.getCurrentUserSync();
  if (usuario?.esAdmin) return true;
  if (tieneRolSuperAdmin(usuario?.roles)) return true;
  return authService.hasPermission('travel_expenses:manage_config');
};

const LISTA_BANCOS_COLOMBIA = [
  'BANCOLOMBIA',
  'BANCO DE BOGOTÁ',
  'DAVIVIENDA',
  'BBVA COLOMBIA',
  'BANCO DE OCCIDENTE',
  'BANCO POPULAR',
  'BANCO AGRARIO DE COLOMBIA',
  'BANCO CAJA SOCIAL',
  'BANCO AV VILLAS',
  'SCOTIABANK COLPATRIA',
  'BANCO ITAÚ',
  'BANCO PICHINCHA',
  'BANCOOMEVA',
  'BANCO FALABELLA',
  'NEQUI',
  'DAVIPLATA',
  'DALE',
];

export default function NuevaSolicitudModal({ abierta, onCerrar, onSolicitudCreada, onSolicitudConsolidada, solicitudAResumir, esSuperAdmin }: Props) {
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState<FormNuevaSolicitud>(formInicialNuevaSolicitud());
  const [comisionado, setComisionado] = useState<Comisionado | null>(null);
  const [solicitudesPendientes023, setSolicitudesPendientes023] = useState<SolicitudPendiente023[]>([]);
  const [consultando, setConsultando] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [habeasPendiente, setHabeasPendiente] = useState(false);
  const [habeasMarcado, setHabeasMarcado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { festivos } = useFestivos();
  // Historial de cuentas bancarias y selección
  const [cuentaBancariaSeleccionadaId, setCuentaBancariaSeleccionadaId] = useState<string>('');
  const [alertaAnticipacion, setAlertaAnticipacion] = useState<{
    extemporanea: boolean;
    diasHabiles: number;
    radicadoFueraJornada: boolean;
  } | null>(null);
  const [alertaSolapamiento, setAlertaSolapamiento] = useState<{
    mensaje: string;
    solicitudConflicto?: any | null;
    claveFechas: string;
    permitirContinuar: boolean;
  } | null>(null);
  const [departamentos, setDepartamentos] = useState<Geopolitica[]>([]);
  const [ciudades, setCiudades] = useState<Geopolitica[]>([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [cargandoDependencias, setCargandoDependencias] = useState(false);
  const [cargosDisponibles, setCargosDisponibles] = useState<Cargo[]>([]);
  const [cargandoCargos, setCargandoCargos] = useState(false);
  const [cargoActualSeleccionado, setCargoActualSeleccionado] = useState<string>('');
  const [modoCambiarCargo, setModoCambiarCargo] = useState<boolean>(false);
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
  const [camposCatalogo, setCamposCatalogo] = useState<CampoFormulario[]>([]);
  const [cargandoParametrizacion, setCargandoParametrizacion] = useState(false);
  const [documentosFaltantes, setDocumentosFaltantes] = useState<string[]>([]);
  const [solicitudBorrador, setSolicitudBorrador] = useState<SolicitudComisionResponse | null>(null);
  const [checklist, setChecklist] = useState<{
    obligatorios: Array<{ codigo: string; nombre: string; descripcion: string | null; instruccionesValidacion?: string | null; camposAValidar?: string[] }>;
    opcionales: Array<{ codigo: string; nombre: string; descripcion: string | null; instruccionesValidacion?: string | null; camposAValidar?: string[] }>;
  } | null>(null);
  const [cargandoChecklist, setCargandoChecklist] = useState(false);
  const [subiendoDocs, setSubiendoDocs] = useState(false);
  const [errorDocumentos, setErrorDocumentos] = useState<string | null>(null);
  const [eliminandoDoc, setEliminandoDoc] = useState(false);
  const {
    documentosVisor,
    abrirDocumentoVisor,
    cerrarDocumentoVisor,
    cerrarTodosVisores,
  } = useVisorDocumentos();
  const [finalizando, setFinalizando] = useState(false);
  // Firma Digital OTP Enlace (estándar institucional ESAP)
  const [modalFirmaEnlaceAbierta, setModalFirmaEnlaceAbierta] = useState(false);
  const [solicitandoOtpEnlace, setSolicitandoOtpEnlace] = useState(false);
  const [otpDataEnlace, setOtpDataEnlace] = useState<{
    verificationId?: string;
    emailEnviadoA?: string;
    devCode?: string;
  } | null>(null);
  const [categoriaInvestigador, setCategoriaInvestigador] = useState<string>('ASOCIADO');
  const [asignacionesBasicasText, setAsignacionesBasicasText] = useState('');
  const [asignacionesBasicas, setAsignacionesBasicas] = useState<number[]>([]);
  const refTokenCiudades = useRef(0);

  // ========== Estado RF-LIQ-003 / RF-LIQ-004 (tiquetes y presupuesto) ==========
  const [tipoTransporte, setTipoTransporte] = useState<TipoTransporteTiquete>('AEREO');
  const [montoEstimadoTiquete, setMontoEstimadoTiquete] = useState<number>(0);
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

  // ========== Estado RF-LIQ-005 (Saldo Presupuestal por Dependencia - Informativo) ==========
  const [saldosPresupuesto, setSaldosPresupuesto] = useState<SaldoTiquete[]>([]);
  const [cargandoSaldosPresupuesto, setCargandoSaldosPresupuesto] = useState(false);

  const cargarSaldosPresupuesto = async () => {
    setCargandoSaldosPresupuesto(true);
    try {
      if (typeof viaticosService.obtenerSaldosTiquetes === 'function') {
        const data = await viaticosService.obtenerSaldosTiquetes();
        setSaldosPresupuesto(data || []);
      }
    } catch (e) {
      console.error('Error cargando saldos presupuestales:', e);
      setSaldosPresupuesto([]);
    } finally {
      setCargandoSaldosPresupuesto(false);
    }
  };

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

  const cargarDependencias = async (depUsuario?: { codDependencia?: string; nomDependencia?: string; idDependencia?: number } | null) => {
    setCargandoDependencias(true);
    try {
      const data = await viaticosService.obtenerDependencias();
      setDependencias(data || []);

      const dep = depUsuario || usuarioActual?.dependencia;
      let codPropio = dep?.codDependencia || '';
      let nomPropio = dep?.nomDependencia || '';
      const idPropio = dep?.idDependencia;

      if (!codPropio && idPropio != null && data && data.length > 0) {
        const match = data.find((d) => Number(d.idDependencia) === Number(idPropio));
        if (match) {
          codPropio = match.codDependencia;
          nomPropio = match.nomDependencia;
        }
      }

      if (puedeElegirDependencia()) {
        if (data && data.length > 0) {
          const existe = data.some(
            (d) => d.codDependencia === dependenciaId || String(d.idDependencia) === String(dependenciaId),
          );
          if (!existe && !dependenciaId) {
            setDependenciaId(codPropio || data[0].codDependencia);
          }
        }
      } else if (codPropio) {
        setDependenciaId(codPropio);
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
    } catch (e) {
      console.error('Error cargando dependencias:', e);
      setDependencias([]);
    } finally {
      setCargandoDependencias(false);
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
        const superAdmin = tieneRolSuperAdmin(usuario.roles);
        setUsuarioActual({
           userId: usuario.userId,
           username: usuario.username,
           roles: usuario.roles,
           dependencia,
         });
         return { dependencia, esSuperAdmin: superAdmin };
       }
       setUsuarioActual(null);
       return { dependencia: null };
     } catch (e) {
       console.error('Error cargando usuario actual:', e);
       setUsuarioActual(null);
       return { dependencia: null };
     } finally {
       setCargandoUsuario(false);
     }
   };

  const cargarParametrizacion = async () => {
    setCargandoParametrizacion(true);
    try {
      const data = await viaticosService.obtenerParametrizacionFormulario();
      if (data) {
        if (data.campos) {
          setCamposCatalogo(data.campos);
          // Inicializar cualquier campo BOOLEAN / CHECKBOX en false si aún no tiene valor en el form
          setForm((prev) => {
            const nuevosAdic = { ...(prev.camposAdicionales || {}) };
            let huboCambio = false;
            data.campos.forEach((c) => {
              const tipo = (c.tipoCampo || '').toUpperCase();
              if (
                (tipo === 'BOOLEAN' || tipo === 'CHECKBOX') &&
                (nuevosAdic[c.clave] === undefined || nuevosAdic[c.clave] === null)
              ) {
                nuevosAdic[c.clave] = false;
                huboCambio = true;
              }
            });
            return huboCambio ? { ...prev, camposAdicionales: nuevosAdic } : prev;
          });
        }
        if (comisionado?.tipoComisionado) {
          const config = data.configuraciones?.[comisionado.tipoComisionado];
          setParametrizacion(config ?? data.configuraciones?.DEFAULT ?? null);
        }
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
    const salarioBasico = Number(solicitud.salarioBasico || 0);
    const costoEstimadoTiquete = Number(solicitud.costoEstimadoTiquete || 0);
    setAsignacionesBasicas(salarioBasico > 0 ? [salarioBasico] : []);
    setMontoEstimadoTiquete(costoEstimadoTiquete);
    setForm({
      documentoComisionado: solicitud.comisionado?.numeroDocumento || '',
      comisionadoId: solicitud.comisionadoId || solicitud.comisionado?.id || '',
      objetoComision: solicitud.objetoComision || '',
      origenCiudad: solicitud.origenCiudad || solicitud.ciudadOrigen || solicitud.sedeOrigen || '',
      origenDepartamento: '',
      destinoCiudad: solicitud.destinoCiudad || '',
      destinoDepartamento: solicitud.destinoDepartamento || '',
      fechaInicio: solicitud.fechaInicio ? new Date(solicitud.fechaInicio).toISOString().slice(0, 10) : '',
      fechaFin: solicitud.fechaFin ? new Date(solicitud.fechaFin).toISOString().slice(0, 10) : '',
      rubroPresupuestal: solicitud.rubroPresupuestal || '',
      numeroCdp: (solicitud as any).numeroCdp || '',
      fechaCdp: (solicitud as any).fechaCdp || '',
      prioridad: (solicitud.prioridad as any) || 'MEDIA',
      requiereTiquetes: Boolean(solicitud.requiereTiquetes),
      montoViaticos: Number(solicitud.montoViaticos || 0),
      montoGastosViaje: Number(solicitud.montoGastosViaje || 0),
      diasComision: solicitud.diasComision ?? 1,
      salarioBasico,
      costoEstimadoTiquete,
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
      camposAdicionales: (() => {
        const raw = (solicitud as any).camposAdicionales || (solicitud as any).campos_adicionales || {};
        const bco = raw.entidad_bancaria || raw.entidadBancaria || raw.banco || '';
        const cta = raw.num_cuenta || raw.numeroCuenta || raw.numCuenta || raw.cuentaBancaria || '';
        const tip = raw.tipo_cuenta || raw.tipoCuenta || '';
        const cargoEncontrado = raw.cargoEsap || raw.cargo || raw.cargoInstitucional || raw.cargoComisionado || solicitud.comisionado?.cargo || '';
        if (cargoEncontrado) {
          setCargoActualSeleccionado(cargoEncontrado);
        }
        return {
          ...raw,
          ...(cargoEncontrado ? { cargoEsap: cargoEncontrado, cargo: cargoEncontrado, cargoInstitucional: cargoEncontrado, cargoComisionado: cargoEncontrado } : {}),
          ...(bco ? { entidad_bancaria: bco, entidadBancaria: bco, banco: bco } : {}),
          ...(cta ? { num_cuenta: cta, numeroCuenta: cta, numCuenta: cta, cuentaBancaria: cta } : {}),
          ...(tip ? { tipo_cuenta: tip, tipoCuenta: tip } : {}),
        };
      })(),
      itinerario: solicitud.itinerario || [],
      idDependencia: (solicitud as any).idDependencia ?? solicitud.comisionado?.idDependencia ?? undefined,
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
      setSolicitudesPendientes023([]);
      setConsultando(false);
      setErrorConsulta(null);
      setErrorValidacion(null);
      setHabeasPendiente(false);
      setHabeasMarcado(false);
      setEnviando(false);
      setAlertaAnticipacion(null);
      setAlertaSolapamiento(null);
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
      cerrarTodosVisores();
      setFinalizando(false);
      setCategoriaInvestigador('ASOCIADO');
      setAsignacionesBasicasText('');
      setAsignacionesBasicas([]);
      setTipoTransporte('AEREO');
      setMontoEstimadoTiquete(0);
      setDependenciaId('');
      setCargoActualSeleccionado('');
      setCargosDisponibles([]);
      setCargandoCargos(false);
      setValidacionTiquete(null);
      setValidandoTiquete(false);
      setNumeroActoExcepcion('');
      setSoporteExcepcionPdf(null);
      setErrorExcepcion(null);
      void cargarDepartamentos();
      void cargarParametrizacion();
      void cargarSaldosPresupuesto();
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
        const superAdmin = ctx.esSuperAdmin || authService.hasPermission('travel_expenses:manage_config');
        setEsSuperAdminViaticos(superAdmin);

        if (!puedeElegirDependencia() && ctx.dependencia?.codDependencia) {
          setDependenciaId(ctx.dependencia.codDependencia);
        }

        await cargarDependencias(ctx.dependencia);
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

  const actualizar = (campo: keyof FormNuevaSolicitud, valor: string | boolean | number | RutaItinerario[]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const actualizarCampoAdicional = (clave: string, valor: any) => {
    setForm((prev) => {
      const campoDef = camposCatalogo.find((c) => c.clave === clave);
      const tipo = (campoDef?.tipoCampo || '').toUpperCase();
      const esBool =
        tipo === 'BOOLEAN' ||
        tipo === 'CHECKBOX' ||
        clave === 'obligacion_tributaria' ||
        clave === 'esFacturadorElectronico';
      const valorFinal = esBool ? Boolean(valor) : valor;

      const nextAdicionales: Record<string, any> = {
        ...(prev.camposAdicionales || {}),
        [clave]: valorFinal,
      };
      if (
        clave === 'cargoEsap' ||
        clave === 'cargo' ||
        clave === 'cargoInstitucional' ||
        clave === 'cargoComisionado'
      ) {
        nextAdicionales.cargoEsap = valor;
        nextAdicionales.cargo = valor;
        nextAdicionales.cargoInstitucional = valor;
        nextAdicionales.cargoComisionado = valor;
        setCargoActualSeleccionado(String(valor || ''));
      } else if (clave === 'entidad_bancaria' || clave === 'entidadBancaria' || clave === 'banco') {
        nextAdicionales.entidad_bancaria = valor;
        nextAdicionales.entidadBancaria = valor;
        nextAdicionales.banco = valor;
      } else if (
        clave === 'num_cuenta' ||
        clave === 'numeroCuenta' ||
        clave === 'numCuenta' ||
        clave === 'cuentaBancaria' ||
        clave === 'numero_cuenta'
      ) {
        nextAdicionales.num_cuenta = valor;
        nextAdicionales.numeroCuenta = valor;
        nextAdicionales.numCuenta = valor;
        nextAdicionales.cuentaBancaria = valor;
        nextAdicionales.numero_cuenta = valor;
      } else if (clave === 'tipo_cuenta' || clave === 'tipoCuenta') {
        nextAdicionales.tipo_cuenta = valor;
        nextAdicionales.tipoCuenta = valor;
      }

      const ctaSync: CuentaBancariaComisionado | undefined =
        nextAdicionales.entidadBancaria && nextAdicionales.numeroCuenta
          ? {
              banco: nextAdicionales.entidadBancaria,
              tipoCuenta: nextAdicionales.tipoCuenta || 'AHORROS',
              numeroCuenta: nextAdicionales.numeroCuenta,
              urlCertificadoBancario: nextAdicionales.urlCertificadoBancario || null,
              nombreArchivoCertificado: nextAdicionales.nombreArchivoCertificado || null,
            }
          : undefined;

      return {
        ...prev,
        cuentaBancariaSeleccionada: ctaSync !== undefined ? ctaSync : prev.cuentaBancariaSeleccionada,
        camposAdicionales: nextAdicionales,
      };
    });
  };

  /**
   * Resuelve el id numérico de la dependencia activa para consultar cargos (N:M auth.dependencias_cargos).
   */
  const idDependenciaActual: number | null = useMemo(() => {
    if (form.idDependencia != null && form.idDependencia !== '') {
      const n = Number(form.idDependencia);
      if (!isNaN(n) && n > 0) return n;
    }
    if (comisionado?.idDependencia != null) {
      const n = Number(comisionado.idDependencia);
      if (!isNaN(n) && n > 0) return n;
    }
    if (dependenciaId) {
      const match = dependencias.find(
        (d) =>
          d.codDependencia === dependenciaId ||
          String(d.idDependencia) === String(dependenciaId),
      );
      if (match?.idDependencia != null) return Number(match.idDependencia);
      const parsed = parseInt(dependenciaId, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (usuarioActual?.dependencia?.idDependencia != null) {
      const n = Number(usuarioActual.dependencia.idDependencia);
      if (!isNaN(n) && n > 0) return n;
    }
    return null;
  }, [form.idDependencia, comisionado?.idDependencia, dependenciaId, dependencias, usuarioActual?.dependencia]);

  // Cargar cargos asignados a la dependencia seleccionada (N:M auth.dependencias_cargos)
  useEffect(() => {
    if (!idDependenciaActual) {
      setCargosDisponibles([]);
      setCargandoCargos(false);
      return;
    }

    let isSubscribed = true;
    setCargandoCargos(true);

    viaticosService
      .obtenerCargosPorDependencia(idDependenciaActual)
      .then((cargos) => {
        if (isSubscribed) {
          setCargosDisponibles(cargos || []);
        }
      })
      .catch((err) => {
        console.error('Error cargando cargos de la dependencia:', err);
        if (isSubscribed) setCargosDisponibles([]);
      })
      .finally(() => {
        if (isSubscribed) setCargandoCargos(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [idDependenciaActual]);

  const cambiarDependencia = (idDep: number | string | null) => {
    const numId = idDep ? Number(idDep) : null;
    const depEncontrada = dependencias.find((d) => Number(d.idDependencia) === numId);

    setForm((prev) => {
      const prevAdic = { ...(prev.camposAdicionales || {}) };
      delete prevAdic.cargoEsap;
      delete prevAdic.cargo;
      delete prevAdic.cargoInstitucional;
      delete prevAdic.cargoComisionado;
      delete prevAdic.idCargo;

      return {
        ...prev,
        idDependencia: numId,
        camposAdicionales: prevAdic,
      };
    });

    if (depEncontrada?.codDependencia) {
      setDependenciaId(depEncontrada.codDependencia);
    } else if (numId) {
      setDependenciaId(String(numId));
    } else {
      setDependenciaId('');
    }

    setCargoActualSeleccionado('');
  };

  const cambiarCargo = (cargoVal: string | null) => {
    const nomCargo = (cargoVal || '').trim();
    setCargoActualSeleccionado(nomCargo);

    // Buscar si el cargo está en los cargos registrados del comisionado con su salario relacional
    const cargoComisionado = (comisionado?.cargos || []).find(
      (c) => c.cargo?.trim().toLowerCase() === nomCargo.toLowerCase(),
    );

    const cargoObj = cargosDisponibles.find(
      (c) => c.nomCargo === nomCargo || String(c.idCargo) === nomCargo,
    );
    const nombreFinal = cargoObj ? cargoObj.nomCargo : nomCargo;
    const idCargoFinal = cargoObj ? cargoObj.idCargo : undefined;

    // Salario relacional asociado: si el cargo tiene salario registrado en el comisionado, usarlo
    let salarioAsociado = form.salarioBasico || 0;
    if (cargoComisionado && cargoComisionado.salario > 0) {
      salarioAsociado = Number(cargoComisionado.salario);
    }

    setForm((prev) => {
      const nextAdic = {
        ...(prev.camposAdicionales || {}),
        cargoEsap: nombreFinal,
        cargo: nombreFinal,
        cargoInstitucional: nombreFinal,
        cargoComisionado: nombreFinal,
        ...(idCargoFinal ? { idCargo: idCargoFinal } : {}),
      };
      return {
        ...prev,
        salarioBasico: salarioAsociado,
        cargoSeleccionado: {
          idCargo: idCargoFinal,
          cargo: nombreFinal,
          salario: salarioAsociado,
        },
        camposAdicionales: nextAdic,
      };
    });
  };

  const seleccionarCuentaBancaria = (cta: CuentaBancariaComisionado) => {
    setCuentaBancariaSeleccionadaId(cta.id || 'cta-sel');

    setForm((prev) => {
      const adic = {
        ...(prev.camposAdicionales || {}),
        entidad_bancaria: cta.banco,
        entidadBancaria: cta.banco,
        banco: cta.banco,
        tipo_cuenta: cta.tipoCuenta,
        tipoCuenta: cta.tipoCuenta,
        num_cuenta: cta.numeroCuenta,
        numeroCuenta: cta.numeroCuenta,
        numCuenta: cta.numeroCuenta,
        cuentaBancaria: cta.numeroCuenta,
        ...(cta.urlCertificadoBancario ? { urlCertificadoBancario: cta.urlCertificadoBancario } : {}),
      };

      let docsActualizados = [...(prev.documentos || [])];
      if (cta.urlCertificadoBancario) {
        const tieneDocCert = docsActualizados.some((d) => d.tipoDocumento === 'CERT_BANCARIA');
        if (!tieneDocCert) {
          docsActualizados.push({
            id: `doc-cert-${Date.now()}`,
            tipoDocumento: 'CERT_BANCARIA',
            nombreArchivoOriginal: cta.nombreArchivoCertificado || `certificacion_bancaria_${cta.banco}.pdf`,
            nombreArchivoSeguro: `cert_${Date.now()}.pdf`,
            urlRepositorio: cta.urlCertificadoBancario,
            tipoMime: 'application/pdf',
          });
        }
      }

      return {
        ...prev,
        cuentaBancariaSeleccionada: cta,
        camposAdicionales: adic,
        documentos: docsActualizados,
      };
    });
  };

  const esCampoActivo = (clave: string): boolean => {
    const definido = camposCatalogo.find((c) => c.clave === clave);
    if (definido && definido.activo === false) {
      return false;
    }
    return true;
  };

  const esCampoObligatorio = (clave: string): boolean => {
    if (!esCampoActivo(clave)) return false;
    if (!parametrizacion) return true;
    return parametrizacion.camposObligatorios.includes(clave);
  };

  const esCampoOpcional = (clave: string): boolean => {
    if (!esCampoActivo(clave)) return false;
    if (!parametrizacion) return false;
    return parametrizacion.camposOpcionales.includes(clave);
  };

  const esCampoOculto = (clave: string): boolean => {
    if (!esCampoActivo(clave)) return true;
    if (!parametrizacion) return false;
    return parametrizacion.camposOcultos.includes(clave);
  };

  const actualizarAsignacionBasica = (indice: number, valor: number) => {
    setAsignacionesBasicas((prev) => {
      const nueva = [...prev];
      nueva[indice] = valor;
      const validas = nueva.filter((v) => Number.isFinite(v) && v > 0);
      if (validas.length > 0) {
        setForm((f) => ({ ...f, salarioBasico: Math.max(...validas) }));
      } else {
        setForm((f) => ({ ...f, salarioBasico: 0 }));
      }
      return nueva;
    });
  };

  const agregarAsignacionBasica = () => {
    setAsignacionesBasicas((prev) => {
      const nueva = [...prev, 0];
      const validas = nueva.filter((v) => Number.isFinite(v) && v > 0);
      if (validas.length > 0) {
        setForm((f) => ({ ...f, salarioBasico: Math.max(...validas) }));
      } else {
        setForm((f) => ({ ...f, salarioBasico: 0 }));
      }
      return nueva;
    });
  };

  const eliminarAsignacionBasica = (indice: number) => {
    setAsignacionesBasicas((prev) => {
      const nueva = prev.filter((_, i) => i !== indice);
      const validas = nueva.filter((v) => Number.isFinite(v) && v > 0);
      if (validas.length > 0) {
        setForm((f) => ({ ...f, salarioBasico: Math.max(...validas) }));
      } else {
        setForm((f) => ({ ...f, salarioBasico: 0 }));
      }
      return nueva;
    });
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
    setSolicitudesPendientes023([]);
    setHabeasPendiente(false);
    setHabeasMarcado(false);
    try {
      const resultado = await viaticosService.consultarComisionado(documento);
      if (!resultado) {
        setErrorConsulta(
          `No se encontró un comisionado con documento ${documento} en ESAP. Verifique el número o contacte al administrador.`,
        );
        return;
      }
      setComisionado(resultado);
      const pendientes = resultado.solicitudesPendientes || [];
      setSolicitudesPendientes023(pendientes);

      // Cuentas bancarias del comisionado
      const cuentas: CuentaBancariaComisionado[] = Array.isArray(resultado.cuentasBancarias)
        ? [...resultado.cuentasBancarias]
        : [];

      const resAny = resultado as any;
      const ctaPlana =
        resAny.num_cuenta ||
        resAny.numeroCuenta ||
        resAny.numCuenta ||
        resAny.NUM_CUENTA_1 ||
        resAny.cuentaBancaria ||
        resAny.cuenta;
      const bcoPlano =
        resAny.entidad_bancaria ||
        resAny.entidadBancaria ||
        resAny.banco ||
        resAny.COD_CUENTA_1 ||
        resAny.nombreBanco;
      const tipPlano =
        resAny.tipo_cuenta ||
        resAny.tipoCuenta ||
        resAny.TIP_CUENTA_1 ||
        'AHORROS';
      const certPlano =
        resAny.urlCertificadoBancario ||
        resAny.url_certificado_bancario ||
        null;

      if (cuentas.length === 0 && ctaPlana && bcoPlano) {
        cuentas.push({
          id: 'cta-default',
          banco: bcoPlano,
          tipoCuenta: tipPlano,
          numeroCuenta: ctaPlana,
          urlCertificadoBancario: certPlano,
          esPrincipal: true,
        });
      }

      let ctaInicial: CuentaBancariaComisionado | null = null;
      if (cuentas.length > 0) {
        ctaInicial = cuentas.find((c) => c.esPrincipal) || cuentas[0];
        setCuentaBancariaSeleccionadaId(ctaInicial.id || 'cta-0');
      } else {
        setCuentaBancariaSeleccionadaId('');
      }

      // Cargos e historial de salario relacional
      const cargosCom: CargoComisionado[] = Array.isArray(resultado.cargos)
        ? [...resultado.cargos]
        : [];

      const cargoComisionado =
        resultado.cargo ||
        resAny.cargoComisionado ||
        resAny.cargoInstitucional ||
        resAny.cargoEsap ||
        (cargosCom.length > 0 ? cargosCom[0].cargo : '') ||
        '';

      const cargoObj = cargosCom.find(
        (c) => c.cargo?.trim().toLowerCase() === cargoComisionado?.trim().toLowerCase(),
      ) || (cargosCom.length > 0 ? cargosCom[0] : null);

      let salarioInicial =
        resultado.salarioBasico != null && Number(resultado.salarioBasico) > 0
          ? Number(resultado.salarioBasico)
          : 0;

      if (cargoObj && cargoObj.salario > 0) {
        salarioInicial = Number(cargoObj.salario);
      }

      if (salarioInicial > 0) {
        setAsignacionesBasicas([salarioInicial]);
      }

      setForm((prev) => {
        const nuevosCamposAdicionales = { ...(prev.camposAdicionales || {}) };
        if (ctaInicial) {
          nuevosCamposAdicionales.num_cuenta = ctaInicial.numeroCuenta;
          nuevosCamposAdicionales.numeroCuenta = ctaInicial.numeroCuenta;
          nuevosCamposAdicionales.numCuenta = ctaInicial.numeroCuenta;
          nuevosCamposAdicionales.cuentaBancaria = ctaInicial.numeroCuenta;
          nuevosCamposAdicionales.entidad_bancaria = ctaInicial.banco;
          nuevosCamposAdicionales.entidadBancaria = ctaInicial.banco;
          nuevosCamposAdicionales.banco = ctaInicial.banco;
          nuevosCamposAdicionales.tipo_cuenta = ctaInicial.tipoCuenta;
          nuevosCamposAdicionales.tipoCuenta = ctaInicial.tipoCuenta;
          if (ctaInicial.urlCertificadoBancario) {
            nuevosCamposAdicionales.urlCertificadoBancario = ctaInicial.urlCertificadoBancario;
          }
        } else if (ctaPlana) {
          nuevosCamposAdicionales.num_cuenta = ctaPlana;
          nuevosCamposAdicionales.numeroCuenta = ctaPlana;
          nuevosCamposAdicionales.numCuenta = ctaPlana;
          nuevosCamposAdicionales.cuentaBancaria = ctaPlana;
          if (bcoPlano) {
            nuevosCamposAdicionales.entidad_bancaria = bcoPlano;
            nuevosCamposAdicionales.entidadBancaria = bcoPlano;
            nuevosCamposAdicionales.banco = bcoPlano;
          }
          if (tipPlano) {
            nuevosCamposAdicionales.tipo_cuenta = tipPlano;
            nuevosCamposAdicionales.tipoCuenta = tipPlano;
          }
        }

        if (resAny.numeroContrato || resAny.contrato) {
          nuevosCamposAdicionales.numeroContrato =
            nuevosCamposAdicionales.numeroContrato || resAny.numeroContrato || resAny.contrato;
        }

        if (cargoComisionado) {
          nuevosCamposAdicionales.cargoEsap = cargoComisionado;
          nuevosCamposAdicionales.cargo = cargoComisionado;
          nuevosCamposAdicionales.cargoInstitucional = cargoComisionado;
          nuevosCamposAdicionales.cargoComisionado = cargoComisionado;
        }

        // Sincronizar régimen de facturación electrónica del comisionado
        const facturadorInicial = Boolean(resultado.esFacturadorElectronico ?? false);
        nuevosCamposAdicionales.obligacion_tributaria = facturadorInicial;
        nuevosCamposAdicionales.esFacturadorElectronico = facturadorInicial;

        // Asegurar que todos los campos booleanos del catálogo tengan valor booleano explícito
        camposCatalogo.forEach((c) => {
          const tipo = (c.tipoCampo || '').toUpperCase();
          if (tipo === 'BOOLEAN' || tipo === 'CHECKBOX') {
            if (
              c.clave === 'obligacion_tributaria' ||
              c.clave === 'esFacturadorElectronico' ||
              c.clave.toLowerCase().includes('factura')
            ) {
              nuevosCamposAdicionales[c.clave] = facturadorInicial;
            } else if (
              nuevosCamposAdicionales[c.clave] === undefined ||
              nuevosCamposAdicionales[c.clave] === null
            ) {
              nuevosCamposAdicionales[c.clave] = false;
            }
          }
        });

        const docsActualizados = [...(prev.documentos || [])];
        if (ctaInicial?.urlCertificadoBancario) {
          const tieneDocCert = docsActualizados.some((d) => d.tipoDocumento === 'CERT_BANCARIA');
          if (!tieneDocCert) {
            docsActualizados.push({
              id: `doc-cert-${Date.now()}`,
              tipoDocumento: 'CERT_BANCARIA',
              nombreArchivoOriginal: ctaInicial.nombreArchivoCertificado || `certificacion_bancaria_${ctaInicial.banco}.pdf`,
              nombreArchivoSeguro: `cert_${Date.now()}.pdf`,
              urlRepositorio: ctaInicial.urlCertificadoBancario,
              tipoMime: 'application/pdf',
            });
          }
        }

        return {
          ...prev,
          comisionadoId: resultado.id,
          idDependencia: resultado.idDependencia ?? prev.idDependencia,
          salarioBasico: salarioInicial > 0 ? salarioInicial : prev.salarioBasico,
          cargoSeleccionado: cargoComisionado
            ? {
                idCargo: cargoObj?.idCargo,
                cargo: cargoComisionado,
                salario: salarioInicial,
              }
            : prev.cargoSeleccionado,
          cuentaBancariaSeleccionada: ctaInicial,
          camposAdicionales: nuevosCamposAdicionales,
          documentos: docsActualizados,
        };
      });

      if (cargoComisionado) {
        setCargoActualSeleccionado(cargoComisionado);
      }
      if (resultado.idDependencia != null) {
        const depEncontrada = dependencias.find((d) => Number(d.idDependencia) === Number(resultado.idDependencia));
        if (depEncontrada?.codDependencia) {
          setDependenciaId(depEncontrada.codDependencia);
        }
      }
      if (!resultado.autorizacionHabeasData) {
        setHabeasPendiente(true);
      }
    } catch (e: any) {
      console.error('Error consultando comisionado:', e);
      // Mensaje proveniente del backend (origen único ESAP).
      setErrorConsulta(
        e?.message ||
          'Ocurrió un error al consultar el comisionado. Intente nuevamente.',
      );
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
      const validacion = validarAnticipacionRadicacion(form.fechaInicio, festivos);
      setAlertaAnticipacion({
        extemporanea: validacion?.extemporanea ?? false,
        diasHabiles: validacion?.diasHabiles ?? 0,
        radicadoFueraJornada: validacion?.radicadoFueraJornada ?? false,
      });
    } else {
      setAlertaAnticipacion(null);
    }
  }, [paso, form.fechaInicio, festivos]);

  useEffect(() => {
    if (form.fechaInicio && form.fechaFin) {
      const dias = calcularDiasComision(form.fechaInicio, form.fechaFin);
      actualizar('diasComision', dias);
    }
  }, [form.fechaInicio, form.fechaFin]);

  // RF-ITIN — Sincronizar fechas y destino globales del formulario
  // cuando el itinerario cambia y tiene tramos guardados (Guardar Tramo).
  useEffect(() => {
    if (form.itinerario && form.itinerario.length > 0) {
      const rutasGuardadas = form.itinerario.filter(
        (r) =>
          r.guardada &&
          Boolean(r.fechaSalida && r.fechaLlegada && r.origenCiudad && r.destinoCiudad),
      );

      if (rutasGuardadas.length > 0) {
        const sync = sincronizarItinerarioFormulario(rutasGuardadas);
        const tieneAereo = rutasGuardadas.some((r) => r.tipoTransporte === 'AEREO');
        const algunRequiereTiquete = rutasGuardadas.some(
          (r) => r.requiereTiquete || r.tipoTransporte === 'AEREO',
        );
        const nuevoTipoTransporte: TipoTransporteTiquete = tieneAereo ? 'AEREO' : 'TERRESTRE';

        setTipoTransporte(nuevoTipoTransporte);

        setForm((prev) => ({
          ...prev,
          origenCiudad: sync.origenCiudad,
          origenDepartamento: sync.origenDepartamento,
          destinoCiudad: sync.destinoCiudad,
          destinoDepartamento: sync.destinoDepartamento,
          fechaInicio: sync.fechaInicio,
          fechaFin: sync.fechaFin,
          diasComision: sync.diasComision,
          montoGastosViaje: sync.totalGastosDesplazamiento,
          camposAdicionales: {
            ...(prev.camposAdicionales || {}),
            transporteTerminalAereo: sync.transporteTerminalesAereos,
            transporteTerrestre: sync.transporteTerrestreOtros,
          },
          requiereTiquetes: algunRequiereTiquete || prev.requiereTiquetes,
          tipoComision: prev.esInternacional ? 'INTERNACIONAL' : (prev.tipoComision === 'ACTO_ADMINISTRATIVO' ? 'ACTO_ADMINISTRATIVO' : 'TERRESTRE'),
        }));
      }
    }
  }, [form.itinerario]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, costoEstimadoTiquete: montoEstimadoTiquete }));
  }, [montoEstimadoTiquete]);

  useEffect(() => {
    const validas = asignacionesBasicas.filter(
      (v) => Number.isFinite(v) && v > 0,
    );
    if (validas.length > 0) {
      setForm((prev) => ({ ...prev, salarioBasico: Math.max(...validas) }));
    } else {
      setForm((prev) => ({ ...prev, salarioBasico: 0 }));
    }
  }, [asignacionesBasicas]);

  // RF-LIQ-003/004 — Validación reactiva de ruta restringida y saldo
  // presupuestal de tiquetes. Se ejecuta cada vez que el usuario cambia
  // algún dato que pueda alterar la decisión (ruta, transporte, monto,
  // dependencia). Sólo se dispara si requiere tiquetes.
  useEffect(() => {
    if (!form.requiereTiquetes) {
      setValidacionTiquete(null);
      return;
    }
    const { origenCiudad: origenItinerario, destinoCiudad: destinoItinerario } = obtenerOrigenDestinoItinerario();
    if (!destinoItinerario || !origenItinerario || !dependenciaId) {
      return;
    }
    const token = ++refTokenValidacionTiquete.current;
    setValidandoTiquete(true);
    void viaticosService
      .validarTiquete({
        dependenciaId,
        origenCiudad: origenItinerario,
        destinoCiudad: destinoItinerario,
        tipoTransporte,
        montoEstimadoTiquete: montoEstimadoTiquete || 0,
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
    form.itinerario,
    dependenciaId,
    tipoTransporte,
  ]);


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

  // Obtiene fechas desde el itinerario (fuente única de verdad)
  const obtenerFechasItinerario = (): { fechaInicio: string; fechaFin: string } => {
    if (!form.itinerario || form.itinerario.length === 0) {
      return { fechaInicio: hoyISO(), fechaFin: siguienteDiaISO() };
    }
    const sync = sincronizarItinerarioFormulario(form.itinerario);
    return { fechaInicio: sync.fechaInicio, fechaFin: sync.fechaFin };
  };

  // Obtiene origen/destino desde el itinerario
  const obtenerOrigenDestinoItinerario = (): { origenCiudad: string; origenDepartamento: string; destinoCiudad: string; destinoDepartamento: string } => {
    if (!form.itinerario || form.itinerario.length === 0) {
      return { origenCiudad: '', origenDepartamento: '', destinoCiudad: '', destinoDepartamento: '' };
    }
    const sync = sincronizarItinerarioFormulario(form.itinerario);
    return { origenCiudad: sync.origenCiudad, origenDepartamento: sync.origenDepartamento, destinoCiudad: sync.destinoCiudad, destinoDepartamento: sync.destinoDepartamento };
  };

  const validarCamposDinamicosObligatorios = (): string | null => {
    const obligatorios = camposCatalogo.filter(
      (c) => c.activo && !camposEstandar.has(c.clave) && !esCampoOculto(c.clave) && esCampoObligatorio(c.clave),
    );
    for (const campo of obligatorios) {
      const val = form.camposAdicionales?.[campo.clave];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        return `Por favor complete el campo obligatorio: "${campo.etiqueta}".`;
      }
    }
    return null;
  };

  const irPaso = (siguiente: number) => {
    if (siguiente === 2 && !tieneComisionadoAutorizado) return;
    if (siguiente === 3) {
      if (!form.itinerario || form.itinerario.length === 0) {
        setErrorValidacion('Debe configurar al menos un tramo en el itinerario.');
        return;
      }
      const tramosSinGuardar = form.itinerario.some((r) => !r.guardada);
      if (tramosSinGuardar) {
        setErrorValidacion(
          'Por favor guarde todos los tramos del itinerario haciendo clic en "Guardar Tramo" antes de continuar.',
        );
        return;
      }
      const valSecuencia = validarSecuenciaItinerario(form.itinerario);
      if (!valSecuencia.valida) {
        setErrorValidacion(valSecuencia.error || 'Secuencia del itinerario no válida.');
        return;
      }
      const { fechaInicio, fechaFin } = obtenerFechasItinerario();
      const error = validarFechasSolicitud(fechaInicio, fechaFin);
      if (error) {
        setErrorValidacion(error);
        return;
      }
      // ── Validación: origen ≠ destino ──────────────────────────────────────
      {
        const { origenCiudad: oc, destinoCiudad: dc } = obtenerOrigenDestinoItinerario();
        const normalizar = (s: string) =>
          s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if (oc && dc && normalizar(oc) === normalizar(dc)) {
          setErrorValidacion(
            `La ciudad de destino ("${dc}") no puede ser la misma que la de origen ("${oc}"). ` +
            'Si el itinerario tiene un tramo de regreso, el destino se calculará como el punto más alejado antes del retorno.',
          );
          return;
        }
      }
      const errCamposDinamicos = validarCamposDinamicosObligatorios();
      if (errCamposDinamicos) {
        setErrorValidacion(errCamposDinamicos);
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

  const guardarYBorrador = async (forzarContinuar = false) => {
    if (!form.itinerario || form.itinerario.length === 0) {
      setErrorValidacion('Debe registrar al menos un tramo en el itinerario.');
      return;
    }
    const valSecuencia = validarSecuenciaItinerario(form.itinerario);
    if (!valSecuencia.valida) {
      setErrorValidacion(valSecuencia.error || 'Secuencia del itinerario no válida.');
      return;
    }
    const { fechaInicio, fechaFin } = obtenerFechasItinerario();
    const error = validarFechasSolicitud(fechaInicio, fechaFin);
    if (error) {
      setErrorValidacion(error);
      return;
    }
    if (!comisionado) {
      setErrorValidacion('Debe consultar el comisionado antes de guardar.');
      return;
    }
    // ── Validación: origen ≠ destino ────────────────────────────────────────
    // La sincronización del itinerario ya aplica la lógica de ida-vuelta, pero
    // se agrega esta guarda adicional para detectar casos donde la ciudad de
    // destino calculada termina siendo igual a la de origen (p.ej. itinerarios
    // incompletos o con rutas de retorno sin tramo intermedio registrado).
    {
      const { origenCiudad: oc, destinoCiudad: dc } = obtenerOrigenDestinoItinerario();
      const normalizar = (s: string) =>
        s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      if (oc && dc && normalizar(oc) === normalizar(dc)) {
        setErrorValidacion(
          `La ciudad de destino ("${dc}") no puede ser la misma que la ciudad de origen ("${oc}"). ` +
          'Verifique el itinerario: si hay un tramo de regreso, el destino se calculará como el punto más alejado antes del retorno.',
        );
        return;
      }
    }
    const errCamposDinamicos = validarCamposDinamicosObligatorios();
    if (errCamposDinamicos) {
      setErrorValidacion(errCamposDinamicos);
      return;
    }

    // ── Validación de duplicidad / solapamiento por cédula y fechas ──────────
    // Al intentar guardar y continuar al cargue de soportes, se verifica duplicidad.
    // Si se detecta solapamiento, se alerta al usuario y NO se le deja continuar la primera vez.
    // Si el usuario decide continuar voluntariamente (segundo clic o botón explícito), puede continuar en borrador,
    // pero al final en la radicación el backend bloqueará la terminación definitiva.
    const claveFechasActual = `${comisionado.numeroDocumento}_${fechaInicio}_${fechaFin}`;
    if (!forzarContinuar) {
      const yaConfirmadoContinuar =
        alertaSolapamiento &&
        alertaSolapamiento.claveFechas === claveFechasActual &&
        alertaSolapamiento.permitirContinuar;

      if (!yaConfirmadoContinuar) {
        setEnviando(true);
        setErrorValidacion(null);
        try {
          const verif = await viaticosService.verificarSolapamiento(
            comisionado.numeroDocumento,
            fechaInicio,
            fechaFin,
            solicitudBorrador?.id,
          );
          if (verif.haySolapamiento) {
            setAlertaSolapamiento({
              mensaje:
                verif.mensaje ||
                'Se detectó duplicidad o solapamiento de fechas con otra solicitud del comisionado.',
              solicitudConflicto: verif.solicitudConflicto,
              claveFechas: claveFechasActual,
              permitirContinuar: true,
            });
            setErrorValidacion(
              verif.mensaje ||
                'Se detectó duplicidad o solapamiento de fechas con otra comisión existente del comisionado. Por seguridad, no puede continuar la primera vez; revise las fechas o confirme si desea continuar en modo borrador.',
            );
            setEnviando(false);
            return; // Bloquea y no deja continuar la primera vez
          } else {
            setAlertaSolapamiento(null);
          }
        } catch (eVerif) {
          console.warn('Error al verificar solapamiento:', eVerif);
        }
      }
    }

    setEnviando(true);
    setErrorValidacion(null);
    try {
      const { fechaInicio, fechaFin, diasComision } = sincronizarItinerarioFormulario(form.itinerario || []);
      const { origenCiudad, origenDepartamento, destinoCiudad, destinoDepartamento } = obtenerOrigenDestinoItinerario();
      const cargoFinal =
        cargoActualSeleccionado ||
        form.camposAdicionales?.cargoEsap ||
        form.camposAdicionales?.cargo ||
        comisionado?.cargo ||
        '';

      const payload = mapearARequestCreacion(
        {
          ...form,
          idDependencia: form.idDependencia ?? comisionado?.idDependencia ?? (idDependenciaActual || undefined),
          fechaInicio,
          fechaFin,
          diasComision,
          origenCiudad,
          origenDepartamento,
          destinoCiudad,
          destinoDepartamento,
          camposAdicionales: {
            ...(form.camposAdicionales || {}),
            obligacion_tributaria:
              form.camposAdicionales?.obligacion_tributaria !== undefined &&
              form.camposAdicionales?.obligacion_tributaria !== null
                ? Boolean(form.camposAdicionales.obligacion_tributaria)
                : Boolean(comisionado?.esFacturadorElectronico ?? false),
            ...(cargoFinal
              ? {
                  cargoEsap: cargoFinal,
                  cargo: cargoFinal,
                  cargoInstitucional: cargoFinal,
                  cargoComisionado: cargoFinal,
                }
              : {}),
          },
        },
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
            destinoCiudad,
            destinoDepartamento,
            fechaInicio,
            fechaFin,
            rubroPresupuestal: form.rubroPresupuestal,
            numeroCdp: form.numeroCdp?.trim() || undefined,
            fechaCdp: form.fechaCdp?.trim() || undefined,
            prioridad: form.prioridad,
            requiereTiquetes: form.requiereTiquetes,
            montoViaticos: form.montoViaticos,
            montoGastosViaje: form.montoGastosViaje,
            diasComision,
            salarioBasico: form.salarioBasico,
            costoEstimadoTiquete: form.costoEstimadoTiquete,
            cargo: cargoFinal || undefined,
            idCargo: cargoObj?.idCargo ?? undefined,
            tipoComision: (() => {
                if (form.esInternacional) return 'INTERNACIONAL';
                const tramos = form.itinerario || [];
                const tieneAereo = tramos.some((r) => r.tipoTransporte === 'AEREO');
                const tieneTerrestre = tramos.some((r) => r.tipoTransporte === 'TERRESTRE');
                if (tieneAereo && tieneTerrestre) return 'MIXTO';
                if (tieneAereo) return 'AEREO';
                return 'TERRESTRE';
              })(),
            esInternacional: Boolean(form.esInternacional),
            idDependencia: form.idDependencia ?? comisionado?.idDependencia ?? (idDependenciaActual || undefined),
            diasPernoctados: form.diasPernoctados ?? undefined,
            tarifaDiaPernoctado: form.tarifaDiaPernoctado ?? undefined,
            totalPernoctados: form.totalPernoctados ?? undefined,
            diasNoPernoctados: form.diasNoPernoctados ?? undefined,
            tarifaDiaNoPernoctado: form.tarifaDiaNoPernoctado ?? undefined,
            totalNoPernoctados: form.totalNoPernoctados ?? undefined,
            tarifaDiariaBase: form.tarifaDiariaBase ?? undefined,
            tarifaFinalAplicadaDia: form.tarifaFinalAplicadaDia ?? undefined,
            salarioBaseAplicado: form.salarioBaseAplicado ?? undefined,
            decretoAplicado: form.decretoAplicado ?? undefined,
            factorComisionado: form.factorComisionado ?? undefined,
            factorPernocta: form.factorPernocta ?? undefined,
            desgloseCalculo: form.desgloseCalculo ?? undefined,
            alertasLiquidacion: form.alertasLiquidacion ?? undefined,
            camposAdicionales: (() => {
              const prevAdic = form.camposAdicionales ?? {};
              const rawBanco =
                prevAdic.entidad_bancaria ||
                prevAdic.entidadBancaria ||
                prevAdic.banco ||
                '';
              const rawCuenta =
                prevAdic.num_cuenta ||
                prevAdic.numeroCuenta ||
                prevAdic.numCuenta ||
                prevAdic.cuentaBancaria ||
                '';
              const rawTipo =
                prevAdic.tipo_cuenta ||
                prevAdic.tipoCuenta ||
                '';
              return {
                ...prevAdic,
                ...(cargoFinal
                  ? {
                      cargoEsap: cargoFinal,
                      cargo: cargoFinal,
                      cargoInstitucional: cargoFinal,
                      cargoComisionado: cargoFinal,
                    }
                  : {}),
                ...(rawBanco ? { entidad_bancaria: rawBanco, entidadBancaria: rawBanco, banco: rawBanco } : {}),
                ...(rawCuenta ? { num_cuenta: rawCuenta, numeroCuenta: rawCuenta, numCuenta: rawCuenta, cuentaBancaria: rawCuenta } : {}),
                ...(rawTipo ? { tipo_cuenta: rawTipo, tipoCuenta: rawTipo } : {}),
                obligacion_tributaria:
                  prevAdic.obligacion_tributaria !== undefined && prevAdic.obligacion_tributaria !== null
                    ? Boolean(prevAdic.obligacion_tributaria)
                    : Boolean(comisionado?.esFacturadorElectronico ?? false),
                transporteTerminalAereo:
                  prevAdic.transporteTerminalAereo ??
                  (form.itinerario || []).reduce(
                    (acc, r) => acc + (r.tarifaTerminalAereo || 0),
                    0,
                  ),
                transporteTerrestre:
                  prevAdic.transporteTerrestre ??
                  Math.max(
                    0,
                    (form.montoGastosViaje || 0) -
                      (form.itinerario || []).reduce(
                        (acc, r) => acc + (r.tarifaTerminalAereo || 0),
                        0,
                      ),
                  ),
                fechaAutoliquidacion:
                  prevAdic.fechaAutoliquidacion ||
                  new Date().toISOString().split('T')[0],
              };
            })(),
            itinerario: (form.itinerario || []).map((r) => {
              const {
                guardada,
                origenDepartamentoId,
                destinoDepartamentoId,
                horaEstimadaLlegada,
                ...cleanRuta
              } = r;
              const horaViaje = r.horaEstimadaSalida || r.horarioEstimadoMilitar || '';
              return {
                ...cleanRuta,
                tarifaTerminalAereo: r.tarifaTerminalAereo,
                horaEstimadaSalida: horaViaje,
                horarioEstimadoMilitar: horaViaje,
              };
            }),
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
    } catch (e: any) {
      console.error('Error guardando borrador:', e);
      const msg = e?.response?.data?.message || e?.message;
      setErrorValidacion(
        Array.isArray(msg)
          ? msg.join(', ')
          : typeof msg === 'string' && msg.length > 0
            ? msg
            : 'No fue posible guardar el borrador. Verifique e intente nuevamente.',
      );
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
    abrirDocumentoVisor({
      url,
      nombre: doc.nombreArchivoOriginal || doc.tipoDocumento,
      tipo: doc.tipoDocumento,
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

  const obtenerNombreEnlace = () => {
    const user = authService.getCurrentUserSync?.() || (authService as any).getCurrentUser?.();
    const resolvedUser = user && typeof (user as any).then !== 'function' ? user : null;
    const nombre =
      (resolvedUser as any)?.fullName ||
      (resolvedUser as any)?.full_name ||
      [(resolvedUser as any)?.firstName, (resolvedUser as any)?.lastName].filter(Boolean).join(' ') ||
      [
        resolvedUser?.primerNombre,
        resolvedUser?.segundoNombre,
        resolvedUser?.primerApellido,
        resolvedUser?.segundoApellido,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      resolvedUser?.person?.full_name ||
      (resolvedUser?.person as any)?.nom_largo ||
      [
        (resolvedUser?.person as any)?.nom_tercero,
        (resolvedUser?.person as any)?.pri_apellido,
        (resolvedUser?.person as any)?.seg_apellido,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      resolvedUser?.nombre ||
      '';
    if (nombre && !nombre.includes('@')) return nombre.trim();
    return 'Enlace de Dependencia';
  };

  const finalizarSolicitud = async () => {
    const valSecuencia = validarSecuenciaItinerario(form.itinerario || []);
    if (!valSecuencia.valida) {
      setErrorValidacion(valSecuencia.error || 'Secuencia del itinerario no válida.');
      return;
    }
    const { fechaInicio, fechaFin } = obtenerFechasItinerario();
    const error = validarFechasSolicitud(fechaInicio, fechaFin);
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

    // Solicitar OTP para firma digital de elaboración del Enlace de Dependencia
    setSolicitandoOtpEnlace(true);
    setErrorValidacion(null);
    try {
      const resp = await viaticosService.solicitarOtpFirma(solicitudBorrador.id, {
        tipoFirma: 'ENLACE_ELABORO',
      });
      setOtpDataEnlace({
        verificationId: resp.verificationId,
        emailEnviadoA: resp.emailEnviadoA || resp.email,
        devCode: resp.devCode,
      });
      setModalFirmaEnlaceAbierta(true);
    } catch (e: any) {
      console.error('Error solicitando OTP de elaboración:', e);
      const mensaje =
        e?.response?.data?.message ||
        e?.message ||
        'No fue posible solicitar el código OTP de verificación. Verifique e intente nuevamente.';
      setErrorValidacion(
        Array.isArray(mensaje) ? mensaje.join(' ') : mensaje,
      );
    } finally {
      setSolicitandoOtpEnlace(false);
    }
  };

  // Manejo de firma digital completada por el Enlace (OTP validado + hash generado)
  const handleFirmaEnlaceCompleta = async (firma: FirmaDigitalData) => {
    if (!solicitudBorrador) return false;
    setFinalizando(true);
    setErrorValidacion(null);
    try {
      const user = authService.getCurrentUserSync?.() || (authService as any).getCurrentUser?.();
      const userDoc =
        (user as any)?.cedula ||
        (user as any)?.numeroDocumento ||
        (user as any)?.num_identificacion ||
        (user as any)?.person?.num_identificacion ||
        (user as any)?.person?.numeroDocumento ||
        undefined;

      const conFirmas = await viaticosService.solicitarFirmasAprobacion(solicitudBorrador.id, {
        otp: firma.codigoOtp,
        verificationId: otpDataEnlace?.verificationId,
        certificadoId: firma.certificado_id,
        hashSha256: firma.hash,
        nombreFirmante: firma.firmante,
        cargoFirmante: firma.cargo,
        documentoIdentidad: userDoc ? String(userDoc).trim() : undefined,
      });
      onSolicitudCreada(conFirmas);
      onCerrar();
      return true;
    } catch (e: any) {
      console.error('Error remitiendo con firma digital de elaboración:', e);
      const mensaje =
        e?.response?.data?.message ||
        e?.message ||
        'No fue posible registrar la firma digital de elaboración de la solicitud.';
      setErrorValidacion(
        Array.isArray(mensaje) ? mensaje.join(' ') : mensaje,
      );
      throw e;
    } finally {
      setFinalizando(false);
    }
  };

  const onSubmitFormulario = (e: FormEvent) => {
    e.preventDefault();
    void finalizarSolicitud();
  };

  const inputCls =
    'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] focus:bg-white transition-all shadow-xs';
  const labelCls = 'text-sm font-bold text-slate-700 block mb-1.5';

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

  // ========================================================================
  // RF-LIQ-004 — Modo de consolidación del expediente ("Paso 4: Resumen de
  // Expediente y Envío"). Cuando el modal se abre con una solicitud ya
  // radicada (RADICADA / EXTEMPORANEA / DEVUELTA), NO se muestra el asistente
  // de creación sino la vista de consolidación que permite revisar el
  // expediente completo y enviarlo a revisión del Grupo de Viáticos.
  // ========================================================================
    // ========================================================================
  // Información consolidada y detallada de Comisionado y Dependencia
  // ========================================================================
  const infoComisionadoCompleta = useMemo(() => {
    const nombre = comisionado
      ? formatearNombreComisionado(comisionado)
      : (form.nombreComisionado || 'Funcionario en Comisión');
    const cedula = comisionado?.numeroDocumento || form.documentoComisionado || '—';
    const tipo = comisionado?.tipoComisionado || form.tipoComisionado || 'FUNCIONARIO';
    const telefono =
      comisionado?.telefonoContacto ||
      (comisionado as any)?.telefono ||
      (comisionado as any)?.celular ||
      'No registrado';
    const correo =
      comisionado?.email ||
      (comisionado as any)?.correo ||
      'No registrado';
    const cargo =
      cargoActualSeleccionado ||
      form.camposAdicionales?.cargoEsap ||
      form.camposAdicionales?.cargo ||
      form.camposAdicionales?.cargoInstitucional ||
      (comisionado as any)?.cargo ||
      (comisionado as any)?.cargoComisionado ||
      (form as any)?.cargoComisionado ||
      'Funcionario Público';
    const origen = comisionado?.origenDatos || 'ESAP';
    const esFacturador = comisionado?.esFacturadorElectronico;
    const habeasAutorizado = Boolean(
      comisionado?.autorizacionHabeasData || form.aceptaHabeasData
    );

    // Búsqueda de dependencia
    const depMatch =
      dependencias.find(
        (d) =>
          (idDependenciaActual != null && Number(d.idDependencia) === Number(idDependenciaActual)) ||
          (dependenciaId &&
            (d.codDependencia === dependenciaId ||
              String(d.idDependencia) === String(dependenciaId))) ||
          (comisionado?.idDependencia &&
            Number(d.idDependencia) === Number(comisionado.idDependencia))
      ) ||
      (usuarioActual?.dependencia
        ? {
            codDependencia: usuarioActual.dependencia.codDependencia,
            nomDependencia: usuarioActual.dependencia.nomDependencia,
            idDependencia: usuarioActual.dependencia.idDependencia,
            dirDependencia: null,
            dirEmail: null,
          }
        : null);

    const depNombre =
      depMatch?.nomDependencia ||
      (comisionado as any)?.dependencia ||
      (comisionado as any)?.nomDependencia ||
      (typeof viaticosService?.resolverNombreDependencia === 'function'
        ? viaticosService.resolverNombreDependencia(comisionado)
        : '') ||
      'Sede Central';
    const depCodigo =
      depMatch?.codDependencia ||
      (dependenciaId
        ? String(dependenciaId)
        : comisionado?.idDependencia
        ? String(comisionado.idDependencia)
        : '');
    const depUbicacion = (depMatch as any)?.dirDependencia || null;
    const depEmail = (depMatch as any)?.dirEmail || null;

    const fechaInicioContrato = comisionado?.fechaInicioContrato
      ? String(comisionado.fechaInicioContrato).split('T')[0]
      : null;
    const fechaFinContrato = comisionado?.fechaFinContrato
      ? String(comisionado.fechaFinContrato).split('T')[0]
      : null;
    const salarioBasico =
      form.salarioBasico != null && Number(form.salarioBasico) > 0
        ? Number(form.salarioBasico)
        : comisionado?.salarioBasico != null
        ? Number(comisionado.salarioBasico)
        : (comisionado?.cargos?.[0]?.salario != null && Number(comisionado.cargos[0].salario) > 0)
        ? Number(comisionado.cargos[0].salario)
        : null;

    return {
      nombre,
      cedula,
      tipo,
      telefono,
      correo,
      cargo,
      origen,
      esFacturador,
      habeasAutorizado,
      depNombre,
      depCodigo,
      depUbicacion,
      depEmail,
      fechaInicioContrato,
      fechaFinContrato,
      salarioBasico,
    };
  }, [comisionado, form, dependencias, dependenciaId, idDependenciaActual, cargoActualSeleccionado, usuarioActual]);

  const saldoDependenciaComisionado = useMemo(() => {
    if (!saldosPresupuesto || saldosPresupuesto.length === 0) return null;
    const depCod = (infoComisionadoCompleta.depCodigo || dependenciaId || '').toLowerCase().trim();
    const depNom = (infoComisionadoCompleta.depNombre || '').toLowerCase().trim();

    return (
      saldosPresupuesto.find((s) => {
        const sId = String(s.dependenciaId || '').toLowerCase().trim();
        const sNom = (s.nombreDependencia || '').toLowerCase().trim();
        return (
          (depCod && sId === depCod) ||
          (depNom && sNom && (sNom === depNom || sNom.includes(depNom) || depNom.includes(sNom)))
        );
      }) || null
    );
  }, [saldosPresupuesto, infoComisionadoCompleta.depCodigo, infoComisionadoCompleta.depNombre, dependenciaId]);

  const esModoConsolidacion = Boolean(
    solicitudAResumir &&
      (ESTADOS_CONSOLIDABLES as readonly string[]).includes(
        solicitudAResumir.estadoSolicitud,
      ),
  );

  if (esModoConsolidacion && solicitudAResumir) {
    return (
      <div className="min-h-full flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-7 md:p-9 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto scrollbar-thin">
          <ConsolidacionExpediente
            solicitud={solicitudAResumir}
            onConsolidada={(resultado) => onSolicitudConsolidada?.(resultado)}
            onCerrar={onCerrar}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-5xl lg:max-w-6xl w-full p-5 sm:p-7 md:p-9 shadow-2xl border border-slate-200/90 max-h-[92vh] overflow-y-auto transition-all">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-[#003DA5] rounded-xl">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Nueva Solicitud de Comisión de Servicios</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Paso {paso} de {PASOS.length}
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
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                    activo
                      ? 'bg-[#003DA5] text-white'
                      : completado
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {completado ? '✓' : n}
                </div>
                <span className={`text-xs sm:text-sm font-bold hidden sm:block ${activo ? 'text-slate-900' : 'text-slate-400'}`}>
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
              {solicitudesPendientes023.length > 0 && (
                <div
                  className="rounded-2xl border-2 border-amber-300 bg-amber-50/95 dark:bg-amber-950/30 p-4 sm:p-5 shadow-xs space-y-3 transition-all animate-fadeIn"
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm sm:text-base">
                          Atención: El comisionado tiene solicitudes de Formato 023 pendientes
                        </h4>
                        <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 border border-amber-400">
                          {solicitudesPendientes023.length} {solicitudesPendientes023.length === 1 ? 'solicitud en trámite' : 'solicitudes en trámite'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                        Este comisionado ya cuenta con solicitudes de comisión (Formato GF-FO-023) registradas y en trámite. Por favor verifique que las nuevas fechas, trayectos y compromisos no generen solapamiento de fechas, duplicidad o incompatibilidad con las solicitudes listadas a continuación:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mt-2 pt-2 border-t border-amber-200/90 dark:border-amber-800/60">
                    <p className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-700" />
                      Solicitudes de Formato 023 pendientes / en trámite:
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto pr-1">
                      {solicitudesPendientes023.map((sol) => {
                        const cfgEstado = getConfigEstado(sol.estadoSolicitud);
                        const consecutivo = sol.codigoSolicitud || sol.consecutivoUnico || `SOL-${sol.id.slice(0, 8)}`;
                        const total = Number(sol.totalGeneral ?? ((sol.montoViaticos || 0) + (sol.montoGastosViaje || 0)));
                        return (
                          <div
                            key={sol.id}
                            className="bg-white/95 dark:bg-slate-900/90 rounded-xl p-3.5 border border-amber-200 dark:border-amber-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-amber-300 transition-colors"
                          >
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-[#003DA5] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 text-xs">
                                  {consecutivo}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${cfgEstado.bg} ${cfgEstado.text}`}>
                                  {cfgEstado.label}
                                </span>
                                <span className="text-slate-500 font-medium text-[11px]">
                                  Formato GF-FO-023
                                </span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-200 font-semibold line-clamp-2" title={sol.objetoComision}>
                                {sol.objetoComision || 'Sin objeto registrado'}
                              </p>
                              <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-[11px] flex-wrap">
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  Destino: {sol.destinoCiudad || 'N/A'}{sol.destinoDepartamento ? `, ${sol.destinoDepartamento}` : ''}
                                </span>
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  Periodo: {sol.fechaInicio || 'N/A'} al {sol.fechaFin || 'N/A'}
                                </span>
                              </div>
                            </div>
                            {total > 0 && (
                              <div className="sm:text-right shrink-0 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60">
                                <span className="text-[10px] text-slate-500 font-medium block">Total Estimado</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                  {formatearMoneda(total)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

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
                    onChange={(e) => {
                      actualizar('documentoComisionado', soloNumeros(e.target.value));
                      if (solicitudesPendientes023.length > 0) {
                        setSolicitudesPendientes023([]);
                      }
                    }}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={consultarComisionado}
                    disabled={consultando}
                    className="px-5 py-2.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-sm font-bold inline-flex items-center gap-1.5 shrink-0 transition-all shadow-xs disabled:opacity-50"
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
                <div className="border border-emerald-200 bg-emerald-50/70 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-emerald-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-base truncate">
                          {infoComisionadoCompleta.nombre}
                        </p>
                        <p className="text-xs text-slate-600 font-medium">
                          {infoComisionadoCompleta.cargo} · <span className="font-bold text-emerald-800">{infoComisionadoCompleta.tipo}</span>
                        </p>
                      </div>
                    </div>
                    {infoComisionadoCompleta.origen && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Verificado {infoComisionadoCompleta.origen === 'HUMANO' ? 'Talento Humano' : infoComisionadoCompleta.origen}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
                    <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Documento / Cédula</span>
                      <span className="font-bold text-slate-800">{infoComisionadoCompleta.cedula}</span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Celular / Teléfono</span>
                      <span className="font-bold text-slate-800">{infoComisionadoCompleta.telefono}</span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correo Electrónico</span>
                      <span className="font-bold text-slate-800 truncate block" title={infoComisionadoCompleta.correo}>{infoComisionadoCompleta.correo}</span>
                    </div>
                    {infoComisionadoCompleta.salarioBasico != null && infoComisionadoCompleta.salarioBasico > 0 && (
                      <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Salario Básico</span>
                        <span className="font-bold text-slate-800">{formatearMoneda(infoComisionadoCompleta.salarioBasico)}</span>
                      </div>
                    )}
                    {(infoComisionadoCompleta.fechaInicioContrato || infoComisionadoCompleta.fechaFinContrato) && (
                      <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vigencia Contrato / Vinculación</span>
                        <span className="font-bold text-slate-800">
                          {infoComisionadoCompleta.fechaInicioContrato || 'Inicio'} al {infoComisionadoCompleta.fechaFinContrato || 'Indefinido / Vigente'}
                        </span>
                      </div>
                    )}
                    <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Régimen DIAN / Facturación</span>
                      <span className="font-bold text-slate-800">
                        {infoComisionadoCompleta.esFacturador ? 'Facturador Electrónico' : 'Régimen Ordinario / RUT'}
                      </span>
                    </div>
                    {/* Asignación Organizacional: Información del Comisionado (Paso 1 - Solo Lectura / Informativo) */}
                    <div className="sm:col-span-2 lg:col-span-3 bg-white p-4 rounded-xl border border-emerald-200/90 shadow-2xs space-y-3 mt-1">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-emerald-100">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#003DA5]" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Asignación Organizacional (Dependencia y Cargo)
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Informativo · Paso 1
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        {/* Dependencia */}
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Dependencia Institucional
                          </span>
                          {infoComisionadoCompleta.depNombre ? (
                            <span className="font-extrabold text-slate-800 block mt-0.5">
                              {infoComisionadoCompleta.depNombre}
                              {infoComisionadoCompleta.depCodigo && (
                                <span className="ml-1 text-[11px] font-mono text-[#003DA5] font-bold">
                                  (Cód. {infoComisionadoCompleta.depCodigo})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Falta información de dependencia (se asignará en Paso 2)
                            </span>
                          )}
                        </div>

                        {/* Cargo principal */}
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Cargo Institucional Registrado
                          </span>
                          {infoComisionadoCompleta.cargo ? (
                            <span className="font-extrabold text-slate-800 block mt-0.5">
                              {infoComisionadoCompleta.cargo}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Falta información de cargo (se seleccionará en Paso 2)
                            </span>
                          )}
                        </div>

                        {/* Salario */}
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Salario Básico Registrado
                          </span>
                          {infoComisionadoCompleta.salarioBasico != null && infoComisionadoCompleta.salarioBasico > 0 ? (
                            <span className="font-extrabold text-slate-800 block mt-0.5">
                              {formatearMoneda(infoComisionadoCompleta.salarioBasico)}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Falta salario (se completará en Paso 2)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mensaje de completado en Paso 2 */}
                      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold">
                            Selección, Cambio y Asignación de Cargo en el Paso 2:
                          </p>
                          <p className="text-[11px] text-blue-800 leading-relaxed">
                            {infoComisionadoCompleta.cargo
                              ? 'Este funcionario ya cuenta con cargo registrado. En el Paso 2 (Objeto y Destino) podrá confirmar con cuál cargo se realizará esta comisión (o cambiarlo si tiene múltiples cargos) y verificar su salario relacional.'
                              : 'Este funcionario no tiene cargo registrado. En el Paso 2 (Objeto y Destino) podrá seleccionar la dependencia, elegir el cargo institucional correspondiente y fijar su salario relacional para la liquidación de viáticos.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* HISTORIAL Y CONSULTA DE CUENTAS BANCARIAS DEL COMISIONADO (PASO 1 INFORMATIVO) */}
              {/* ========================================================================= */}
              {comisionado && !habeasPendiente && (
                <div className="border border-blue-200 bg-white rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#003DA5] flex items-center justify-center font-bold">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                          Cuentas Bancarias Registradas
                          {comisionado.cuentasBancarias && comisionado.cuentasBancarias.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#003DA5] border border-blue-200 font-extrabold">
                              {comisionado.cuentasBancarias.length} guardada(s)
                            </span>
                          )}
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Información de cuentas bancarias asociadas al funcionario (Modo solo consulta e informativo).
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                      Informativo · Paso 1
                    </span>
                  </div>

                  {comisionado.cuentasBancarias && comisionado.cuentasBancarias.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {comisionado.cuentasBancarias.map((cta, idx) => (
                          <div
                            key={cta.id || `cta-info-${idx}`}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-slate-900 text-xs truncate">
                                {cta.banco}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                                  {cta.tipoCuenta || 'AHORROS'}
                                </span>
                                {cta.esPrincipal && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                    Principal
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-600 font-mono">
                              No. <span className="font-bold text-slate-800">{cta.numeroCuenta}</span>
                            </div>
                            <div className="pt-1 border-t border-slate-200/60 text-[10px]">
                              {cta.urlCertificadoBancario ? (
                                <a
                                  href={cta.urlCertificadoBancario}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                                >
                                  <BadgeCheck className="w-3 h-3 text-emerald-600" /> Certificado registrado
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">
                                  Sin certificación adjunta
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-[#003DA5] shrink-0" />
                        <span className="text-[11px]">
                          En el <strong>Paso 2 (Objeto y Destino)</strong> puede verificar o modificar los datos de la cuenta en los campos adicionales paramétricos, y en el <strong>Paso 3 (Documentos)</strong> gestionar sus soportes.
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Si no hay cuenta indica que no se ha registrado */
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-950">
                          No se ha registrado cuenta bancaria para este comisionado
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                          El comisionado no cuenta con cuentas bancarias registradas en su historial. En el <strong>Paso 2 (Objeto y Destino)</strong> podrá ingresar los datos de la cuenta en los campos adicionales paramétricos, y en el <strong>Paso 3 (Documentos)</strong> adjuntar la certificación bancaria correspondiente.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Saldo presupuestal por dependencia (Informativo - Paso 1) */}
              {comisionado && !habeasPendiente && (
                <div className="border border-blue-200 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#003DA5] text-white flex items-center justify-center font-bold shadow-xs">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800 text-xs sm:text-sm">
                          Saldo Presupuestal por Dependencia
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          {infoComisionadoCompleta.depNombre}
                          {infoComisionadoCompleta.depCodigo && ` · Cód. ${infoComisionadoCompleta.depCodigo}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                      Informativo
                    </span>
                  </div>

                  {cargandoSaldosPresupuesto ? (
                    <div className="py-2 text-xs text-slate-500 flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Consultando saldo presupuestal institucional...
                    </div>
                  ) : saldoDependenciaComisionado ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white/90 p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Presupuesto Techo / Asignado
                        </span>
                        <span className="text-sm font-black text-slate-800">
                          {formatearMoneda(saldoDependenciaComisionado.presupuestoInicial)}
                        </span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Presupuesto Reservado
                        </span>
                        <span className="text-sm font-black text-amber-700">
                          {formatearMoneda(saldoDependenciaComisionado.presupuestoReservado)}
                        </span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Saldo Disponible
                        </span>
                        <span
                          className={`text-sm font-black ${
                            saldoDependenciaComisionado.presupuestoDisponible > 0
                              ? 'text-emerald-700'
                              : 'text-red-600'
                          }`}
                        >
                          {formatearMoneda(saldoDependenciaComisionado.presupuestoDisponible)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/80 p-3 rounded-xl border border-blue-100 text-xs text-slate-600">
                      No se registra cuota o techo presupuestal individual configurado para esta dependencia. La comisión podrá tramitarse conforme a la disponibilidad institucional global.
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => irPaso(2)}
                  disabled={!tieneComisionadoAutorizado}
                  className="px-5 py-2.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Guardar y Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="space-y-5">
              {/* Encabezado del Paso 2 */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-[#003DA5]">
                    2. Objeto y Destino de la Comisión, Itinerario y Autoliquidación
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Registre los datos requeridos, configure el itinerario multiruta y aplique el autoliquidador.
                  </p>
                </div>
              </div>

              {/* ========== BANNER DE INFORMACIÓN AUTOMÁTICA (COMISIONADO Y DEPENDENCIA COMPLETA) ========== */}
              <div className="bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/50 border border-blue-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                {/* Fila superior: Avatar, Nombre comisionado, badges */}
                <div className="flex items-start sm:items-center justify-between flex-wrap gap-3 pb-3.5 border-b border-blue-100">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#003DA5] to-blue-600 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-sm shrink-0">
                      <User className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                          {infoComisionadoCompleta.nombre}
                        </h4>
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-[#003DA5] border border-blue-200 uppercase tracking-wide">
                          {infoComisionadoCompleta.tipo}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{infoComisionadoCompleta.cargo}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {infoComisionadoCompleta.origen && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Verificado {infoComisionadoCompleta.origen === 'HUMANO' ? 'Talento Humano (FNC)' : infoComisionadoCompleta.origen}
                      </span>
                    )}
                    <span className="text-[11px] font-black uppercase tracking-wider bg-white text-[#003DA5] px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                      Datos Precargados
                    </span>
                  </div>
                </div>

                {/* Cuadrícula detallada con todos los datos requeridos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* 1. Cédula / Documento */}
                  <div className="bg-white/85 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <IdCard className="w-3.5 h-3.5 text-[#003DA5]" />
                      <span>Documento de Identidad</span>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-800 pl-5">
                      {infoComisionadoCompleta.cedula}
                    </p>
                  </div>

                  {/* 2. Celular / Teléfono */}
                  <div className="bg-white/85 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Celular / Teléfono</span>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-800 pl-5">
                      {infoComisionadoCompleta.telefono}
                    </p>
                  </div>

                  {/* 3. Correo Electrónico */}
                  <div className="bg-white/85 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>Correo Electrónico</span>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-800 pl-5 truncate" title={infoComisionadoCompleta.correo}>
                      {infoComisionadoCompleta.correo}
                    </p>
                  </div>

                  {/* 4. Dependencia Asignada Completa */}
                  <div className="sm:col-span-2 lg:col-span-2 bg-white/85 backdrop-blur-xs p-3.5 rounded-xl border border-blue-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <Building2 className="w-3.5 h-3.5 text-[#003DA5]" />
                        <span>Dependencia Asignada</span>
                      </div>
                      {infoComisionadoCompleta.depCodigo && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-blue-50 text-[#003DA5] border border-blue-200 rounded-md">
                          Cód. {infoComisionadoCompleta.depCodigo}
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base font-black text-slate-900 pl-5 leading-snug">
                      {infoComisionadoCompleta.depNombre}
                    </p>
                    {(infoComisionadoCompleta.depUbicacion || infoComisionadoCompleta.depEmail) && (
                      <p className="text-xs text-slate-500 pl-5 flex items-center gap-3 flex-wrap">
                        {infoComisionadoCompleta.depUbicacion && <span>📍 {infoComisionadoCompleta.depUbicacion}</span>}
                        {infoComisionadoCompleta.depEmail && <span>✉️ {infoComisionadoCompleta.depEmail}</span>}
                      </p>
                    )}
                  </div>

                  {/* 5. Facturación / DIAN */}
                  <div className="bg-white/85 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>RUT / Facturación</span>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-800 pl-5">
                      {infoComisionadoCompleta.esFacturador ? 'Facturador Electrónico' : 'Régimen Ordinario / RUT'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ========== ASIGNACIÓN ORGANIZACIONAL: CARGO Y SALARIO DE LA COMISIÓN (FORMATO 023 - PASO 2) ========== */}
              <div className="rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-emerald-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#003DA5]" />
                    <div>
                      <h5 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                        Asignación Organizacional (Dependencia y Cargo para la Comisión)
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Seleccione o confirme el cargo y salario relacional con el que se realizará la comisión (Formato GF-FO-023) para trazabilidad y KPIs.
                      </p>
                    </div>
                  </div>
                  {infoComisionadoCompleta.depCodigo && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                      Cód. {infoComisionadoCompleta.depCodigo}
                    </span>
                  )}
                </div>

                {/* SI EL COMISIONADO TIENE CARGO REGISTRADO O SELECCIONADO */}
                {((comisionado?.cargos && comisionado.cargos.length > 0) || Boolean(comisionado?.cargo) || Boolean(cargoActualSeleccionado)) && (
                  <div className="bg-gradient-to-r from-blue-50/70 via-slate-50/50 to-emerald-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#003DA5] flex items-center justify-center shrink-0 mt-0.5">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-100 text-[#003DA5] rounded-full border border-blue-200">
                              Cargo Seleccionado para la Comisión
                            </span>
                            {infoComisionadoCompleta.depNombre && (
                              <span className="text-[11px] text-slate-500 truncate">
                                • {infoComisionadoCompleta.depNombre}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 truncate">
                            {cargoActualSeleccionado || comisionado?.cargo || comisionado?.cargos?.[0]?.cargo || 'Cargo Institucional'}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Este cargo quedará registrado en la solicitud para trazabilidad y KPIs analíticos de gasto por cargo.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        <div className="text-right px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Salario Relacional</span>
                          <span className="text-xs sm:text-sm font-extrabold text-emerald-900">
                            ${(form.salarioBasico || 0).toLocaleString('es-CO')} COP
                          </span>
                        </div>

                        <button
                          type="button"
                          id="btn-cambiar-cargo-comision"
                          onClick={() => setModoCambiarCargo((prev) => !prev)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs ${
                            modoCambiarCargo
                              ? 'bg-slate-200 text-slate-800 border-slate-300'
                              : 'bg-[#003DA5] text-white hover:bg-[#002D7A] border-[#003DA5]'
                          }`}
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          {modoCambiarCargo ? 'Cerrar selector' : 'Cambiar cargo'}
                        </button>
                      </div>
                    </div>

                    {/* Chips de otros cargos que ya tiene el comisionado guardados */}
                    {comisionado?.cargos && comisionado.cargos.length > 1 && (
                      <div className="pt-2 border-t border-slate-200/80 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          Cargos previos: Cambiar a otro cargo registrado:
                        </span>
                        {comisionado.cargos.map((c, i) => {
                          const esActivo = cargoActualSeleccionado.toLowerCase() === c.cargo.trim().toLowerCase();
                          return (
                            <button
                              key={c.id || i}
                              type="button"
                              onClick={() => {
                                cambiarCargo(c.cargo);
                                setModoCambiarCargo(false);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                esActivo
                                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                                  : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {c.cargo} {c.salario > 0 ? `(${formatearMoneda(c.salario)})` : ''}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* SELECTOR INTERACTIVO: Para cambiar cargo o para completar cuando falta info */}
                <div className={
                  modoCambiarCargo || (!((comisionado?.cargos && comisionado.cargos.length > 0) || Boolean(comisionado?.cargo)))
                    ? 'space-y-4 pt-2'
                    : 'hidden'
                }>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      {!((comisionado?.cargos && comisionado.cargos.length > 0) || Boolean(comisionado?.cargo))
                        ? 'Completar información requerida de cargo y salario'
                        : 'Seleccionar o registrar nuevo cargo para la comisión'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Cargos parametrizados según dependencia institucional
                    </span>
                  </div>

                  {!((comisionado?.cargos && comisionado.cargos.length > 0) || Boolean(comisionado?.cargo)) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        El funcionario no tiene cargo asignado. Por favor seleccione la dependencia, elija o ingrese el cargo y defina su salario relacional para la liquidación.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        Dependencia Asignada <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        id="dependencia-asignada-select"
                        options={dependencias.map((d) => ({
                          value: String(d.idDependencia),
                          label: d.nomDependencia,
                          sublabel: d.codDependencia ? `Cód. ${d.codDependencia}` : undefined,
                        }))}
                        value={idDependenciaActual ? String(idDependenciaActual) : ''}
                        onChange={(val) => cambiarDependencia(val)}
                        placeholder="Seleccionar dependencia..."
                        disabled={!puedeElegirDependencia() && Boolean(comisionado?.idDependencia)}
                        emptyText="No hay dependencias registradas"
                      />
                      {infoComisionadoCompleta.depNombre && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          {infoComisionadoCompleta.depNombre}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">
                        Los cargos disponibles se actualizarán según la dependencia seleccionada.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        Cargo Institucional <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        id="cargo-institucional-select"
                        options={(() => {
                          const listaOpciones: { value: string; label: string; sublabel?: string }[] = [];
                          const agregados = new Set<string>();

                          // 1. Cargos disponibles de la dependencia
                          cargosDisponibles.forEach((c) => {
                            const nom = c.nomCargo?.trim();
                            if (nom && !agregados.has(nom.toLowerCase())) {
                              agregados.add(nom.toLowerCase());
                              listaOpciones.push({
                                value: nom,
                                label: nom,
                                sublabel: `${c.codCargo ? `Cód. ${c.codCargo}` : ''}${
                                  c.nivelJerarquico ? ` • ${c.nivelJerarquico}` : ''
                                }`.trim() || undefined,
                              });
                            }
                          });

                          // 2. Cargos registrados previamente en el comisionado
                          (comisionado?.cargos || []).forEach((c) => {
                            const nom = c.cargo?.trim();
                            if (nom && !agregados.has(nom.toLowerCase())) {
                              agregados.add(nom.toLowerCase());
                              listaOpciones.push({
                                value: nom,
                                label: nom,
                                sublabel: `Registrado en perfil • Salario: ${formatearMoneda(c.salario)}`,
                              });
                            }
                          });

                          // 3. Cargo actual del comisionado si no está
                          if (comisionado?.cargo && !agregados.has(comisionado.cargo.trim().toLowerCase())) {
                            const nom = comisionado.cargo.trim();
                            listaOpciones.push({
                              value: nom,
                              label: nom,
                              sublabel: 'Cargo actual en ESAP',
                            });
                          }

                          return listaOpciones;
                        })()}
                        value={cargoActualSeleccionado}
                        onChange={(val) => cambiarCargo(val)}
                        placeholder={
                          !idDependenciaActual
                            ? 'Primero seleccione una dependencia...'
                            : cargandoCargos
                            ? 'Cargando cargos...'
                            : 'Buscar o seleccionar cargo...'
                        }
                        disabled={!idDependenciaActual || cargandoCargos}
                        loading={cargandoCargos}
                        allowClear
                        emptyText={
                          !idDependenciaActual
                            ? 'Primero seleccione una dependencia'
                            : 'No hay cargos asignados a esta dependencia en Configuración General'
                        }
                      />

                      {idDependenciaActual && cargosDisponibles.length > 0 ? (
                        <p className="text-[11px] text-emerald-700 font-medium mt-1">
                          {cargosDisponibles.length} cargo(s) disponible(s) para esta dependencia.
                        </p>
                      ) : idDependenciaActual && !cargandoCargos ? (
                        <p className="text-[11px] text-amber-700 font-medium mt-1">
                          Sin cargos vinculados a esta dependencia en Configuración General.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Salario básico relacional al cargo */}
                  <div className="pt-3 border-t border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/40 p-3 rounded-xl">
                    <div className="min-w-0">
                      <label htmlFor="salario-cargo-relacional" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-emerald-700" />
                        Salario Básico Relacional del Cargo <span className="text-red-500">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Asignación salarial vinculada directamente al cargo seleccionado para el cálculo y liquidación de viáticos.
                      </p>
                    </div>
                    <div className="w-full sm:w-56 shrink-0">
                      <div className="relative rounded-xl shadow-2xs">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">$</span>
                        <input
                          id="salario-cargo-relacional"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={form.salarioBasico ? form.salarioBasico.toLocaleString('es-CO') : ''}
                          onChange={(e) => {
                            const num = Number(e.target.value.replace(/\D/g, '')) || 0;
                            setForm((prev) => ({
                              ...prev,
                              salarioBasico: num,
                              cargoSeleccionado: prev.cargoSeleccionado
                                ? { ...prev.cargoSeleccionado, salario: num }
                                : cargoActualSeleccionado
                                ? { cargo: cargoActualSeleccionado, salario: num }
                                : undefined,
                            }));
                            setAsignacionesBasicas(num > 0 ? [num] : []);
                          }}
                          className="block w-full pl-8 pr-3 py-2 text-sm font-bold text-slate-900 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botón de confirmar cargo y mensaje informativo */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <p className="text-[11px] text-slate-500 italic">
                      ✓ Al fijar este cargo, se vinculará a la solicitud GF-FO-023 y se agregará al perfil del comisionado.
                    </p>
                    {((comisionado?.cargos && comisionado.cargos.length > 0) || Boolean(comisionado?.cargo)) && (
                      <button
                        type="button"
                        id="btn-fijar-cargo-comision"
                        onClick={() => setModoCambiarCargo(false)}
                        className="px-3 py-1.5 bg-[#003DA5] text-white rounded-xl text-xs font-bold hover:bg-[#002D7A] transition-all flex items-center justify-center gap-1.5 self-end shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Fijar este cargo para la comisión
                      </button>
                    )}
                  </div>
                </div>
              </div>


              {/* ========== BLOQUE 1: DATOS REQUERIDOS DE LA COMISIÓN Y SALARIO ========== */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-[#003DA5]" />
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Datos Requeridos de la Comisión
                  </h5>
                </div>

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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                  {!esCampoOculto('numeroCdp') && (
                    <div>
                      <label className={labelCls} htmlFor="numeroCdp">
                        {renderLabel('numeroCdp', 'Número de CDP')}
                      </label>
                      <input
                        id="numeroCdp"
                        type="text"
                        required={esCampoObligatorio('numeroCdp')}
                        placeholder="Ej. CDP-2026-00123"
                        value={form.numeroCdp || ''}
                        onChange={(e) => actualizar('numeroCdp', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  )}
                  {!esCampoOculto('fechaCdp') && (
                    <div>
                      <label className={labelCls} htmlFor="fechaCdp">
                        {renderLabel('fechaCdp', 'Fecha de CDP')}
                      </label>
                      <input
                        id="fechaCdp"
                        type="date"
                        required={esCampoObligatorio('fechaCdp')}
                        value={form.fechaCdp || ''}
                        onChange={(e) => actualizar('fechaCdp', e.target.value)}
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
                </div>

                {/* Categoría investigador y excepción regional si aplica */}
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

                {/* Campos adicionales dinámicos */}
                {(() => {
                  const camposAdicionalesConfigurados = camposCatalogo
                    .filter((c) => c.activo && !camposEstandar.has(c.clave) && !esCampoOculto(c.clave))
                    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

                  const tieneCuentasMultiples = Boolean(comisionado?.cuentasBancarias && comisionado.cuentasBancarias.length > 1);

                  if (camposAdicionalesConfigurados.length === 0 && !tieneCuentasMultiples) return null;

                  return (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Información Adicional de la Comisión
                        </p>
                      </div>

                      {/* Selector rápido para comisionados con múltiples cuentas registradas */}
                      {comisionado?.cuentasBancarias && comisionado.cuentasBancarias.length > 1 && (
                        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-[#003DA5] shrink-0" />
                            <span className="text-xs font-bold text-slate-800">
                              Cuentas registradas del comisionado:
                            </span>
                            <span className="text-[10px] text-slate-500">
                              (Haga clic para autocompletar los campos adicionales bancarios)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {comisionado.cuentasBancarias.map((cta, idx) => {
                              const idActual = cta.id || `cta-${idx}`;
                              const esSeleccionada = cuentaBancariaSeleccionadaId === idActual;
                              return (
                                <button
                                  key={idActual}
                                  type="button"
                                  onClick={() => seleccionarCuentaBancaria(cta)}
                                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                                    esSeleccionada
                                      ? 'bg-[#003DA5] text-white border-[#003DA5] shadow-xs'
                                      : 'bg-white text-slate-700 border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5]'
                                  }`}
                                >
                                  <Landmark className="w-3.5 h-3.5" />
                                  <span>{cta.banco} ({cta.tipoCuenta || 'AHORROS'} - {cta.numeroCuenta})</span>
                                  {cta.esPrincipal && (
                                    <span className={`text-[9px] font-bold px-1 rounded ${esSeleccionada ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                                      Principal
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {camposAdicionalesConfigurados.map((campo) => {
                          const valorActual = form.camposAdicionales?.[campo.clave] ?? '';
                          const obligatorio = esCampoObligatorio(campo.clave);

                          const esCampoCargo =
                            campo.clave === 'cargoEsap' ||
                            campo.clave === 'cargo' ||
                            campo.clave === 'cargoInstitucional' ||
                            campo.clave === 'cargoComisionado';

                          if (esCampoCargo) {
                            return (
                              <div key={campo.clave}>
                                <label className={labelCls} htmlFor={`campo_${campo.clave}`}>
                                  {renderLabel(campo.clave, campo.etiqueta)}
                                </label>
                                <SearchableSelect
                                  id={`campo_${campo.clave}`}
                                  options={cargosDisponibles.map((c) => ({
                                    value: c.nomCargo,
                                    label: c.nomCargo,
                                    sublabel: `${c.codCargo ? `Cód. ${c.codCargo}` : ''}${
                                      c.nivelJerarquico ? ` • ${c.nivelJerarquico}` : ''
                                    }`.trim() || undefined,
                                  }))}
                                  value={String(valorActual || cargoActualSeleccionado || '')}
                                  onChange={(v) => {
                                    actualizarCampoAdicional(campo.clave, v);
                                    cambiarCargo(v);
                                  }}
                                  placeholder={
                                    !idDependenciaActual
                                      ? 'Primero seleccione una dependencia en Paso 1...'
                                      : cargandoCargos
                                      ? 'Cargando cargos de la dependencia...'
                                      : 'Buscar o seleccionar cargo...'
                                  }
                                  disabled={!idDependenciaActual || cargandoCargos}
                                  loading={cargandoCargos}
                                  allowClear
                                  emptyText={
                                    !idDependenciaActual
                                      ? 'Primero seleccione una dependencia en Paso 1'
                                      : 'No hay cargos asignados a esta dependencia en Configuración General'
                                  }
                                />
                                {idDependenciaActual && cargosDisponibles.length > 0 && (
                                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                                    {cargosDisponibles.length} cargo(s) asignado(s) a la dependencia.
                                  </p>
                                )}
                              </div>
                            );
                          }

                          if (campo.tipoCampo === 'TEXTAREA') {
                            return (
                              <div key={campo.clave} className="col-span-1 sm:col-span-2">
                                <label className={labelCls} htmlFor={`campo_${campo.clave}`}>
                                  {renderLabel(campo.clave, campo.etiqueta)}
                                </label>
                                <textarea
                                  id={`campo_${campo.clave}`}
                                  required={obligatorio}
                                  rows={2}
                                  placeholder={campo.placeholder || (campo as any).ayuda || ''}
                                  value={String(valorActual)}
                                  onChange={(e) => actualizarCampoAdicional(campo.clave, e.target.value)}
                                  className={inputCls}
                                />
                              </div>
                            );
                          }

                          if ((campo.tipoCampo as string) === 'CHECKBOX' || (campo.tipoCampo as string) === 'BOOLEAN') {
                            const estaCheckeado =
                              valorActual !== '' && valorActual !== null && valorActual !== undefined
                                ? Boolean(valorActual)
                                : false;
                            return (
                              <div key={campo.clave} className="col-span-1 sm:col-span-2 flex items-center pt-2">
                                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                                  <input
                                    type="checkbox"
                                    id={`campo_${campo.clave}`}
                                    checked={estaCheckeado}
                                    onChange={(e) => actualizarCampoAdicional(campo.clave, e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
                                  />
                                  <span>{renderLabel(campo.clave, campo.etiqueta)}</span>
                                </label>
                              </div>
                            );
                          }

                          if (campo.tipoCampo?.toUpperCase() === 'SELECT') {
                            const opcionesSelect = (campo.opciones || [])
                              .map((o: any) => {
                                if (typeof o === 'string') return { value: o, label: o };
                                if (o && typeof o === 'object' && !Array.isArray(o)) {
                                  const val = o.value ?? o.valor ?? o.id ?? '';
                                  const lab = o.label ?? o.nombre ?? o.etiqueta ?? val;
                                  if (val || lab) return { value: String(val), label: String(lab) };
                                }
                                return null;
                              })
                              .filter((o): o is { value: string; label: string } => Boolean(o && (o.value || o.label)));

                            return (
                              <div key={campo.clave}>
                                <label className={labelCls} htmlFor={`campo_${campo.clave}`}>
                                  {renderLabel(campo.clave, campo.etiqueta)}
                                </label>
                                <SearchableSelect
                                  id={`campo_${campo.clave}`}
                                  options={opcionesSelect}
                                  value={String(valorActual)}
                                  onChange={(v) => actualizarCampoAdicional(campo.clave, v)}
                                  placeholder="Seleccione..."
                                />
                              </div>
                            );
                          }

                          const esCampoBanco =
                            campo.clave === 'entidadBancaria' ||
                            campo.clave === 'entidad_bancaria' ||
                            campo.clave === 'banco';

                          return (
                            <div key={campo.clave}>
                              <label className={labelCls} htmlFor={`campo_${campo.clave}`}>
                                {renderLabel(campo.clave, campo.etiqueta)}
                              </label>
                              <input
                                id={`campo_${campo.clave}`}
                                type={campo.tipoCampo === 'DATE' ? 'date' : 'text'}
                                list={esCampoBanco ? 'bancos-colombia-list' : undefined}
                                required={obligatorio}
                                placeholder={campo.placeholder || (campo as any).ayuda || ''}
                                value={campo.tipoCampo === 'CURRENCY' && typeof valorActual === 'number' ? formatearMoneda(valorActual) : String(valorActual)}
                                onChange={(e) => {
                                  const val = campo.tipoCampo === 'CURRENCY' ? Number(soloNumeros(e.target.value)) || 0 : e.target.value;
                                  actualizarCampoAdicional(campo.clave, val);
                                }}
                                className={inputCls}
                              />
                              {esCampoBanco && (
                                <datalist id="bancos-colombia-list">
                                  {LISTA_BANCOS_COLOMBIA.map((b) => (
                                    <option key={b} value={b} />
                                  ))}
                                </datalist>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer pt-1">
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
              </div>

              {/* ========== BLOQUE 2: ITINERARIO DE LA COMISIÓN (MULTIRUTA) ========== */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
                <ItinerarioBuilder
                  itinerario={form.itinerario || []}
                  onChange={(itinerario) => {
                    if (alertaSolapamiento) {
                      setAlertaSolapamiento(null);
                    }
                    const sync = sincronizarItinerarioFormulario(itinerario.filter((r) => r.guardada));
                    setForm((prev) => ({
                      ...prev,
                      itinerario,
                      fechaInicio: sync.fechaInicio || prev.fechaInicio,
                      fechaFin: sync.fechaFin || prev.fechaFin,
                      diasComision: sync.diasComision || prev.diasComision,
                      origenCiudad: sync.origenCiudad || prev.origenCiudad,
                      origenDepartamento: sync.origenDepartamento || prev.origenDepartamento,
                      destinoCiudad: sync.destinoCiudad || prev.destinoCiudad,
                      destinoDepartamento: sync.destinoDepartamento || prev.destinoDepartamento,
                      ...(sync.transporteTerminalesAereos > 0
                        ? { montoGastosViaje: sync.transporteTerminalesAereos }
                        : {}),
                    }));
                  }}
                  departamentos={departamentos}
                />
              </div>

              {/* ========== BLOQUE 3: AUTOLIQUIDADOR Y VALORES DE LA COMISIÓN ========== */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Calculator className="w-4 h-4 text-[#003DA5]" />
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Liquidación y Valores de la Comisión
                  </h5>
                </div>

                <LiquidacionPanel
                  fechaInicio={form.fechaInicio}
                  fechaFin={form.fechaFin}
                  tipoComisionado={comisionado?.tipoComisionado || ''}
                  destinoCiudad={form.destinoCiudad}
                  destinoDepartamento={form.destinoDepartamento}
                  categoriaInvestigador={categoriaInvestigador}
                  asignacionesBasicas={obtenerAsignacionesBasicasValidas()}
                  incluyeTransporteAereo={form.itinerario?.some((r) => r.tipoTransporte === 'AEREO')}
                  montoTransporteTerrestre={(form.itinerario || []).reduce((acc, r) => r.tipoTransporte !== 'AEREO' ? acc + (Number(r.valorTransporte ?? r.montoTransporteTerrestre ?? 0) || 0) : acc, 0)}
                  itinerario={form.itinerario}
                  onAplicarValor={(montoViaticos, dias, montoGastosDesplazamiento, datosCompletos) => {
                    const tarifasAereas = (form.itinerario || []).reduce((acc, r) => acc + (r.tarifaTerminalAereo || 0), 0);
                    const transporteTerrestreTotal = (form.itinerario || []).reduce((acc, r) => r.tipoTransporte !== 'AEREO' ? acc + (Number(r.valorTransporte ?? r.montoTransporteTerrestre ?? 0) || 0) : acc, 0);
                    const totalDesplazamiento = (montoGastosDesplazamiento !== undefined && montoGastosDesplazamiento > 0)
                      ? montoGastosDesplazamiento
                      : (tarifasAereas + transporteTerrestreTotal);

                    setForm((prev) => ({
                      ...prev,
                      montoViaticos,
                      diasComision: dias,
                      montoGastosViaje: totalDesplazamiento,
                      idDependencia: prev.idDependencia ?? comisionado?.idDependencia ?? null,
                      diasPernoctados: datosCompletos?.diasPernoctados ?? prev.diasPernoctados,
                      tarifaDiaPernoctado: datosCompletos?.tarifaDiaPernoctado ?? prev.tarifaDiaPernoctado,
                      totalPernoctados: datosCompletos?.totalPernoctados ?? prev.totalPernoctados,
                      diasNoPernoctados: datosCompletos?.diasNoPernoctados ?? prev.diasNoPernoctados,
                      tarifaDiaNoPernoctado: datosCompletos?.tarifaDiaNoPernoctado ?? prev.tarifaDiaNoPernoctado,
                      totalNoPernoctados: datosCompletos?.totalNoPernoctados ?? prev.totalNoPernoctados,
                      tarifaDiariaBase: datosCompletos?.tarifaDiariaBase ?? prev.tarifaDiariaBase,
                      tarifaFinalAplicadaDia: datosCompletos?.tarifaFinalAplicadaDia ?? prev.tarifaFinalAplicadaDia,
                      salarioBaseAplicado: datosCompletos?.salarioBaseAplicado ?? prev.salarioBaseAplicado,
                      decretoAplicado: datosCompletos?.decretoAplicado ?? prev.decretoAplicado,
                      factorComisionado: datosCompletos?.factorComisionado ?? prev.factorComisionado,
                      factorPernocta: datosCompletos?.factorPernocta ?? prev.factorPernocta,
                      desgloseCalculo: datosCompletos?.desgloseCalculo ?? prev.desgloseCalculo,
                      alertasLiquidacion: datosCompletos?.alertas ?? prev.alertasLiquidacion,
                      camposAdicionales: {
                        ...(prev.camposAdicionales || {}),
                        transporteTerminalAereo: datosCompletos?.transporteTerminalesAereos ?? tarifasAereas,
                        transporteTerrestre: datosCompletos?.transporteTerrestreFluvial ?? transporteTerrestreTotal,
                        fechaAutoliquidacion: prev.camposAdicionales?.fechaAutoliquidacion || new Date().toISOString().split('T')[0],
                      },
                    }));
                  }}
                />

                {(!esCampoOculto('montoViaticos') || !esCampoOculto('montoGastosViaje') || !esCampoOculto('diasComision')) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-slate-500" />
                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Valores Consolidados de la Comisión
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Columna Izquierda: Viáticos y Días de comisión */}
                      <div className="space-y-3">
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
                                readOnly
                                aria-readonly="true"
                                title="Calculado automáticamente por el Autoliquidador (no editable)"
                                className={`${inputCls} pl-7 text-right font-bold bg-slate-100 cursor-not-allowed`}
                              />
                            </div>
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-100 w-fit">
                              <Calculator className="w-3 h-3" /> Automático (Autoliquidador)
                            </span>
                          </div>
                        )}

                        {!esCampoOculto('diasComision') && (
                          <div>
                            <label className={labelCls} htmlFor="diasComision">
                              {renderLabel('diasComision', 'Días de comisión')}
                            </label>
                            <input
                              type="hidden"
                              id="diasComision"
                              value={form.diasComision}
                            />
                            <div className="mt-1 flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl hover:bg-slate-100/60 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-1.5 bg-blue-50 text-[#003DA5] rounded-lg shrink-0">
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 leading-tight">
                                    {formatearDiasComision(Number(form.diasComision))}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    Calculado según itinerario
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md shrink-0">
                                {Number(form.diasComision)} {Number(form.diasComision) === 1 ? 'día' : 'días'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Columna Derecha: Gastos de Desplazamiento y Transporte */}
                      {!esCampoOculto('montoGastosViaje') && (() => {
                          const tarifasAereas = (form.itinerario || []).reduce((acc, r) => acc + (r.tarifaTerminalAereo || 0), 0);
                          const transporteTerrestreOtrosTotal = (form.itinerario || []).reduce(
                            (acc, r) => (r.tipoTransporte !== 'AEREO' ? acc + (Number(r.valorTransporte ?? r.montoTransporteTerrestre ?? 0) || 0) : acc),
                            0,
                          );
                          return (
                            <div className="space-y-1.5">
                              <p className={labelCls}>
                                {renderLabel('montoGastosViaje', 'Gastos de Desplazamiento y Transporte')}
                              </p>
                              {/* Desglose visual */}
                              <div className="rounded-xl border border-slate-200 bg-slate-50/50 divide-y divide-slate-100 overflow-hidden">
                                {/* Fila: Terminales Aéreos */}
                                <div className="grid grid-cols-2 items-center px-3 py-2 gap-2">
                                  <div>
                                    <p className="text-[11px] font-bold text-slate-700">
                                       Transporte a terminales aéreos
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {form.itinerario?.some((r) => r.tipoTransporte === 'AEREO')
                                        ? 'Calculado por tarifa regulada'
                                        : 'Sin rutas aéreas'}
                                    </p>
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                                    <input
                                      id="montoGastosViaje_aereo"
                                      type="text"
                                      readOnly
                                      aria-readonly="true"
                                      value={formatearMoneda(tarifasAereas)}
                                      title="Calculado automáticamente desde el itinerario aéreo"
                                      className={`${inputCls} pl-7 text-right font-bold bg-slate-100 cursor-not-allowed`}
                                    />
                                    {tarifasAereas > 0 && (
                                      <span className="flex items-center gap-1 mt-1 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded w-fit ml-auto">
                                        <Plane className="w-2.5 h-2.5" /> Automático
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Fila: Transporte Terrestre / Otros */}
                                <div className="grid grid-cols-2 items-center px-3 py-2 gap-2">
                                  <div>
                                    <p className="text-[11px] font-bold text-slate-700">
                                      Transporte terrestre / fluvial / ferroviario / otros
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {transporteTerrestreOtrosTotal > 0
                                        ? 'Totalizado desde itinerario'
                                        : 'Calculado desde itinerario'}
                                    </p>
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                                    <input
                                      id="montoGastosViaje_terrestre"
                                      type="text"
                                      readOnly
                                      aria-readonly="true"
                                      value={formatearMoneda(transporteTerrestreOtrosTotal)}
                                      title="Calculado automáticamente desde los tramos del itinerario"
                                      className={`${inputCls} pl-7 text-right font-bold bg-slate-100 cursor-not-allowed`}
                                    />
                                    {transporteTerrestreOtrosTotal > 0 && (
                                      <span className="flex items-center gap-1 mt-1 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded w-fit ml-auto">
                                        <Bus className="w-2.5 h-2.5" /> Automático
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Total desplazamiento */}
                                <div className="grid grid-cols-2 items-center px-3 py-2 gap-2 bg-blue-50/70 border-t border-blue-100">
                                  <span className="text-[11px] font-black text-blue-900 uppercase tracking-wide">
                                    Total Gastos de Desplazamiento
                                  </span>
                                  <span className="text-right text-sm font-black text-blue-900">
                                    {formatearMoneda(form.montoGastosViaje || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                    </div>

                    {(form.montoViaticos > 0 || form.montoGastosViaje > 0) && (
                      <div className="bg-[#003DA5] text-white rounded-xl px-6 py-5 shadow-sm border border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                            Total Estimado de la Comisión
                          </p>
                          <p className="text-2xl font-black text-white tracking-tight">
                            {formatearMoneda(form.montoViaticos + form.montoGastosViaje)}
                          </p>
                          <p className="text-xs text-blue-100 font-medium">
                            Viáticos ({formatearMoneda(form.montoViaticos)}) + Desplazamiento ({formatearMoneda(form.montoGastosViaje)})
                          </p>
                        </div>
                        <div className="sm:text-right shrink-0">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/15 text-white border border-white/20 shadow-xs">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                            Total consolidado
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {alertaSolapamiento && (
                <div className="rounded-xl border-2 border-amber-400 bg-amber-50/95 p-4 space-y-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          Alerta de Duplicidad / Solapamiento de Fechas
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                          Bloqueo preventivo
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                        {alertaSolapamiento.mensaje}
                      </p>
                      {alertaSolapamiento.solicitudConflicto && (
                        <div className="bg-white/90 border border-amber-200 rounded-lg p-2.5 text-xs text-slate-800 space-y-1">
                          <p className="font-semibold text-slate-900">
                            Solicitud en conflicto:{' '}
                            <span className="font-bold text-[#003DA5]">
                              {alertaSolapamiento.solicitudConflicto.consecutivoUnico || alertaSolapamiento.solicitudConflicto.id}
                            </span>{' '}
                            <span className="text-[11px] text-slate-500 font-normal">
                              ({alertaSolapamiento.solicitudConflicto.estadoSolicitud})
                            </span>
                          </p>
                          <p className="text-slate-600 text-[11px]">
                            Vigencia en conflicto:{' '}
                            <strong>
                              {alertaSolapamiento.solicitudConflicto.fechaInicio ? new Date(alertaSolapamiento.solicitudConflicto.fechaInicio).toLocaleDateString() : ''} al{' '}
                              {alertaSolapamiento.solicitudConflicto.fechaFin ? new Date(alertaSolapamiento.solicitudConflicto.fechaFin).toLocaleDateString() : ''}
                            </strong>{' '}
                            {alertaSolapamiento.solicitudConflicto.destinoCiudad && `— Destino: ${alertaSolapamiento.solicitudConflicto.destinoCiudad}`}
                          </p>
                        </div>
                      )}
                      <div className="text-[11px] text-amber-800 font-medium bg-amber-100/70 rounded-md p-2 border border-amber-200/80">
                        ⚠️ <strong>Primera advertencia:</strong> No se le permite continuar automáticamente para prevenir duplicidad. Si aún así desea continuar guardando el borrador y cargando soportes, puede pulsar nuevamente <em>"Guardar y Continuar"</em> o hacer clic en el botón a continuación. Tenga en cuenta que en la etapa final de radicación la validación del sistema no le permitirá culminar el proceso.
                      </div>
                      <div className="pt-1 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          disabled={enviando}
                          onClick={() => void guardarYBorrador(true)}
                          className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          {enviando && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                          Continuar de todos modos al cargue de soportes <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {errorValidacion && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                  {errorValidacion}
                </p>
              )}

              {/* Botones de navegación del Paso 2 */}
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
                  className="px-5 py-2.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
                >
                  {enviando && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Guardar y Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {paso === 3 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                3. Documentos de la Comisión
              </h4>
              {alertaSolapamiento && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800 block">
                      Aviso de Solapamiento de Fechas
                    </span>
                    <p className="text-[11px] leading-snug">
                      Esta solicitud presenta cruce de fechas con otra comisión del comisionado ({alertaSolapamiento.solicitudConflicto?.consecutivoUnico || 'comisión existente'}). Puede completar el cargue de soportes en modo borrador, pero al radicarla definitivamente el sistema bloqueará la radicación hasta corregir las fechas.
                    </p>
                  </div>
                </div>
              )}
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
                    const ayuda = obtenerAyudaValidacionDocumento(doc.codigo, doc.instruccionesValidacion, {
                      form,
                      comisionado,
                    }, doc.camposAValidar);
                    const esAlerta = ayuda?.badgeTipo === 'alert';
                    const esWarning = ayuda?.badgeTipo === 'warning';

                    return (
                      <div key={doc.codigo} className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs hover:border-blue-200 transition-colors">
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
                          <div key={d.id} className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                            <p className="text-[10px] text-slate-500 truncate">
                              {d.nombreArchivoOriginal} · {d.tipoMime}
                            </p>
                            <button
                              type="button"
                              title="Previsualizar PDF"
                              aria-label="Previsualizar documento"
                              onClick={() => abrirPrevisualizacion(d)}
                              className="p-1 rounded-md text-[#003DA5] hover:bg-blue-50 transition-colors shrink-0 inline-flex items-center gap-1 text-[10px] font-medium"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver PDF
                            </button>
                          </div>
                        ))}

                        {ayuda && (
                          <div
                            className={`mt-2.5 rounded-xl p-3 border text-xs transition-colors ${
                              esAlerta
                                ? 'bg-amber-50/70 border-amber-200/90 text-amber-950'
                                : esWarning
                                ? 'bg-sky-50/70 border-sky-200/90 text-slate-800'
                                : 'bg-slate-50/90 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`p-1.5 rounded-lg shrink-0 ${
                                  esAlerta
                                    ? 'bg-amber-100 text-amber-700'
                                    : esWarning
                                    ? 'bg-sky-100 text-[#003DA5]'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </div>
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500">
                                    Pauta de validación
                                  </span>
                                  {ayuda.notaAlerta && (
                                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300/60">
                                      {ayuda.notaAlerta}
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-700 leading-snug">
                                  {ayuda.instruccion}
                                </p>

                                {ayuda.datosAContrastar.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-slate-200/80">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                                      <Search className="w-3 h-3 text-[#003DA5]" />
                                      Campos a validar según el documento:
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {ayuda.datosAContrastar.map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="bg-white/95 border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs flex flex-col"
                                        >
                                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight">
                                            {item.etiqueta}
                                          </span>
                                          <span className="text-[11px] font-bold text-slate-800 truncate" title={item.valor}>
                                            {item.valor}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {!faltan && (
                                  <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium">
                                    <CheckCircle className="w-3 h-3 shrink-0" />
                                    Soporte cargado. Verifica en la previsualización del PDF que los datos coincidan fielmente.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
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
                    const ayuda = obtenerAyudaValidacionDocumento(doc.codigo, doc.instruccionesValidacion, {
                      form,
                      comisionado,
                    }, doc.camposAValidar);
                    const esAlerta = ayuda?.badgeTipo === 'alert';
                    const esWarning = ayuda?.badgeTipo === 'warning';

                    return (
                      <div key={doc.codigo} className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs hover:border-blue-200 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-xs">{doc.nombre}</p>
                            <p className="text-[10px] text-slate-400">{doc.codigo}</p>
                            {doc.descripcion && (
                              <p className="text-[10px] text-slate-400">{doc.descripcion}</p>
                            )}
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
                          <div key={d.id} className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                            <p className="text-[10px] text-slate-500 truncate">
                              {d.nombreArchivoOriginal} · {d.tipoMime}
                            </p>
                            <button
                              type="button"
                              title="Previsualizar PDF"
                              aria-label="Previsualizar documento"
                              onClick={() => abrirPrevisualizacion(d)}
                              className="p-1 rounded-md text-[#003DA5] hover:bg-blue-50 transition-colors shrink-0 inline-flex items-center gap-1 text-[10px] font-medium"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver PDF
                            </button>
                          </div>
                        ))}

                        {ayuda && (
                          <div
                            className={`mt-2.5 rounded-xl p-3 border text-xs transition-colors ${
                              esAlerta
                                ? 'bg-amber-50/70 border-amber-200/90 text-amber-950'
                                : esWarning
                                ? 'bg-sky-50/70 border-sky-200/90 text-slate-800'
                                : 'bg-slate-50/90 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`p-1.5 rounded-lg shrink-0 ${
                                  esAlerta
                                    ? 'bg-amber-100 text-amber-700'
                                    : esWarning
                                    ? 'bg-sky-100 text-[#003DA5]'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </div>
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500">
                                    Pauta de validación
                                  </span>
                                  {ayuda.notaAlerta && (
                                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300/60">
                                      {ayuda.notaAlerta}
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-700 leading-snug">
                                  {ayuda.instruccion}
                                </p>

                                {ayuda.datosAContrastar.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-slate-200/80">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                                      <Search className="w-3 h-3 text-[#003DA5]" />
                                      Campos a validar según el documento:
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {ayuda.datosAContrastar.map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="bg-white/95 border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs flex flex-col"
                                        >
                                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight">
                                            {item.etiqueta}
                                          </span>
                                          <span className="text-[11px] font-bold text-slate-800 truncate" title={item.valor}>
                                            {item.valor}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {!faltan && (
                                  <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium">
                                    <CheckCircle className="w-3 h-3 shrink-0" />
                                    Soporte cargado. Verifica en la previsualización del PDF que los datos coincidan fielmente.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
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
                  className="px-5 py-2.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  Guardar y Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {paso === 4 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                4. Confirmación de la Solicitud
              </h4>
              {alertaSolapamiento && (
                <div className="rounded-xl border border-red-300 bg-red-50/95 p-3.5 flex items-start gap-3 text-xs text-red-900 shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="font-bold text-xs uppercase tracking-wider text-red-800 block">
                      ⚠️ Bloqueo por Cruce de Fechas / Duplicidad
                    </span>
                    <p className="text-[11px] leading-relaxed text-red-900">
                      Esta solicitud tiene fechas que se cruzan con la comisión <strong>{alertaSolapamiento.solicitudConflicto?.consecutivoUnico || alertaSolapamiento.solicitudConflicto?.id || 'existente'}</strong>. Al presionar <em>"Enviar a Firmas de Aprobación"</em>, el sistema rechazará la radicación. Para poder radicarla, regrese al paso de <strong>Objeto y Destino</strong> y ajuste las fechas del itinerario.
                    </p>
                    <button
                      type="button"
                      onClick={() => irPaso(2)}
                      className="mt-1 px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft className="w-3 h-3" /> Regresar y ajustar fechas
                    </button>
                  </div>
                </div>
              )}
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
                      {formatearDiasComision(Number(form.diasComision || calcularDiasComision(form.fechaInicio, form.fechaFin)))}
                    </span>
                  </div>
                )}
                {!esCampoOculto('rubroPresupuestal') && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Rubro</span>
                    <span className="font-semibold text-slate-800">{form.rubroPresupuestal}</span>
                  </div>
                )}
                {!esCampoOculto('numeroCdp') && form.numeroCdp && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Número de CDP</span>
                    <span className="font-semibold text-slate-800 font-mono">{form.numeroCdp}</span>
                  </div>
                )}
                {!esCampoOculto('fechaCdp') && form.fechaCdp && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Fecha de CDP</span>
                    <span className="font-semibold text-slate-800">{form.fechaCdp}</span>
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
                {(form.salarioBasico ?? 0) > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Salario básico mensual</span>
                    <span className="font-semibold text-slate-800">{formatearMoneda(form.salarioBasico ?? 0)}</span>
                  </div>
                )}
                
                {dependenciaId && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Dependencia solicitante</span>
                    <span className="font-semibold text-slate-800">
                      {dependencias.find((d) => d.codDependencia === dependenciaId)?.nomDependencia || dependenciaId}
                    </span>
                  </div>
                )}
                {!esCampoOculto('montoViaticos') && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Total Viáticos (Sec. 3)</span>
                    <span className="font-semibold text-slate-800">{formatearMoneda(form.montoViaticos)}</span>
                  </div>
                )}
                {!esCampoOculto('montoGastosViaje') && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-400 font-bold">Gastos Desplazamiento / Transporte (Sec. 4)</span>
                    <span className="font-semibold text-slate-800">{formatearMoneda(form.montoGastosViaje)}</span>
                  </div>
                )}
                {!esCampoOculto('montoViaticos') && !esCampoOculto('montoGastosViaje') && (
                  <div className="flex justify-between px-4 py-2.5 bg-slate-50 font-bold">
                    <span className="text-slate-700">TOTAL VIÁTICOS, TRANSPORTES Y DESPLAZAMIENTOS*</span>
                    <span className="font-black text-slate-900 text-sm">
                      {formatearMoneda(form.montoViaticos + form.montoGastosViaje)}
                    </span>
                  </div>
                )}
                {!esCampoOculto('objetoComision') && (
                  <div className="px-4 py-2.5">
                    <span className="text-slate-400 font-bold block mb-1">Objeto</span>
                    <p className="bg-slate-50 rounded-lg p-2.5 text-slate-700 leading-relaxed">{form.objetoComision}</p>
                  </div>
                )}
                {/* Campos adicionales configurados */}
                {camposCatalogo
                  .filter((c) => c.activo && !camposEstandar.has(c.clave) && !esCampoOculto(c.clave))
                  .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                  .map((campo) => {
                    const val = form.camposAdicionales?.[campo.clave];
                    if (val === undefined || val === null || val === '') return null;
                    let displayVal = String(val);
                    if (typeof val === 'boolean') {
                      displayVal = val ? 'Sí' : 'No';
                    } else if (campo.tipoCampo === 'CURRENCY' && typeof val === 'number') {
                      displayVal = formatearMoneda(val);
                    } else if (campo.tipoCampo?.toUpperCase() === 'SELECT' && campo.opciones) {
                      const matched = (campo.opciones as any[]).find((o) => {
                        const v = typeof o === 'string' ? o : (o?.value ?? o?.valor);
                        return String(v) === String(val);
                      });
                      if (matched) {
                        displayVal = typeof matched === 'string' ? matched : (matched.label ?? matched.nombre ?? matched.value ?? displayVal);
                      }
                    }

                    return (
                      <div key={campo.clave} className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-400 font-bold">{campo.etiqueta}</span>
                        <span className="font-semibold text-slate-800">{displayVal}</span>
                      </div>
                    );
                  })}
                {form.itinerario && form.itinerario.length > 0 && (() => {
                  const sync = sincronizarItinerarioFormulario(form.itinerario);
                  return (
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 border-y border-blue-100">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#003DA5] bg-blue-100/80 px-2 py-0.5 rounded">
                          Ruta General Consolidada
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-800 mb-1">
                        {sync.rutaGeneral || `${sync.origenCiudad || '—'} → ${sync.destinoCiudad || '—'}`}
                      </div>
                      <div className="text-xs text-slate-600 mb-3">
                        {sync.fechaInicio} al {sync.fechaFin}
                      </div>

                      <span className="text-slate-400 font-bold block mb-2 text-[11px] uppercase tracking-wider">
                        Desglose de tramos ({form.itinerario.length})
                      </span>
                      <div className="space-y-1.5">
                        {form.itinerario.map((ruta, idx) => (
                          <div key={ruta.id} className="flex flex-wrap items-center gap-1.5 text-[10px] bg-white border border-blue-100/80 rounded-lg px-2.5 py-1.5 shadow-xs">
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#003DA5] text-white text-[8px] font-black">{idx + 1}</span>
                            <span className="font-bold text-slate-700">{ruta.origenCiudad || 'Origen'}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-slate-700">{ruta.destinoCiudad || 'Destino'}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600">{ruta.fechaSalida} al {ruta.fechaLlegada}</span>
                            <span className="text-slate-400">·</span>
                            <span className="inline-flex items-center gap-0.5 text-slate-700 font-semibold">
                              <Clock className="w-2.5 h-2.5 text-blue-600" /> Hora del viaje: {ruta.horaEstimadaSalida || ruta.horarioEstimadoMilitar || '—'}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="inline-flex items-center px-1 py-0 rounded text-[8px] font-bold bg-slate-200 text-slate-600">
                              {ruta.tipoTrayecto === 'SOLO_IDA' ? 'IDA' : 'ID/VUELTA'}
                            </span>
                            {ruta.tipoTransporte && (
                              <span className="inline-flex items-center px-1 py-0 rounded text-[8px] font-bold bg-blue-100 text-blue-700">
                                {ruta.tipoTransporte}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
                  disabled={!checklistCompleto() || finalizando || solicitandoOtpEnlace}
                  onClick={() => void finalizarSolicitud()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {solicitandoOtpEnlace
                    ? 'Enviando OTP...'
                    : finalizando
                    ? 'Consolidando...'
                    : 'Firmar y Pasar a Firmas'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Modal Institucional de Firma Digital OTP para Enlace de Dependencia */}
      {modalFirmaEnlaceAbierta && solicitudBorrador && (
        <FirmaDigitalViaticosModal
          isOpen={modalFirmaEnlaceAbierta}
          solicitudId={solicitudBorrador.id}
          consecutivo={solicitudBorrador.codigoSolicitud || 'Borrador'}
          comisionadoNombre={formatearNombreComisionado(comisionado)}
          destino={form.destinoCiudad || ''}
          fechas={
            obtenerFechasItinerario().fechaInicio && obtenerFechasItinerario().fechaFin
              ? `${obtenerFechasItinerario().fechaInicio} al ${obtenerFechasItinerario().fechaFin}`
              : ''
          }
          firmanteNombre={obtenerNombreEnlace()}
          firmanteCargo="Enlace de Dependencia"
          etapaLabel="Firma de Elaboración y Remisión a Firmas"
          correoDestino={otpDataEnlace?.emailEnviadoA}
          devCode={otpDataEnlace?.devCode}
          onVerifyCodigo={async (codigoOtp: string) => {
            await viaticosService.verificarOtpFirma(solicitudBorrador.id, {
              verificationId: otpDataEnlace?.verificationId || '',
              code: codigoOtp,
              otp: codigoOtp,
              tipoFirma: 'ENLACE_ELABORO',
              consume: false,
            });
          }}
          onFirmaCompleta={handleFirmaEnlaceCompleta}
          onCancelar={() => setModalFirmaEnlaceAbierta(false)}
        />
      )}

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

      <VisorDocumentosFlotante
        documentos={documentosVisor}
        onCerrar={cerrarDocumentoVisor}
      />
    </div>
  );
}
