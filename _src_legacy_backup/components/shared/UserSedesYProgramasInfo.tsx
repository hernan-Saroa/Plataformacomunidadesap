/**
 * Componente compartido para mostrar información de Sedes y Programas Académicos
 * de un usuario en el modelo Usuario Persona de ESAP
 */

import { Building2, BookOpen, MapPin, GraduationCap, Calendar } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { User, AsignacionSede, AsignacionPrograma } from '../../types';

interface UserSedesYProgramasInfoProps {
  user: Partial<User>;
  variant?: 'compact' | 'detailed' | 'full';
  showSedes?: boolean;
  showProgramas?: boolean;
}

export function UserSedesYProgramasInfo({
  user,
  variant = 'compact',
  showSedes = true,
  showProgramas = true,
}: UserSedesYProgramasInfoProps) {
  
  // Si no hay asignaciones, no mostrar nada
  if (!user.asignacionesSedes?.length && !user.asignacionesProgramas?.length) {
    return null;
  }

  // VARIANT: COMPACT - Solo badges principales
  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {showSedes && user.sedePrincipal && (
          <Badge variant="outline" className="text-xs gap-1.5">
            <MapPin className="w-3 h-3" />
            {user.sedePrincipal.nombre}
          </Badge>
        )}
        {showProgramas && user.programaPrincipal && (
          <Badge variant="outline" className="text-xs gap-1.5">
            <BookOpen className="w-3 h-3" />
            {user.programaPrincipal.nombre}
          </Badge>
        )}
      </div>
    );
  }

  // VARIANT: DETAILED - Información detallada
  if (variant === 'detailed') {
    return (
      <div className="space-y-3">
        {/* Sedes */}
        {showSedes && user.asignacionesSedes && user.asignacionesSedes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">Sedes Asignadas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.asignacionesSedes.map((asignacion) => (
                <Badge
                  key={asignacion.id}
                  variant={asignacion.esPrincipal ? 'default' : 'outline'}
                  className="text-xs gap-1.5"
                  style={
                    asignacion.esPrincipal
                      ? { backgroundColor: '#003DA5', color: 'white' }
                      : undefined
                  }
                >
                  <MapPin className="w-3 h-3" />
                  {asignacion.unidad?.nombre || asignacion.unidadId}
                  {asignacion.esPrincipal && ' (Principal)'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Programas Académicos */}
        {showProgramas && user.asignacionesProgramas && user.asignacionesProgramas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-gray-700">Programas Académicos</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.asignacionesProgramas.map((asignacion) => (
                <Badge
                  key={asignacion.id}
                  variant={asignacion.esPrincipal ? 'default' : 'outline'}
                  className="text-xs gap-1.5"
                  style={
                    asignacion.esPrincipal
                      ? { backgroundColor: '#8b5cf6', color: 'white' }
                      : undefined
                  }
                >
                  <BookOpen className="w-3 h-3" />
                  {asignacion.programa?.nombre || asignacion.programaId}
                  {asignacion.esPrincipal && ' (Principal)'}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // VARIANT: FULL - Información completa con detalles
  return (
    <div className="space-y-4 bg-gray-50 rounded-lg p-4">
      {/* Sedes */}
      {showSedes && user.asignacionesSedes && user.asignacionesSedes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-900">Sedes Asignadas</span>
          </div>
          <div className="space-y-2">
            {user.asignacionesSedes.map((asignacion) => (
              <div
                key={asignacion.id}
                className="bg-white rounded-lg p-3 border border-gray-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        {asignacion.unidad?.nombre || asignacion.unidadId}
                      </span>
                      {asignacion.esPrincipal && (
                        <Badge className="text-xs" style={{ backgroundColor: '#003DA5' }}>
                          Principal
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={
                          asignacion.estado === 'activa'
                            ? { borderColor: '#10b981', color: '#10b981' }
                            : { borderColor: '#ef4444', color: '#ef4444' }
                        }
                      >
                        {asignacion.estado === 'activa' ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {asignacion.unidad?.ciudad && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {asignacion.unidad.ciudad}
                            {asignacion.unidad.departamento &&
                              `, ${asignacion.unidad.departamento}`}
                          </span>
                        </div>
                      )}
                      {asignacion.rolNombre && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">Rol:</span>
                          <span>{asignacion.rolNombre}</span>
                        </div>
                      )}
                      {asignacion.fechaInicio && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Desde {new Date(asignacion.fechaInicio).toLocaleDateString('es-CO')}
                            {asignacion.fechaFin &&
                              ` hasta ${new Date(asignacion.fechaFin).toLocaleDateString('es-CO')}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Programas Académicos */}
      {showProgramas && user.asignacionesProgramas && user.asignacionesProgramas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-5 h-5 text-purple-600" />
            <span className="font-bold text-gray-900">Programas Académicos</span>
          </div>
          <div className="space-y-2">
            {user.asignacionesProgramas.map((asignacion) => (
              <div
                key={asignacion.id}
                className="bg-white rounded-lg p-3 border border-gray-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        {asignacion.programa?.nombre || asignacion.programaId}
                      </span>
                      {asignacion.esPrincipal && (
                        <Badge className="text-xs" style={{ backgroundColor: '#8b5cf6' }}>
                          Principal
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={
                          asignacion.estado === 'activa'
                            ? { borderColor: '#10b981', color: '#10b981' }
                            : { borderColor: '#ef4444', color: '#ef4444' }
                        }
                      >
                        {asignacion.estado === 'activa' ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {asignacion.programa?.nivel && (
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3" />
                          <span>
                            {asignacion.programa.nivel} - {asignacion.programa.modalidad}
                          </span>
                        </div>
                      )}
                      {asignacion.rolNombre && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">Rol:</span>
                          <span>{asignacion.rolNombre}</span>
                        </div>
                      )}
                      {asignacion.fechaInicio && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Desde {new Date(asignacion.fechaInicio).toLocaleDateString('es-CO')}
                            {asignacion.fechaFin &&
                              ` hasta ${new Date(asignacion.fechaFin).toLocaleDateString('es-CO')}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Componente simplificado para mostrar solo la sede principal
 */
export function UserSedePrincipal({ user }: { user: Partial<User> }) {
  if (!user.sedePrincipal) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <MapPin className="w-4 h-4 text-blue-600" />
      <span>{user.sedePrincipal.nombre}</span>
      {user.sedePrincipal.nivel && (
        <Badge variant="outline" className="text-xs">
          {user.sedePrincipal.nivel}
        </Badge>
      )}
    </div>
  );
}

/**
 * Componente simplificado para mostrar solo el programa principal
 */
export function UserProgramaPrincipal({ user }: { user: Partial<User> }) {
  if (!user.programaPrincipal) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <GraduationCap className="w-4 h-4 text-purple-600" />
      <span>{user.programaPrincipal.nombre}</span>
      {user.programaPrincipal.nivel && (
        <Badge variant="outline" className="text-xs">
          {user.programaPrincipal.nivel}
        </Badge>
      )}
    </div>
  );
}
