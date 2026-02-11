/**
 * RF004 - FLUJO DE APROBACIÓN DE AUTOS POR JEFE DE OCID
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 * REFACTORIZADO: Usa componente central ModalRevisionAuto
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Search, CheckCircle, Calendar
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';
import { ModalRevisionAuto, type BorradorPendiente } from './ModalRevisionAuto';

// ==================== MOCK DATA ====================

const BORRADORES_PENDIENTES: BorradorPendiente[] = [
  {
    id: 'b1',
    numeroProceso: 'P-120-2025',
    titulo: 'Auto de Indagación Preliminar',
    plantilla: 'Auto de Indagación Preliminar',
    version: 2,
    fechaEnvio: '2025-01-08T14:30:00',
    profesional: {
      nombre: 'Juan Carlos Pérez',
      email: 'juan.perez@esap.edu.co'
    },
    observacionesProfesional: 'Se adjuntan todos los documentos soporte. La conducta presunta está claramente configurada según el artículo 48 de la Ley 734.',
    contenido: `AUTO DE APERTURA DE INDAGACIÓN PRELIMINAR

PROCESO No: P-120-2025
NOTICIA ORIGEN: ND-260
DISCIPLINABLE: Juan Pérez Gómez
IDENTIFICACIÓN: 1234567890

La Oficina de Control Interno Disciplinario de la ESAP, en uso de sus facultades legales,

CONSIDERANDO:

PRIMERO: Que mediante noticia disciplinaria No. ND-260 de fecha 03 de enero de 2025, se puso en conocimiento presuntos hechos de acoso laboral.

SEGUNDO: Que los hechos descritos ameritan indagación preliminar para establecer si se configura falta disciplinaria.

RESUELVE:

ARTÍCULO PRIMERO: ABRIR INDAGACIÓN PRELIMINAR en contra de Juan Pérez Gómez, identificado con CC 1234567890.

ARTÍCULO SEGUNDO: NOTIFÍQUESE el presente auto al investigado.

Dado en Bogotá D.C., a los 08 días del mes de enero de 2025.`,
    denunciado: 'Juan Pérez Gómez',
    etapa: 'Indagación Preliminar',
    prioridad: 'alta',
    estado: 'pendiente_revision',
    tiempoEspera: '2h 15m',
    historial: [
      {
        id: 'h1',
        tipo: 'recibido',
        usuario: 'Juan Carlos Pérez',
        fecha: '2025-01-08T14:30:00',
        descripcion: 'Borrador enviado para revisión',
        detalles: { version: 2 }
      }
    ]
  },
  {
    id: 'b2',
    numeroProceso: 'P-089-2024',
    titulo: 'Auto de Inhibitorio',
    plantilla: 'Auto de Inhibitorio',
    version: 1,
    fechaEnvio: '2025-01-07T10:15:00',
    profesional: {
      nombre: 'María Torres',
      email: 'maria.torres@esap.edu.co'
    },
    observacionesProfesional: 'Los hechos investigados no constituyen falta disciplinaria. Se recomienda archivo.',
    contenido: `AUTO DE INHIBITORIO

PROCESO No: P-089-2024
NOTICIA ORIGEN: ND-178

Se RESUELVE INHIBIRSE de iniciar investigación disciplinaria por no configurarse falta disciplinaria.`,
    denunciado: 'María González Castro',
    etapa: 'Valoración',
    prioridad: 'media',
    estado: 'en_revision',
    tiempoEspera: '1d 4h',
    historial: [
      {
        id: 'h2',
        tipo: 'recibido',
        usuario: 'María Torres',
        fecha: '2025-01-07T10:15:00',
        descripcion: 'Borrador enviado para revisión'
      },
      {
        id: 'h3',
        tipo: 'revision_iniciada',
        usuario: 'Jefe OCID',
        fecha: '2025-01-08T09:00:00',
        descripcion: 'Revisión iniciada'
      }
    ]
  }
];

// ==================== UTILIDADES ====================

const getInitials = (nombre: string) => {
  const parts = nombre.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
};

// ==================== COMPONENTE PRINCIPAL ====================

export function RevisionAprobacionJefe() {
  const [borradores] = useState<BorradorPendiente[]>(BORRADORES_PENDIENTES);
  const [borradorSeleccionado, setBorradorSeleccionado] = useState<BorradorPendiente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente_revision' | 'en_revision'>('todos');

  const borradorsFiltrados = borradores.filter(b => {
    const matchesSearch = searchQuery === '' || 
      b.numeroProceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.titulo.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = filtroEstado === 'todos' || b.estado === filtroEstado;
    
    return matchesSearch && matchesEstado;
  });

  const handleAprobar = (comentarios: string) => {
    toast.success('Auto Aprobado', {
      description: `${borradorSeleccionado?.numeroProceso} - Auto aprobado exitosamente`
    });
    setBorradorSeleccionado(null);
  };

  const handleDevolver = (motivo: string, comentarios: string, archivos: File[]) => {
    toast.warning('Auto Devuelto', {
      description: `El auto ha sido devuelto al profesional para correcciones`
    });
    setBorradorSeleccionado(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Header - Estándar Corporativo ESAP */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <CheckCircle size={20} className="sm:w-6 sm:h-6" style={{ color: '#10B981' }} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Revisión y Aprobación de Autos
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  Sistema Integrado de Gestión Legal (SIGL v5.0)
                </p>
              </div>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs text-gray-600">Total Borradores</p>
              <p className="text-xl font-bold" style={{ color: '#003DA5' }}>
                {borradores.length}
              </p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-gray-600">Pendientes</p>
              <p className="text-xl font-bold text-amber-700">
                {borradores.filter(b => b.estado === 'pendiente_revision').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {/* Buscador y Filtros */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Buscar por número de proceso o título..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] bg-white"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filtroEstado === 'todos'
                  ? 'text-white'
                  : 'bg-white text-gray-700 border-2'
              }`}
              style={
                filtroEstado === 'todos'
                  ? { background: '#003DA5' }
                  : { borderColor: '#E5E7EB' }
              }
            >
              Todos ({borradores.length})
            </button>
            <button
              onClick={() => setFiltroEstado('pendiente_revision')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filtroEstado === 'pendiente_revision'
                  ? 'text-white'
                  : 'bg-white text-gray-700 border-2'
              }`}
              style={
                filtroEstado === 'pendiente_revision'
                  ? { background: '#003DA5' }
                  : { borderColor: '#E5E7EB' }
              }
            >
              Pendientes ({borradores.filter(b => b.estado === 'pendiente_revision').length})
            </button>
            <button
              onClick={() => setFiltroEstado('en_revision')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filtroEstado === 'en_revision'
                  ? 'text-white'
                  : 'bg-white text-gray-700 border-2'
              }`}
              style={
                filtroEstado === 'en_revision'
                  ? { background: '#003DA5' }
                  : { borderColor: '#E5E7EB' }
              }
            >
              En Revisión ({borradores.filter(b => b.estado === 'en_revision').length})
            </button>
          </div>
        </div>

        {/* Lista de Borradores */}
        <div className="space-y-4">
          {borradorsFiltrados.map((borrador) => {
            const initials = getInitials(borrador.profesional.nombre);
            
            return (
              <div
                key={borrador.id}
                className="bg-white rounded-xl border-2 p-5 hover:shadow-lg transition-all cursor-pointer"
                style={{ borderColor: '#E5E7EB' }}
                onClick={() => setBorradorSeleccionado(borrador)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                    {initials}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-xl font-extrabold mb-1" style={{ color: '#1F2937' }}>
                          {borrador.titulo}
                        </h3>
                        <p className="text-sm" style={{ color: '#6B7280' }}>
                          {borrador.numeroProceso} • {borrador.profesional.nombre}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {borrador.tiempoEspera && (
                          <Badge style={{ background: '#FEF3C7', color: '#D97706' }}>
                            {borrador.tiempoEspera}
                          </Badge>
                        )}
                        {borrador.prioridad === 'alta' && (
                          <Badge style={{ background: '#FEE2E2', color: '#DC2626' }}>
                            Alta Prioridad
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span style={{ color: '#6B7280' }}>
                        <Calendar className="w-4 h-4 inline-block mr-1" />
                        {new Date(borrador.fechaEnvio).toLocaleDateString('es-CO')}
                      </span>
                      <span style={{ color: '#6B7280' }}>
                        Versión {borrador.version}
                      </span>
                      <span style={{ color: '#6B7280' }}>
                        {borrador.etapa}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {borradorsFiltrados.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
              <p className="text-lg font-semibold mb-2" style={{ color: '#6B7280' }}>
                No se encontraron borradores
              </p>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Intenta cambiar los filtros de búsqueda
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Revisión - Componente Central Unificado */}
      <AnimatePresence>
        {borradorSeleccionado && (
          <ModalRevisionAuto
            borrador={borradorSeleccionado}
            onClose={() => setBorradorSeleccionado(null)}
            onAprobar={handleAprobar}
            onDevolver={handleDevolver}
            mostrarBotonDevolver={true}
            tituloModal="Revisión de Auto"
            descripcionModal={`Sistema Integrado de Gestión Legal (SIGL v5.0) - ${borradorSeleccionado.numeroProceso}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
