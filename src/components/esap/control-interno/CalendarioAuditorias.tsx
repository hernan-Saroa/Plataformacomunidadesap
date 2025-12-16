/**
 * CALENDARIO DE AUDITORÍAS
 * Vista de calendario mensual con auditorías distribuidas por fechas
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, MapPin } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  fase: string;
  territorial: string;
  sede: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  progreso: number;
  prioridad: 'Alta' | 'Media' | 'Baja';
  hallazgos: number;
}

interface CalendarioAuditoriasProps {
  auditorias: Auditoria[];
  onVerDetalles: (auditoria: Auditoria) => void;
}

export function CalendarioAuditorias({ auditorias, onVerDetalles }: CalendarioAuditoriasProps) {
  const [mesActual, setMesActual] = useState(new Date());

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Obtener primer y último día del mes
  const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
  const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
  
  // Obtener día de la semana del primer día (0 = Domingo)
  const primerDiaSemana = primerDiaMes.getDay();
  
  // Total de días en el mes
  const diasEnMes = ultimoDiaMes.getDate();

  // Navegar meses
  const mesAnterior = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1));
  };

  const mesSiguiente = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1));
  };

  const hoy = new Date();
  const esHoy = (dia: number) => {
    return dia === hoy.getDate() && 
           mesActual.getMonth() === hoy.getMonth() && 
           mesActual.getFullYear() === hoy.getFullYear();
  };

  // Obtener auditorías para un día específico
  const getAuditoriasDelDia = (dia: number) => {
    const fechaDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia);
    
    return auditorias.filter(auditoria => {
      const fechaInicio = new Date(auditoria.fechaInicio);
      const fechaFin = new Date(auditoria.fechaFin);
      
      // Normalizar fechas para comparar solo día/mes/año
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin.setHours(0, 0, 0, 0);
      fechaDia.setHours(0, 0, 0, 0);
      
      return fechaDia >= fechaInicio && fechaDia <= fechaFin;
    });
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return '#EF4444';
      case 'Media': return '#F59E0B';
      case 'Baja': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getFaseColor = (fase: string) => {
    switch (fase) {
      case 'planeacion': return '#6B7280';
      case 'en-curso': return '#3B82F6';
      case 'revision': return '#F59E0B';
      case 'completada': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Construir array de días (incluyendo días vacíos al inicio)
  const dias = [];
  
  // Días vacíos antes del primer día del mes
  for (let i = 0; i < primerDiaSemana; i++) {
    dias.push(null);
  }
  
  // Días del mes
  for (let dia = 1; dia <= diasEnMes; dia++) {
    dias.push(dia);
  }

  return (
    <div className="rounded-2xl border-2 overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
      {/* Header del Calendario */}
      <div className="p-4 border-b-2 flex items-center justify-between" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: '#EFF6FF' }}>
            <Calendar className="w-5 h-5" style={{ color: '#003DA5' }} />
          </div>
          <div>
            <h3 className="font-black" style={{ color: '#1F2937' }}>
              {meses[mesActual.getMonth()]} {mesActual.getFullYear()}
            </h3>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              {auditorias.length} auditoría{auditorias.length !== 1 ? 's' : ''} en total
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={mesAnterior}
            className="h-9 w-9 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMesActual(new Date())}
            className="text-xs px-3"
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={mesSiguiente}
            className="h-9 w-9 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendario */}
      <div className="p-4">
        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {diasSemana.map((dia) => (
            <div
              key={dia}
              className="text-center py-2 font-bold text-xs"
              style={{ color: '#6B7280' }}
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-2">
          {dias.map((dia, index) => {
            const auditoriasDelDia = dia ? getAuditoriasDelDia(dia) : [];
            const tieneAuditorias = auditoriasDelDia.length > 0;
            
            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 rounded-lg border-2 transition-all ${
                  dia ? 'hover:border-blue-300 cursor-pointer' : ''
                }`}
                style={{
                  background: dia ? (esHoy(dia) ? '#EFF6FF' : '#FFFFFF') : '#F9FAFB',
                  borderColor: dia ? (esHoy(dia) ? '#003DA5' : '#E5E7EB') : '#E5E7EB'
                }}
              >
                {dia && (
                  <>
                    {/* Número del día */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm font-bold ${
                          esHoy(dia) ? 'flex items-center justify-center w-6 h-6 rounded-full' : ''
                        }`}
                        style={{
                          color: esHoy(dia) ? '#FFFFFF' : '#1F2937',
                          background: esHoy(dia) ? '#003DA5' : 'transparent'
                        }}
                      >
                        {dia}
                      </span>
                      {tieneAuditorias && (
                        <Badge
                          style={{
                            background: '#F97316',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            padding: '2px 6px'
                          }}
                        >
                          {auditoriasDelDia.length}
                        </Badge>
                      )}
                    </div>

                    {/* Auditorías del día */}
                    <div className="space-y-1">
                      {auditoriasDelDia.slice(0, 2).map((auditoria) => (
                        <div
                          key={auditoria.id}
                          className="p-1.5 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            background: `${getFaseColor(auditoria.fase)}20`,
                            borderLeft: `3px solid ${getFaseColor(auditoria.fase)}`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onVerDetalles(auditoria);
                          }}
                        >
                          <p
                            className="font-bold truncate"
                            style={{ color: getFaseColor(auditoria.fase), fontSize: '10px' }}
                          >
                            {auditoria.codigo}
                          </p>
                          <p
                            className="truncate"
                            style={{ color: '#6B7280', fontSize: '9px' }}
                          >
                            {auditoria.nombre}
                          </p>
                        </div>
                      ))}
                      
                      {/* Indicador de más auditorías */}
                      {auditoriasDelDia.length > 2 && (
                        <button
                          className="text-xs w-full text-left px-1.5 py-1 rounded hover:bg-gray-100 transition-colors"
                          style={{ color: '#6B7280' }}
                          onClick={() => {
                            // Aquí se podría abrir un modal con todas las auditorías del día
                          }}
                        >
                          +{auditoriasDelDia.length - 2} más
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="p-4 border-t-2" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-6 flex-wrap">
          <span className="text-xs font-bold" style={{ color: '#6B7280' }}>FASES:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#6B7280' }} />
            <span className="text-xs" style={{ color: '#6B7280' }}>Planeación</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#3B82F6' }} />
            <span className="text-xs" style={{ color: '#6B7280' }}>En Curso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#F59E0B' }} />
            <span className="text-xs" style={{ color: '#6B7280' }}>Revisión</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#10B981' }} />
            <span className="text-xs" style={{ color: '#6B7280' }}>Completada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
