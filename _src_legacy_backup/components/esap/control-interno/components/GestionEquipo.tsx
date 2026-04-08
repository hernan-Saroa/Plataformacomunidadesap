/**
 * ═════════════════════════════════════════════════════════════════════════
 * GESTIÓN DE EQUIPO - OCIG
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Componente para gestionar el equipo de una auditoría
 * Muestra miembros con roles y permite agregar/remover
 * 
 * @version 1.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, Mail, Phone, User, Crown, Shield } from 'lucide-react';
import { ESAP_CLASSES } from '../utils/esapThemeOCIG';
import { toast } from 'sonner@2.0.3';

// ═════════════════════════════════════════════════════════════════════════
// TIPOS
// ═════════════════════════════════════════════════════════════════════════

export interface MiembroEquipo {
  id: string;
  nombre: string;
  cargo: string;
  rol: 'lider' | 'senior' | 'junior' | 'apoyo';
  email?: string;
  telefono?: string;
  avatar?: string;
  activo?: boolean;
}

interface GestionEquipoProps {
  miembros: MiembroEquipo[];
  onAgregar?: () => void;
  onRemover?: (id: string) => void;
  onEditar?: (id: string) => void;
  soloLectura?: boolean;
  className?: string;
}

// ═════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ROLES
// ═════════════════════════════════════════════════════════════════════════

const ROL_CONFIG = {
  lider: {
    label: 'Auditor Líder',
    icon: Crown,
    color: '#2874A6',
    bg: '#E8F4F8',
  },
  senior: {
    label: 'Auditor Senior',
    icon: Shield,
    color: '#8B5CF6',
    bg: '#EDE9FE',
  },
  junior: {
    label: 'Auditor Junior',
    icon: User,
    color: '#10B981',
    bg: '#D1FAE5',
  },
  apoyo: {
    label: 'Apoyo',
    icon: User,
    color: '#6C757D',
    bg: '#F8F9FA',
  },
};

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function GestionEquipo({
  miembros,
  onAgregar,
  onRemover,
  onEditar,
  soloLectura = false,
  className = '',
}: GestionEquipoProps) {
  
  const [miembroExpandido, setMiembroExpandido] = useState<string | null>(null);

  const handleRemover = (id: string, nombre: string) => {
    if (onRemover) {
      onRemover(id);
      toast.success('Miembro removido', {
        description: `${nombre} ha sido removido del equipo`,
        duration: 2000,
      });
    }
  };

  const obtenerIniciales = (nombre: string): string => {
    return nombre
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Equipo de Auditoría
          </h3>
          <p className="text-sm text-gray-600">
            {miembros.length} {miembros.length === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>

        {!soloLectura && onAgregar && (
          <button
            onClick={onAgregar}
            className={`${ESAP_CLASSES.button.primary} flex items-center gap-2`}
          >
            <Plus className="w-4 h-4" />
            Agregar Miembro
          </button>
        )}
      </div>

      {/* Lista de Miembros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {miembros.map((miembro) => {
          const config = ROL_CONFIG[miembro.rol];
          const Icon = config.icon;
          const expandido = miembroExpandido === miembro.id;

          return (
            <div
              key={miembro.id}
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all"
            >
              {/* Header de la Card */}
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}CC 100%)` 
                  }}
                >
                  {miembro.avatar ? (
                    <img 
                      src={miembro.avatar} 
                      alt={miembro.nombre}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    obtenerIniciales(miembro.nombre)
                  )}
                </div>

                {/* Información Principal */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    {miembro.nombre}
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    {miembro.cargo}
                  </p>

                  {/* Badge de Rol */}
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: config.bg,
                        color: config.color,
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>

                    {miembro.activo === false && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600">
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                {!soloLectura && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setMiembroExpandido(expandido ? null : miembro.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Ver más"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${expandido ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {onRemover && miembro.rol !== 'lider' && (
                      <button
                        onClick={() => handleRemover(miembro.id, miembro.nombre)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Información Expandida */}
              {expandido && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  {miembro.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a 
                        href={`mailto:${miembro.email}`}
                        className="hover:text-[#2874A6] transition-colors"
                      >
                        {miembro.email}
                      </a>
                    </div>
                  )}

                  {miembro.telefono && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a 
                        href={`tel:${miembro.telefono}`}
                        className="hover:text-[#2874A6] transition-colors"
                      >
                        {miembro.telefono}
                      </a>
                    </div>
                  )}

                  {onEditar && (
                    <button
                      onClick={() => onEditar(miembro.id)}
                      className="w-full mt-2 px-3 py-2 text-sm font-medium text-[#2874A6] hover:text-white hover:bg-[#2874A6] border border-[#2874A6] rounded transition-all"
                    >
                      Editar Información
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {miembros.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            No hay miembros en el equipo
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            Agrega miembros para conformar el equipo de auditoría
          </p>
          {!soloLectura && onAgregar && (
            <button
              onClick={onAgregar}
              className={ESAP_CLASSES.button.primary}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Agregar Primer Miembro
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default GestionEquipo;
