/**
 * COMPONENTE: Selector de Territorial y Sede
 * Permite seleccionar una dirección territorial Y una sede específica
 */

import React, { useState, useEffect } from 'react';
import { Building2, MapPin, ChevronDown } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { ESTRUCTURA_ORGANIZACIONAL_ESAP } from '../../data/estructura-organizacional-completa';
import type { UnidadOrganizacional } from '../../types/estructura-organizacional.types';

interface SelectorTerritorialYSedeProps {
  territorialId?: string;
  sedeId?: string;
  onTerritorialChange: (territorialId: string | undefined, territorial: UnidadOrganizacional | undefined) => void;
  onSedeChange: (sedeId: string | undefined, sede: UnidadOrganizacional | undefined) => void;
  required?: boolean;
  error?: string;
}

export function SelectorTerritorialYSede({
  territorialId,
  sedeId,
  onTerritorialChange,
  onSedeChange,
  required = false,
  error
}: SelectorTerritorialYSedeProps) {
  // Obtener todas las territoriales
  const territoriales = ESTRUCTURA_ORGANIZACIONAL_ESAP.filter(
    u => u.nivel === 'territorial' && u.estado === 'activa'
  );

  // Obtener sedes según la territorial seleccionada
  const [sedesDisponibles, setSedesDisponibles] = useState<UnidadOrganizacional[]>([]);

  useEffect(() => {
    if (territorialId) {
      // Filtrar sedes que pertenezcan a esta territorial
      const sedes = ESTRUCTURA_ORGANIZACIONAL_ESAP.filter(
        u => u.nivel === 'sede' && 
             u.estado === 'activa' && 
             u.ruta.includes(territorialId)
      );
      setSedesDisponibles(sedes);
      
      // Si la sede actual no pertenece a la territorial, limpiarla
      if (sedeId && !sedes.find(s => s.id === sedeId)) {
        onSedeChange(undefined, undefined);
      }
    } else {
      setSedesDisponibles([]);
      onSedeChange(undefined, undefined);
    }
  }, [territorialId]);

  const handleTerritorialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      const territorial = territoriales.find(t => t.id === value);
      onTerritorialChange(value, territorial);
    } else {
      onTerritorialChange(undefined, undefined);
    }
  };

  const handleSedeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      const sede = sedesDisponibles.find(s => s.id === value);
      onSedeChange(value, sede);
    } else {
      onSedeChange(undefined, undefined);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selector de Territorial */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Building2 className="w-4 h-4 inline mr-2 text-green-600" />
          Dirección Territorial
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          <select
            value={territorialId || ''}
            onChange={handleTerritorialChange}
            required={required}
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#003DA5] focus:outline-none transition-colors appearance-none pr-10"
            style={{
              fontSize: '14px',
              lineHeight: '20px',
            }}
          >
            <option value="">Seleccionar territorial...</option>
            {territoriales.map((territorial) => (
              <option key={territorial.id} value={territorial.id}>
                {territorial.nombre} - {territorial.departamento}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        
        {territorialId && (
          <div className="mt-2">
            <Badge 
              className="text-xs"
              style={{ backgroundColor: '#10b981', color: 'white' }}
            >
              {territoriales.find(t => t.id === territorialId)?.codigo}
            </Badge>
          </div>
        )}
      </div>

      {/* Selector de Sede */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <MapPin className="w-4 h-4 inline mr-2 text-orange-600" />
          Sede Específica
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {!territorialId ? (
          <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">
              Primero seleccione una dirección territorial
            </p>
          </div>
        ) : sedesDisponibles.length === 0 ? (
          <div className="px-4 py-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              No hay sedes disponibles para esta territorial
            </p>
          </div>
        ) : (
          <>
            <div className="relative">
              <select
                value={sedeId || ''}
                onChange={handleSedeChange}
                required={required}
                disabled={!territorialId}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#003DA5] focus:outline-none transition-colors appearance-none pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                style={{
                  fontSize: '14px',
                  lineHeight: '20px',
                }}
              >
                <option value="">Seleccionar sede...</option>
                {sedesDisponibles.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre} {sede.ciudad && `- ${sede.ciudad}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            
            {sedeId && (
              <div className="mt-2">
                <Badge 
                  className="text-xs"
                  style={{ backgroundColor: '#f59e0b', color: 'white' }}
                >
                  {sedesDisponibles.find(s => s.id === sedeId)?.codigo}
                </Badge>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mensaje de ayuda */}
      <Card className="p-3 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-2">
          <Building2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">¿Cuál es la diferencia?</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Territorial:</strong> Dirección administrativa de una región (17 en Colombia)</li>
              <li>• <strong>Sede:</strong> Punto físico específico donde se imparten clases (71+ en Colombia)</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Mostrar error si existe */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-2 border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Vista previa de selección */}
      {territorialId && sedeId && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-orange-50 border-2 border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">Selección actual:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">
                {territoriales.find(t => t.id === territorialId)?.nombre}
              </span>
            </div>
            <div className="w-8 h-px bg-gray-300 ml-2"></div>
            <div className="flex items-center gap-2 ml-4">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-900">
                {sedesDisponibles.find(s => s.id === sedeId)?.nombre}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
