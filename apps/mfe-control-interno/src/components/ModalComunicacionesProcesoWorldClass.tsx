/**
 * ============================================
 * MODAL COMUNICACIONES PROCESO - WORLD CLASS
 * ============================================
 * 
 * Ejemplo de implementación del modal estándar
 * para comunicaciones de procesos judiciales/auditorías
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { useState } from 'react';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Info, ThumbsUp } from 'lucide-react';
import { 
  ModalWorldClass, 
  ChatTimeline, 
  ModalChatFooter, 
  type MensajeChat 
} from './ModalWorldClass';
import { toast } from 'sonner';

// ============ TIPOS ============

interface ComunicacionProceso {
  id: string;
  codigo: string;
  titulo: string;
  estado: 'NOTIFICADA' | 'PENDIENTE' | 'RESPONDIDA' | 'CERRADA';
  totalMensajes: number;
  mensajes: MensajeChat[];
}

interface ModalComunicacionesProcesoProps {
  isOpen: boolean;
  onClose: () => void;
  comunicacion: ComunicacionProceso | null;
}

// ============ DATOS DE EJEMPLO ============

const MENSAJES_EJEMPLO: MensajeChat[] = [
  {
    id: 'msg-1',
    autor: {
      nombre: 'María González Pérez',
      cargo: 'Demandante - Dr. Juan Pérez López',
      iniciales: 'MG'
    },
    contenido: 'Se requiere notificación del juzgado con auto admisorio. Procedemos a contestar la demanda en los próximos 10 días según el término legal.',
    timestamp: '22/12/2024 14:15',
    tipo: 'recibido'
  },
  {
    id: 'msg-2',
    autor: {
      nombre: 'Juan Pérez López',
      cargo: 'Abogado Defensor',
      iniciales: 'JP'
    },
    contenido: 'Se recibió notificación del juzgado con auto admisorio. Procedemos a contestar la demanda en los próximos 10 días según el término legal.',
    timestamp: '22/12/2024 14:15',
    tipo: 'enviado'
  },
  {
    id: 'msg-3',
    autor: {
      nombre: 'María González',
      cargo: 'Coordinadora Jurídica',
      iniciales: 'MG'
    },
    contenido: '@Juan Pérez, ¿Me revisaste los precedentes jurisprudenciales? Necesitamos incluirlos en la contestación.',
    timestamp: '22/12/2024 16:20',
    tipo: 'recibido'
  }
];

// ============ COMPONENTE ============

export function ModalComunicacionesProcesoWorldClass({
  isOpen,
  onClose,
  comunicacion
}: ModalComunicacionesProcesoProps) {
  const [filtroActivo, setFiltroActivo] = useState<string | null>(null);

  if (!comunicacion) return null;

  // Badges dinámicos según estado
  const badges = [
    {
      label: comunicacion.estado,
      variant: 
        comunicacion.estado === 'NOTIFICADA' ? 'primary' :
        comunicacion.estado === 'RESPONDIDA' ? 'success' :
        comunicacion.estado === 'PENDIENTE' ? 'warning' :
        'neutral'
    },
    {
      label: `${comunicacion.totalMensajes} mensajes`,
      icon: <Clock className="w-3.5 h-3.5" />,
      variant: 'info'
    }
  ] as const;

  // Filtros
  const filtros = [
    {
      label: 'Respuesta rápida',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      active: filtroActivo === 'rapida',
      onClick: () => setFiltroActivo(filtroActivo === 'rapida' ? null : 'rapida')
    },
    {
      label: 'Recibido',
      icon: <Info className="w-3.5 h-3.5" />,
      active: filtroActivo === 'recibido',
      onClick: () => setFiltroActivo(filtroActivo === 'recibido' ? null : 'recibido')
    },
    {
      label: 'Más info',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      active: filtroActivo === 'info',
      onClick: () => setFiltroActivo(filtroActivo === 'info' ? null : 'info')
    },
    {
      label: 'Aprobado',
      icon: <ThumbsUp className="w-3.5 h-3.5" />,
      active: filtroActivo === 'aprobado',
      onClick: () => setFiltroActivo(filtroActivo === 'aprobado' ? null : 'aprobado')
    }
  ];

  const handleEnviarMensaje = (mensaje: string) => {
    console.log('Enviando mensaje:', mensaje);
    toast.success('Mensaje enviado correctamente', {
      description: 'El destinatario será notificado por correo electrónico'
    });
  };

  const handleResponder = (mensaje: MensajeChat) => {
    console.log('Respondiendo a:', mensaje);
    toast.info(`Respondiendo a ${mensaje.autor.nombre}`);
  };

  const handleReaccionar = (mensaje: MensajeChat) => {
    console.log('Reaccionando a:', mensaje);
    toast.success('Reacción agregada');
  };

  return (
    <ModalWorldClass
      isOpen={isOpen}
      onClose={onClose}
      titulo={comunicacion.titulo}
      codigo={comunicacion.codigo}
      icono={<MessageSquare className="w-6 h-6" />}
      badges={badges}
      size="lg"
      footer={
        <ModalChatFooter
          placeholder="Escribe un mensaje sobre este proceso judicial..."
          onEnviar={handleEnviarMensaje}
          filtros={filtros}
        />
      }
    >
      {/* Timeline de mensajes */}
      <ChatTimeline
        mensajes={comunicacion.mensajes}
        onResponder={handleResponder}
        onReaccionar={handleReaccionar}
      />
    </ModalWorldClass>
  );
}

// ============ EJEMPLO DE USO ============

export function EjemploUso() {
  const [modalOpen, setModalOpen] = useState(false);

  const comunicacionEjemplo: ComunicacionProceso = {
    id: 'com-001',
    codigo: 'PJ-2025-001',
    titulo: 'Comunicaciones del Proceso',
    estado: 'NOTIFICADA',
    totalMensajes: 5,
    mensajes: MENSAJES_EJEMPLO
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Abrir Comunicaciones
      </button>

      <ModalComunicacionesProcesoWorldClass
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        comunicacion={comunicacionEjemplo}
      />
    </>
  );
}
