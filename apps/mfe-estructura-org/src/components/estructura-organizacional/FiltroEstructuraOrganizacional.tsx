/**
 * FILTRO DE ESTRUCTURA ORGANIZACIONAL
 * Componente reutilizable para filtrar por Sede Central, Territoriales o CETAP
 * Usado en módulos de Usuarios, Roles, Reportes, etc.
 */

import { useState } from 'react';
import { Building2, ChevronDown, MapPin, X } from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { TERRITORIALES_ESAP } from '../../data/territoriales-cetap-completo';

interface FiltroEstructuraProps {
  value?: string;
  onChange: (unidadId?: string) => void;
  placeholder?: string;
  className?: string;
  showClearButton?: boolean;
}

export function FiltroEstructuraOrganizacional({
  value,
  onChange,
  placeholder = 'Todas las unidades',
  className = '',
  showClearButton = true
}: FiltroEstructuraProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Construir opciones: Sede Central + Territoriales + CETAP
  const opciones = [
    {
      id: 'sede-central',
      nombre: 'Sede Central',
      codigo: 'ESAP-CENTRAL',
      nivel: 'sede-central' as const,
      ubicacion: 'Bogotá D.C.'
    },
    ...TERRITORIALES_ESAP.map(ter => ({
      id: ter.id,
      nombre: ter.nombre,
      codigo: ter.codigo,
      nivel: 'territorial' as const,
      ubicacion: `${ter.ciudadPrincipal}, ${ter.departamentos[0]}`
    })),
    ...TERRITORIALES_ESAP.flatMap(ter =>
      ter.cetap.map(cetap => ({
        id: cetap.id,
        nombre: cetap.nombre,
        codigo: cetap.codigo,
        nivel: 'cetap' as const,
        ubicacion: `${cetap.ciudad}, ${cetap.departamento}`,
        territorialPadre: ter.nombre
      }))
    )
  ];

  // Filtrar opciones por búsqueda
  const opcionesFiltradas = opciones.filter(op =>
    searchTerm === '' ||
    op.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.ubicacion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Encontrar la opción seleccionada
  const seleccionada = opciones.find(op => op.id === value);

  const nivelColors = {
    'sede-central': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'territorial': { bg: 'bg-green-100', text: 'text-green-700' },
    'cetap': { bg: 'bg-orange-100', text: 'text-orange-700' }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#003DA5] hover:border-[#003DA5] transition-colors flex items-center justify-between bg-white"
        style={{ height: '44px' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {seleccionada ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Badge className={`${nivelColors[seleccionada.nivel].bg} ${nivelColors[seleccionada.nivel].text} border-0 text-xs flex-shrink-0`}>
                {seleccionada.nivel === 'sede-central' ? 'Sede Central' : seleccionada.nivel}
              </Badge>
              <span className="text-gray-900 truncate">{seleccionada.nombre}</span>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {showClearButton && value && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Limpiar filtro"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic afuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menú desplegable */}
          <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
            {/* Búsqueda */}
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Buscar unidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Lista de opciones */}
            <div className="overflow-y-auto max-h-80">
              {opcionesFiltradas.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No se encontraron unidades
                </div>
              ) : (
                opcionesFiltradas.map((opcion) => (
                  <button
                    key={opcion.id}
                    onClick={() => {
                      onChange(opcion.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      value === opcion.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge className={`${nivelColors[opcion.nivel].bg} ${nivelColors[opcion.nivel].text} border-0 text-xs flex-shrink-0`}>
                        {opcion.nivel === 'sede-central' ? 'Sede Central' : opcion.nivel}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{opcion.nombre}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">({opcion.codigo})</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{opcion.ubicacion}</span>
                        </div>
                        {'territorialPadre' in opcion && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Depende de: {opcion.territorialPadre}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer con stats */}
            <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span>Total: {opcionesFiltradas.length} unidades</span>
                <span className="text-gray-500">
                  1 Sede Central • 17 Territoriales • 307 CETAP
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * VARIANTE COMPACTA - Solo badge selector
 */
interface FiltroEstructuraCompactoProps {
  value?: string;
  onChange: (unidadId?: string) => void;
}

export function FiltroEstructuraCompacto({ value, onChange }: FiltroEstructuraCompactoProps) {
  return (
    <FiltroEstructuraOrganizacional
      value={value}
      onChange={onChange}
      placeholder="Filtrar por unidad"
      className="w-64"
      showClearButton={true}
    />
  );
}
