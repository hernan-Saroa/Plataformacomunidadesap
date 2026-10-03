import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSignature,
  FileText,
  Info,
  MapPin,
  Paperclip,
  PenTool,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
  XCircle,
} from 'lucide-react';
import {
  EstadoFirmasResponse,
  FirmanteRequerido,
  FirmarSolicitudPayload,
  SolicitudComisionResponse,
  TipoFirmaAprobacion,
} from '../types/viaticos';
import viaticosService from '../services/api/viaticosService';
import { authService } from '../services/api/authService';
import FirmaDigitalViaticosModal, { FirmaDigitalData } from './FirmaDigitalViaticosModal';
import VisorDocumentosFlotante, { useVisorDocumentos } from './VisorDocumentosFlotante';

interface Props {
  solicitudId: string;
  consecutivoUnico?: string;
  codigoSolicitud?: string;
  solicitudInicial?: any;
  abierta?: boolean;
  isOpen?: boolean;
  onCerrar?: () => void;
  onClose?: () => void;
  onFirmasCompletadas?: (solicitud: SolicitudComisionResponse) => void;
  onFirmadoExitoso?: () => void;
  onSolicitudDevuelta?: (solicitud: SolicitudComisionResponse) => void;
  modoInicialDevolucion?: boolean;
}

export default function ModalFirmasAprobacion({
  solicitudId,
  consecutivoUnico,
  codigoSolicitud,
  solicitudInicial,
  abierta,
  isOpen,
  onCerrar,
  onClose,
  onFirmasCompletadas,
  onFirmadoExitoso,
  onSolicitudDevuelta,
  modoInicialDevolucion,
}: Props) {
  const visible = abierta ?? isOpen ?? false;
  const cerrar = onCerrar || onClose || (() => {});
  const codigo = consecutivoUnico || codigoSolicitud || '';
  const [cargando, setCargando] = useState(true);
  const [estadoFirmas, setEstadoFirmas] = useState<EstadoFirmasResponse | null>(null);
  const [solicitudDetalle, setSolicitudDetalle] = useState<any | null>(solicitudInicial || null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [pestaña, setPestaña] = useState<'REVISION' | 'FIRMAS'>(
    modoInicialDevolucion ? 'FIRMAS' : 'REVISION',
  );

  // Selección de firmante activo para firmar
  const [firmanteSeleccionado, setFirmanteSeleccionado] = useState<TipoFirmaAprobacion>('JEFE_DEPENDENCIA');
  const [nombreFirmante, setNombreFirmante] = useState('');
  const [cargoFirmante, setCargoFirmante] = useState('');
  const [esAusencia, setEsAusencia] = useState(false);
  const [motivoAusencia, setMotivoAusencia] = useState('');
  const [comentarios, setComentarios] = useState('');

  // Acciones en progreso
  const [procesandoFirma, setProcesandoFirma] = useState(false);
  const [enviandoAlerta, setEnviandoAlerta] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Firma Digital OTP (estándar institucional ESAP)
  const [modalFirmaDigitalAbierta, setModalFirmaDigitalAbierta] = useState(false);
  const [solicitandoOtp, setSolicitandoOtp] = useState(false);
  const [otpData, setOtpData] = useState<{
    verificationId?: string;
    emailEnviadoA?: string;
    devCode?: string;
  } | null>(null);

  // Modo devolución
  const [modoDevolucion, setModoDevolucion] = useState(Boolean(modoInicialDevolucion));
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [devolviendo, setDevolviendo] = useState(false);

  // Previsualización PDF Formato 023 y Documentos Flotantes
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const {
    documentosVisor,
    abrirDocumentoVisor,
    cerrarDocumentoVisor,
  } = useVisorDocumentos();

  // Cargar estado de firmas y detalle de la solicitud
  const cargarEstado = async () => {
    if (!solicitudId) return;
    setCargando(true);
    setErrorCarga(null);
    try {
      const promCompleta =
        typeof viaticosService.obtenerSolicitudCompleta === 'function'
          ? viaticosService.obtenerSolicitudCompleta(solicitudId).catch(() => null)
          : Promise.resolve(null);
      const [data, completa] = await Promise.all([
        viaticosService.obtenerEstadoFirmas(solicitudId),
        promCompleta,
      ]);
      setEstadoFirmas(data);
      if (completa) {
        setSolicitudDetalle(completa);
      }

      // Asignar el rol que corresponde al usuario autenticado (sin permitir firmar por el otro rol)
      const esGerenteUser = Boolean(authService.isGerenteProyecto?.());
      const esJefeUser = Boolean(authService.isJefeDependencia?.());
      const esAnalistaUser = Boolean(authService.isAnalista?.());
      const esAdminUser = Boolean(authService.getCurrentUserSync()?.esAdmin) || Boolean(authService.isSuperAdmin?.());

      const fJefe = data.firmantes.find((f) => f.tipo === 'JEFE_DEPENDENCIA');
      const fGerente = data.firmantes.find((f) => f.tipo === 'GERENTE_PROYECTO');

      let miRol: TipoFirmaAprobacion = 'JEFE_DEPENDENCIA';
      if (esGerenteUser && (!esJefeUser || fJefe?.firmado)) {
        miRol = 'GERENTE_PROYECTO';
      } else if (esJefeUser && (!esGerenteUser || !fJefe?.firmado)) {
        miRol = 'JEFE_DEPENDENCIA';
      } else if (esAnalistaUser && !esJefeUser && !esGerenteUser) {
        miRol = 'ANALISTA';
      } else if (esAdminUser) {
        if (fJefe && !fJefe.firmado) {
          miRol = 'JEFE_DEPENDENCIA';
        } else if (fGerente && !fGerente.firmado) {
          miRol = 'GERENTE_PROYECTO';
        } else {
          const p = data.firmantes.find((f) => !f.firmado);
          if (p) miRol = p.tipo;
        }
      } else {
        const p = data.firmantes.find((f) => !f.firmado);
        if (p) miRol = p.tipo;
      }
      setFirmanteSeleccionado(miRol);
      const firmanteObj = data.firmantes.find((f) => f.tipo === miRol);
      if (firmanteObj?.cargo) {
        setCargoFirmante(firmanteObj.cargo);
      }

      // Pre-llenar datos de usuario autenticado
      const user = authService.getCurrentUserSync?.() || (authService as any).getCurrentUser?.();
      if (user && typeof (user as any).then !== 'function') {
        const nombreCompleto =
          `${user.primerNombre || ''} ${user.segundoNombre || ''} ${user.primerApellido || ''} ${user.segundoApellido || ''}`.trim() ||
          user.nombre ||
          user.email ||
          '';
        if (nombreCompleto && !nombreFirmante) {
          setNombreFirmante(nombreCompleto);
        }
      }
    } catch (e: any) {
      console.error('Error cargando estado de firmas:', e);
      setErrorCarga(
        e?.response?.data?.message ||
          e?.message ||
          'No fue posible obtener el estado de firmas de la solicitud.',
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (visible && solicitudId) {
      void cargarEstado();
    }
  }, [visible, solicitudId]);

  // Actualizar cargo por defecto cuando cambia el firmante seleccionado
  useEffect(() => {
    if (estadoFirmas) {
      const f = estadoFirmas.firmantes.find((item) => item.tipo === firmanteSeleccionado);
      if (f && f.cargo) {
        setCargoFirmante(f.cargo);
      } else if (firmanteSeleccionado === 'ANALISTA') {
        setCargoFirmante('Analista de Viáticos / Grupo de Gestión Financiera');
      }
    }
  }, [firmanteSeleccionado, estadoFirmas]);

  // Generar estampa digital certificada institucional (conforme a Ley 527 de 1999)
  const generarEstampaDigital = (nombre: string, cargo: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Fondo limpio
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borde institucional
    ctx.strokeStyle = '#003DA5';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Texto de encabezado de seguridad
    ctx.fillStyle = '#003DA5';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('ESAP — FIRMADO DIGITALMENTE', 16, 24);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(nombre.slice(0, 36), 16, 52);

    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText(cargo.slice(0, 42), 16, 72);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    const ahora = new Date().toISOString();
    ctx.fillText(`FECHA/HORA: ${ahora}`, 16, 96);
    ctx.fillText('VALIDACIÓN: HASH CRIPTOGRÁFICO SHA-256', 16, 112);

    return canvas.toDataURL('image/png');
  };

  const obtenerNombreFirmanteFinal = () => {
    if (nombreFirmante.trim() && !nombreFirmante.includes('@')) return nombreFirmante.trim();
    const user = authService.getCurrentUserSync?.() || (authService as any).getCurrentUser?.();
    const deUser =
      (user as any)?.fullName ||
      (user as any)?.full_name ||
      [(user as any)?.firstName, (user as any)?.lastName].filter(Boolean).join(' ') ||
      [user?.primerNombre, user?.segundoNombre, user?.primerApellido, user?.segundoApellido].filter(Boolean).join(' ') ||
      user?.person?.full_name ||
      (user?.person as any)?.nom_largo ||
      [(user?.person as any)?.nom_tercero, (user?.person as any)?.pri_apellido, (user?.person as any)?.seg_apellido].filter(Boolean).join(' ') ||
      user?.nombre ||
      '';
    if (deUser && !deUser.includes('@')) return deUser.trim();
    const f = estadoFirmas?.firmantes.find((item) => item.tipo === miRolFirmante || item.tipo === firmanteSeleccionado);
    if (f?.nombre && !f.nombre.includes('@')) return f.nombre;
    if (firmanteSeleccionado === 'JEFE_DEPENDENCIA' || miRolFirmante === 'JEFE_DEPENDENCIA') return 'Jefe de Dependencia / Supervisor';
    if (firmanteSeleccionado === 'GERENTE_PROYECTO' || miRolFirmante === 'GERENTE_PROYECTO') return 'Gerente de Proyecto';
    if (miRolFirmante === 'ANALISTA') return 'Analista de Viáticos';
    return 'Funcionario Autorizador';
  };

  const obtenerCargoFirmanteFinal = () => {
    if (cargoFirmante.trim()) return cargoFirmante.trim();
    const f = estadoFirmas?.firmantes.find((item) => item.tipo === miRolFirmante || item.tipo === firmanteSeleccionado);
    if (f?.cargo) return f.cargo;
    if (firmanteSeleccionado === 'JEFE_DEPENDENCIA' || miRolFirmante === 'JEFE_DEPENDENCIA') return 'Jefe de Dependencia / Supervisor';
    if (firmanteSeleccionado === 'GERENTE_PROYECTO' || miRolFirmante === 'GERENTE_PROYECTO') return 'Gerente de Proyecto';
    if (miRolFirmante === 'ANALISTA') return 'Analista de Viáticos';
    return 'Funcionario Autorizador';
  };

  // Preparar datos base de la firma (resolución automática de firmante institucional)
  const prepararPayloadBase = (): FirmarSolicitudPayload | null => {
    setErrorAccion(null);
    setMensajeExito(null);

    const nombreFinal = obtenerNombreFirmanteFinal();
    const cargoFinal = obtenerCargoFirmanteFinal();
    const firmaImagen = generarEstampaDigital(nombreFinal, cargoFinal);

    const userDoc =
      (currentUser as any)?.cedula ||
      (currentUser as any)?.numeroDocumento ||
      (currentUser as any)?.num_identificacion ||
      (currentUser as any)?.person?.num_identificacion ||
      (currentUser as any)?.person?.numeroDocumento ||
      (currentUser as any)?.documento ||
      undefined;

    return {
      tipoFirma: miRolFirmante,
      nombreFirmante: nombreFinal,
      cargoFirmante: cargoFinal,
      documentoIdentidad: userDoc ? String(userDoc).trim() : undefined,
      firmaImagen,
      esAusencia: false,
      comentarios: comentarios.trim() || undefined,
    };
  };

  // Solicitar OTP e iniciar modal de firma digital
  const handleIniciarFirmaOtp = async () => {
    const base = prepararPayloadBase();
    if (!base) return;

    setSolicitandoOtp(true);
    setErrorAccion(null);
    try {
      const resp = await viaticosService.solicitarOtpFirma(solicitudId, {
        tipoFirma: miRolFirmante,
      });
      setOtpData({
        verificationId: resp.verificationId,
        emailEnviadoA: resp.emailEnviadoA || resp.email,
        devCode: resp.devCode,
      });
      setModalFirmaDigitalAbierta(true);
    } catch (e: any) {
      console.error('Error solicitando OTP de firma:', e);
      setErrorAccion(
        e?.response?.data?.message ||
          e?.message ||
          'No fue posible solicitar el código OTP de verificación. Intente nuevamente.',
      );
    } finally {
      setSolicitandoOtp(false);
    }
  };

  // Confirmar firma digital tras verificación del OTP y hash criptográfico
  const handleFirmaDigitalCompleta = async (firma: FirmaDigitalData) => {
    const base = prepararPayloadBase();
    if (!base) return false;

    const payload: FirmarSolicitudPayload = {
      ...base,
      otp: firma.codigoOtp,
      verificationId: otpData?.verificationId,
      certificadoId: firma.certificado_id,
      hashSha256: firma.hash,
    };

    setProcesandoFirma(true);
    try {
      const resp = await viaticosService.firmarSolicitud(solicitudId, payload);
      setMensajeExito(resp.mensaje);
      await cargarEstado();
      onFirmadoExitoso?.();

      if (resp.radicada) {
        onFirmasCompletadas?.(resp.solicitud);
        setTimeout(() => {
          cerrar();
        }, 1800);
      }
      return true;
    } catch (e: any) {
      console.error('Error registrando firma digital:', e);
      setErrorAccion(
        e?.response?.data?.message ||
          e?.message ||
          'No fue posible registrar la firma digital de aprobación.',
      );
      throw e;
    } finally {
      setProcesandoFirma(false);
    }
  };

  // Fallback de firma directa si se requiere
  const handleFirmar = handleIniciarFirmaOtp;

  // Devolver solicitud
  const handleDevolver = async () => {
    if (!motivoDevolucion.trim()) {
      setErrorAccion('Debe ingresar el motivo detallado de la devolución.');
      return;
    }

    setDevolviendo(true);
    setErrorAccion(null);
    try {
      const resp = await viaticosService.devolverFirma(solicitudId, {
        motivo: motivoDevolucion.trim(),
      });
      setMensajeExito(resp.message || 'Solicitud devuelta correctamente con observaciones.');
      setModoDevolucion(false);
      onSolicitudDevuelta?.(resp.solicitud);
      setTimeout(() => {
        cerrar();
      }, 1500);
    } catch (e: any) {
      console.error('Error devolviendo solicitud:', e);
      setErrorAccion(
        e?.response?.data?.message ||
          e?.message ||
          'No fue posible devolver la solicitud.',
      );
    } finally {
      setDevolviendo(false);
    }
  };

  // Previsualizar Formato 023 en visor flotante / mitad de pantalla
  const handlePrevisualizarFormato023Flotante = async () => {
    setDescargandoPdf(true);
    try {
      const blob = await viaticosService.exportarFormato023(
        solicitudId,
        consecutivoUnico || '023',
      );
      const url = window.URL.createObjectURL(blob);
      abrirDocumentoVisor({
        url,
        nombre: `Formato 023 — ${consecutivoUnico || codigoSolicitud || 'comision'}.pdf`,
        tipo: 'Formato 023 Oficial',
        mime: 'application/pdf',
      });
    } catch (e) {
      console.error('Error visualizando Formato 023 en visor flotante:', e);
      setErrorAccion('No fue posible abrir el Formato 023 en el visor flotante.');
    } finally {
      setDescargandoPdf(false);
    }
  };

  // Previsualizar / Descargar Formato 023 directamente
  const handleDescargarFormato023 = async () => {
    setDescargandoPdf(true);
    try {
      const blob = await viaticosService.exportarFormato023(
        solicitudId,
        consecutivoUnico || '023',
      );
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    } catch (e) {
      console.error('Error visualizando Formato 023:', e);
      setErrorAccion('No fue posible generar la vista previa del Formato 023.');
    } finally {
      setDescargandoPdf(false);
    }
  };

  if (!visible) return null;

  const firmante1 = estadoFirmas?.firmantes.find((f) => f.tipo === 'JEFE_DEPENDENCIA');
  const firmante2 = estadoFirmas?.firmantes.find((f) => f.tipo === 'GERENTE_PROYECTO');
  const firmante3 = estadoFirmas?.firmantes.find(
    (f) => f.tipo === 'ANALISTA' || (f.tipo as string) === 'ANALISTA_VIATICOS',
  );
  const esReglaEspecial = estadoFirmas?.reglaDesplazamiento && estadoFirmas.reglaDesplazamiento !== 'REGULAR';
  const todasFirmadas = Boolean(estadoFirmas?.completado);

  const currentUser = authService.getCurrentUserSync();
  const esGerente = Boolean(authService.isGerenteProyecto?.());
  const esJefe = Boolean(authService.isJefeDependencia?.());
  const esAnalista = Boolean(authService.isAnalista?.());
  const esAdmin = Boolean(currentUser?.esAdmin) || Boolean(authService.isSuperAdmin?.());
  const esEnlace = Boolean(authService.isEnlaceDependencia?.());

  // Permisos efectivos de firma según roles
  const puedeFirmarComoJefe = Boolean(esAdmin || esJefe) && Boolean(firmante1 && !firmante1.firmado);
  const puedeFirmarComoGerente = Boolean(esAdmin || esGerente) && Boolean(firmante2 && !firmante2.firmado);
  const puedeFirmarComoAnalista = Boolean(esAdmin || esAnalista) && Boolean(firmante3 && !firmante3.firmado);

  // Rol específico con el que firma el usuario autenticado (respeta selección explícita del usuario)
  let miRolFirmante: TipoFirmaAprobacion = firmanteSeleccionado || 'JEFE_DEPENDENCIA';
  if (miRolFirmante === 'GERENTE_PROYECTO' && !puedeFirmarComoGerente && puedeFirmarComoJefe) {
    miRolFirmante = 'JEFE_DEPENDENCIA';
  } else if (miRolFirmante === 'JEFE_DEPENDENCIA' && !puedeFirmarComoJefe && puedeFirmarComoGerente) {
    miRolFirmante = 'GERENTE_PROYECTO';
  } else if (!esAdmin && esGerente && !esJefe) {
    miRolFirmante = 'GERENTE_PROYECTO';
  } else if (!esAdmin && esJefe && !esGerente) {
    miRolFirmante = 'JEFE_DEPENDENCIA';
  } else if (!esAdmin && esAnalista && !esJefe && !esGerente) {
    miRolFirmante = 'ANALISTA';
  }

  // Firmante correspondiente a mi rol y estado de mi firma
  const miFirmanteObj = estadoFirmas?.firmantes.find((f) => f.tipo === miRolFirmante);
  const miFirmaFirmada = Boolean(miFirmanteObj?.firmado);
  const miTituloRol =
    miFirmanteObj?.titulo ||
    (miRolFirmante === 'JEFE_DEPENDENCIA'
      ? 'Jefe de Dependencia / Supervisor'
      : miRolFirmante === 'GERENTE_PROYECTO'
      ? 'Gerente de Proyecto'
      : 'Analista de Viáticos');

  // Rol del otro firmante para alertas
  const otroFirmanteTipo: TipoFirmaAprobacion =
    miRolFirmante === 'JEFE_DEPENDENCIA' ? 'GERENTE_PROYECTO' : 'JEFE_DEPENDENCIA';
  const otroFirmanteObj = estadoFirmas?.firmantes.find((f) => f.tipo === otroFirmanteTipo);
  const otroFirmantePendiente = Boolean(otroFirmanteObj && !otroFirmanteObj.firmado);
  const otroFirmanteTitulo =
    otroFirmanteObj?.titulo ||
    (otroFirmanteTipo === 'JEFE_DEPENDENCIA'
      ? 'Jefe de Dependencia / Supervisor'
      : 'Gerente de Proyecto');

  const puedeFirmar =
    !esEnlace &&
    (Boolean(authService.canFirmarAprobacion?.()) || esJefe || esGerente || esAnalista || esAdmin);

  // Enviar alerta y recordatorio de firma pendiente al otro rol
  const handleEnviarAlerta = async (tipoDestino?: TipoFirmaAprobacion) => {
    const destinoFinal: TipoFirmaAprobacion = tipoDestino || otroFirmanteTipo;
    const firmanteDestino = estadoFirmas?.firmantes.find((f) => f.tipo === destinoFinal);
    const tituloDestino =
      firmanteDestino?.titulo ||
      (destinoFinal === 'JEFE_DEPENDENCIA'
        ? 'Jefe de Dependencia / Supervisor'
        : 'Gerente de Proyecto');

    setEnviandoAlerta(true);
    setErrorAccion(null);
    setMensajeExito(null);
    try {
      const resp = await viaticosService.notificarFirmaPendiente(
        solicitudId,
        destinoFinal,
      );
      setMensajeExito(
        resp?.mensaje || `Alerta y recordatorio de firma enviado exitosamente a ${tituloDestino}.`,
      );
    } catch (e: any) {
      console.error('Error enviando alerta:', e);
      setErrorAccion(e?.message || 'No fue posible enviar la alerta al firmante pendiente.');
    } finally {
      setEnviandoAlerta(false);
    }
  };
  const firmasRegistradasCount =
    (firmante1?.firmado ? 1 : 0) +
    (firmante2?.firmado ? 1 : 0) +
    (firmante3?.firmado ? 1 : 0);

  const formatearMonedaLocal = (valor: number | undefined | null) => {
    return `$ ${(Number(valor) || 0).toLocaleString('es-CO')}`;
  };

  const formatearFechaAmigable = (val?: string | Date | null) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = meses[d.getMonth()];
    const anio = d.getFullYear();
    return `${dia} de ${mes} de ${anio}`;
  };

  const comisionadoData =
    solicitudDetalle?.comisionado || (solicitudDetalle as any)?.camposAdicionales?.comisionado || null;

  // El comisionado tiene campos separados (primerNombre, primerApellido, etc.), construimos el nombre completo
  const nombreComisionadoCompleto = comisionadoData
    ? [
        comisionadoData.primerNombre,
        comisionadoData.segundoNombre,
        comisionadoData.primerApellido,
        comisionadoData.segundoApellido,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() || comisionadoData.nombre
    : solicitudDetalle?.nombreComisionado || 'Funcionario en Comisión';

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 flex flex-col h-[88vh] max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Encabezado Fijo */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 shrink-0 bg-gradient-to-r from-slate-50 via-white to-blue-50/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-50 text-[#003DA5] rounded-xl shrink-0">
              <FileSignature className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  Control Previo a Radicación
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {consecutivoUnico || estadoFirmas?.consecutivoUnico || 'GF-FO-023'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
                Firmas de Aprobación de la Solicitud
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrevisualizarFormato023Flotante}
              disabled={descargandoPdf}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#003DA5] border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              title="Ver Formato 023 en visor flotante / mitad de pantalla"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Visor Formato 023</span>
            </button>
            <button
              type="button"
              onClick={cerrar}
              className="p-1.5 text-slate-400 hover:text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pestañas fijas bajo el encabezado */}
        {!cargando && estadoFirmas && (
          <div className="flex border-b border-slate-200 px-6 pt-2 shrink-0 bg-white gap-2">
            <button
              type="button"
              onClick={() => setPestaña('REVISION')}
              className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                pestaña === 'REVISION'
                  ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Revisión de la Solicitud y Soportes</span>
            </button>
            <button
              type="button"
              onClick={() => setPestaña('FIRMAS')}
              className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                pestaña === 'FIRMAS'
                  ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileSignature className="w-4 h-4" />
              <span>2. Firmas y Decisión de Aprobación</span>
              {todasFirmadas ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Firmado
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Pendiente
                </span>
              )}
            </button>
          </div>
        )}

        {/* Cuerpo del Modal con Scroll Interno Bounded */}
        <div 
          className="px-6 py-4 space-y-4 text-xs overflow-y-auto flex-1 min-h-0 scrollbar-thin"
          style={{ maxHeight: 'calc(88vh - 120px)', overscrollBehavior: 'contain' }}
        >
          {cargando && (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Cargando estado de firmas y validaciones institucionales…</p>
            </div>
          )}

          {errorCarga && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorCarga}</span>
            </div>
          )}

          {!cargando && estadoFirmas && (
            <>
              {/* ========================================================================= */}
              {/* PESTAÑA 1: REVISIÓN DE LA SOLICITUD, ITINERARIO Y DOCUMENTOS */}
              {/* ========================================================================= */}
              {pestaña === 'REVISION' && (
                <div className="space-y-4 pt-1">
                {/* Tarjeta del Funcionario Comisionado */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#003DA5] text-white flex items-center justify-center font-black text-lg shadow-sm">
                        {(nombreComisionadoCompleto || 'F').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Servidor Comisionado
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                          {nombreComisionadoCompleto}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          C.C. {comisionadoData?.numeroDocumento || (solicitudDetalle as any)?.cedulaComisionado || '—'} · Cargo:{' '}
                          <span className="font-semibold text-slate-700">
                            {comisionadoData?.cargo || (solicitudDetalle as any)?.cargoComisionado || 'Servidor Público'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {comisionadoData?.tipoComisionado || (solicitudDetalle as any)?.tipoComisionado || 'FUNCIONARIO'}
                      </span>
                      {comisionadoData?.esFacturadorElectronico && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Facturador Electrónico DIAN
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Dependencia</span>
                      <span className="font-semibold text-slate-800">
                        {comisionadoData?.dependencia || (solicitudDetalle as any)?.dependencia || 'Sede Central'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Correo Electrónico</span>
                      <span className="font-medium text-slate-700">
                        {comisionadoData?.email || (solicitudDetalle as any)?.email || 'No registrado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Teléfono de Contacto</span>
                      <span className="font-medium text-slate-700">
                        {comisionadoData?.telefonoContacto || (solicitudDetalle as any)?.telefono || 'No registrado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Objeto de la Comisión */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Objeto de la Comisión Oficial
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 font-medium italic leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    &ldquo;{solicitudDetalle?.objetoComision || (solicitudDetalle as any)?.camposAdicionales?.objetoComision || 'Comisión oficial de servicios institucionales'}&rdquo;
                  </p>
                </div>

                {/* Itinerario y Fechas */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#003DA5]" />
                      <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Itinerario y Tramos de Desplazamiento
                      </h5>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600">
                        {solicitudDetalle?.fechaInicio ? new Date(solicitudDetalle.fechaInicio).toLocaleDateString('es-CO') : '—'} al{' '}
                        {solicitudDetalle?.fechaFin ? new Date(solicitudDetalle.fechaFin).toLocaleDateString('es-CO') : '—'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {solicitudDetalle?.diasComision || 1} días
                      </span>
                    </div>
                  </div>

                  {Array.isArray(solicitudDetalle?.itinerario) && solicitudDetalle.itinerario.length > 0 ? (
                    <div className="space-y-2">
                      {solicitudDetalle.itinerario.map((tramo: any, idx: number) => (
                        <div key={tramo.id || idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#003DA5] text-white text-[10px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800">{tramo.origenCiudad || 'Origen'}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-slate-800">{tramo.destinoCiudad || 'Destino'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span>{tramo.fechaSalida} al {tramo.fechaLlegada}</span>
                            {tramo.tipoTransporte && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px]">
                                {tramo.tipoTransporte}
                              </span>
                            )}
                            {(tramo.horaEstimadaSalida || tramo.horarioEstimadoMilitar) && (
                              <span className="font-mono text-[10px] text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                {tramo.horaEstimadaSalida || tramo.horarioEstimadoMilitar} h
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 p-2.5 bg-slate-50 rounded-xl">
                      Destino principal: <strong>{solicitudDetalle?.destinoCiudad || (solicitudDetalle as any)?.ciudadDestino || 'Destino institucional'}</strong> ({solicitudDetalle?.destinoDepartamento || ''})
                    </div>
                  )}
                </div>

                {/* Presupuesto y Liquidación */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Liquidación Estimada de Gastos
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Viáticos</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {formatearMonedaLocal(solicitudDetalle?.montoViaticos || 0)}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Gastos de Viaje / Transporte</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {formatearMonedaLocal(solicitudDetalle?.montoGastosViaje || 0)}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/30">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Monto Total Estimado</span>
                      <span className="font-mono font-black text-emerald-700 text-base">
                        {formatearMonedaLocal(
                          (Number(solicitudDetalle?.montoViaticos) || 0) +
                            (Number(solicitudDetalle?.montoGastosViaje) || 0) ||
                            (Number(solicitudDetalle?.montoTotalEstimado) || 0),
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Soportes y Documentos Adjuntos */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-[#003DA5]" />
                      <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Soportes y Documentos Adjuntos ({solicitudDetalle?.documentosSoporte?.length || 0})
                      </h5>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrevisualizarFormato023Flotante}
                        disabled={descargandoPdf}
                        className="px-3 py-1.5 bg-blue-50 text-[#003DA5] hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Ver Formato 023 en visor flotante / mitad de pantalla"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {descargandoPdf ? 'Cargando…' : 'Visor Formato 023'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDescargarFormato023}
                        disabled={descargandoPdf}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Descargar Formato 023 en PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF 023
                      </button>
                    </div>
                  </div>

                  {Array.isArray(solicitudDetalle?.documentosSoporte) && solicitudDetalle.documentosSoporte.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {solicitudDetalle.documentosSoporte.map((doc: any) => {
                        const url = viaticosService.obtenerUrlArchivo(doc.urlRepositorio);
                        return (
                          <div key={doc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                              <div className="truncate">
                                <p className="text-xs font-bold text-slate-800 truncate" title={doc.nombreArchivo || doc.nombreArchivoOriginal}>
                                  {doc.nombreArchivo || doc.nombreArchivoOriginal}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {doc.tipoDocumento || 'Soporte PDF'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {url && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      abrirDocumentoVisor({
                                        url,
                                        nombre: doc.nombreArchivo || doc.nombreArchivoOriginal || 'Documento Soporte',
                                        tipo: doc.tipoDocumento || 'Soporte',
                                      })
                                    }
                                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-[#003DA5] hover:border-blue-300 transition-colors cursor-pointer"
                                    title="Ver en visor flotante / mitad de pantalla"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-slate-500 hover:text-[#003DA5] hover:bg-white rounded-lg transition-colors cursor-pointer"
                                    title="Abrir soporte en pestaña nueva"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-2">
                      No hay documentos soporte adicionales cargados en la solicitud.
                    </p>
                  )}
                </div>

                {/* Firmas Digitales Verificadas (Elaboración y Aprobaciones) */}
                {(() => {
                  const firmaElaboro =
                    estadoFirmas?.firmaElaboro ||
                    solicitudDetalle?.camposAdicionales?.firmaElaboro ||
                    null;
                  const tieneAlgunaFirma =
                    Boolean(firmaElaboro) ||
                    Boolean(firmante1?.firmado) ||
                    Boolean(firmante2?.firmado) ||
                    Boolean(firmante3?.firmado);

                  if (!tieneAlgunaFirma) return null;

                  return (
                    <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/20 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-black text-xs text-slate-800">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Firmas Digitales Verificadas en el Trámite</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Validadas con OTP
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {/* Elaboró - Enlace */}
                        {firmaElaboro && (
                          <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              1. Elaboró (Enlace)
                            </span>
                            <p className="font-black text-slate-900 truncate">
                              {firmaElaboro.nombreFirmante || 'Enlace de Dependencia'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {firmaElaboro.cargoFirmante || 'Enlace de Dependencia'}
                              {firmaElaboro.documentoIdentidad ? ` · C.C. ${firmaElaboro.documentoIdentidad}` : ''}
                            </p>
                            <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-700">
                              <span className="inline-flex items-center gap-1 font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verificada
                              </span>
                              <span className="font-mono text-slate-400">{formatearFechaAmigable(firmaElaboro.fechaFirma)}</span>
                            </div>
                          </div>
                        )}

                        {/* Aprobó - Jefe */}
                        {firmante1?.firmado && (
                          <div className="bg-white border border-emerald-200 rounded-xl p-3 text-xs space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              2. {firmante1.titulo || 'Jefe de Dependencia'}
                            </span>
                            <p className="font-black text-slate-900 truncate">
                              {firmante1.nombreFirmante || firmante1.firma?.nombreFirmante || 'Servidor Autorizado'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {firmante1.cargoFirmante || firmante1.firma?.cargoFirmante || firmante1.cargo}
                              {(firmante1.documentoIdentidad || firmante1.firma?.documentoIdentidad)
                                ? ` · C.C. ${firmante1.documentoIdentidad || firmante1.firma?.documentoIdentidad}`
                                : ''}
                            </p>
                            <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-700">
                              <span className="inline-flex items-center gap-1 font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verificada
                              </span>
                              <span className="font-mono text-slate-400">
                                {formatearFechaAmigable(firmante1.fechaFirma || firmante1.firma?.fechaFirma)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Aprobó - Gerente */}
                        {firmante2?.firmado && (
                          <div className="bg-white border border-emerald-200 rounded-xl p-3 text-xs space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              3. {firmante2.titulo || 'Gerente de Proyecto'}
                            </span>
                            <p className="font-black text-slate-900 truncate">
                              {firmante2.nombreFirmante || firmante2.firma?.nombreFirmante || 'Servidor Autorizado'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {firmante2.cargoFirmante || firmante2.firma?.cargoFirmante || firmante2.cargo}
                              {(firmante2.documentoIdentidad || firmante2.firma?.documentoIdentidad)
                                ? ` · C.C. ${firmante2.documentoIdentidad || firmante2.firma?.documentoIdentidad}`
                                : ''}
                            </p>
                            <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-700">
                              <span className="inline-flex items-center gap-1 font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verificada
                              </span>
                              <span className="font-mono text-slate-400">
                                {formatearFechaAmigable(firmante2.fechaFirma || firmante2.firma?.fechaFirma)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Revisó - Analista */}
                        {firmante3?.firmado && (
                          <div className="bg-white border border-emerald-200 rounded-xl p-3 text-xs space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              4. {firmante3.titulo || 'Analista de Viáticos'}
                            </span>
                            <p className="font-black text-slate-900 truncate">
                              {firmante3.nombreFirmante || firmante3.firma?.nombreFirmante || 'Servidor Autorizado'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {firmante3.cargoFirmante || firmante3.firma?.cargoFirmante || firmante3.cargo}
                            </p>
                            <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-700">
                              <span className="inline-flex items-center gap-1 font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verificada
                              </span>
                              <span className="font-mono text-slate-400">
                                {formatearFechaAmigable(firmante3.fechaFirma || firmante3.firma?.fechaFirma)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Botón único de decisión en Revisión: Continuar y Firmar */}
                <div className="pt-3 flex justify-end border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setModoDevolucion(false);
                      setPestaña('FIRMAS');
                    }}
                    className="px-6 py-2.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-black inline-flex items-center gap-2 transition-all shadow-md shadow-blue-900/10 cursor-pointer"
                  >
                    <span>Continuar y Firmar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PESTAÑA 2: FIRMAS Y APROBACIÓN INSTITUCIONAL (FORMATO 023) */}
            {/* ========================================================================= */}
            {pestaña === 'FIRMAS' && (
              <div className="space-y-4 pt-1">
                {/* Banner de regla de desplazamiento / jerarquía */}
                <div
                  className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                    esReglaEspecial
                      ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                      : 'bg-blue-50/70 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black tracking-tight">
                    {esReglaEspecial ? (
                      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-[#003DA5] shrink-0" />
                    )}
                    <span>
                      {esReglaEspecial
                        ? 'Regla Especial de Desplazamiento y Jerarquía Aplicada'
                        : 'Regla Institucional de Aprobación Previa'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90 pl-6">
                    {estadoFirmas.descripcionRegla}
                  </p>
                  <div className="pl-6 pt-1 text-[10px] font-semibold text-slate-500 flex flex-wrap items-center gap-3">
                    <span>• Subdirector Nacional G.C. desplazado → Firma Director Nacional</span>
                    <span>• Director Nacional desplazado → Firma Subdirector Nacional G.C.</span>
                    <span>• Director Territorial desplazado → Firma Director Nacional</span>
                  </div>
                </div>

                {/* Stepper y Progreso de Firmas 1 a 1 */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Control Previo a Radicación · Flujo de Firmas Requeridas
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800">
                        {todasFirmadas
                          ? 'Flujo de Aprobación Completado Satisfactoriamente'
                          : firmasRegistradasCount === 1
                          ? 'Flujo en Proceso: 1 de 2 Firmas Registradas'
                          : 'Flujo Pendiente: Se requieren 2 firmas para formalizar la radicación'}
                      </h4>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 ${
                        todasFirmadas
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : firmasRegistradasCount === 1
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {todasFirmadas ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>2 de 2 Firmas · ENVIADA A SECRETARÍA</span>
                        </>
                      ) : firmasRegistradasCount === 1 ? (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span>1 de 2 Firmas · PENDIENTE 1 FIRMA</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>0 de 2 Firmas · PENDIENTE AMBAS</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Stepper visual de pasos 1 y 2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Paso 1 */}
                    <div
                      className={`p-3 rounded-xl border transition-all ${
                        firmante1?.firmado
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                          : firmanteSeleccionado === 'JEFE_DEPENDENCIA'
                          ? 'bg-blue-50/80 border-[#003DA5] text-blue-950 ring-2 ring-blue-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                            firmante1?.firmado
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {firmante1?.firmado ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                            Firma 1 · Jefe Inmediato / Autoridad
                          </p>
                          <p className="text-xs font-black truncate">{firmante1?.titulo}</p>
                          <p className="text-[10px] opacity-80 truncate">
                            {firmante1?.firmado
                              ? `Firmado por: ${firmante1.nombreFirmante || firmante1.firma?.nombreFirmante || 'Servidor Autorizado'}`
                              : 'Pendiente de firma y visto bueno'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Paso 2 */}
                    <div
                      className={`p-3 rounded-xl border transition-all ${
                        firmante2?.firmado
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                          : firmanteSeleccionado === 'GERENTE_PROYECTO'
                          ? 'bg-blue-50/80 border-[#003DA5] text-blue-950 ring-2 ring-blue-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                            firmante2?.firmado
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {firmante2?.firmado ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                            Firma 2 · Gerente de Proyecto / Convenio
                          </p>
                          <p className="text-xs font-black truncate">{firmante2?.titulo}</p>
                          <p className="text-[10px] opacity-80 truncate">
                            {firmante2?.firmado
                              ? `Firmado por: ${firmante2.nombreFirmante || firmante2.firma?.nombreFirmante || 'Servidor Autorizado'}`
                              : 'Pendiente de firma y visto bueno'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

            {/* Tarjetas de Firmantes Requeridos al estilo amigable PTA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-700">
                  Aprobación por Componente
                </h4>
                <span className="text-[11px] font-medium text-slate-500">
                  {todasFirmadas ? '2 de 2 aprobadas' : firmasRegistradasCount === 1 ? '1 de 2 aprobadas' : '0 de 2 aprobadas'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Firmante 1: Jefe / Supervisor / Director */}
                <div
                  onClick={() => {
                    if (puedeFirmarComoJefe) {
                      setFirmanteSeleccionado('JEFE_DEPENDENCIA');
                      if (firmante1?.cargo) setCargoFirmante(firmante1.cargo);
                    }
                  }}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    puedeFirmarComoJefe ? 'cursor-pointer hover:border-[#003DA5]' : ''
                  } ${
                    firmante1?.firmado
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] shadow-xs'
                      : miRolFirmante === 'JEFE_DEPENDENCIA'
                      ? 'bg-blue-50/40 border-[#003DA5] ring-2 ring-[#003DA5]/20 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">
                    {firmante1?.titulo || 'JEFE DE DEPENDENCIA — SUPERVISOR'}
                  </div>

                  <div className={`text-sm font-black mb-1 min-h-[20px] ${
                    firmante1?.firmado ? 'text-slate-900' : 'text-[#9CA3AF]'
                  }`}>
                    {firmante1?.firmado
                      ? (firmante1.nombreFirmante || firmante1.firma?.nombreFirmante || 'Servidor Autorizado')
                      : '—'}
                  </div>

                  {firmante1?.firmado && (firmante1.cargoFirmante || firmante1.firma?.cargoFirmante) && (
                    <div className="text-[11px] font-semibold text-slate-600 mb-1">
                      {firmante1.cargoFirmante || firmante1.firma?.cargoFirmante}
                    </div>
                  )}

                  {firmante1?.firmado && (firmante1.documentoIdentidad || firmante1.firma?.documentoIdentidad) ? (
                    <div className="text-[11px] font-medium text-slate-500 mb-2">
                      C.C. {firmante1.documentoIdentidad || firmante1.firma?.documentoIdentidad}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-center my-2">
                    {firmante1?.firmado ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#D1FAE5] text-[#065F46] text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Firma Digital Verificada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#F3F4F6] text-[#9CA3AF] text-xs font-semibold">
                        Pendiente por firmar
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#9CA3AF] mt-1">
                    {firmante1?.firmado && (firmante1.fechaFirma || firmante1.firma?.fechaFirma)
                      ? formatearFechaAmigable(firmante1.fechaFirma || firmante1.firma?.fechaFirma)
                      : '—'}
                  </div>

                  {firmante1?.firmado && (
                    <div className="mt-3 pt-2 border-t border-emerald-100 text-[10px] text-slate-400 space-y-0.5">
                      <p className="font-mono text-[9px] text-[#003DA5]">
                        Cert: {firmante1.certificadoId || firmante1.firma?.certificadoId || 'ESAP-CERT-VIAT'}
                      </p>
                      {firmante1.firma?.esAusencia && (
                        <p className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[9px]">
                          En ausencia: {firmante1.firma.motivoAusencia}
                        </p>
                      )}
                    </div>
                  )}

                  {!firmante1?.firmado && !todasFirmadas && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      {miRolFirmante !== 'JEFE_DEPENDENCIA' && miFirmaFirmada ? (
                        <button
                          type="button"
                          disabled={enviandoAlerta}
                          onClick={() => void handleEnviarAlerta('JEFE_DEPENDENCIA')}
                          className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                          title="Enviar alerta y recordatorio por correo y notificación en sistema"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>
                            {enviandoAlerta
                              ? 'Enviando alerta…'
                              : `Enviar Alerta al ${firmante1?.titulo || 'Jefe de Dependencia'}`}
                          </span>
                        </button>
                      ) : miRolFirmante === 'JEFE_DEPENDENCIA' && !miFirmaFirmada ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#003DA5]">
                          <FileSignature className="w-3.5 h-3.5" /> Su firma requerida (Ver abajo)
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Firmante 2: Gerente de Proyecto */}
                <div
                  onClick={() => {
                    if (puedeFirmarComoGerente) {
                      setFirmanteSeleccionado('GERENTE_PROYECTO');
                      if (firmante2?.cargo) setCargoFirmante(firmante2.cargo);
                    }
                  }}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    puedeFirmarComoGerente ? 'cursor-pointer hover:border-[#003DA5]' : ''
                  } ${
                    firmante2?.firmado
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] shadow-xs'
                      : miRolFirmante === 'GERENTE_PROYECTO'
                      ? 'bg-blue-50/40 border-[#003DA5] ring-2 ring-[#003DA5]/20 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">
                    {firmante2?.titulo || 'GERENTE DE PROYECTO / CONVENIO'}
                  </div>

                  <div className={`text-sm font-black mb-1 min-h-[20px] ${
                    firmante2?.firmado ? 'text-slate-900' : 'text-[#9CA3AF]'
                  }`}>
                    {firmante2?.firmado
                      ? (firmante2.nombreFirmante || firmante2.firma?.nombreFirmante || 'Servidor Autorizado')
                      : '—'}
                  </div>

                  {firmante2?.firmado && (firmante2.cargoFirmante || firmante2.firma?.cargoFirmante) && (
                    <div className="text-[11px] font-semibold text-slate-600 mb-1">
                      {firmante2.cargoFirmante || firmante2.firma?.cargoFirmante}
                    </div>
                  )}

                  {firmante2?.firmado && (firmante2.documentoIdentidad || firmante2.firma?.documentoIdentidad) ? (
                    <div className="text-[11px] font-medium text-slate-500 mb-2">
                      C.C. {firmante2.documentoIdentidad || firmante2.firma?.documentoIdentidad}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-center my-2">
                    {firmante2?.firmado ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#D1FAE5] text-[#065F46] text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Firma Digital Verificada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#F3F4F6] text-[#9CA3AF] text-xs font-semibold">
                        Pendiente por firmar
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#9CA3AF] mt-1">
                    {firmante2?.firmado && (firmante2.fechaFirma || firmante2.firma?.fechaFirma)
                      ? formatearFechaAmigable(firmante2.fechaFirma || firmante2.firma?.fechaFirma)
                      : '—'}
                  </div>

                  {firmante2?.firmado && (
                    <div className="mt-3 pt-2 border-t border-emerald-100 text-[10px] text-slate-400 space-y-0.5">
                      <p className="font-mono text-[9px] text-[#003DA5]">
                        Cert: {firmante2.certificadoId || firmante2.firma?.certificadoId || 'ESAP-CERT-VIAT'}
                      </p>
                      {firmante2.firma?.esAusencia && (
                        <p className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[9px]">
                          En ausencia: {firmante2.firma.motivoAusencia}
                        </p>
                      )}
                    </div>
                  )}

                  {!firmante2?.firmado && !todasFirmadas && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      {miRolFirmante !== 'GERENTE_PROYECTO' && miFirmaFirmada ? (
                        <button
                          type="button"
                          disabled={enviandoAlerta}
                          onClick={() => void handleEnviarAlerta('GERENTE_PROYECTO')}
                          className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                          title="Enviar alerta y recordatorio por correo y notificación en sistema"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>
                            {enviandoAlerta
                              ? 'Enviando alerta…'
                              : `Enviar Alerta al ${firmante2?.titulo || 'Gerente de Proyecto'}`}
                          </span>
                        </button>
                      ) : miRolFirmante === 'GERENTE_PROYECTO' && !miFirmaFirmada ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#003DA5]">
                          <FileSignature className="w-3.5 h-3.5" /> Su firma requerida (Ver abajo)
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Firmante 3: Analista de Viáticos (opcional) */}
                {firmante3 && (
                  <div
                    className={`p-4 rounded-xl border text-center transition-all ${
                      firmante3.firmado
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] shadow-xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">
                      {firmante3.titulo || 'ANALISTA DE VIÁTICOS'}
                    </div>

                    <div className={`text-sm font-black mb-1 min-h-[20px] ${
                      firmante3.firmado ? 'text-slate-900' : 'text-[#9CA3AF]'
                    }`}>
                      {firmante3.firmado
                        ? (firmante3.nombreFirmante || firmante3.firma?.nombreFirmante || 'Servidor Autorizado')
                        : '—'}
                    </div>

                    {firmante3.firmado && (firmante3.cargoFirmante || firmante3.firma?.cargoFirmante) && (
                      <div className="text-[11px] font-semibold text-slate-600 mb-1">
                        {firmante3.cargoFirmante || firmante3.firma?.cargoFirmante}
                      </div>
                    )}

                    {firmante3.firmado && (firmante3.documentoIdentidad || firmante3.firma?.documentoIdentidad) ? (
                      <div className="text-[11px] font-medium text-slate-500 mb-2">
                        C.C. {firmante3.documentoIdentidad || firmante3.firma?.documentoIdentidad}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-center my-2">
                      {firmante3.firmado ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#D1FAE5] text-[#065F46] text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Firma Digital Verificada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#F3F4F6] text-[#9CA3AF] text-xs font-semibold">
                          Pendiente por firmar
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#9CA3AF] mt-1">
                      {firmante3.firmado && firmante3.firma?.fechaFirma
                        ? formatearFechaAmigable(firmante3.firma.fechaFirma)
                        : '—'}
                    </div>

                    {firmante3.firmado && firmante3.firma && (
                      <div className="mt-3 pt-2 border-t border-emerald-100 text-[10px] text-slate-400 space-y-0.5">
                        <p className="font-mono text-[9px] text-[#003DA5]">
                          Cert: {firmante3.firma.certificadoId || 'ESAP-CERT-VIAT'}
                        </p>
                      </div>
                    )}

                    {!firmante3.firmado && !todasFirmadas && miRolFirmante === 'ANALISTA' && !miFirmaFirmada && (
                      <div className="mt-3 pt-2 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#003DA5]">
                          <FileSignature className="w-3.5 h-3.5" /> Su firma requerida (Ver abajo)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Panel de Éxito cuando todas las firmas están listas */}
            {todasFirmadas && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Flujo de Firmas de Aprobación Completado</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Surtido el flujo de firmas de aprobación y las validaciones correspondientes, la solicitud no requiere
                  reprocesos y pasa directamente a la <strong>Secretaría de Viáticos</strong> para su priorización y asignación a analista.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDescargarFormato023}
                    disabled={descargandoPdf}
                    className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {descargandoPdf ? 'Generando PDF…' : 'Descargar Formato 023 Firmado'}
                  </button>
                  <button
                    type="button"
                    onClick={cerrar}
                    className="px-4 py-2 border border-emerald-400 text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100"
                  >
                    Aceptar y Salir
                  </button>
                </div>
              </div>
            )}

            {/* Si el usuario tiene rol de firma y YA firmó su parte */}
            {miFirmaFirmada && !modoDevolucion && (
              <div className="space-y-4">
                {/* Banner de confirmación con datos de la firma verificada */}
                {(() => {
                  const nombreFirmado =
                    miFirmanteObj?.nombreFirmante ||
                    miFirmanteObj?.firma?.nombreFirmante ||
                    currentUser?.nombreCompleto ||
                    obtenerNombreFirmanteFinal();
                  const cargoFirmado =
                    miFirmanteObj?.cargoFirmante ||
                    miFirmanteObj?.firma?.cargoFirmante ||
                    obtenerCargoFirmanteFinal();
                  const fechaFirma =
                    miFirmanteObj?.fechaFirma || miFirmanteObj?.firma?.fechaFirma;
                  const certId =
                    miFirmanteObj?.certificadoId || miFirmanteObj?.firma?.certificadoId;
                  const docId =
                    miFirmanteObj?.documentoIdentidad || miFirmanteObj?.firma?.documentoIdentidad;

                  return (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 shadow-xs">
                      <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 text-xs min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-black text-emerald-950 text-sm">
                            Firma Digital Verificada y Certificada
                          </h5>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                            Validación OTP Exitosa
                          </span>
                        </div>
                        <p className="text-xs text-emerald-900 font-bold">
                          Firmante:{' '}
                          <span className="underline decoration-emerald-400 font-black">{nombreFirmado}</span>
                          {cargoFirmado ? ` — ${cargoFirmado}` : ''}
                          {docId ? ` (C.C. ${docId})` : ''}
                        </p>
                        <p className="text-[11px] text-emerald-800">
                          Rol institucional: <strong>{miTituloRol}</strong>
                          {fechaFirma ? ` · Fecha: ${formatearFechaAmigable(fechaFirma)}` : ''}
                          {certId ? ` · Certificado: ${certId}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Si el otro rol aún tiene su firma pendiente, mostrar botón para enviar alerta */}
                {otroFirmantePendiente && !todasFirmadas && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 text-xs text-amber-950">
                      <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-extrabold">Firma pendiente por: {otroFirmanteTitulo}</p>
                        <p className="text-[11px] text-amber-800">
                          Puede enviar una alerta y recordatorio prioritario para que complete la firma requerida.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={enviandoAlerta}
                      onClick={() => void handleEnviarAlerta()}
                      className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-amber-500/20 cursor-pointer shrink-0"
                    >
                      <Bell className="w-4 h-4" />
                      <span>
                        {enviandoAlerta
                          ? 'Enviando alerta…'
                          : `Enviar Alerta al ${otroFirmanteTitulo}`}
                      </span>
                    </button>
                  </div>
                )}

                {errorAccion && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorAccion}</span>
                  </div>
                )}

                {mensajeExito && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{mensajeExito}</span>
                  </div>
                )}
              </div>
            )}

            {/* Formulario de Firma Activa: SOLO aparece si el usuario puede firmar y NO ha firmado aún */}
            {!todasFirmadas && !modoDevolucion && puedeFirmar && !miFirmaFirmada && (
              <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 bg-slate-50/50">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#003DA5]" />
                    <h4 className="text-xs sm:text-sm font-black text-slate-800">
                      Aprobación Digital con Validación OTP:{' '}
                      <span className="text-[#003DA5]">{miTituloRol}</span>
                    </h4>
                  </div>
                  {puedeFirmarComoJefe && puedeFirmarComoGerente && (
                    <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl border border-slate-300">
                      <button
                        type="button"
                        onClick={() => {
                          setFirmanteSeleccionado('JEFE_DEPENDENCIA');
                          if (firmante1?.cargo) setCargoFirmante(firmante1.cargo);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          miRolFirmante === 'JEFE_DEPENDENCIA'
                            ? 'bg-[#003DA5] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Firmar como Jefe
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFirmanteSeleccionado('GERENTE_PROYECTO');
                          if (firmante2?.cargo) setCargoFirmante(firmante2.cargo);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          miRolFirmante === 'GERENTE_PROYECTO'
                            ? 'bg-[#003DA5] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Firmar como Gerente
                      </button>
                    </div>
                  )}
                  <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                    {obtenerNombreFirmanteFinal()}
                  </span>
                </div>

                {/* Observaciones opcionales */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Observaciones de la Aprobación <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    placeholder="Escriba aquí sus observaciones o comentarios sobre la comisión (opcional)..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:bg-white bg-white transition-all resize-none shadow-xs"
                  />
                </div>

                {errorAccion && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorAccion}</span>
                  </div>
                )}

                {mensajeExito && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{mensajeExito}</span>
                  </div>
                )}

                {/* Botones de acción del formulario */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModoDevolucion(true)}
                    className="px-3.5 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Devolver con Observaciones
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevisualizarFormato023Flotante}
                      disabled={descargandoPdf}
                      className="px-3.5 py-2 border border-blue-200 bg-blue-50/60 text-[#003DA5] hover:bg-blue-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Ver formato GF-FO-023 en visor interactivo (flotante / mitad de pantalla)"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#003DA5]" />
                      {descargandoPdf ? 'Cargando…' : 'Visor Formato 023'}
                    </button>
                    <button
                      type="button"
                      disabled={procesandoFirma || solicitandoOtp}
                      onClick={() => void handleIniciarFirmaOtp()}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {solicitandoOtp
                        ? 'Enviando OTP…'
                        : procesandoFirma
                        ? 'Firmando y validando…'
                        : 'Firmar con Validación OTP'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Aviso informativo para rol Enlace o usuarios sin rol de firma */}
            {!todasFirmadas && !modoDevolucion && !puedeFirmar && (
              <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-black text-xs">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Trámite en Revisión y Firmas de Aprobación Institucional</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  Usted está consultando este expediente con perfil de <strong>Enlace de Dependencia (Solo Lectura)</strong>. El Enlace no realiza acciones de firma; la aprobación previa es suscrita de forma obligatoria por el Jefe de Dependencia/Supervisor y el Gerente de Proyecto antes de la radicación formal de la solicitud.
                </p>
              </div>
            )}

            {/* Panel de Devolución con Observaciones */}
            {modoDevolucion && (
              <div className="p-4 border border-rose-200 bg-rose-50/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-xs text-rose-800">
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>Devolución de la Solicitud para Subsanación</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModoDevolucion(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Al devolver la solicitud, regresará al Enlace de la dependencia en estado <strong>DEVUELTA</strong> para corrección de los puntos señalados.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Motivo detallado de la devolución <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={motivoDevolucion}
                    onChange={(e) => setMotivoDevolucion(e.target.value)}
                    placeholder="Indique con claridad qué debe subsanar el enlace (itinerario, fechas, justificación, documentos, etc.)…"
                    className="w-full px-3 py-2 border border-rose-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  />
                </div>

                {errorAccion && (
                  <p className="text-xs text-red-700 font-semibold bg-red-100 p-2 rounded-lg">
                    {errorAccion}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setModoDevolucion(false)}
                    className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Volver al formulario
                  </button>
                  <button
                    type="button"
                    disabled={devolviendo || !motivoDevolucion.trim()}
                    onClick={() => void handleDevolver()}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {devolviendo ? 'Devolviendo…' : 'Confirmar Devolución'}
                  </button>
                </div>
              </div>
            )}
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* Visor de documentos flotante, movible, minimizable y divisible */}
      <VisorDocumentosFlotante
        documentos={documentosVisor}
        onCerrar={cerrarDocumentoVisor}
      />

      {/* Modal Institucional de Firma Digital con Validación OTP */}
      {modalFirmaDigitalAbierta && (
        <FirmaDigitalViaticosModal
          isOpen={modalFirmaDigitalAbierta}
          solicitudId={solicitudId}
          consecutivo={consecutivoUnico || estadoFirmas?.consecutivoUnico || codigo || '023'}
          comisionadoNombre={nombreComisionadoCompleto}
          destino={solicitudDetalle?.destino || solicitudDetalle?.lugarComision || ''}
          fechas={
            solicitudDetalle?.fechaInicio && solicitudDetalle?.fechaFin
              ? `${solicitudDetalle.fechaInicio} al ${solicitudDetalle.fechaFin}`
              : ''
          }
          firmanteNombre={obtenerNombreFirmanteFinal()}
          firmanteCargo={obtenerCargoFirmanteFinal()}
          etapaLabel={
            firmanteSeleccionado === 'JEFE_DEPENDENCIA'
              ? 'Aprobación Jefe de Dependencia / Supervisor'
              : firmanteSeleccionado === 'GERENTE_PROYECTO'
              ? 'Aprobación Gerente de Proyecto / Convenio'
              : 'Revisión y Control Analista de Viáticos'
          }
          correoDestino={otpData?.emailEnviadoA}
          devCode={otpData?.devCode}
          onVerifyCodigo={async (codigoOtp: string) => {
            await viaticosService.verificarOtpFirma(solicitudId, {
              verificationId: otpData?.verificationId || '',
              code: codigoOtp,
              otp: codigoOtp,
              tipoFirma: firmanteSeleccionado,
              consume: false,
            });
          }}
          onFirmaCompleta={handleFirmaDigitalCompleta}
          onCancelar={() => setModalFirmaDigitalAbierta(false)}
        />
      )}
    </div>
  );
}
