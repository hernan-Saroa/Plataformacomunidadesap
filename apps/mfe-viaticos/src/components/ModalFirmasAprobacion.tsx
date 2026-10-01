import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
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
  const [modoTrazo, setModoTrazo] = useState<'CANVAS' | 'SELLO'>('CANVAS');

  // Estado del canvas de firma
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [haDibujado, setHaDibujado] = useState(false);

  // Acciones en progreso
  const [procesandoFirma, setProcesandoFirma] = useState(false);
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

  // Previsualización PDF Formato 023
  const [descargandoPdf, setDescargandoPdf] = useState(false);

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

      // Autoseleccionar el primer firmante pendiente
      const pendiente = data.firmantes.find((f) => !f.firmado);
      if (pendiente) {
        setFirmanteSeleccionado(pendiente.tipo);
        setCargoFirmante(pendiente.cargo || '');
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

  // Canvas drawing handlers (mouse & touch)
  const iniciarTrazo = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#003DA5';
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);

    setIsDrawing(true);
    setHaDibujado(true);
  };

  const trazar = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const detenerTrazo = () => {
    setIsDrawing(false);
  };

  const limpiarCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHaDibujado(false);
  };

  // Generar estampa digital como fallback o alternativa limpia
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

  // Preparar datos base de la firma
  const prepararPayloadBase = (): FirmarSolicitudPayload | null => {
    setErrorAccion(null);
    setMensajeExito(null);

    if (!nombreFirmante.trim()) {
      setErrorAccion('Debe ingresar el nombre del firmante.');
      return null;
    }

    if (!cargoFirmante.trim()) {
      setErrorAccion('Debe ingresar el cargo oficial del firmante.');
      return null;
    }

    if (esAusencia && !motivoAusencia.trim()) {
      setErrorAccion('Debe especificar el motivo o justificación de la ausencia/desplazamiento.');
      return null;
    }

    let firmaImagen: string | undefined = undefined;
    if (modoTrazo === 'CANVAS') {
      const canvas = canvasRef.current;
      if (canvas && haDibujado) {
        firmaImagen = canvas.toDataURL('image/png');
      } else {
        firmaImagen = generarEstampaDigital(nombreFirmante, cargoFirmante);
      }
    } else {
      firmaImagen = generarEstampaDigital(nombreFirmante, cargoFirmante);
    }

    return {
      tipoFirma: firmanteSeleccionado,
      nombreFirmante: nombreFirmante.trim(),
      cargoFirmante: cargoFirmante.trim(),
      firmaImagen,
      esAusencia,
      motivoAusencia: esAusencia ? motivoAusencia.trim() : undefined,
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
        tipoFirma: firmanteSeleccionado,
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
      limpiarCanvas();
      await cargarEstado();
      onFirmadoExitoso?.();

      if (resp.radicada) {
        onFirmasCompletadas?.(resp.solicitud);
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

  // Previsualizar Formato 023
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
  const esJefe = Boolean(authService.isJefeDependencia?.()) || Boolean(authService.isSubdireccionGestionCorporativa?.()) || Boolean(authService.isDireccionNacional?.()) || Boolean(currentUser?.esAdmin);
  const esGerente = Boolean(authService.isGerenteProyecto?.()) || Boolean(currentUser?.esAdmin);
  const esAnalista = Boolean(authService.isAnalista?.()) || Boolean(currentUser?.esAdmin);
  const puedeFirmar = Boolean(authService.canFirmarAprobacion?.()) || esJefe || esGerente || esAnalista;
  const firmasRegistradasCount =
    (firmante1?.firmado ? 1 : 0) +
    (firmante2?.firmado ? 1 : 0) +
    (firmante3?.firmado ? 1 : 0);

  const formatearMonedaLocal = (valor: number | undefined | null) => {
    return `$ ${(Number(valor) || 0).toLocaleString('es-CO')}`;
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200/90 max-h-[94vh] overflow-y-auto space-y-5">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-[#003DA5] rounded-2xl">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  Control Previo a Radicación
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {consecutivoUnico || estadoFirmas?.consecutivoUnico || 'GF-FO-023'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                Firmas de Aprobación de la Solicitud
              </h3>
              <p className="text-xs text-slate-500">
                Aprobación obligatoria por Jefe de Dependencia/Supervisor y Gerente de Proyecto antes de radicar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
            {/* Pestañas: 1. Revisión de Solicitud y Soportes · 2. Firmas y Decisión */}
            <div className="flex border-b border-slate-200 gap-2">
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
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-[#003DA5]" />
                      <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Soportes y Documentos Adjuntos ({solicitudDetalle?.documentosSoporte?.length || 0})
                      </h5>
                    </div>
                    <button
                      type="button"
                      onClick={handleDescargarFormato023}
                      disabled={descargandoPdf}
                      className="px-3 py-1.5 bg-blue-50 text-[#003DA5] hover:bg-blue-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {descargandoPdf ? 'Generando…' : 'Previsualizar Formato 023 (PDF)'}
                    </button>
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
                                <p className="text-xs font-bold text-slate-800 truncate" title={doc.nombreArchivo}>
                                  {doc.nombreArchivo}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {doc.tipoDocumento || 'Soporte PDF'}
                                </p>
                              </div>
                            </div>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-500 hover:text-[#003DA5] hover:bg-white rounded-lg transition-colors shrink-0"
                                title="Abrir soporte en pestaña nueva"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
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

                {/* Botones de Decisión en Revisión */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  {puedeFirmar ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setModoDevolucion(true);
                          setPestaña('FIRMAS');
                        }}
                        className="px-4 py-2 border border-rose-300 text-rose-700 bg-rose-50/40 hover:bg-rose-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-600" />
                        <span>Devolver al Enlace con Observaciones</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModoDevolucion(false);
                          setPestaña('FIRMAS');
                        }}
                        className="px-5 py-2.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-black inline-flex items-center gap-2 transition-all shadow-md shadow-blue-900/10 cursor-pointer"
                      >
                        <span>Continuar a Firmar Solicitud</span>
                        <PenTool className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-500 italic flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Perfil Enlace: Consulta de expediente y seguimiento de firmas de aprobación</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setModoDevolucion(false);
                          setPestaña('FIRMAS');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <span>Ver Estado de Firmas</span>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      </button>
                    </div>
                  )}
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
                          <span>2 de 2 Firmas · RADICADA</span>
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
                              ? `Firmado: ${firmante1.firma?.nombreFirmante}`
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
                              ? `Firmado: ${firmante2.firma?.nombreFirmante}`
                              : 'Pendiente de firma y visto bueno'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

            {/* Tarjetas de Firmantes Requeridos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Firmante 1: Jefe / Supervisor / Director */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  firmante1?.firmado
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : firmanteSeleccionado === 'JEFE_DEPENDENCIA'
                    ? 'bg-blue-50/40 border-[#003DA5] shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white border border-slate-200 text-[#003DA5] font-black text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {firmante1?.titulo || 'Jefe de Dependencia / Supervisor'}
                      </p>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        {firmante1?.cargo || 'Jefe Inmediato o Autoridad Designada'}
                      </h4>
                    </div>
                  </div>
                  {firmante1?.firmado ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Firmado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <Clock className="w-3 h-3" /> Pendiente
                    </span>
                  )}
                </div>

                {firmante1?.firmado && firmante1.firma ? (
                  <div className="mt-2 p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px] space-y-1">
                    <p className="font-bold text-slate-900">{firmante1.firma.nombreFirmante}</p>
                    <p className="text-[10px] text-slate-500">{firmante1.firma.cargoFirmante}</p>
                    <p className="text-[10px] text-slate-400">
                      Fecha: {new Date(firmante1.firma.fechaFirma).toLocaleString('es-CO')}
                    </p>
                    {firmante1.firma.esAusencia && (
                      <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        En ausencia/desplazamiento: {firmante1.firma.motivoAusencia}
                      </p>
                    )}
                    {firmante1.firma.comentarios && (
                      <p className="text-[10px] italic text-slate-600 bg-slate-50 p-1.5 rounded">
                        "{firmante1.firma.comentarios}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <p className="italic">{firmante1?.descripcion}</p>
                    {!todasFirmadas && puedeFirmar && esJefe && (
                      <button
                        type="button"
                        onClick={() => setFirmanteSeleccionado('JEFE_DEPENDENCIA')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                          firmanteSeleccionado === 'JEFE_DEPENDENCIA'
                            ? 'bg-[#003DA5] text-white shadow-xs'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                      >
                        Firmar como {firmante1?.titulo}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Firmante 2: Gerente de Proyecto */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  firmante2?.firmado
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : firmanteSeleccionado === 'GERENTE_PROYECTO'
                    ? 'bg-blue-50/40 border-[#003DA5] shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white border border-slate-200 text-[#003DA5] font-black text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {firmante2?.titulo || 'Gerente de Proyecto'}
                      </p>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        {firmante2?.cargo || 'Gerente de Proyecto / Supervisor de Convenio'}
                      </h4>
                    </div>
                  </div>
                  {firmante2?.firmado ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Firmado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <Clock className="w-3 h-3" /> Pendiente
                    </span>
                  )}
                </div>

                {firmante2?.firmado && firmante2.firma ? (
                  <div className="mt-2 p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px] space-y-1">
                    <p className="font-bold text-slate-900">{firmante2.firma.nombreFirmante}</p>
                    <p className="text-[10px] text-slate-500">{firmante2.firma.cargoFirmante}</p>
                    <p className="text-[10px] text-slate-400">
                      Fecha: {new Date(firmante2.firma.fechaFirma).toLocaleString('es-CO')}
                    </p>
                    {firmante2.firma.comentarios && (
                      <p className="text-[10px] italic text-slate-600 bg-slate-50 p-1.5 rounded">
                        "{firmante2.firma.comentarios}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <p className="italic">{firmante2?.descripcion}</p>
                    {!todasFirmadas && puedeFirmar && esGerente && (
                      <button
                        type="button"
                        onClick={() => setFirmanteSeleccionado('GERENTE_PROYECTO')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                          firmanteSeleccionado === 'GERENTE_PROYECTO'
                            ? 'bg-[#003DA5] text-white shadow-xs'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                      >
                        Firmar como Gerente de Proyecto
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Firmante 3: Analista de Viáticos (Revisión y Control Técnico) */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  firmante3?.firmado
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : firmanteSeleccionado === 'ANALISTA'
                    ? 'bg-blue-50/40 border-[#003DA5] shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white border border-slate-200 text-[#003DA5] font-black text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {firmante3?.titulo || 'Analista de Viáticos'}
                      </p>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        {firmante3?.cargo || 'Analista de Viáticos / Grupo Financiero'}
                      </h4>
                    </div>
                  </div>
                  {firmante3?.firmado ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Firmado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <Clock className="w-3 h-3" /> Pendiente
                    </span>
                  )}
                </div>

                {firmante3?.firmado && firmante3.firma ? (
                  <div className="mt-2 p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px] space-y-1">
                    <p className="font-bold text-slate-900">{firmante3.firma.nombreFirmante}</p>
                    <p className="text-[10px] text-slate-500">{firmante3.firma.cargoFirmante}</p>
                    <p className="text-[10px] text-slate-400">
                      Fecha: {new Date(firmante3.firma.fechaFirma).toLocaleString('es-CO')}
                    </p>
                    {firmante3.firma.certificadoId && (
                      <p className="text-[9px] font-mono text-blue-700">
                        Certificado: {firmante3.firma.certificadoId}
                      </p>
                    )}
                    {firmante3.firma.comentarios && (
                      <p className="text-[10px] italic text-slate-600 bg-slate-50 p-1.5 rounded">
                        "{firmante3.firma.comentarios}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <p className="italic">{firmante3?.descripcion || 'Revisión y firma de control técnico del Analista de Viáticos.'}</p>
                    {!todasFirmadas && puedeFirmar && esAnalista && (
                      <button
                        type="button"
                        onClick={() => setFirmanteSeleccionado('ANALISTA')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                          firmanteSeleccionado === 'ANALISTA'
                            ? 'bg-[#003DA5] text-white shadow-xs'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                      >
                        Firmar como Analista de Viáticos
                      </button>
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
                  Surtido el flujo de firmas y las validaciones correspondientes, la solicitud ha sido incorporada
                  y queda formalmente en estado <strong>RADICADA</strong>.
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

            {/* Formulario de Firma Activa (si faltan firmas y el usuario puede firmar) */}
            {!todasFirmadas && !modoDevolucion && puedeFirmar && (
              <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 bg-slate-50/50">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-[#003DA5]" />
                    <h4 className="text-xs sm:text-sm font-black text-slate-800">
                      Registro de Firma:{' '}
                      <span className="text-[#003DA5]">
                        {firmanteSeleccionado === 'JEFE_DEPENDENCIA'
                          ? firmante1?.titulo || 'Jefe de Dependencia / Supervisor'
                          : firmanteSeleccionado === 'GERENTE_PROYECTO'
                          ? firmante2?.titulo || 'Gerente de Proyecto'
                          : firmante3?.titulo || 'Analista de Viáticos'}
                      </span>
                    </h4>
                  </div>
                  <div className="inline-flex p-0.5 bg-slate-200 rounded-xl text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setModoTrazo('CANVAS')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        modoTrazo === 'CANVAS'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Trazar Firma (Pad)
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoTrazo('SELLO')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        modoTrazo === 'SELLO'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Estampa Electrónica
                    </button>
                  </div>
                </div>

                {/* Campos de Nombre y Cargo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nombre Completo del Firmante <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nombreFirmante}
                      onChange={(e) => setNombreFirmante(e.target.value)}
                      placeholder="Ej. Dr. Carlos Arturo Mendoza"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Cargo Oficial del Firmante <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cargoFirmante}
                      onChange={(e) => setCargoFirmante(e.target.value)}
                      placeholder="Ej. Director Nacional / Subdirector Nacional G.C."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                    />
                  </div>
                </div>

                {/* Checkbox de ausencia o desplazamiento */}
                {firmanteSeleccionado === 'JEFE_DEPENDENCIA' && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={esAusencia}
                        onChange={(e) => setEsAusencia(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-[#003DA5] border-slate-300 focus:ring-[#003DA5]"
                      />
                      <span className="text-xs text-slate-700 font-semibold">
                        Firma en ausencia o por desplazamiento del titular de la dependencia
                      </span>
                    </label>
                    {esAusencia && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Justificación de la Ausencia / Desplazamiento <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={motivoAusencia}
                          onChange={(e) => setMotivoAusencia(e.target.value)}
                          placeholder="Ej. Titular en comisión oficial en territorio según resolución 482"
                          className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs bg-amber-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Pad de trazo interactivo o preview de estampa */}
                {modoTrazo === 'CANVAS' ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">
                        Dibuje su firma en el panel:
                      </label>
                      <button
                        type="button"
                        onClick={limpiarCanvas}
                        className="text-[10px] text-slate-500 hover:text-red-600 font-bold inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Limpiar trazo
                      </button>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden shadow-inner">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={160}
                        onMouseDown={iniciarTrazo}
                        onMouseMove={trazar}
                        onMouseUp={detenerTrazo}
                        onMouseLeave={detenerTrazo}
                        onTouchStart={iniciarTrazo}
                        onTouchMove={trazar}
                        onTouchEnd={detenerTrazo}
                        className="w-full h-36 touch-none cursor-crosshair"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      * Puede dibujar el trazo con ratón o pantalla táctil. Si no dibuja trazo, el sistema estampará automáticamente la firma electrónica certificada institucional.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-1">
                    <p className="text-[11px] font-bold text-slate-700 mb-1">Previsualización de Estampa:</p>
                    <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl font-mono text-[11px] text-slate-800 space-y-0.5">
                      <p className="font-bold text-[#003DA5]">ESAP — FIRMADO DIGITALMENTE</p>
                      <p className="font-bold">{nombreFirmante || '[Nombre del Firmante]'}</p>
                      <p className="text-slate-600">{cargoFirmante || '[Cargo Oficial]'}</p>
                      <p className="text-[9px] text-slate-400">FECHA: {new Date().toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                )}

                {/* Comentarios opcionales */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Comentarios u Observaciones de la Aprobación (opcional)
                  </label>
                  <input
                    type="text"
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    placeholder="Ej. Solicitud revisada y autorizada para el cumplimiento de objetivos institucionales."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
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
                    className="px-3.5 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Devolver con Observaciones
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDescargarFormato023}
                      disabled={descargandoPdf}
                      className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Previsualizar formato GF-FO-023 en PDF"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#003DA5]" />
                      {descargandoPdf ? 'Generando…' : 'Ver Formato 023'}
                    </button>
                    <button
                      type="button"
                      disabled={procesandoFirma || solicitandoOtp}
                      onClick={() => void handleIniciarFirmaOtp()}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-emerald-600/20"
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
          firmanteNombre={nombreFirmante.trim()}
          firmanteCargo={cargoFirmante.trim()}
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
              tipoFirma: firmanteSeleccionado,
              otp: codigoOtp,
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
