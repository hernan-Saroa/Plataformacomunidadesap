/**
 * COMPONENTE REUTILIZABLE: Select de Filtro por Sede
 * 
 * Uso:
 * import { SedeFilterSelect } from '../shared/SedeFilterSelect';
 * 
 * <SedeFilterSelect
 *   value={sedeFilter}
 *   onChange={setSedeFilter}
 *   variant="primary" // o "secondary"
 * />
 */

import React from 'react';
import { Building2 } from 'lucide-react';

interface SedeFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  variant?: 'primary' | 'secondary';
  showIcon?: boolean;
  className?: string;
}

// Lista de sedes ESAP (puede venir de una API en el futuro)
export const SEDES_ESAP = [
  { id: 'bogota', nombre: 'Bogotá', codigo: 'DIR-BOG', departamento: 'Cundinamarca' },
  { id: 'medellin', nombre: 'Medellín', codigo: 'DIR-ANT', departamento: 'Antioquia' },
  { id: 'cali', nombre: 'Cali', codigo: 'DIR-VAL', departamento: 'Valle del Cauca' },
  { id: 'barranquilla', nombre: 'Barranquilla', codigo: 'DIR-ATL', departamento: 'Atlántico' },
  { id: 'bucaramanga', nombre: 'Bucaramanga', codigo: 'DIR-SAN', departamento: 'Santander' },
  { id: 'cartagena', nombre: 'Cartagena', codigo: 'CRE-CAR', departamento: 'Bolívar' },
  { id: 'pasto', nombre: 'Pasto', codigo: 'DIR-NAR', departamento: 'Nariño' },
  { id: 'manizales', nombre: 'Manizales', codigo: 'DIR-CAL', departamento: 'Caldas' },
  { id: 'ibague', nombre: 'Ibagué', codigo: 'DIR-TOL', departamento: 'Tolima' },
  { id: 'neiva', nombre: 'Neiva', codigo: 'DIR-HUI', departamento: 'Huila' },
];

export function SedeFilterSelect({
  value,
  onChange,
  variant = 'primary',
  showIcon = false,
  className = ''
}: SedeFilterSelectProps) {
  const baseClasses = 'px-4 py-3 border-2 rounded-lg bg-white cursor-pointer font-medium text-sm transition-all';
  
  const variantClasses = {
    primary: 'border-[#D1D5DB] hover:border-[#003DA5] focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20',
    secondary: 'border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]'
  };

  return (
    <div className="relative inline-block">
      {showIcon && (
        <Building2 
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" 
        />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseClasses} ${variantClasses[variant]} ${showIcon ? 'pl-11' : ''} ${className}`}
        style={{ height: '44px' }}
      >
        <option value="all">Todas las sedes</option>
        {SEDES_ESAP.map(sede => (
          <option key={sede.id} value={sede.nombre}>
            {sede.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Hook personalizado para gestionar filtro de sede
 * 
 * Uso:
 * const { sedeFilter, setSedeFilter, filterBySede } = useSedeFilter();
 * 
 * const filteredData = data.filter(item => filterBySede(item));
 */
export function useSedeFilter() {
  const [sedeFilter, setSedeFilter] = React.useState<string>('all');

  const filterBySede = (item: any, sedeField: string = 'sede') => {
    if (sedeFilter === 'all') return true;
    
    // Si el item tiene asignacionesSedes (Usuario-Persona)
    if (item.asignacionesSedes && Array.isArray(item.asignacionesSedes)) {
      return item.asignacionesSedes.some((asig: any) => asig.nombreSede === sedeFilter);
    }
    
    // Si el item tiene un campo directo de sede
    return item[sedeField] === sedeFilter;
  };

  const resetFilter = () => setSedeFilter('all');

  return {
    sedeFilter,
    setSedeFilter,
    filterBySede,
    resetFilter,
    isFiltering: sedeFilter !== 'all'
  };
}
