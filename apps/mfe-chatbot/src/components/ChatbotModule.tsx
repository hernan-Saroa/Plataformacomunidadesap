import React, { useState, useEffect, useRef } from 'react';
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
import { ChatbotService, ConversacionChat, MensajeChat } from '../services/chatbot.service';

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
  userEmail?: string;
  userId?: string;
  userName?: string;
  initialConversationId?: string;
  onClose?: () => void;
  isWidget?: boolean;
}

export const ChatbotModule: React.FC<ChatbotModuleProps> = ({
  userEmail,
  userId,
  userName,
  initialConversationId,
  onClose,
  isWidget = false,
}) => {
  const [conversaciones, setConversaciones] = useState<ConversacionChat[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<ConversacionChat | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [inputTexto, setInputTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [filtroContexto, setFiltroContexto] = useState('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarConversaciones();
  }, [userEmail, isWidget]);

  useEffect(() => {
    if (initialConversationId) {
      seleccionarConversacion(initialConversationId);
    }
  }, [initialConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes, cargando]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cargarConversaciones = async () => {
    // Si es widget carga las del usuario logueado; si es el módulo completo carga todas las conversaciones
    const lista = isWidget
      ? await ChatbotService.listarConversaciones(userEmail, false)
      : await ChatbotService.listarConversaciones(undefined, true);
    setConversaciones(lista);
    if (lista.length > 0) {
      seleccionarConversacion(lista[0].id);
    } else {
      iniciarNuevaConversacion('general');
    }
  };

  const seleccionarConversacion = async (id: string) => {
    try {
      const detalle = await ChatbotService.obtenerConversacion(id);
      setConversacionActiva(detalle);
      setMensajes(detalle.mensajes || []);
    } catch {
      const conv = conversaciones.find((c) => c.id === id);
      if (conv) {
        setConversacionActiva(conv);
        setMensajes(conv.mensajes || []);
      }
    }
  };

  const iniciarNuevaConversacion = async (contexto: string = 'general') => {
    const nueva = await ChatbotService.crearConversacion(
      'Nueva consulta',
      contexto,
      userEmail,
      userId,
      userName,
    );
    setConversaciones((prev) => [nueva, ...prev.filter((c) => c.id !== nueva.id)]);
    setConversacionActiva(nueva);
    setMensajes(nueva.mensajes || []);
  };

  const handleEnviar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputTexto.trim() || cargando || !conversacionActiva) return;

    const texto = inputTexto.trim();
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

    try {
      const res = await ChatbotService.enviarMensaje(conversacionActiva.id, texto);
      setMensajes((prev) => [
        ...prev.filter((m) => m.id !== userMsgTemp.id),
        res.userMessage,
        res.botMessage,
      ]);
      // Refrescar lista de conversaciones para actualizar título / última modificación
      if (!isWidget) {
        ChatbotService.listarConversaciones(undefined, true).then(setConversaciones);
      }
    } catch {
      // Manejado en el servicio fallback
    } finally {
      setCargando(false);
    }
  };

  const usarSugerencia = (prompt: string) => {
    setInputTexto(prompt);
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
    <div className="flex h-[calc(100vh-4.5rem)] bg-slate-50 text-slate-800 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      {/* Sidebar de Historial */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0" style={isWidget ? { display: 'none' } : {}}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">ChatBot ESAP</h2>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                En línea
              </span>
            </div>
          </div>
          <button
            onClick={() => iniciarNuevaConversacion(filtroContexto)}
            className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            title="Nueva conversación"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Buscador de conversaciones */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <input
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
            <span className="text-[10px] text-blue-600 font-normal">Todas</span>
          </div>

          {conversacionesFiltradas.map((conv) => (
            <button
              key={conv.id}
              onClick={() => seleccionarConversacion(conv.id)}
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

          {conversacionesFiltradas.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No se encontraron conversaciones.
            </div>
          )}
        </div>

        {/* Banner institucional inferior */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>Historial de consultas al ChatBot institucional ESAP.</span>
        </div>
      </aside>

      {/* Área Principal de Chat */}
      <main className="flex-1 flex flex-col bg-slate-50 relative">
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mensajes.length === 0 && (
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

              {/* Tarjetas de Sugerencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
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
              </div>
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
                className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.rol === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.contenido}</div>
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
                </div>
              </div>
            </div>
          ))}

          {cargando && (
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

          <div ref={messagesEndRef} />
        </div>

        {/* Barra de Entrada de Mensaje */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form onSubmit={handleEnviar} className="flex items-center gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              placeholder="Escribe tu consulta sobre trámites, módulos o procesos ESAP..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              disabled={cargando}
            />
            <button
              type="submit"
              disabled={!inputTexto.trim() || cargando}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Send className="w-4 h-4" />
              Enviar
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ChatbotModule;
