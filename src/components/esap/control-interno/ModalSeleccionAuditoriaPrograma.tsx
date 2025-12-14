/**
 * MODAL DE SELECCIÓN DE AUDITORÍA DEL PROGRAMA ANUAL
 * Permite seleccionar una auditoría programada para crear el Plan Individual
 */

import { useState } from 'react';
import { Calendar, Building2, MapPin, AlertCircle, Search, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveModal } from '../shared/ResponsiveModal';

interface AuditoriaProgramada {
  id: string;
  codigo: string;
  procesoAuditable: string;
  tipoProceso: 'Misional' | 'Apoyo' | 'Estratégico' | 'Evaluación';
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string;
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
  añoPriorizacion: string;
  auditorLider?: string;
  equipoAuditor?: string[];
  fechas: {
    planeacion: { inicio: string; fin: string };
    ejecucion: { inicio: string; fin: string };
    comunicacion: { inicio: string; fin: string };
  };
  estado: 'Programada' | 'En Ejecución' | 'Completada';
}

interface ModalSeleccionAuditoriaProgramaProps {
  isOpen: boolean;
  onClose: () => void;
  onSeleccionar: (auditoria: AuditoriaProgramada) => void;
}

// Mock de auditorías del programa (normalmente vendría de props)
const MOCK_AUDITORIAS_PROGRAMADAS: AuditoriaProgramada[] = [
  {
    id: '1',
    codigo: 'AUD-2025-001',
    procesoAuditable: 'Gestión Financiera',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'CRÍTICO',
    añoPriorizacion: 'Año 1',
    auditorLider: 'Mario Oswaldo Bernal Rodriguez',
    equipoAuditor: ['Catalina Rubio', 'Sandra Montero'],
    fechas: {
      planeacion: { inicio: '2025-01-15', fin: '2025-01-30' },
      ejecucion: { inicio: '2025-02-01', fin: '2025-03-01' },
      comunicacion: { inicio: '2025-03-03', fin: '2025-03-18' }
    },
    estado: 'Programada'
  },
  {
    id: '2',
    codigo: 'AUD-2025-002',
    procesoAuditable: 'Gestión Contractual',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'ALTO',
    añoPriorizacion: 'Año 1',
    auditorLider: 'Fernando Ávila',
    equipoAuditor: ['William Ramírez', 'Lucila Villamil'],
    fechas: {
      planeacion: { inicio: '2025-04-01', fin: '2025-04-16' },
      ejecucion: { inicio: '2025-04-17', fin: '2025-05-17' },
      comunicacion: { inicio: '2025-05-19', fin: '2025-06-03' }
    },
    estado: 'Programada'
  },
  {
    id: '3',
    codigo: 'AUD-2025-003',
    procesoAuditable: 'Gestión de Talento Humano',
    tipoProceso: 'Apoyo',
    tipoSede: 'Territorial',
    territorial: 'Antioquia',
    nivelRiesgo: 'MEDIO',
    añoPriorizacion: 'Año 2-3',
    auditorLider: 'Alexandra Triviño',
    equipoAuditor: ['Natalia Cañon'],
    fechas: {
      planeacion: { inicio: '2025-06-15', fin: '2025-06-25' },
      ejecucion: { inicio: '2025-06-26', fin: '2025-06-30' },
      comunicacion: { inicio: '2025-07-01', fin: '2025-07-11' }
    },
    estado: 'Programada'
  }
];

export function ModalSeleccionAuditoriaPrograma({
  isOpen,
  onClose,
  onSeleccionar
}: ModalSeleccionAuditoriaProgramaProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRiesgo, setFiltroRiesgo] = useState<string>('todos');
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<AuditoriaProgramada | null>(null);

  // Filtrar solo auditorías programadas
  let auditoriasFiltradas = MOCK_AUDITORIAS_PROGRAMADAS.filter(a => a.estado === 'Programada');

  if (busqueda) {
    auditoriasFiltradas = auditoriasFiltradas.filter(a =>
      a.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.procesoAuditable.toLowerCase().includes(busqueda.toLowerCase())
    );
  }

  if (filtroRiesgo !== 'todos') {
    auditoriasFiltradas = auditoriasFiltradas.filter(a => a.nivelRiesgo === filtroRiesgo);
  }

  const getRiesgoColor = (riesgo: string) => {
    switch (riesgo) {
      case 'CRÍTICO': return { bg: '#DC2626', text: '#FFFFFF' };
      case 'ALTO': return { bg: '#F59E0B', text: '#FFFFFF' };
      case 'MEDIO': return { bg: '#3B82F6', text: '#FFFFFF' };
      case 'BAJO': return { bg: '#10B981', text: '#FFFFFF' };
      default: return { bg: '#6B7280', text: '#FFFFFF' };
    }
  };

  const handleConfirmar = () => {
    if (!auditoriaSeleccionada) return;
    onSeleccionar(auditoriaSeleccionada);
    setAuditoriaSeleccionada(null);
    setBusqueda('');
    setFiltroRiesgo('todos');
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Seleccionar Auditoría del Programa Anual"
      subtitle="Selecciona una auditoría programada para crear el Plan Individual"
      icon={<Calendar className="w-6 h-6" style={{ color: '#003DA5' }} />}
      maxWidth="4xl"
      footer={
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setAuditoriaSeleccionada(null);
            }}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!auditoriaSeleccionada}
            className="flex-1"
            style={{ background: auditoriaSeleccionada ? '#003DA5' : '#9CA3AF', color: '#FFFFFF' }}
          >
            Continuar con Plan Individual
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o proceso..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 rounded-lg text-sm"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          <select
            value={filtroRiesgo}
            onChange={(e) => setFiltroRiesgo(e.target.value)}
            className="px-3 py-2 border-2 rounded-lg text-sm"
            style={{ borderColor: '#E5E7EB' }}
          >
            <option value="todos">Todos los riesgos</option>
            <option value="CRÍTICO">Solo CRÍTICO</option>
            <option value="ALTO">Solo ALTO</option>
            <option value="MEDIO">Solo MEDIO</option>
            <option value="BAJO">Solo BAJO</option>
          </select>
        </div>

        {/* Información */}
        <div className="rounded-xl p-4" style={{ background: '#EFF6FF', borderLeft: '4px solid #003DA5' }}>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#003DA5' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: '#1E40AF' }}>
                Auditorías Programadas Disponibles
              </p>
              <p className="text-sm" style={{ color: '#1E40AF' }}>
                Se muestran únicamente las auditorías del Programa Anual con estado "Programada" que aún no tienen Plan Individual asignado.
              </p>
            </div>
          </div>
        </div>

        {/* Lista de auditorías */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {auditoriasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
              <p style={{ color: '#6B7280' }}>No hay auditorías programadas disponibles</p>
            </div>
          ) : (
            auditoriasFiltradas.map((auditoria) => {
              const isSelected = auditoriaSeleccionada?.id === auditoria.id;
              const colorRiesgo = getRiesgoColor(auditoria.nivelRiesgo);

              return (
                <button
                  key={auditoria.id}
                  onClick={() => setAuditoriaSeleccionada(auditoria)}
                  className="w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md"
                  style={{
                    background: isSelected ? '#EFF6FF' : '#FFFFFF',
                    borderColor: isSelected ? '#003DA5' : '#E5E7EB'
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-bold text-sm" style={{ color: '#1F2937' }}>
                          {auditoria.codigo}
                        </span>
                        <Badge
                          className="text-xs"
                          style={{
                            background: colorRiesgo.bg,
                            color: colorRiesgo.text
                          }}
                        >
                          {auditoria.nivelRiesgo}
                        </Badge>
                        <Badge className="text-xs" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                          {auditoria.tipoProceso}
                        </Badge>
                      </div>

                      <h4 className="font-bold mb-2" style={{ color: '#1F2937' }}>
                        {auditoria.procesoAuditable}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm" style={{ color: '#6B7280' }}>
                        <div className="flex items-center gap-2">
                          {auditoria.tipoSede === 'Territorial' ? (
                            <>
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span>Territorial - {auditoria.territorial}</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="w-4 h-4 flex-shrink-0" />
                              <span>Sede Principal</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>Inicia: {new Date(auditoria.fechas.planeacion.inicio).toLocaleDateString('es-CO')}</span>
                        </div>
                      </div>

                      <div className="mt-2 text-sm" style={{ color: '#6B7280' }}>
                        <span className="font-bold">Auditor Líder:</span> {auditoria.auditorLider || 'Sin asignar'}
                      </div>
                      <div className="text-sm" style={{ color: '#6B7280' }}>
                        <span className="font-bold">Equipo:</span> {auditoria.equipoAuditor?.length || 0} miembro(s)
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#003DA5' }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: '#FFFFFF' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </ResponsiveModal>
  );
}
