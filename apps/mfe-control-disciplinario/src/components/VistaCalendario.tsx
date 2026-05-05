/**
 * VISTA CALENDARIO - TÉRMINOS Y ALERTAS ✨
 * Calendario interactivo con días festivos y términos
 * Diseño corporativo ESAP (SIGL v5.0)
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Clock, AlertCircle, CheckCircle, User, FileText
} from 'lucide-react';

interface Termino {
  id: string;
  procesoId: string;
  numeroProceso: string;
  denunciado: string;
  actuacion: string;
  responsable: string;
  emailResponsable: string;
  fechaInicio: string;
  diasHabiles: number;
  fechaVencimiento: string;
  diasRestantes: number;
  estado: 'pendiente' | 'proximo_vencer' | 'vencido' | 'cumplido' | 'suspendido';
  alertaEnviada: boolean;
  etapaProcesal: string;
}

interface DiaFestivo {
  id: string;
  fecha: string;
  descripcion: string;
  tipo: 'nacional' | 'regional' | 'institucional';
  territorio?: string;
}

interface VistaCalendarioProps {
  terminos: Termino[];
  diasFestivos: DiaFestivo[];
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function VistaCalendario({ terminos, diasFestivos }: VistaCalendarioProps) {
  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);

  // Generar días del calendario
  const diasDelMes = useMemo(() => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    
    const diasAnteriores = primerDia.getDay();
    const diasEnMes = ultimoDia.getDate();
    
    const dias: (Date | null)[] = [];
    
    // Días del mes anterior
    for (let i = 0; i < diasAnteriores; i++) {
      dias.push(null);
    }
    
    // Días del mes actual
    for (let i = 1; i <= diasEnMes; i++) {
      dias.push(new Date(year, month, i));
    }
    
    return dias;
  }, [mesActual]);

  // Obtener términos por fecha
  const terminosPorFecha = useMemo(() => {
    const map = new Map<string, Termino[]>();
    
    terminos.forEach(termino => {
      const fecha = termino.fechaVencimiento;
      if (!map.has(fecha)) {
        map.set(fecha, []);
      }
      map.get(fecha)!.push(termino);
    });
    
    return map;
  }, [terminos]);

  // Obtener festivos por fecha
  const festivosPorFecha = useMemo(() => {
    const map = new Map<string, DiaFestivo>();
    
    diasFestivos.forEach(festivo => {
      map.set(festivo.fecha, festivo);
    });
    
    return map;
  }, [diasFestivos]);

  const mesAnterior = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1));
    setDiaSeleccionado(null);
  };

  const mesSiguiente = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1));
    setDiaSeleccionado(null);
  };

  const hoyEs = (fecha: Date) => {
    const hoy = new Date();
    return fecha.getDate() === hoy.getDate() &&
           fecha.getMonth() === hoy.getMonth() &&
           fecha.getFullYear() === hoy.getFullYear();
  };

  const getFechaString = (fecha: Date) => {
    return fecha.toISOString().split('T')[0];
  };

  const getTiposDia = (fecha: Date) => {
    const fechaStr = getFechaString(fecha);
    const tieneTerminos = terminosPorFecha.has(fechaStr);
    const esFestivo = festivosPorFecha.has(fechaStr);
    const esHoy = hoyEs(fecha);
    
    return { tieneTerminos, esFestivo, esHoy };
  };

  const terminosDelDia = useMemo(() => {
    if (!diaSeleccionado) return [];
    const fechaStr = getFechaString(diaSeleccionado);
    return terminosPorFecha.get(fechaStr) || [];
  }, [diaSeleccionado, terminosPorFecha]);

  const festivoDelDia = useMemo(() => {
    if (!diaSeleccionado) return null;
    const fechaStr = getFechaString(diaSeleccionado);
    return festivosPorFecha.get(fechaStr) || null;
  }, [diaSeleccionado, festivosPorFecha]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Calendario */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
          {/* Header del calendario */}
          <div className="p-4 border-b-2" style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)', borderColor: '#E5E7EB' }}>
            <div className="flex items-center justify-between">
              <button
                onClick={mesAnterior}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" style={{ color: 'white' }} />
              </button>
              
              <div className="text-center">
                <h3 className="text-xl font-bold" style={{ color: 'white' }}>
                  {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
                </h3>
              </div>
              
              <button
                onClick={mesSiguiente}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-5 h-5" style={{ color: 'white' }} />
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 border-b-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
            {DIAS_SEMANA.map(dia => (
              <div key={dia} className="p-3 text-center">
                <span className="text-xs font-bold" style={{ color: '#6B7280' }}>
                  {dia}
                </span>
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7">
            {diasDelMes.map((dia, index) => {
              if (!dia) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="aspect-square border-b border-r"
                    style={{ borderColor: '#F3F4F6', background: '#FAFAFA' }}
                  />
                );
              }

              const { tieneTerminos, esFestivo, esHoy } = getTiposDia(dia);
              const fechaStr = getFechaString(dia);
              const cantidadTerminos = terminosPorFecha.get(fechaStr)?.length || 0;
              const esSeleccionado = diaSeleccionado && getFechaString(diaSeleccionado) === fechaStr;

              return (
                <div
                  key={index}
                  onClick={() => setDiaSeleccionado(dia)}
                  className="aspect-square border-b border-r p-2 cursor-pointer hover:bg-blue-50 transition-colors relative"
                  style={{
                    borderColor: '#E5E7EB',
                    background: esSeleccionado ? '#EFF6FF' : esFestivo ? '#FEF3C7' : '#FFFFFF'
                  }}
                >
                  {/* Número del día */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold mb-1"
                    style={{
                      background: esHoy ? '#003DA5' : 'transparent',
                      color: esHoy ? 'white' : esFestivo ? '#92400E' : '#1F2937'
                    }}
                  >
                    {dia.getDate()}
                  </div>

                  {/* Indicadores */}
                  <div className="space-y-1">
                    {esFestivo && (
                      <div className="text-xs px-1 py-0.5 rounded" style={{ background: '#F59E0B', color: 'white' }}>
                        🎉
                      </div>
                    )}
                    {tieneTerminos && (
                      <div className="text-xs px-1 py-0.5 rounded font-semibold" style={{
                        background: cantidadTerminos > 3 ? '#DC2626' :
                                   cantidadTerminos > 1 ? '#F59E0B' : '#2563EB',
                        color: 'white'
                      }}>
                        {cantidadTerminos}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leyenda */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full" style={{ background: '#003DA5' }}></div>
              <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>Día actual</span>
            </div>
          </div>
          <div className="p-3 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded flex items-center justify-center text-lg" style={{ background: '#FEF3C7' }}>🎉</div>
              <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>Festivo</span>
            </div>
          </div>
          <div className="p-3 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold" style={{ background: '#DC2626', color: 'white' }}>3</div>
              <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>Términos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel lateral - Detalles del día */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border-2 overflow-hidden h-full" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
          {diaSeleccionado ? (
            <div>
              {/* Header */}
              <div className="p-4 border-b-2" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
                <h4 className="text-lg font-bold mb-1" style={{ color: '#1F2937' }}>
                  {diaSeleccionado.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h4>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {diaSeleccionado.getFullYear()}
                </p>
              </div>

              {/* Contenido */}
              <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                {/* Festivo */}
                {festivoDelDia && (
                  <div className="mb-4 p-3 rounded-xl border-2" style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🎉</span>
                      <span className="font-bold text-sm" style={{ color: '#92400E' }}>Día Festivo</span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#78350F' }}>
                      {festivoDelDia.descripcion}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#92400E' }}>
                      {festivoDelDia.tipo === 'nacional' ? 'Nacional' :
                       festivoDelDia.tipo === 'regional' ? 'Regional' : 'Institucional'}
                    </p>
                  </div>
                )}

                {/* Términos */}
                {terminosDelDia.length > 0 ? (
                  <div>
                    <h5 className="text-sm font-bold mb-3" style={{ color: '#6B7280' }}>
                      TÉRMINOS QUE VENCEN ({terminosDelDia.length})
                    </h5>
                    <div className="space-y-3">
                      {terminosDelDia.map(termino => {
                        const getColor = () => {
                          if (termino.estado === 'vencido') return { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' };
                          if (termino.estado === 'proximo_vencer') return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
                          if (termino.estado === 'cumplido') return { bg: '#ECFDF5', border: '#10B981', text: '#065F46' };
                          return { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF' };
                        };
                        const colors = getColor();

                        return (
                          <div
                            key={termino.id}
                            className="p-3 rounded-xl border-2"
                            style={{ borderColor: colors.border, background: colors.bg }}
                          >
                            <p className="font-mono font-bold text-xs mb-1" style={{ color: colors.text }}>
                              {termino.numeroProceso}
                            </p>
                            <p className="font-semibold text-sm mb-2" style={{ color: '#1F2937' }}>
                              {termino.denunciado}
                            </p>
                            <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
                              {termino.actuacion}
                            </p>
                            <div className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
                              <User className="w-3 h-3" />
                              <span>{termino.responsable}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : !festivoDelDia && (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      Sin eventos este día
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <CalendarIcon className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
                <p className="font-semibold mb-2" style={{ color: '#6B7280' }}>
                  Selecciona un día
                </p>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Haz clic en cualquier día del calendario para ver los detalles
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
