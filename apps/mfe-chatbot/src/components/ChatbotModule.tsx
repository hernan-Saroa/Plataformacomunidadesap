import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import {
  Bot,
  Send,
  Plus,
  MessageSquare,
  Sparkles,
  Info,
  Clock,
  CheckCircle2,
  Trash2,
  HelpCircle,
  BookOpen,
  FileText,
  Calendar,
  DollarSign,
  User
} from 'lucide-react';
import { ChatbotService, createChatbotService, ChatbotHttpError, ChatbotServiceError, ConversacionChat, MensajeChat } from '../services/chatbot.service';
import { PublicChatbotModule } from './PublicChatbotModule';
import './ChatbotModule.css';
import { ChatMessageText } from './ChatMessageText';

type RetryAction =
  | { kind: 'history'; todas: boolean; inicial?: string; crearSiVacia?: boolean }
  | { kind: 'detail'; id: string }
  | { kind: 'list'; todas: boolean };
type ChatError = { message: string; retry?: RetryAction; retryLabel?: string };
type ServiceStatus = 'checking' | 'available' | 'unavailable' | 'session' | 'rejected';

const SERVICE_LABELS: Record<ServiceStatus, string> = {
  checking: 'Comprobando servicio…', available: 'Última consulta correcta',
  unavailable: 'Servicio no disponible', session: 'Inicia sesión para continuar', rejected: 'Consulta no completada',
};

const QUICK_PROMPTS = [
  {
    icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
    title: 'Viáticos y Gastos de Viaje',
    prompt: '¿Cómo solicito y legalizo viáticos para una comisión de servicios?',
  },
  {
    icon: <FileText className="w-4 h-4 text-blue-600" />,
    title: 'Certificados Laborales',
    prompt: '¿Cómo descargo un certificado laboral oficial con firma digital?',
  },
  {
    icon: <BookOpen className="w-4 h-4 text-purple-600" />,
    title: 'Plan de Trabajo Académico (PTA)',
    prompt: '¿Dónde consulto y diligencio mi Plan de Trabajo Académico docente?',
  },
  {
    icon: <Calendar className="w-4 h-4 text-amber-600" />,
    title: 'Programación Académica',
    prompt: '¿Cómo reviso las franjas horarias y asignación de aulas?',
  },
];

export interface ChatbotModuleProps {
  mode?: 'authenticated' | 'public';
  onLogin?: () => void;
  apiBaseUrl?: string;
  userEmail?: string;
  userId?: string;
  userName?: string;
  initialConversationId?: string;
  onClose?: () => void;
  isWidget?: boolean;
}

const AuthenticatedChatbotModule: React.FC<ChatbotModuleProps> = ({
  apiBaseUrl,
  userEmail,
  userId,
  userName,
  initialConversationId,
  onClose,
  isWidget = false,
}) => {
  const api = useMemo(() => apiBaseUrl === undefined ? ChatbotService : createChatbotService(apiBaseUrl), [apiBaseUrl]);
  const [conversaciones, setConversaciones] = useState<ConversacionChat[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<ConversacionChat | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [inputTexto, setInputTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [puedeVerTodas, setPuedeVerTodas] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('checking');
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [creando, setCreando] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const [requiereRevision, setRequiereRevision] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtroContexto, setFiltroContexto] = useState('general');
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [vistaEstrecha, setVistaEstrecha] = useState(() => window.innerWidth <= 760);
  const historialComoPanel = isWidget || vistaEstrecha;
  const [focusTarget, setFocusTarget] = useState<'search' | 'composer' | 'history' | null>(null);
  const historyId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const moduleRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const sesionRevision = useRef(0);
  const historialRevision = useRef(0);
  const seleccionRevision = useRef(0);
  const enviandoRef = useRef(false);
  const creandoRef = useRef(false);
  const reintentandoRef = useRef(false);
  const borradores = useRef(new Map<string, string>());
  const enviosPorComprobar = useRef(new Set<string>());
  const ocupado = cargando || cargandoHistorial || cargandoDetalle || creando || reintentando;

  useEffect(() => {
    const update = () => setVistaEstrecha((moduleRef.current?.getBoundingClientRect().width || window.innerWidth) <= 760);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    if (moduleRef.current) observer?.observe(moduleRef.current);
    window.addEventListener('resize', update);
    update();
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  useEffect(() => {
    if (!focusTarget || ocupado) return;
    const target = focusTarget === 'search' ? searchRef.current : focusTarget === 'composer' ? inputRef.current : historyButtonRef.current;
    if (target && !target.closest('[aria-hidden="true"]') && !target.disabled) target.focus({ preventScroll: true });
    setFocusTarget(null);
  }, [focusTarget, ocupado]);

  useEffect(() => {
    const revision = ++sesionRevision.current;
    setConversaciones([]);
    setConversacionActiva(null);
    setMensajes([]);
    setInputTexto('');
    setPuedeVerTodas(false);
    setVerTodas(false);
    setCargando(false);
    setCargandoDetalle(false);
    setCreando(false);
    setReintentando(false);
    setRequiereRevision(false);
    setAviso(null);
    setHistorialAbierto(false);
    setBusqueda('');
    setFocusTarget(null);
    setServiceStatus('checking');
    enviandoRef.current = false;
    creandoRef.current = false;
    reintentandoRef.current = false;
    borradores.current.clear();
    enviosPorComprobar.current.clear();
    cargarConversaciones(false, revision, initialConversationId);
    return () => {
      ++sesionRevision.current;
      ++seleccionRevision.current;
    };
  }, [userEmail, userId, isWidget, initialConversationId, api]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes, cargando]);

  const scrollToBottom = () => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  };

  const mostrarError = (err: unknown, retry: RetryAction, contexto?: string, retryLabel = 'Reintentar') => {
    const motivo = err instanceof ChatbotHttpError || err instanceof ChatbotServiceError
      ? err.message : 'El servicio del chatbot no está disponible. Intenta nuevamente.';
    const sesionRechazada = err instanceof ChatbotHttpError && err.status === 401;
    const permisoRevocado = err instanceof ChatbotHttpError && err.status === 403;
    const inaccesible = err instanceof ChatbotHttpError && err.status === 404;
    setError({
      message: contexto ? `${contexto} ${motivo}` : motivo,
      retry: sesionRechazada ? undefined : permisoRevocado || inaccesible ? { kind: 'history', todas: false, crearSiVacia: false } : retry,
      retryLabel: permisoRevocado ? 'Ver mi historial' : inaccesible ? 'Revisar historial' : retryLabel,
    });
    setServiceStatus(err instanceof ChatbotHttpError && err.status === 401 ? 'session'
      : err instanceof ChatbotHttpError && err.status < 500 ? 'rejected' : 'unavailable');
    if (err instanceof ChatbotHttpError && (err.status === 401 || err.status === 403)) {
      ++seleccionRevision.current;
      ++historialRevision.current;
      setConversaciones([]);
      setConversacionActiva(null);
      setMensajes([]);
      setInputTexto('');
      setPuedeVerTodas(false);
      setVerTodas(false);
      setCargandoHistorial(false);
      setCargando(false);
      setCargandoDetalle(false);
      setCreando(false);
      setRequiereRevision(false);
      setAviso(null);
      borradores.current.clear();
      enviosPorComprobar.current.clear();
    }
  };

  const cargarConversaciones = async (todas = false, revision = sesionRevision.current, inicial?: string, crearSiVacia = true) => {
    const carga = ++historialRevision.current;
    const vigente = () => revision === sesionRevision.current && carga === historialRevision.current;
    ++seleccionRevision.current;
    setCargandoHistorial(true);
    setError(null);
    setAviso(null);
    setServiceStatus('checking');
    setConversaciones([]);
    setConversacionActiva(null);
    setMensajes([]);
    try {
      const acceso = await api.obtenerAcceso();
      if (!vigente()) return;
      setPuedeVerTodas(acceso.puedeVerTodas);
      const global = todas && acceso.puedeVerTodas && !isWidget;
      setVerTodas(global);
      const lista = await api.listarConversaciones(global);
      if (!vigente()) return;
      setConversaciones(lista);
      setServiceStatus('available');
      if (inicial || lista.length > 0) {
        await seleccionarConversacion(inicial || lista[0].id, revision);
      } else if (!global && crearSiVacia) {
        await iniciarNuevaConversacion('general', revision);
      }
    } catch (err) {
      if (vigente()) mostrarError(err, { kind: 'history', todas, inicial, crearSiVacia }, 'No se pudo cargar el historial.');
    } finally {
      if (vigente()) setCargandoHistorial(false);
    }
  };

  const seleccionarConversacion = async (id: string, revision = sesionRevision.current, enfocar = false) => {
    const seleccion = ++seleccionRevision.current;
    setError(null);
    setAviso(null);
    setServiceStatus('checking');
    setCargandoDetalle(true);
    setInputTexto('');
    setConversacionActiva(null);
    setMensajes([]);
    try {
      const detalle = await api.obtenerConversacion(id);
      if (revision !== sesionRevision.current || seleccion !== seleccionRevision.current) return;
      setConversacionActiva(detalle);
      setMensajes(detalle.mensajes || []);
      setInputTexto(borradores.current.get(id) || '');
      setServiceStatus('available');
      if (enfocar) setFocusTarget('composer');
      setRequiereRevision(false);
      if (enviosPorComprobar.current.delete(id)) {
        setAviso('Historial actualizado. Comprueba si tu mensaje ya aparece antes de volver a enviarlo.');
      }
    } catch (err) {
      if (revision === sesionRevision.current && seleccion === seleccionRevision.current) {
        setInputTexto(borradores.current.get(id) || '');
        mostrarError(err, { kind: 'detail', id }, 'No se pudo cargar la conversación.');
      }
    } finally {
      if (revision === sesionRevision.current && seleccion === seleccionRevision.current) setCargandoDetalle(false);
    }
  };

  const iniciarNuevaConversacion = async (contexto: string = 'general', revision = sesionRevision.current, enfocar = false) => {
    if (creandoRef.current) return;
    creandoRef.current = true;
    const seleccion = ++seleccionRevision.current;
    setError(null);
    setAviso(null);
    setCreando(true);
    setServiceStatus('checking');
    try {
      const nueva = await api.crearConversacion('Nueva consulta', contexto);
      if (revision !== sesionRevision.current || seleccion !== seleccionRevision.current) return;
      // Una nueva consulta siempre pertenece al usuario actual, también al salir del historial institucional.
      setConversaciones((prev) => [nueva, ...(verTodas ? [] : prev.filter((c) => c.id !== nueva.id))]);
      setVerTodas(false);
      setBusqueda('');
      setConversacionActiva(nueva);
      setMensajes(nueva.mensajes || []);
      setInputTexto('');
      setRequiereRevision(false);
      setServiceStatus('available');
      if (enfocar) setFocusTarget('composer');
    } catch (err) {
      if (revision === sesionRevision.current && seleccion === seleccionRevision.current) {
        // Si el POST llegó a guardarse, recuperarlo mediante lectura antes de intentar otra creación.
        mostrarError(err, { kind: 'history', todas: false, crearSiVacia: false },
          'No se pudo confirmar la creación de la conversación.', 'Revisar historial');
      }
    } finally {
      if (revision === sesionRevision.current) {
        creandoRef.current = false;
        setCreando(false);
      }
    }
  };

  const actualizarBorrador = (texto: string) => {
    setInputTexto(texto);
    if (conversacionActiva) borradores.current.set(conversacionActiva.id, texto);
  };

  const refrescarLista = async (todas: boolean, revision = sesionRevision.current) => {
    const historial = historialRevision.current;
    setServiceStatus('checking');
    try {
      const lista = await api.listarConversaciones(todas);
      if (revision !== sesionRevision.current || historial !== historialRevision.current) return;
      setConversaciones(lista);
      setServiceStatus('available');
    } catch (err) {
      if (revision === sesionRevision.current && historial === historialRevision.current) {
        mostrarError(err, { kind: 'list', todas }, 'No se pudo actualizar la lista de conversaciones.');
      }
    }
  };

  const reintentar = async () => {
    if (!error?.retry || ocupado || reintentandoRef.current) return;
    const retry = error.retry;
    const revision = sesionRevision.current;
    reintentandoRef.current = true;
    setReintentando(true);
    setError(null);
    try {
      if (retry.kind === 'history') await cargarConversaciones(retry.todas, revision, retry.inicial, retry.crearSiVacia);
      else if (retry.kind === 'detail') await seleccionarConversacion(retry.id, revision);
      else await refrescarLista(retry.todas, revision);
    } finally {
      if (revision === sesionRevision.current) {
        reintentandoRef.current = false;
        setReintentando(false);
      }
    }
  };

  const handleEnviar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputTexto.trim() || ocupado || enviandoRef.current || requiereRevision || !conversacionActiva?.puedeEscribir) return;

    const texto = inputTexto.trim();
    const conversacionId = conversacionActiva.id;
    enviandoRef.current = true;
    const revision = sesionRevision.current;
    const seleccion = seleccionRevision.current;
    borradores.current.set(conversacionId, texto);
    setInputTexto('');

    // Mensaje optimista del usuario
    const userMsgTemp: MensajeChat = {
      id: 'temp-' + Date.now(),
      conversacionId: conversacionActiva.id,
      rol: 'user',
      contenido: texto,
      createdAt: new Date().toISOString(),
    };
    setMensajes((prev) => [...prev, userMsgTemp]);
    setCargando(true);
    setError(null);
    setAviso(null);
    setServiceStatus('checking');

    try {
      const res = await api.enviarMensaje(conversacionActiva.id, texto);
      if (revision !== sesionRevision.current || seleccion !== seleccionRevision.current) return;
      setMensajes((prev) => [
        ...prev.filter((m) => m.id !== userMsgTemp.id),
        res.userMessage,
        res.botMessage,
      ]);
      borradores.current.delete(conversacionId);
      enviosPorComprobar.current.delete(conversacionId);
      setServiceStatus('available');
      // Refrescar lista de conversaciones para actualizar título / última modificación
      await refrescarLista(verTodas, revision);
    } catch (err) {
      if (revision === sesionRevision.current && seleccion === seleccionRevision.current) {
        setMensajes((prev) => prev.filter((m) => m.id !== userMsgTemp.id));
        setInputTexto(texto);
        enviosPorComprobar.current.add(conversacionId);
        setRequiereRevision(true);
        mostrarError(err, { kind: 'detail', id: conversacionId },
          'No se pudo confirmar el envío. El mensaje podría haberse guardado. Revisa la conversación antes de enviarlo otra vez.',
          'Revisar conversación');
      }
    } finally {
      if (revision === sesionRevision.current) {
        enviandoRef.current = false;
        setCargando(false);
      }
    }
  };

  const usarSugerencia = (prompt: string) => {
    actualizarBorrador(prompt);
    setFocusTarget('composer');
  };

  const conversacionesFiltradas = conversaciones.filter((c) => {
    if (!busqueda.trim()) return true;
    const query = busqueda.toLowerCase();
    const titulo = (c.titulo || '').toLowerCase();
    const nombre = (c.usuarioNombre || '').toLowerCase();
    const email = (c.usuarioEmail || '').toLowerCase();
    return titulo.includes(query) || nombre.includes(query) || email.includes(query);
  });

  return (
    <div ref={moduleRef} className={`esap-chatbot-module ${historialComoPanel ? 'esap-chatbot-module--compact' : ''} ${isWidget ? 'esap-chatbot-module--widget h-full min-h-0' : 'h-[calc(100vh-4.5rem)]'} bg-slate-50 text-slate-800 overflow-hidden rounded-xl border border-slate-200 shadow-sm`}>
      {historialComoPanel && <nav className="esap-chatbot-module__toolbar" aria-label="Navegación del chat">
        <button ref={historyButtonRef} type="button" aria-expanded={historialAbierto} aria-controls={historyId} disabled={ocupado}
          onClick={() => {
            setHistorialAbierto(!historialAbierto);
            setFocusTarget(historialAbierto ? 'history' : 'search');
          }}>{historialAbierto ? 'Volver al chat' : 'Historial'}</button>
        <button type="button" disabled={ocupado || serviceStatus === 'session'} onClick={() => {
          setHistorialAbierto(false);
          void iniciarNuevaConversacion('general', sesionRevision.current, true);
        }}><Plus aria-hidden="true" size={16} />Nueva conversación</button>
      </nav>}
      <div className="esap-chatbot-module__workspace">
      {/* Sidebar de Historial */}
      <aside id={historyId} aria-label="Historial de conversaciones" className="esap-chatbot-module__history bg-white border-r border-slate-200 flex flex-col flex-shrink-0" style={historialComoPanel ? { display: historialAbierto ? 'flex' : 'none' } : {}}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">ChatBot ESAP</h2>
              <span className="text-[11px] text-slate-500">Asistente institucional</span>
            </div>
          </div>
          {!historialComoPanel && <button
            onClick={() => iniciarNuevaConversacion(filtroContexto, sesionRevision.current, true)}
            disabled={ocupado}
            className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            title="Nueva conversación"
          >
            <Plus className="w-4 h-4" />
          </button>}
        </div>

        {puedeVerTodas && !isWidget && (
          <div className="flex gap-2 p-3 border-b border-slate-100" aria-label="Ámbito del historial">
            <button type="button" aria-pressed={!verTodas} disabled={ocupado}
              onClick={() => cargarConversaciones(false)} className="text-xs p-2 rounded-lg border">
              Mis conversaciones
            </button>
            <button type="button" aria-pressed={verTodas} disabled={ocupado}
              onClick={() => cargarConversaciones(true)} className="text-xs p-2 rounded-lg border">
              Historial institucional
            </button>
          </div>
        )}

        {/* Buscador de conversaciones */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <input
            ref={searchRef}
            aria-label="Buscar conversaciones"
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por usuario, tema o email..."
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Lista de Conversaciones */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Historial ({conversacionesFiltradas.length})</span>
            <span className="text-[10px] text-blue-600 font-normal">{verTodas ? 'Institucional' : 'Personal'}</span>
          </div>

          {conversacionesFiltradas.map((conv) => (
            <button
              key={conv.id}
              disabled={ocupado}
              aria-current={conversacionActiva?.id === conv.id ? 'true' : undefined}
              onClick={() => {
                setHistorialAbierto(false);
                void seleccionarConversacion(conv.id, sesionRevision.current, true);
              }}
              className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 ${
                conversacionActiva?.id === conv.id
                  ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                {conv.usuarioNombre ? conv.usuarioNombre.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-slate-800">{conv.titulo}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-medium truncate mt-0.5">
                  <User className="w-3 h-3 flex-shrink-0 text-blue-500" />
                  <span className="truncate">{conv.usuarioNombre || conv.usuarioEmail || 'Usuario ESAP'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString('es-CO', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {conv.usuarioEmail && (
                    <span className="truncate max-w-[100px] text-[9px] text-slate-400 font-mono">
                      {conv.usuarioEmail.split('@')[0]}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}

          {!cargandoHistorial && !error && conversacionesFiltradas.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No se encontraron conversaciones.
            </div>
          )}
        </div>

        {/* Banner institucional inferior */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>{verTodas ? 'Historial institucional autorizado para consulta.' : 'Tu historial personal de consultas al ChatBot ESAP.'}</span>
        </div>
      </aside>

      {/* Área Principal de Chat */}
      <main className="esap-chatbot-module__chat flex-1 min-w-0 min-h-0 flex flex-col bg-slate-50 relative" style={historialComoPanel && historialAbierto ? { display: 'none' } : {}}>
        <div role="status" className="esap-chatbot-module__notice px-3 py-2 text-xs text-slate-600 bg-white border-b border-slate-200">
          {SERVICE_LABELS[serviceStatus]}
        </div>
        {error && (
          <div role="alert" className="esap-chatbot-module__notice p-3 text-xs text-red-800 bg-red-50 border-b border-red-200">
            <p>{error.message}</p>
            {error.retry && <button type="button" onClick={reintentar} disabled={ocupado}
              className="mt-2 px-3 py-1.5 rounded-lg border border-red-300 font-semibold disabled:opacity-50">
              {reintentando ? 'Comprobando…' : error.retryLabel || 'Reintentar'}
            </button>}
          </div>
        )}
        {aviso && <p role="status" className="esap-chatbot-module__notice p-3 text-xs text-blue-800 bg-blue-50 border-b border-blue-200">{aviso}</p>}
        {/* Header Superior */}
        <header
          className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm"
          style={isWidget ? { display: 'none' } : {}}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                {conversacionActiva?.titulo || 'Asistente Institucional ESAP'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium text-blue-700">
                  <User className="w-3.5 h-3.5" />
                  {conversacionActiva?.usuarioNombre || conversacionActiva?.usuarioEmail || 'Usuario Institucional'}
                </span>
                {conversacionActiva?.usuarioEmail && (
                  <span className="text-slate-400 font-mono text-[11px]">
                    ({conversacionActiva.usuarioEmail})
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Historial de Mensajes */}
        <div ref={messagesRef} className="esap-chatbot-module__messages flex-1 overflow-y-auto p-6 space-y-4" role="log" aria-label="Mensajes de la conversación" aria-live="polite" aria-relevant="additions text">
          {!mensajes.some((message) => message.rol === 'user') && !ocupado && !error && !verTodas && (
            <div className="max-w-xl mx-auto text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                ¿En qué puedo orientarte hoy?
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Selecciona una consulta rápida o escribe tu pregunta abajo.
              </p>
              {!conversacionActiva && !verTodas && (
                <button type="button" onClick={() => iniciarNuevaConversacion('general', sesionRevision.current, true)} className="mb-4 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs">
                  Iniciar conversación
                </button>
              )}

              {/* Tarjetas de Sugerencia */}
              {conversacionActiva?.puedeEscribir && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                {QUICK_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => usarSugerencia(item.prompt)}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-xs flex items-start gap-3 group"
                  >
                    <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-blue-50 transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{item.title}</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">{item.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>}
            </div>
          )}

          {mensajes.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 max-w-2xl ${
                msg.rol === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm bg-gradient-to-br from-blue-600 to-indigo-700`}
              >
                {msg.rol === 'user' ? 'Tú' : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`esap-chatbot-module__bubble p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.rol === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.rol === 'assistant' ? <ChatMessageText text={msg.contenido} /> : msg.contenido}</div>
                <div
                  className={`text-[10px] mt-1.5 flex items-center gap-1 ${
                    msg.rol === 'user' ? 'text-blue-200 justify-end' : 'text-slate-400'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {new Date(msg.createdAt).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {msg.id.startsWith('temp-') && <span>Pendiente de confirmación</span>}
                </div>
              </div>
            </div>
          ))}

          {cargando && mensajes.some((message) => message.id.startsWith('temp-')) && (
            <div className="flex items-start gap-3 max-w-2xl mr-auto">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                El Asistente Virtual está procesando tu respuesta...
              </div>
            </div>
          )}

        </div>

        {/* Barra de Entrada de Mensaje */}
        <div className="esap-chatbot-module__composer p-4 bg-white border-t border-slate-200">
          {conversacionActiva && !conversacionActiva.puedeEscribir ? (
            <p className="text-xs text-slate-600">Consulta de solo lectura. Solo el propietario puede enviar mensajes en esta conversación.</p>
          ) : (
            <form onSubmit={handleEnviar} className="flex items-center gap-3 max-w-4xl mx-auto">
              <input
                ref={inputRef}
                aria-label="Mensaje para el asistente"
                type="text"
                maxLength={2000}
                value={inputTexto}
                onChange={(e) => actualizarBorrador(e.target.value)}
                placeholder="Escribe tu consulta sobre trámites, módulos o procesos ESAP..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                disabled={ocupado || !conversacionActiva?.puedeEscribir}
              />
              <button
                type="submit"
                disabled={!inputTexto.trim() || ocupado || requiereRevision || !conversacionActiva?.puedeEscribir}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                Enviar
              </button>
            </form>
          )}
        </div>
      </main>
      </div>
    </div>
  );
};

export const ChatbotModule: React.FC<ChatbotModuleProps> = (props) => props.mode === 'public'
  ? <PublicChatbotModule apiBaseUrl={props.apiBaseUrl} onLogin={props.onLogin} />
  : <AuthenticatedChatbotModule {...props} />;

export default ChatbotModule;
