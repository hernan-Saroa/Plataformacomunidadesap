/**
 * Modal Nueva Auditoría - Versión Simplificada
 * Formulario básico para crear auditorías
 */

import { useState } from 'react';
import { X, Plus, Calendar, Users, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ModalNuevaAuditoriaSimpleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCrear: (auditoria: any) => void;
}

export function ModalNuevaAuditoriaSimple({
  open,
  onOpenChange,
  onCrear
}: ModalNuevaAuditoriaSimpleProps) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [territorial, setTerritorial] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [liderAuditoria, setLiderAuditoria] = useState('');

  if (!open) return null;

  const tiposAuditoria = [
    'Auditoría de Cumplimiento',
    'Auditoría Financiera',
    'Auditoría de Gestión',
    'Auditoría de Desempeño',
    'Auditoría Operacional',
    'Auditoría de Sistemas',
    'Auditoría Integral',
    'Auditoría Especial'
  ];

  const territorialesESAP = [
    'Nacional - Sede Central',
    'Antioquia - Medellín',
    'Atlántico - Barranquilla',
    'Bolívar - Cartagena',
    'Boyacá - Tunja',
    'Caldas - Manizales',
    'Cauca - Popayán',
    'Cesar - Valledupar',
    'Córdoba - Montería',
    'Cundinamarca - Bogotá',
    'Huila - Neiva',
    'La Guajira - Riohacha',
    'Magdalena - Santa Marta',
    'Meta - Villavicencio',
    'Nariño - Pasto',
    'Norte de Santander - Cúcuta',
    'Quindío - Armenia',
    'Risaralda - Pereira',
    'Santander - Bucaramanga',
    'Sucre - Sincelejo',
    'Tolima - Ibagué',
    'Valle del Cauca - Cali'
  ];

  const lideresDisponibles = [
    'Dra. María Rodríguez',
    'Dr. Carlos Méndez',
    'Mg. Ana Sánchez',
    'Dr. Juan Torres',
    'Dra. Patricia Gómez'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !tipo || !territorial || !fechaInicio || !fechaFin || !liderAuditoria) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900) + 100;
    const codigo = `AUD-${year}-${random}`;

    const nuevaAuditoria = {
      codigo,
      nombre,
      tipo,
      alcance: 'Nacional',
      objetivo: '',
      territorial,
      fase: 'Por Programar',
      prioridad: 'Media',
      fechaInicio,
      fechaFin,
      progreso: 0,
      liderAuditoria,
      equipoAuditor: [],
      proceso: '',
      riesgoAsociado: '',
      estado: 'Activa',
      fechaCreacion: new Date().toISOString()
    };

    onCrear(nuevaAuditoria);
    
    // Limpiar formulario
    setNombre('');
    setTipo('');
    setTerritorial('');
    setFechaInicio('');
    setFechaFin('');
    setLiderAuditoria('');
    
    toast.success(`Auditoría ${codigo} creada exitosamente`);
    onOpenChange(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={() => onOpenChange(false)}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#003DA5' }}>
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>Nueva Auditoría</h2>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Completa la información básica para crear una nueva auditoría
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: '#E5E7EB' }}>
              <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h3 className="font-semibold" style={{ color: '#1F2937' }}>Información Básica</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: '#374151' }}>
                Nombre de la Auditoría <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-xl border-2 outline-none focus:border-blue-400"
                style={{ borderColor: '#E5E7EB' }}
                placeholder="Ej: Auditoría de Gestión - Dirección Financiera Territorial Antioquia"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: '#374151' }}>
                  Tipo de Auditoría <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-2 rounded-xl border-2 outline-none focus:border-blue-400"
                  style={{ borderColor: '#E5E7EB' }}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  required
                >
                  <option value="">Selecciona el tipo</option>
                  {tiposAuditoria.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: '#374151' }}>
                  Líder de Auditoría <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-2 rounded-xl border-2 outline-none focus:border-blue-400"
                  style={{ borderColor: '#E5E7EB' }}
                  value={liderAuditoria}
                  onChange={(e) => setLiderAuditoria(e.target.value)}
                  required
                >
                  <option value="">Selecciona el líder</option>
                  {lideresDisponibles.map((lider) => (
                    <option key={lider} value={lider}>{lider}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Alcance Territorial */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: '#E5E7EB' }}>
              <MapPin className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h3 className="font-semibold" style={{ color: '#1F2937' }}>Alcance Territorial</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: '#374151' }}>
                Territorial <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 rounded-xl border-2 outline-none focus:border-blue-400"
                style={{ borderColor: '#E5E7EB' }}
                value={territorial}
                onChange={(e) => setTerritorial(e.target.value)}
                required
              >
                <option value="">Selecciona la territorial</option>
                {territorialesESAP.map((terr) => (
                  <option key={terr} value={terr}>{terr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Período de Ejecución */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: '#E5E7EB' }}>
              <Calendar className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h3 className="font-semibold" style={{ color: '#1F2937' }}>Período de Ejecución</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: '#374151' }}>
                  Fecha de Inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 rounded-xl border-2 outline-none focus:border-blue-400"
                  style={{ borderColor: '#E5E7EB' }}
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: '#374151' }}>
                  Fecha de Finalización <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 rounded-xl border-2 outline-none focus:border-blue-400"
                  style={{ borderColor: '#E5E7EB' }}
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  min={fechaInicio}
                  required
                />
              </div>
            </div>
          </div>

          {/* Mensaje informativo */}
          <div className="rounded-xl p-4" style={{ background: '#EFF6FF' }}>
            <div className="flex gap-3">
              <Users className="w-5 h-5 flex-shrink-0" style={{ color: '#003DA5' }} />
              <div>
                <p className="text-sm" style={{ color: '#003DA5' }}>
                  <strong>Nota:</strong> La auditoría se creará en la fase <strong>"Por Programar"</strong>. 
                  Posteriormente podrás editarla y moverla a través de las diferentes fases del proceso.
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t-2" style={{ borderColor: '#E5E7EB' }}>
            <button
              type="button"
              className="flex-1 px-6 py-3 rounded-xl border-2 font-medium hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              style={{ background: '#003DA5' }}
            >
              <Plus className="w-5 h-5" />
              Crear Auditoría
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
