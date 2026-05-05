/**
 * COMPONENTE - SELECTOR DE ESTRUCTURA ORGANIZACIONAL
 * Selector reutilizable para filtrar por sede/unidad en todos los módulos
 */

import { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check, MapPin, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { UnidadOrganizacional, NivelEstructura } from '../../types/estructura-organizacional.types';

interface SelectorEstructuraProps {
  value?: string;                              // ID de la unidad seleccionada
  onChange: (unidadId: string | undefined) => void;
  placeholder?: string;
  incluirTodas?: boolean;                      // Permitir opción "Todas las sedes"
  nivelesPermitidos?: NivelEstructura[];       // Filtrar por niveles específicos
  multiselect?: boolean;                       // Permitir selección múltiple
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function SelectorEstructura({
  value,
  onChange,
  placeholder = 'Seleccionar sede...',
  incluirTodas = true,
  nivelesPermitidos,
  multiselect = false,
  className = '',
  size = 'md',
  disabled = false,
}: SelectorEstructuraProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Mock data - en producción vendría de API
  const unidades: UnidadOrganizacional[] = [
    {
      id: '1',
      codigo: 'SEDE-NAL',
      nombre: 'Sede Nacional',
      nombreCorto: 'Nacional',
      nivel: 'nacional',
      padreId: null,
      ruta: ['1'],
      rutaNombres: ['Sede Nacional'],
      departamento: 'Cundinamarca',
      ciudad: 'Bogotá D.C.',
      estado: 'activa',
      permiteInscripciones: true,
      permiteMatriculas: true,
      visiblePortal: true,
      createdAt: '2020-01-15T08:00:00Z',
      updatedAt: '2024-11-30T10:30:00Z',
      createdBy: 'admin',
    },
    {
      id: '2',
      codigo: 'DIR-BOG',
      nombre: 'Dirección Territorial Bogotá',
      nombreCorto: 'Bogotá',
      nivel: 'territorial',
      padreId: '1',
      ruta: ['1', '2'],
      rutaNombres: ['Sede Nacional', 'Dirección Territorial Bogotá'],
      departamento: 'Cundinamarca',
      ciudad: 'Bogotá D.C.',
      estado: 'activa',
      permiteInscripciones: true,
      permiteMatriculas: true,
      visiblePortal: true,
      createdAt: '2020-01-15T08:00:00Z',
      updatedAt: '2024-11-30T10:30:00Z',
      createdBy: 'admin',
    },
    {
      id: '3',
      codigo: 'DIR-ANT',
      nombre: 'Dirección Territorial Antioquia',
      nombreCorto: 'Antioquia',
      nivel: 'territorial',
      padreId: '1',
      ruta: ['1', '3'],
      rutaNombres: ['Sede Nacional', 'Dirección Territorial Antioquia'],
      departamento: 'Antioquia',
      ciudad: 'Medellín',
      estado: 'activa',
      permiteInscripciones: true,
      permiteMatriculas: true,
      visiblePortal: true,
      createdAt: '2020-01-15T08:00:00Z',
      updatedAt: '2024-11-30T10:30:00Z',
      createdBy: 'admin',
    },
    {
      id: '4',
      codigo: 'CRE-MED',
      nombre: 'Centro Regional Medellín',
      nombreCorto: 'Medellín',
      nivel: 'regional',
      padreId: '3',
      ruta: ['1', '3', '4'],
      rutaNombres: ['Sede Nacional', 'Dirección Territorial Antioquia', 'Centro Regional Medellín'],
      departamento: 'Antioquia',
      ciudad: 'Medellín',
      estado: 'activa',
      permiteInscripciones: true,
      permiteMatriculas: true,
      visiblePortal: true,
      createdAt: '2020-03-01T08:00:00Z',
      updatedAt: '2024-11-30T10:30:00Z',
      createdBy: 'admin',
    },
    {
      id: '5',
      codigo: 'DIR-VAL',
      nombre: 'Dirección Territorial Valle del Cauca',
      nombreCorto: 'Valle',
      nivel: 'territorial',
      padreId: '1',
      ruta: ['1', '5'],
      rutaNombres: ['Sede Nacional', 'Dirección Territorial Valle del Cauca'],
      departamento: 'Valle del Cauca',
      ciudad: 'Cali',
      estado: 'activa',
      permiteInscripciones: true,
      permiteMatriculas: true,
      visiblePortal: true,
      createdAt: '2020-01-15T08:00:00Z',
      updatedAt: '2024-11-30T10:30:00Z',
      createdBy: 'admin',
    },
  ];

  // Filtrar unidades
  const unidadesFiltradas = unidades.filter(unidad => {
    // Filtrar por niveles permitidos
    if (nivelesPermitidos && !nivelesPermitidos.includes(unidad.nivel)) {
      return false;
    }

    // Filtrar por búsqueda
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      return (
        unidad.nombre.toLowerCase().includes(termino) ||
        unidad.codigo.toLowerCase().includes(termino) ||
        unidad.ciudad?.toLowerCase().includes(termino) ||
        unidad.departamento?.toLowerCase().includes(termino)
      );
    }

    return true;
  });

  // Obtener unidad seleccionada
  const unidadSeleccionada = value ? unidades.find(u => u.id === value) : undefined;

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // Estilos por tamaño
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  const nivelColors = {
    nacional: 'text-blue-600',
    territorial: 'text-green-600',
    regional: 'text-purple-600',
    sede: 'text-orange-600',
  };

  const handleSelect = (unidadId: string | undefined) => {
    onChange(unidadId);
    setIsOpen(false);
    setBusqueda('');
  };

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Botón principal */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-3 
          border border-gray-300 rounded-lg bg-white
          hover:border-[#003DA5] focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5]
          transition-all
          ${sizeClasses[size]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Building2 className={`flex-shrink-0 ${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-gray-400`} />
          
          {unidadSeleccionada ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-gray-900 truncate">
                {unidadSeleccionada.nombreCorto || unidadSeleccionada.nombre}
              </span>
              <span className={`text-xs ${nivelColors[unidadSeleccionada.nivel]}`}>
                ({unidadSeleccionada.codigo})
              </span>
            </div>
          ) : (
            <span className="text-gray-500 truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown 
          className={`flex-shrink-0 w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col"
            >
              {/* Búsqueda */}
              <div className="p-3 border-b border-gray-200">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar sede..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                  autoFocus
                />
              </div>

              {/* Lista de opciones */}
              <div className="overflow-y-auto">
                {/* Opción "Todas" */}
                {incluirTodas && (
                  <button
                    onClick={() => handleSelect(undefined)}
                    className={`
                      w-full px-4 py-2.5 flex items-center justify-between gap-3 
                      hover:bg-gray-50 transition-colors text-left
                      ${!value ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">Todas las sedes</div>
                        <div className="text-xs text-gray-500">Sin filtro de estructura</div>
                      </div>
                    </div>
                    {!value && <Check className="w-4 h-4 text-[#003DA5]" />}
                  </button>
                )}

                {incluirTodas && unidadesFiltradas.length > 0 && (
                  <div className="h-px bg-gray-200" />
                )}

                {/* Lista de unidades */}
                {unidadesFiltradas.map((unidad) => (
                  <button
                    key={unidad.id}
                    onClick={() => handleSelect(unidad.id)}
                    className={`
                      w-full px-4 py-2.5 flex items-center justify-between gap-3 
                      hover:bg-gray-50 transition-colors text-left
                      ${value === unidad.id ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Building2 className={`w-4 h-4 flex-shrink-0 ${nivelColors[unidad.nivel]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">
                          {unidad.nombre}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="font-mono">{unidad.codigo}</span>
                          <span>•</span>
                          <MapPin className="w-3 h-3" />
                          <span>{unidad.ciudad}</span>
                        </div>
                      </div>
                    </div>
                    {value === unidad.id && (
                      <Check className="w-4 h-4 text-[#003DA5] flex-shrink-0" />
                    )}
                  </button>
                ))}

                {/* Sin resultados */}
                {unidadesFiltradas.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">No se encontraron sedes</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * VARIANTE COMPACTA - Para usar en headers y toolbars
 */
interface SelectorEstructuraCompactoProps {
  value?: string;
  onChange: (unidadId: string | undefined) => void;
  className?: string;
}

export function SelectorEstructuraCompacto({
  value,
  onChange,
  className = '',
}: SelectorEstructuraCompactoProps) {
  return (
    <SelectorEstructura
      value={value}
      onChange={onChange}
      placeholder="Filtrar por sede"
      incluirTodas={true}
      size="sm"
      className={className}
    />
  );
}

/**
 * VARIANTE PARA FORMULARIOS - Con label y validación
 */
interface SelectorEstructuraFormProps {
  value?: string;
  onChange: (unidadId: string | undefined) => void;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  nivelesPermitidos?: NivelEstructura[];
  className?: string;
}

export function SelectorEstructuraForm({
  value,
  onChange,
  label = 'Sede',
  required = false,
  error,
  helperText,
  nivelesPermitidos,
  className = '',
}: SelectorEstructuraFormProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <SelectorEstructura
        value={value}
        onChange={onChange}
        placeholder="Seleccionar sede..."
        incluirTodas={false}
        nivelesPermitidos={nivelesPermitidos}
        size="md"
      />

      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}