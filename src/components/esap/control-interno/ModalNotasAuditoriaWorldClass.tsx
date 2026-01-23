/**
 * ============================================
 * MODAL NOTAS AUDITORÍA - WORLD CLASS
 * ============================================
 * 
 * Modal estandarizado para gestión de notas y observaciones
 * Usa ModalWorldClass como base
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { useState } from 'react';
import { MessageSquare, Plus, Star, StarOff, Edit2, Trash2, Clock, Tag } from 'lucide-react';
import { ModalWorldClass, ModalChatFooter, type MensajeChat } from './ModalWorldClass';
import { toast } from 'sonner@2.0.3';
import { motion } from 'motion/react';

// ============ TIPOS ============

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
}

type CategoriaNota = 'Hallazgo' | 'Observación' | 'Recomendación' | 'Seguimiento' | 'General';

interface Nota {
  id: string;
  auditoriaId: string;
  contenido: string;
  categoria: CategoriaNota;
  autor: string;
  cargoAutor: string;
  fecha: string;
  hora: string;
  importante: boolean;
}

interface ModalNotasAuditoriaProps {
  auditoria: Auditoria | null;
  open: boolean;
  onClose: () => void;
}

// ============ COMPONENTE PRINCIPAL ============

export function ModalNotasAuditoriaWorldClass({
  auditoria,
  open,
  onClose
}: ModalNotasAuditoriaProps) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaNota | 'Todas'>('Todas');
  const [soloImportantes, setSoloImportantes] = useState(false);

  if (!auditoria) return null;

  // Badges dinámicos
  const badges = [
    { label: `${notas.length} notas`, variant: 'info' as const },
    { 
      label: `${notas.filter(n => n.importante).length} importantes`, 
      icon: <Star className="w-3.5 h-3.5" />,
      variant: 'warning' as const
    }
  ];

  // Filtros para el footer
  const filtros = [
    {
      label: 'Hallazgo',
      active: filtroCategoria === 'Hallazgo',
      onClick: () => setFiltroCategoria(filtroCategoria === 'Hallazgo' ? 'Todas' : 'Hallazgo')
    },
    {
      label: 'Observación',
      active: filtroCategoria === 'Observación',
      onClick: () => setFiltroCategoria(filtroCategoria === 'Observación' ? 'Todas' : 'Observación')
    },
    {
      label: 'Recomendación',
      active: filtroCategoria === 'Recomendación',
      onClick: () => setFiltroCategoria(filtroCategoria === 'Recomendación' ? 'Todas' : 'Recomendación')
    },
    {
      label: soloImportantes ? 'Todas' : 'Solo importantes',
      icon: <Star className="w-3.5 h-3.5" />,
      active: soloImportantes,
      onClick: () => setSoloImportantes(!soloImportantes)
    }
  ];

  // Handler: Agregar nota
  const handleAgregarNota = (contenido: string) => {
    const nuevaNota: Nota = {
      id: `nota-${Date.now()}`,
      auditoriaId: auditoria.id,
      contenido,
      categoria: filtroCategoria !== 'Todas' ? filtroCategoria : 'General',
      autor: 'Usuario Actual',
      cargoAutor: 'Auditor Líder',
      fecha: new Date().toLocaleDateString('es-CO'),
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      importante: false
    };

    setNotas(prev => [nuevaNota, ...prev]);
    toast.success('Nota agregada correctamente');
  };

  // Handler: Marcar como importante
  const handleToggleImportante = (notaId: string) => {
    setNotas(prev => prev.map(nota => 
      nota.id === notaId 
        ? { ...nota, importante: !nota.importante }
        : nota
    ));
    toast.success('Nota actualizada');
  };

  // Handler: Eliminar nota
  const handleEliminarNota = (notaId: string) => {
    setNotas(prev => prev.filter(n => n.id !== notaId));
    toast.success('Nota eliminada');
  };

  // Filtrar notas
  const notasFiltradas = notas.filter(nota => {
    const cumpleCategoria = filtroCategoria === 'Todas' || nota.categoria === filtroCategoria;
    const cumpleImportante = !soloImportantes || nota.importante;
    return cumpleCategoria && cumpleImportante;
  });

  return (
    <ModalWorldClass
      isOpen={open}
      onClose={onClose}
      titulo="Notas y Observaciones"
      codigo={auditoria.codigo}
      icono={<MessageSquare className="w-6 h-6" />}
      badges={badges}
      size="lg"
      footer={
        <ModalChatFooter
          placeholder="Escribe una nota u observación..."
          onEnviar={handleAgregarNota}
          filtros={filtros}
        />
      }
    >
      {/* Lista de notas */}
      <div className="space-y-4">
        {notasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              {filtroCategoria !== 'Todas' || soloImportantes
                ? 'No hay notas con los filtros seleccionados'
                : 'No hay notas registradas. Agrega la primera nota abajo.'
              }
            </p>
          </div>
        )}

        {notasFiltradas.map((nota) => (
          <NotaCard
            key={nota.id}
            nota={nota}
            onToggleImportante={handleToggleImportante}
            onEliminar={handleEliminarNota}
          />
        ))}
      </div>
    </ModalWorldClass>
  );
}

// ============ COMPONENTE AUXILIAR: NOTA CARD ============

interface NotaCardProps {
  nota: Nota;
  onToggleImportante: (id: string) => void;
  onEliminar: (id: string) => void;
}

function NotaCard({ nota, onToggleImportante, onEliminar }: NotaCardProps) {
  const categoriaColors: Record<CategoriaNota, string> = {
    'Hallazgo': 'bg-red-100 text-red-800 border-red-200',
    'Observación': 'bg-blue-100 text-blue-800 border-blue-200',
    'Recomendación': 'bg-green-100 text-green-800 border-green-200',
    'Seguimiento': 'bg-orange-100 text-orange-800 border-orange-200',
    'General': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        p-4 rounded-lg border-2 transition-all
        ${nota.importante 
          ? 'bg-amber-50 border-amber-300 shadow-md' 
          : 'bg-white border-gray-200'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {nota.autor.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>

          {/* Info */}
          <div>
            <p className="text-sm font-medium text-gray-900">{nota.autor}</p>
            <p className="text-xs text-gray-600">{nota.cargoAutor}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleImportante(nota.id)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title={nota.importante ? 'Desmarcar importante' : 'Marcar como importante'}
          >
            {nota.importante ? (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            ) : (
              <StarOff className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <button
            onClick={() => onEliminar(nota.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
            title="Eliminar nota"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
        {nota.contenido}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${categoriaColors[nota.categoria]}`}>
            <Tag className="w-3 h-3" />
            {nota.categoria}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          {nota.fecha} • {nota.hora}
        </div>
      </div>
    </motion.div>
  );
}
