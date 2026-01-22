/**
 * SISTEMA DE COMUNICACIONES DEL PROCESO - CONTROL INTERNO DISCIPLINARIO
 * Diseño actualizado tipo chat alineado con el estándar ESAP (SIGL v5.0)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, Send, Pin, AlertCircle, Info, CheckCircle,
  User, Clock, X, Edit2, Trash2, Flag, Search, Filter,
  FileText, Scale, Users, Calendar, Tag, ChevronDown, ChevronUp,
  Paperclip, Download, Smile, AtSign, Hash
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
  cargo?: string;
}

interface Comentario {
  id: string;
  autor: Persona;
  fecha: string;
  hora: string;
  etapa: string;
  contenido: string;
  tipo: 'normal' | 'importante' | 'guia' | 'alerta';
  categoria?: 'juridico' | 'administrativo' | 'probatorio' | 'general';
  adjuntos?: string[];
  fijado?: boolean;
  editado?: boolean;
}

interface SistemaComentariosProps {
  numeroProceso: string;
  etapaActual: string;
  comentariosIniciales?: Comentario[];
  profesionalActual: Persona;
}

export function SistemaComentarios({ 
  numeroProceso, 
  etapaActual,
  comentariosIniciales = [],
  profesionalActual 
}: SistemaComentariosProps) {
  const [comentarios, setComentarios] = useState<Comentario[]>(comentariosIniciales.length > 0 ? comentariosIniciales : [
    {
      id: 'c1',
      autor: {
        nombre: 'Juan Pérez López',
        tipoIdentificacion: 'CC',
        numeroIdentificacion: '1234567890',
        cargo: 'Abogado Defensor'
      },
      fecha: '22/10/2024',
      hora: '14:53',
      etapa: 'Recepción',
      contenido: 'Se recibió notificación del juzgado con auto admisorio. Procederemos a contestar la demanda en los próximos 10 días según el término legal.',
      tipo: 'importante',
      categoria: 'juridico',
      fijado: false
    },
    {
      id: 'c2',
      autor: {
        nombre: 'María González',
        tipoIdentificacion: 'CC',
        numeroIdentificacion: '9876543210',
        cargo: 'Coordinadora Jurídica'
      },
      fecha: '22/10/2024',
      hora: '18:20',
      etapa: 'Indagación Previa',
      contenido: '@Juan Pérez ¿Los necesitamos los precedentes jurisprudenciales? Necesitamos incluirlos en la contestación.',
      tipo: 'normal',
      categoria: 'juridico',
      fijado: false
    }
  ]);

  const [nuevoComentario, setNuevoComentario] = useState('');
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

  // Obtener color del avatar según el tipo
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

  const handleEnviarComentario = () => {
    if (!nuevoComentario.trim()) {
      toast.error('Comentario vacío', {
        description: 'Por favor escribe un mensaje antes de enviar'
      });
      return;
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

    toast.success('Mensaje Enviado', {
      description: 'Tu comentario ha sido agregado al proceso'
    });
  };

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
              Comunicaciones del Proceso
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
            onClick={handleEnviarComentario}
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
