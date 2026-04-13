/**
 * Componente de filtros avanzados por Sede y Programa Académico
 * Para uso en todos los módulos del sistema
 */

import React, { useState } from 'react';
import { Building2, GraduationCap, X, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/badge';
import { SEDES_ESAP, PROGRAMAS_ESAP } from '../../data/oferta-academica-esap';

export interface FiltrosSedePrograma {
  sedes: string[];
  programas: string[];
  niveles: string[];
  modalidades: string[];
  nivelesOrganizacionales: string[];
}

interface FiltrosSedeProgramaProps {
  filtros: FiltrosSedePrograma;
  onChange: (filtros: FiltrosSedePrograma) => void;
  showSedes?: boolean;
  showProgramas?: boolean;
  showNiveles?: boolean;
  showModalidades?: boolean;
  showNivelesOrg?: boolean;
}

export function FiltrosSedePrograma({
  filtros,
  onChange,
  showSedes = true,
  showProgramas = true,
  showNiveles = true,
  showModalidades = true,
  showNivelesOrg = true,
}: FiltrosSedeProgramaProps) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const handleToggleSede = (codigoSede: string) => {
    const nuevasSedes = filtros.sedes.includes(codigoSede)
      ? filtros.sedes.filter((s) => s !== codigoSede)
      : [...filtros.sedes, codigoSede];
    onChange({ ...filtros, sedes: nuevasSedes });
  };

  const handleTogglePrograma = (codigoPrograma: string) => {
    const nuevosProgramas = filtros.programas.includes(codigoPrograma)
      ? filtros.programas.filter((p) => p !== codigoPrograma)
      : [...filtros.programas, codigoPrograma];
    onChange({ ...filtros, programas: nuevosProgramas });
  };

  const handleToggleNivel = (nivel: string) => {
    const nuevosNiveles = filtros.niveles.includes(nivel)
      ? filtros.niveles.filter((n) => n !== nivel)
      : [...filtros.niveles, nivel];
    onChange({ ...filtros, niveles: nuevosNiveles });
  };

  const handleToggleModalidad = (modalidad: string) => {
    const nuevasModalidades = filtros.modalidades.includes(modalidad)
      ? filtros.modalidades.filter((m) => m !== modalidad)
      : [...filtros.modalidades, modalidad];
    onChange({ ...filtros, modalidades: nuevasModalidades });
  };

  const handleToggleNivelOrg = (nivel: string) => {
    const nuevosNiveles = filtros.nivelesOrganizacionales.includes(nivel)
      ? filtros.nivelesOrganizacionales.filter((n) => n !== nivel)
      : [...filtros.nivelesOrganizacionales, nivel];
    onChange({ ...filtros, nivelesOrganizacionales: nuevosNiveles });
  };

  const handleLimpiarFiltros = () => {
    onChange({
      sedes: [],
      programas: [],
      niveles: [],
      modalidades: [],
      nivelesOrganizacionales: [],
    });
  };

  const cantidadFiltrosActivos =
    filtros.sedes.length +
    filtros.programas.length +
    filtros.niveles.length +
    filtros.modalidades.length +
    filtros.nivelesOrganizacionales.length;

  const nivelesAcademicos = ['Pregrado', 'Especialización', 'Maestría'];
  const modalidadesAcademicas = ['Presencial', 'Virtual', 'Distancia'];
  const nivelesOrganizacionales = ['Nacional', 'Territorial', 'Regional', 'Sede'];

  return (
    <div className="space-y-3">
      {/* Botón Toggle Filtros */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-blue-500 hover:text-blue-600 transition-all"
        >
          <Filter className="w-4 h-4" />
          <span>Filtros Avanzados</span>
          {cantidadFiltrosActivos > 0 && (
            <Badge className="text-xs" style={{ backgroundColor: '#3B82F6' }}>
              {cantidadFiltrosActivos}
            </Badge>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${mostrarFiltros ? 'rotate-180' : ''}`}
          />
        </button>

        {cantidadFiltrosActivos > 0 && (
          <button
            onClick={handleLimpiarFiltros}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* Panel de Filtros */}
      <AnimatePresence>
        {mostrarFiltros && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border-2 border-gray-200 p-6 space-y-6"
          >
            {/* Filtro de Sedes */}
            {showSedes && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-gray-900">Sedes</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {SEDES_ESAP.slice(0, 12).map((sede) => (
                    <button
                      key={sede.codigo}
                      onClick={() => handleToggleSede(sede.codigo)}
                      className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                        filtros.sedes.includes(sede.codigo)
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {sede.ciudad || sede.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro de Niveles Organizacionales */}
            {showNivelesOrg && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-gray-900">Nivel Organizacional</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {nivelesOrganizacionales.map((nivel) => (
                    <button
                      key={nivel}
                      onClick={() => handleToggleNivelOrg(nivel)}
                      className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                        filtros.nivelesOrganizacionales.includes(nivel)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      {nivel}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro de Programas */}
            {showProgramas && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  <h4 className="font-bold text-gray-900">Programas Académicos</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {PROGRAMAS_ESAP.map((programa) => (
                    <button
                      key={programa.codigo}
                      onClick={() => handleTogglePrograma(programa.codigo)}
                      className={`px-3 py-2 text-sm text-left rounded-lg border-2 transition-all ${
                        filtros.programas.includes(programa.codigo)
                          ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-semibold">{programa.nombre}</div>
                      <div className="text-xs opacity-75">
                        {programa.nivel} - {programa.modalidad}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro de Niveles Académicos */}
            {showNiveles && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="w-5 h-5 text-orange-600" />
                  <h4 className="font-bold text-gray-900">Nivel Académico</h4>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {nivelesAcademicos.map((nivel) => (
                    <button
                      key={nivel}
                      onClick={() => handleToggleNivel(nivel)}
                      className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                        filtros.niveles.includes(nivel)
                          ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                      }`}
                    >
                      {nivel}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro de Modalidades */}
            {showModalidades && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                  <h4 className="font-bold text-gray-900">Modalidad</h4>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {modalidadesAcademicas.map((modalidad) => (
                    <button
                      key={modalidad}
                      onClick={() => handleToggleModalidad(modalidad)}
                      className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                        filtros.modalidades.includes(modalidad)
                          ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                      }`}
                    >
                      {modalidad}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badges de Filtros Activos */}
      {cantidadFiltrosActivos > 0 && (
        <div className="flex flex-wrap gap-2">
          {filtros.sedes.map((codigoSede) => {
            const sede = SEDES_ESAP.find((s) => s.codigo === codigoSede);
            return (
              <Badge
                key={codigoSede}
                variant="outline"
                className="text-xs gap-1.5 cursor-pointer hover:bg-blue-50"
                onClick={() => handleToggleSede(codigoSede)}
              >
                <Building2 className="w-3 h-3" />
                {sede?.ciudad || sede?.nombre}
                <X className="w-3 h-3" />
              </Badge>
            );
          })}
          {filtros.programas.map((codigoPrograma) => {
            const programa = PROGRAMAS_ESAP.find((p) => p.codigo === codigoPrograma);
            return (
              <Badge
                key={codigoPrograma}
                variant="outline"
                className="text-xs gap-1.5 cursor-pointer hover:bg-purple-50"
                onClick={() => handleTogglePrograma(codigoPrograma)}
              >
                <GraduationCap className="w-3 h-3" />
                {programa?.nombre}
                <X className="w-3 h-3" />
              </Badge>
            );
          })}
          {filtros.niveles.map((nivel) => (
            <Badge
              key={nivel}
              variant="outline"
              className="text-xs gap-1.5 cursor-pointer hover:bg-orange-50"
              onClick={() => handleToggleNivel(nivel)}
            >
              {nivel}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          {filtros.modalidades.map((modalidad) => (
            <Badge
              key={modalidad}
              variant="outline"
              className="text-xs gap-1.5 cursor-pointer hover:bg-green-50"
              onClick={() => handleToggleModalidad(modalidad)}
            >
              {modalidad}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          {filtros.nivelesOrganizacionales.map((nivel) => (
            <Badge
              key={nivel}
              variant="outline"
              className="text-xs gap-1.5 cursor-pointer hover:bg-indigo-50"
              onClick={() => handleToggleNivelOrg(nivel)}
            >
              {nivel}
              <X className="w-3 h-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}