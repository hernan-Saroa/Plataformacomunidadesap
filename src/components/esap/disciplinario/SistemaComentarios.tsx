/**
 * SISTEMA DE COMUNICACIONES DEL PROCESO - CONTROL INTERNO DISCIPLINARIO
 * Diseño actualizado tipo chat alineado con el estándar ESAP (SIGL v5.0)
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, Send, Pin, AlertCircle, Info, CheckCircle,
  User, Clock, X, Edit2, Trash2, Flag, Search, Filter,
  FileText, Scale, Users, Calendar, Tag, ChevronDown, ChevronUp,
  Paperclip, Download, History, Smile, AtSign, Hash,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../ui/alert-dialog';
import { toast } from 'sonner@2.0.3';

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
  cargo?: string;
}

interface ComentarioAdjunto {
  nombre: string;
  size: number;
  type: string;
  dataUrl: string;
}

interface Comentario {
  id: string;
  autor: Persona;
  fecha: string;
  hora: string;
  etapa: string;
  contenido: string;
  tipo: 'normal' | 'importante' | 'guia' | 'alerta' | 'sistema';
  categoria?: 'juridico' | 'administrativo' | 'probatorio' | 'general';
  adjuntos?: ComentarioAdjunto[];
  fijado?: boolean;
  editado?: boolean;
}

interface SistemaComentariosProps {
  procesoId: string;
  numeroProceso: string;
  etapaActual: string;
  comentariosIniciales?: Comentario[];
  profesionalActual: Persona;
}

export function SistemaComentarios({ 
  procesoId,
  numeroProceso, 
  etapaActual,
  comentariosIniciales = [],
  profesionalActual 
}: SistemaComentariosProps) {
  const STORAGE_PREFIX = 'disciplinario-comentarios:';
  const getUserKey = () => {
    try {
      const rawSesion = localStorage.getItem('esap-sesion-activa');
      if (rawSesion) {
        const sesion = JSON.parse(rawSesion);
        const usuario = sesion?.usuario || {};
        return usuario.id || usuario.email || 'anon';
      }
    } catch (e) {
      console.warn('No se pudo leer sesion activa', e);
    }
    try {
      const rawUser = localStorage.getItem('esap_user_data');
      if (rawUser) {
        const data = JSON.parse(rawUser);
        return data.personId || data.email || data.name || 'anon';
      }
    } catch (e) {
      console.warn('No se pudo leer user_data', e);
    }
    return 'anon';
  };

  const userKey = getUserKey();
  const storageKey = `${STORAGE_PREFIX}${procesoId}:${userKey}`;
  const legacyStorageKey = `${STORAGE_PREFIX}${procesoId}`;

  const getAutorActual = (): Persona => {
    try {
      const rawSesion = localStorage.getItem('esap-sesion-activa');
      if (rawSesion) {
        const sesion = JSON.parse(rawSesion);
        const usuario = sesion?.usuario || {};
        if (usuario?.nombre || usuario?.email || usuario?.id) {
          return {
            nombre: usuario.nombre || usuario.email || 'Usuario',
            tipoIdentificacion: 'CC',
            numeroIdentificacion: usuario.id || usuario.email || 'N/A'
          };
        }
      }
    } catch (e) {
      console.warn('No se pudo leer autor actual', e);
    }
    return profesionalActual;
  };

  const loadPersistedComments = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
      const legacyRaw = localStorage.getItem(legacyStorageKey);
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        const legacy = Array.isArray(parsedLegacy) ? parsedLegacy : [];
        localStorage.setItem(storageKey, JSON.stringify(legacy));
        return legacy;
      }
      return [];
    } catch (e) {
      console.warn('No se pudieron leer comentarios persistidos', e);
      return [];
    }
  };

  const [comentarios, setComentarios] = useState<Comentario[]>(() => {
    const persisted = loadPersistedComments();
    if (persisted.length > 0) return persisted;
    return comentariosIniciales;
  });
  
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<'normal' | 'importante' | 'guia' | 'alerta' | 'sistema'>('normal');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<'juridico' | 'administrativo' | 'probatorio' | 'general'>('general');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todas');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroFijados, setFiltroFijados] = useState<'todos' | 'fijados' | 'no-fijados'>('todos');
  const [comentarioParaEliminar, setComentarioParaEliminar] = useState<Comentario | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(comentarios));
    } catch (e) {
      console.warn('No se pudieron guardar comentarios persistidos', e);
    }
  }, [comentarios, storageKey]);

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  };

  const getEtapaColor = (etapa: string) => {
    const key = (etapa || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (key.includes('investigacion')) return '#003DA5';
    if (key.includes('juzgamiento')) return '#2563EB';
    if (key.includes('fallo')) return '#16A34A';
    if (key.includes('indagacion')) return '#0F766E';
    if (key.includes('valoracion')) return '#6B7280';
    if (key.includes('recepcion')) return '#4B5563';
    return '#6B7280';
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const [etiquetaSeleccionada, setEtiquetaSeleccionada] = useState<string | null>(null);
  const [mostrarAdjuntos, setMostrarAdjuntos] = useState(false);

  // Obtener iniciales del nombre
  const getInitials = (nombre: string) => {
    const parts = nombre.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  const tiposComentario = [
    { id: 'normal', nombre: 'Normal', color: '#6B7280', icon: MessageCircle },
    { id: 'importante', nombre: 'Importante', color: '#F59E0B', icon: Flag },
    { id: 'guia', nombre: 'Guia', color: '#3B82F6', icon: Info },
    { id: 'alerta', nombre: 'Alerta', color: '#DC2626', icon: AlertCircle },
    { id: 'sistema', nombre: 'Sistema', color: '#0F172A', icon: History }
  ];

  const categorias = [
    { id: 'general', nombre: 'General', icon: MessageCircle },
    { id: 'juridico', nombre: 'Jurídico', icon: Scale },
    { id: 'administrativo', nombre: 'Administrativo', icon: FileText },
    { id: 'probatorio', nombre: 'Probatorio', icon: Users }
  ];

  const getAvatarColor = (tipo: string) => {
    switch(tipo) {
      case 'importante':
        return { bg: '#FEE2E2', text: '#DC2626' };
      case 'alerta':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'guia':
        return { bg: '#DBEAFE', text: '#2563EB' };
      default:
        return { bg: '#E0EDFF', text: '#003DA5' };
    }
  };

  const handleAgregarComentario = async () => {
    if (!nuevoComentario.trim()) {
      toast.error('Comentario vacío', {
        description: 'Por favor escribe un mensaje antes de enviar'
      });
      return;
    }

    const archivosGrandes = archivosAdjuntos.filter((file) => file.size > MAX_FILE_SIZE);
    if (archivosGrandes.length > 0) {
      toast.error('Archivo demasiado grande', {
        description: 'Cada archivo debe ser de maximo 10 MB'
      });
      return;
    }

    const ahora = new Date();
    let adjuntos: ComentarioAdjunto[] | undefined;
    if (archivosAdjuntos.length > 0) {
      try {
        adjuntos = await Promise.all(archivosAdjuntos.map(async (file) => ({
          nombre: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: await readFileAsDataUrl(file)
        })));
      } catch (error) {
        console.error('Error leyendo archivos adjuntos', error);
        toast.error('No se pudieron cargar los archivos adjuntos');
        return;
      }
    }

    const now = new Date();
    const nuevoComentarioObj: Comentario = {
      id: `c${comentarios.length + 1}`,
      autor: profesionalActual,
      fecha: now.toLocaleDateString('es-CO'),
      hora: now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      etapa: etapaActual,
      contenido: nuevoComentario,
      tipo: 'normal',
      categoria: 'general'
    };

    setComentarios([...comentarios, nuevoComentarioObj]);
    setNuevoComentario('');
    setEtiquetaSeleccionada(null);

    toast.success('Comentario agregado', {
      description: adjuntos 
        ? `Comentario con ${adjuntos.length} archivo(s) adjunto(s)`
        : `Se agregó comentario en etapa: ${etapaActual}`
    });
  };

  const handleFijarComentario = (id: string) => {
    const updated = comentarios.map(c =>
      c.id === id ? { ...c, fijado: !c.fijado } : c
    );
    setComentarios(updated);
    const comentario = updated.find(c => c.id === id);
    toast.success(
      comentario?.fijado ? 'Comentario fijado' : 'Comentario desfijado',
      { description: comentario?.fijado ? 'El comentario se mostrara en la parte superior' : 'El comentario ya no esta destacado' }
    );
  };


  const handleEliminarComentario = (id: string) => {
    setComentarios(comentarios.filter(c => c.id !== id));
    toast.success('Comentario eliminado', {
      description: 'El comentario ha sido eliminado permanentemente'
    });
  };

  const handleConfirmarEliminar = () => {
    if (!comentarioParaEliminar) return;
    handleEliminarComentario(comentarioParaEliminar.id);
    setComentarioParaEliminar(null);
  };

  // Filtrar comentarios
  const comentariosFiltrados = comentarios.filter(c => {
    const textoBusqueda = busqueda.trim().toLowerCase();
    const tipoLabel = getTipoConfig(c.tipo).nombre.toLowerCase();
    const categoriaLabel = getCategoriaConfig(c.categoria).nombre.toLowerCase();
    const coincideBusqueda = !textoBusqueda ||
      c.contenido.toLowerCase().includes(textoBusqueda) ||
      c.autor.nombre.toLowerCase().includes(textoBusqueda) ||
      c.etapa.toLowerCase().includes(textoBusqueda) ||
      tipoLabel.includes(textoBusqueda) ||
      categoriaLabel.includes(textoBusqueda);
    const coincideEtapa = filtroEtapa === 'todas' || c.etapa === filtroEtapa;
    const coincideTipo = filtroTipo === 'todos' || c.tipo === filtroTipo;
    const coincideCategoria = filtroCategoria === 'todas' || c.categoria === filtroCategoria;
    const coincideFijado = filtroFijados === 'todos' || (filtroFijados === 'fijados' ? c.fijado : !c.fijado);
    return coincideBusqueda && coincideEtapa && coincideTipo && coincideCategoria && coincideFijado;
  });

// Separar fijados y no fijados
  const comentariosFijados = comentariosFiltrados.filter(c => c.fijado);
  const comentariosNormales = comentariosFiltrados.filter(c => !c.fijado);

  function getTipoConfig(tipo: string) {
    return tiposComentario.find(t => t.id === tipo) || tiposComentario[0];
  }

  function getCategoriaConfig(categoria?: string) {
    return categorias.find(c => c.id === categoria) || categorias[0];
  }
  const handleResponder = (comentario: Comentario) => {
    setNuevoComentario(`@${comentario.autor.nombre.split(' ')[0]} `);
  };

  const handleReaccionar = (comentario: Comentario) => {
    toast.info('Reacción', {
      description: 'Función de reacciones disponible próximamente'
    });
  };

  const totalComentarios = comentarios.length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#E0EDFF' }}>
            <MessageCircle className="w-5 h-5" style={{ color: '#003DA5' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#1F2937' }}>
              Comunicaciones del Procesoasds
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {numeroProceso}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge style={{ background: '#003DA5', color: '#FFFFFF' }}>
            NOTIFICACIÓN
          </Badge>
          <Badge style={{ background: '#E0EDFF', color: '#003DA5' }}>
            {totalComentarios} {totalComentarios === 1 ? 'mensaje' : 'mensajes'}
          </Badge>
        </div>
      </div>

      {/* Información del Demandante/Proceso */}
      <div className="mb-6 p-4 rounded-xl" style={{ background: '#EFF6FF' }}>
        <div className="flex items-center gap-3">
          <User className="w-5 h-5" style={{ color: '#003DA5' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
              Denunciante: María González Pérez
            </p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              Profesional: Dr. Juan Pérez López
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Comentarios/Mensajes */}
      <div className="space-y-3 mb-6 max-h-[500px] overflow-y-auto">
        {comentarios.map((comentario) => {
          const avatarColor = getAvatarColor(comentario.tipo);
          const initials = getInitials(comentario.autor.nombre);

          return (
            <div
              key={comentario.id}
              className="p-4 rounded-xl hover:shadow-sm transition-all"
              style={{ background: '#F8FAFC' }}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: avatarColor.bg, color: avatarColor.text }}
                >
                  {initials}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: '#1F2937' }}>
                          {comentario.autor.nombre}
                        </span>
                        {comentario.tipo === 'importante' && (
                          <Flag className="w-4 h-4" style={{ color: '#DC2626' }} />
                        )}
                      </div>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        {comentario.autor.cargo || 'Profesional'} • {comentario.etapa}
                      </p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: '#9CA3AF' }}>
                      {comentario.fecha} {comentario.hora}
                    </span>
                  </div>

                  <p className="text-sm mb-3" style={{ color: '#374151' }}>
                    {comentario.contenido}
                  </p>

                  {/* Adjuntos si los hay */}
                  {comentario.adjuntos && comentario.adjuntos.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <Paperclip className="w-4 h-4" style={{ color: '#6B7280' }} />
                      <span className="text-xs font-semibold" style={{ color: '#003DA5' }}>
                        {comentario.adjuntos.length} {comentario.adjuntos.length === 1 ? 'adjunto' : 'adjuntos'}
                      </span>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleResponder(comentario)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white"
                      style={{ color: '#003DA5' }}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Responder
                    </button>
                    <button
                      onClick={() => handleReaccionar(comentario)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white"
                      style={{ color: '#F59E0B' }}
                    >
                      <Smile className="w-3.5 h-3.5" />
                      Reaccionar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Etiquetas rápidas */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
          Respuestas rápidas:
        </span>
        <button
          onClick={() => setEtiquetaSeleccionada('re-saludo')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            etiquetaSeleccionada === 're-saludo' ? 'shadow-sm' : ''
          }`}
          style={{
            background: etiquetaSeleccionada === 're-saludo' ? '#D1FAE5' : '#F3F4F6',
            color: etiquetaSeleccionada === 're-saludo' ? '#059669' : '#6B7280'
          }}
        >
          ✓ Re-Saludo
        </button>
        <button
          onClick={() => setEtiquetaSeleccionada('me-info')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            etiquetaSeleccionada === 'me-info' ? 'shadow-sm' : ''
          }`}
          style={{
            background: etiquetaSeleccionada === 'me-info' ? '#DBEAFE' : '#F3F4F6',
            color: etiquetaSeleccionada === 'me-info' ? '#2563EB' : '#6B7280'
          }}
        >
          ? Me info
        </button>
        <button
          onClick={() => setEtiquetaSeleccionada('aplazado')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            etiquetaSeleccionada === 'aplazado' ? 'shadow-sm' : ''
          }`}
          style={{
            background: etiquetaSeleccionada === 'aplazado' ? '#FEF3C7' : '#F3F4F6',
            color: etiquetaSeleccionada === 'aplazado' ? '#D97706' : '#6B7280'
          }}
        >
          ⚡ Aplazado
        </button>
      </div>

      {/* Área de escritura */}
      <div className="border-2 rounded-xl p-4" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
        <textarea
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
          placeholder="Escribe un mensaje sobre este proceso judicial..."
          rows={3}
          className="w-full px-0 py-0 border-0 focus:outline-none resize-none text-sm"
          style={{ color: '#1F2937' }}
        />

        {/* Botones de acción del editor */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Adjuntar archivo"
            >
              <Paperclip className="w-4 h-4" style={{ color: '#6B7280' }} />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Emoji"
            >
              <Smile className="w-4 h-4" style={{ color: '#6B7280' }} />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Mencionar"
            >
              <AtSign className="w-4 h-4" style={{ color: '#6B7280' }} />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Etiqueta"
            >
              <Hash className="w-4 h-4" style={{ color: '#6B7280' }} />
            </button>
          </div>

          <button
            onClick={handleAgregarComentario}
            disabled={!nuevoComentario.trim()}
            className="px-4 py-2 rounded-lg font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#003DA5' }}
          >
            <Send className="w-4 h-4" />
            Enviar
          </button>
        </div>

        {/* Ayuda */}
        <div className="mt-3 flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
          <p className="text-xs" style={{ color: '#6B7280' }}>
            Usa <code className="px-1 py-0.5 rounded bg-gray-100 font-mono">ENTER</code> para enviar o{' '}
            <code className="px-1 py-0.5 rounded bg-gray-100 font-mono">SHIFT + ENTER</code> para nueva línea
          </p>
        </div>
      </div>
    </div>
  );
}

// Componente individual de comentario
interface ComentarioItemProps {
  comentario: Comentario;
  onFijar: (id: string) => void;
  onRequestEliminar: (comentario: Comentario) => void;
  getTipoConfig: (tipo: string) => any;
  getCategoriaConfig: (categoria?: string) => any;
  getEtapaColor: (etapa: string) => string;
  formatFileSize: (size: number) => string;
}

function ComentarioItem({ 
  comentario, 
  onFijar, 
  onRequestEliminar,
  getTipoConfig,
  getCategoriaConfig,
  getEtapaColor,
  formatFileSize
}: ComentarioItemProps) {
  const tipoConfig = getTipoConfig(comentario.tipo);
  const categoriaConfig = getCategoriaConfig(comentario.categoria);
  const etapaColor = getEtapaColor(comentario.etapa);
  const [expanded, setExpanded] = useState(false);
  const MAX_CHARS = 220;
  const isLong = comentario.contenido.length > MAX_CHARS;
  const contenidoMostrado = expanded || !isLong
    ? comentario.contenido
    : `${comentario.contenido.slice(0, MAX_CHARS).trimEnd()}...`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card 
        className={`p-4 hover:shadow-md transition-shadow border-l-4 ${
          comentario.fijado ? 'border-2 border-orange-300 bg-orange-50' : ''
        }`}
        style={{ borderLeftColor: tipoConfig.color }}
      >
        {/* Header del comentario */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div 
              className="p-2 rounded-lg"
              style={{ background: tipoConfig.color + '20' }}
            >
              <tipoConfig.icon 
                className="w-4 h-4" 
                style={{ color: tipoConfig.color }} 
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-bold text-gray-900">{comentario.autor.nombre}</p>
                <Badge 
                  variant="outline"
                  style={{ 
                    background: tipoConfig.color + '15',
                    color: tipoConfig.color,
                    borderColor: tipoConfig.color + '40'
                  }}
                >
                  {tipoConfig.nombre}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <categoriaConfig.icon className="w-3 h-3 mr-1" />
                  {categoriaConfig.nombre}
                </Badge>
                {comentario.fijado && (
                  <Badge className="bg-orange-100 text-orange-700 text-xs">
                    <Pin className="w-3 h-3 mr-1" />
                    Fijado
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {comentario.autor.tipoIdentificacion} {comentario.autor.numeroIdentificacion}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {comentario.fecha}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {comentario.hora}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    color: etapaColor,
                    borderColor: etapaColor + '40',
                    background: etapaColor + '10'
                  }}
                >
                  {comentario.etapa}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Acciones */}
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onFijar(comentario.id)}
              title={comentario.fijado ? 'Desfijar comentario' : 'Fijar comentario'}
              className={comentario.fijado ? 'bg-orange-100 border-orange-300' : ''}
            >
              <Pin className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onRequestEliminar(comentario)}
              title="Eliminar comentario"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Contenido */}
        <div className="pl-14">
          <p
            className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer"
            onClick={() => isLong && setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {contenidoMostrado}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              {expanded ? 'Ver menos' : 'Ver mas'}
            </button>
          )}

          {/* Archivos Adjuntos */}
          {comentario.adjuntos && comentario.adjuntos.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="w-3.5 h-3.5 text-gray-600" />
                <p className="text-xs font-bold text-gray-700">
                  {comentario.adjuntos.length} archivo(s) adjunto(s)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {comentario.adjuntos.map((archivo, index) => (
                  <a
                    key={index}
                    href={archivo.dataUrl}
                    download={archivo.nombre}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
                    title={archivo.nombre}
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-xs text-gray-700 max-w-[160px] truncate">{archivo.nombre}</span>
                    <span className="text-[10px] text-gray-500">{formatFileSize(archivo.size)}</span>
                    <Download className="w-3 h-3 text-gray-500" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {comentario.editado && (
            <p className="text-xs text-gray-500 mt-2 italic">
              Editado
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
