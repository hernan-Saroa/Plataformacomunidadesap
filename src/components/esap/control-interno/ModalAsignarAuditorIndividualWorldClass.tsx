/**
 * ============================================
 * MODAL ASIGNAR AUDITOR - WORLD CLASS
 * ============================================
 * 
 * Modal para asignar auditor a una auditoría específica
 * Usa ModalWorldClass como base
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { useState } from 'react';
import { UserPlus, User, Briefcase, Mail, Phone, Shield, CheckCircle } from 'lucide-react';
import { ModalWorldClass } from './ModalWorldClass';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface Auditor {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
  telefono: string;
  especializacion: string;
  auditorias_activas: number;
  disponible: boolean;
}

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  territorial: string;
}

interface ModalAsignarAuditorIndividualProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: Auditoria | null;
  onAsignar: (auditorId: string, rol: string) => void;
}

// ============ DATOS DE EJEMPLO ============

const AUDITORES_DISPONIBLES: Auditor[] = [
  {
    id: 'aud-1',
    nombre: 'Ana María López Silva',
    cargo: 'Auditor Senior',
    email: 'ana.lopez@esap.edu.co',
    telefono: '310 456 7890',
    especializacion: 'Gestión Financiera',
    auditorias_activas: 2,
    disponible: true
  },
  {
    id: 'aud-2',
    nombre: 'Carlos Andrés Ramírez',
    cargo: 'Auditor Junior',
    email: 'carlos.ramirez@esap.edu.co',
    telefono: '315 234 5678',
    especializacion: 'Procesos Administrativos',
    auditorias_activas: 1,
    disponible: true
  },
  {
    id: 'aud-3',
    nombre: 'María Fernanda Gómez',
    cargo: 'Auditor Líder',
    email: 'maria.gomez@esap.edu.co',
    telefono: '320 987 6543',
    especializacion: 'Control Interno',
    auditorias_activas: 4,
    disponible: false
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function ModalAsignarAuditorIndividualWorldClass({
  isOpen,
  onClose,
  auditoria,
  onAsignar
}: ModalAsignarAuditorIndividualProps) {
  const [auditorSeleccionado, setAuditorSeleccionado] = useState<string | null>(null);
  const [rolAsignado, setRolAsignado] = useState<'lider' | 'miembro'>('miembro');
  const [busqueda, setBusqueda] = useState('');

  if (!auditoria) return null;

  // Badges dinámicos
  const badges = [
    { 
      label: auditoria.territorial, 
      variant: 'info' as const 
    },
    { 
      label: 'Seleccionar auditor',
      icon: <UserPlus className="w-3.5 h-3.5" />,
      variant: 'primary' as const
    }
  ];

  // Filtrar auditores
  const auditoresFiltrados = AUDITORES_DISPONIBLES.filter(aud =>
    aud.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    aud.cargo.toLowerCase().includes(busqueda.toLowerCase()) ||
    aud.especializacion.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleAsignar = () => {
    if (!auditorSeleccionado) {
      toast.error('Debes seleccionar un auditor');
      return;
    }

    const auditor = AUDITORES_DISPONIBLES.find(a => a.id === auditorSeleccionado);
    
    onAsignar(auditorSeleccionado, rolAsignado);
    toast.success('Auditor asignado correctamente', {
      description: `${auditor?.nombre} ha sido asignado como ${rolAsignado === 'lider' ? 'Auditor Líder' : 'Auditor Miembro'}`
    });
    onClose();
    setAuditorSeleccionado(null);
    setBusqueda('');
  };

  return (
    <ModalWorldClass
      isOpen={isOpen}
      onClose={onClose}
      titulo="Asignar Auditor"
      codigo={auditoria.codigo}
      icono={<UserPlus className="w-6 h-6" />}
      badges={badges}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAsignar}
            disabled={!auditorSeleccionado}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Asignar Auditor
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Info de la auditoría */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            Asignando auditor a:
          </h3>
          <p className="text-sm text-gray-900 font-medium">{auditoria.titulo}</p>
          <p className="text-xs text-gray-600 mt-1">{auditoria.codigo}</p>
        </div>

        {/* Rol a asignar */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Rol del Auditor
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRolAsignado('lider')}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${rolAsignado === 'lider'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Auditor Líder</span>
              </div>
              <p className="text-xs text-gray-600">
                Responsable principal de la auditoría
              </p>
            </button>

            <button
              onClick={() => setRolAsignado('miembro')}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${rolAsignado === 'miembro'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Auditor Miembro</span>
              </div>
              <p className="text-xs text-gray-600">
                Miembro del equipo auditor
              </p>
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Buscar Auditor
          </label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, cargo o especialización..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Lista de auditores */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Auditores Disponibles
          </label>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {auditoresFiltrados.map((auditor) => (
              <AuditorCard
                key={auditor.id}
                auditor={auditor}
                selected={auditorSeleccionado === auditor.id}
                onSelect={() => setAuditorSeleccionado(auditor.id)}
              />
            ))}

            {auditoresFiltrados.length === 0 && (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  No se encontraron auditores con los criterios de búsqueda
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalWorldClass>
  );
}

// ============ COMPONENTE AUXILIAR: AUDITOR CARD ============

interface AuditorCardProps {
  auditor: Auditor;
  selected: boolean;
  onSelect: () => void;
}

function AuditorCard({ auditor, selected, onSelect }: AuditorCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={!auditor.disponible}
      className={`
        w-full p-4 rounded-lg border-2 transition-all text-left
        ${selected
          ? 'border-blue-500 bg-blue-50'
          : auditor.disponible
            ? 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
        }
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium
            ${selected 
              ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
              : 'bg-gradient-to-br from-gray-500 to-gray-600'
            }
          `}>
            {auditor.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>

          {/* Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {auditor.nombre}
            </h4>
            <p className="text-xs text-gray-600">{auditor.cargo}</p>
          </div>
        </div>

        {/* Indicador selección */}
        {selected && (
          <div className="flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
        )}
      </div>

      {/* Detalles */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-600">
          <Briefcase className="w-3.5 h-3.5" />
          <span>{auditor.especializacion}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Shield className="w-3.5 h-3.5" />
          <span>{auditor.auditorias_activas} auditorías activas</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Mail className="w-3.5 h-3.5" />
          <span className="truncate">{auditor.email}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="w-3.5 h-3.5" />
          <span>{auditor.telefono}</span>
        </div>
      </div>

      {/* Estado */}
      {!auditor.disponible && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <span className="text-xs text-red-600 font-medium">
            No disponible - Carga completa
          </span>
        </div>
      )}
    </button>
  );
}
