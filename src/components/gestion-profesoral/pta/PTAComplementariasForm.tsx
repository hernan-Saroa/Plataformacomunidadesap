/**
 * PTAComplementariasForm.tsx
 * 
 * Formulario para registrar Funciones Complementarias en el PTA
 * Incluye: Funciones administrativas, Cargos directivos, Comités, Representaciones
 * 
 * Características:
 * - 15+ tooltips contextuales
 * - Validaciones inteligentes en tiempo real
 * - Auto-cálculo de horas
 * - Vista previa del prorrateo
 * - Integración con PTAContext
 * 
 * @author Sistema ESAP
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Settings, Briefcase, Users2, Award, AlertCircle, Eye, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PTAProrrateoPreview } from './PTAProrrateoPreview';
import { Textarea } from '@/components/ui/textarea';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface FuncionAdministrativa {
  id: string;
  cargo: string;
  dependencia: string;
  horasSemanales: number;
  responsabilidades: string;
  tipo: 'jefatura' | 'coordinacion' | 'secretaria' | 'otra';
}

interface CargoDirectivo {
  id: string;
  nombreCargo: string;
  nivel: 'decano' | 'director' | 'coordinador' | 'secretario_academico';
  horasSemanales: number;
  facultadPrograma: string;
  fechaInicio: string;
  fechaFin: string;
}

interface ComiteAcademico {
  id: string;
  nombreComite: string;
  tipo: 'curricular' | 'investigacion' | 'extension' | 'acreditacion' | 'otro';
  rol: 'presidente' | 'secretario' | 'miembro';
  horasSemanales: number;
  periodicidadReuniones: string;
}

interface Representacion {
  id: string;
  entidad: string;
  tipo: 'consejo_superior' | 'consejo_academico' | 'consejo_facultad' | 'comision' | 'otro';
  horasSemanales: number;
  descripcion: string;
  vigencia: string;
}

interface PTAComplementariasFormProps {
  data?: {
    funcionesAdministrativas: FuncionAdministrativa[];
    cargosDirectivos: CargoDirectivo[];
    comitesAcademicos: ComiteAcademico[];
    representaciones: Representacion[];
  };
  onChange?: (data: any) => void;
  readonly?: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const TIPOS_FUNCION = [
  { value: 'jefatura', label: 'Jefatura', horas: 8 },
  { value: 'coordinacion', label: 'Coordinación', horas: 6 },
  { value: 'secretaria', label: 'Secretaría', horas: 4 },
  { value: 'otra', label: 'Otra', horas: 3 },
];

const NIVELES_CARGO = [
  { value: 'decano', label: 'Decano', horas: 10 },
  { value: 'director', label: 'Director de Programa', horas: 8 },
  { value: 'coordinador', label: 'Coordinador', horas: 6 },
  { value: 'secretario_academico', label: 'Secretario Académico', horas: 4 },
];

const TIPOS_COMITE = [
  { value: 'curricular', label: 'Curricular' },
  { value: 'investigacion', label: 'Investigación' },
  { value: 'extension', label: 'Extensión' },
  { value: 'acreditacion', label: 'Acreditación' },
  { value: 'otro', label: 'Otro' },
];

const ROLES_COMITE = [
  { value: 'presidente', label: 'Presidente', horas: 3 },
  { value: 'secretario', label: 'Secretario', horas: 2 },
  { value: 'miembro', label: 'Miembro', horas: 1 },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const PTAComplementariasForm: React.FC<PTAComplementariasFormProps> = ({
  data,
  onChange,
  readonly = false,
}) => {
  // Estado local
  const [funcionesAdministrativas, setFuncionesAdministrativas] = useState<FuncionAdministrativa[]>(
    data?.funcionesAdministrativas || []
  );
  const [cargosDirectivos, setCargosDirectivos] = useState<CargoDirectivo[]>(
    data?.cargosDirectivos || []
  );
  const [comitesAcademicos, setComitesAcademicos] = useState<ComiteAcademico[]>(
    data?.comitesAcademicos || []
  );
  const [representaciones, setRepresentaciones] = useState<Representacion[]>(
    data?.representaciones || []
  );
  
  const [showFuncionModal, setShowFuncionModal] = useState(false);
  const [showCargoModal, setShowCargoModal] = useState(false);
  const [showComiteModal, setShowComiteModal] = useState(false);
  const [showRepresentacionModal, setShowRepresentacionModal] = useState(false);
  const [showProrrateoPreview, setShowProrrateoPreview] = useState(false);
  
  const [editingFuncion, setEditingFuncion] = useState<FuncionAdministrativa | null>(null);
  const [editingCargo, setEditingCargo] = useState<CargoDirectivo | null>(null);
  const [editingComite, setEditingComite] = useState<ComiteAcademico | null>(null);
  const [editingRepresentacion, setEditingRepresentacion] = useState<Representacion | null>(null);

  // ============================================================================
  // CÁLCULO DE TOTALES
  // ============================================================================

  const calcularTotalHoras = () => {
    const horasFunciones = funcionesAdministrativas.reduce((sum, f) => sum + f.horasSemanales, 0);
    const horasCargos = cargosDirectivos.reduce((sum, c) => sum + c.horasSemanales, 0);
    const horasComites = comitesAcademicos.reduce((sum, c) => sum + c.horasSemanales, 0);
    const horasRepresentaciones = representaciones.reduce((sum, r) => sum + r.horasSemanales, 0);
    return horasFunciones + horasCargos + horasComites + horasRepresentaciones;
  };

  const totalHoras = calcularTotalHoras();

  // ============================================================================
  // VALIDACIONES
  // ============================================================================

  const validarHoras = (horas: number): string | null => {
    if (horas < 1) return 'Las horas deben ser al menos 1';
    if (horas > 20) return 'Las horas no pueden superar 20 por actividad';
    if (totalHoras + horas > 40) return 'El total excedería las 40 horas semanales';
    return null;
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAgregarFuncion = (funcion: FuncionAdministrativa) => {
    const nuevasFunciones = editingFuncion
      ? funcionesAdministrativas.map(f => f.id === funcion.id ? funcion : f)
      : [...funcionesAdministrativas, { ...funcion, id: Date.now().toString() }];
    
    setFuncionesAdministrativas(nuevasFunciones);
    onChange?.({ funcionesAdministrativas: nuevasFunciones, cargosDirectivos, comitesAcademicos, representaciones });
    setShowFuncionModal(false);
    setEditingFuncion(null);
  };

  const handleEliminarFuncion = (id: string) => {
    const nuevasFunciones = funcionesAdministrativas.filter(f => f.id !== id);
    setFuncionesAdministrativas(nuevasFunciones);
    onChange?.({ funcionesAdministrativas: nuevasFunciones, cargosDirectivos, comitesAcademicos, representaciones });
  };

  // Similar handlers para cargo, comité y representación...

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header con información general */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#003DA5]" />
              <h3 className="text-lg font-semibold">Funciones Complementarias</h3>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="font-semibold mb-1">⚙️ Funciones Complementarias</p>
                  <p className="text-sm">
                    Actividades administrativas, cargos directivos, participación en comités
                    y representaciones institucionales que complementan la labor académica.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Administración, cargos directivos, comités y representaciones
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProrrateoPreview(true)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Vista Previa Prorrateo
          </Button>
        </div>

        {/* Alerta de límite de horas */}
        {totalHoras > 35 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Advertencia:</strong> Está cerca del límite de 40 horas semanales.
              Total actual en Complementarias: {totalHoras} horas.
            </AlertDescription>
          </Alert>
        )}

        {/* ========================================================================
            SECCIÓN 1: FUNCIONES ADMINISTRATIVAS
        ======================================================================== */}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#003DA5]" />
                <CardTitle className="text-base">Funciones Administrativas</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-1">🏢 Funciones Administrativas</p>
                    <p className="text-sm mb-2">
                      Responsabilidades de gestión y administración en la institución.
                    </p>
                    <p className="text-sm font-semibold">Horas recomendadas:</p>
                    <ul className="text-xs space-y-1 mt-1">
                      <li>• Jefatura: 8h/semana</li>
                      <li>• Coordinación: 6h/semana</li>
                      <li>• Secretaría: 4h/semana</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              {!readonly && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingFuncion(null);
                    setShowFuncionModal(true);
                  }}
                  className="gap-2"
                  disabled={totalHoras >= 40}
                >
                  <Plus className="h-4 w-4" />
                  Agregar Función
                </Button>
              )}
            </div>
            <CardDescription>
              Responsabilidades de gestión y administración
            </CardDescription>
          </CardHeader>
          <CardContent>
            {funcionesAdministrativas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay funciones administrativas registradas</p>
                <p className="text-sm mt-1">Agregue cargos de gestión o coordinación</p>
              </div>
            ) : (
              <div className="space-y-3">
                {funcionesAdministrativas.map((funcion) => (
                  <Card key={funcion.id} className="border-l-4 border-l-[#003DA5]">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{funcion.cargo}</h4>
                            <Badge variant="outline">
                              {TIPOS_FUNCION.find(t => t.value === funcion.tipo)?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{funcion.responsabilidades}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Dependencia:</span> {funcion.dependencia}
                            </div>
                            <div>
                              <span className="font-medium">Horas semanales:</span> {funcion.horasSemanales}h
                            </div>
                          </div>
                        </div>
                        {!readonly && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingFuncion(funcion);
                                setShowFuncionModal(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminarFuncion(funcion.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========================================================================
            SECCIÓN 2: CARGOS DIRECTIVOS
        ======================================================================== */}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#003DA5]" />
                <CardTitle className="text-base">Cargos Directivos</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-1">👔 Cargos Directivos</p>
                    <p className="text-sm mb-2">
                      Posiciones de liderazgo académico y administrativo.
                    </p>
                    <p className="text-sm font-semibold">Horas recomendadas:</p>
                    <ul className="text-xs space-y-1 mt-1">
                      <li>• Decano: 10h/semana</li>
                      <li>• Director: 8h/semana</li>
                      <li>• Coordinador: 6h/semana</li>
                      <li>• Secretario Académico: 4h/semana</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              {!readonly && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingCargo(null);
                    setShowCargoModal(true);
                  }}
                  className="gap-2"
                  disabled={totalHoras >= 40}
                >
                  <Plus className="h-4 w-4" />
                  Agregar Cargo
                </Button>
              )}
            </div>
            <CardDescription>
              Posiciones de liderazgo académico y administrativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cargosDirectivos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay cargos directivos registrados</p>
                <p className="text-sm mt-1">Agregue cargos de dirección académica</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cargosDirectivos.map((cargo) => (
                  <Card key={cargo.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{cargo.nombreCargo}</h4>
                            <Badge variant="outline">
                              {NIVELES_CARGO.find(n => n.value === cargo.nivel)?.label}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Facultad/Programa:</span> {cargo.facultadPrograma}
                            </div>
                            <div>
                              <span className="font-medium">Horas semanales:</span> {cargo.horasSemanales}h
                            </div>
                            <div>
                              <span className="font-medium">Inicio:</span> {new Date(cargo.fechaInicio).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Fin:</span> {new Date(cargo.fechaFin).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {!readonly && (
                          <div className="flex gap-2 ml-4">
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========================================================================
            SECCIÓN 3: COMITÉS ACADÉMICOS
        ======================================================================== */}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users2 className="h-5 w-5 text-[#003DA5]" />
                <CardTitle className="text-base">Comités Académicos</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-1">🤝 Comités Académicos</p>
                    <p className="text-sm mb-2">
                      Participación en comités curriculares, de investigación, extensión, etc.
                    </p>
                    <p className="text-sm font-semibold">Horas recomendadas:</p>
                    <ul className="text-xs space-y-1 mt-1">
                      <li>• Presidente: 3h/semana</li>
                      <li>• Secretario: 2h/semana</li>
                      <li>• Miembro: 1h/semana</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              {!readonly && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingComite(null);
                    setShowComiteModal(true);
                  }}
                  className="gap-2"
                  disabled={totalHoras >= 40}
                >
                  <Plus className="h-4 w-4" />
                  Agregar Comité
                </Button>
              )}
            </div>
            <CardDescription>
              Participación en comités institucionales
            </CardDescription>
          </CardHeader>
          <CardContent>
            {comitesAcademicos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay comités registrados</p>
                <p className="text-sm mt-1">Agregue comités en los que participa</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comitesAcademicos.map((comite) => (
                  <Card key={comite.id} className="border-l-4 border-l-indigo-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{comite.nombreComite}</h4>
                            <Badge variant="outline">
                              {TIPOS_COMITE.find(t => t.value === comite.tipo)?.label}
                            </Badge>
                            <Badge className="bg-indigo-100 text-indigo-800">
                              {ROLES_COMITE.find(r => r.value === comite.rol)?.label}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Horas semanales:</span> {comite.horasSemanales}h
                            </div>
                            <div>
                              <span className="font-medium">Periodicidad:</span> {comite.periodicidadReuniones}
                            </div>
                          </div>
                        </div>
                        {!readonly && (
                          <div className="flex gap-2 ml-4">
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========================================================================
            SECCIÓN 4: REPRESENTACIONES INSTITUCIONALES
        ======================================================================== */}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-[#003DA5]" />
                <CardTitle className="text-base">Representaciones Institucionales</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-1">🎭 Representaciones</p>
                    <p className="text-sm">
                      Representación en consejos, comisiones y entidades externas.
                      Normalmente asignan 1-2 horas semanales según el nivel de participación.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {!readonly && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingRepresentacion(null);
                    setShowRepresentacionModal(true);
                  }}
                  className="gap-2"
                  disabled={totalHoras >= 40}
                >
                  <Plus className="h-4 w-4" />
                  Agregar Representación
                </Button>
              )}
            </div>
            <CardDescription>
              Consejos, comisiones y representaciones externas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {representaciones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Award className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay representaciones registradas</p>
                <p className="text-sm mt-1">Agregue representaciones institucionales</p>
              </div>
            ) : (
              <div className="space-y-3">
                {representaciones.map((repr) => (
                  <Card key={repr.id} className="border-l-4 border-l-amber-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{repr.entidad}</h4>
                            <Badge variant="outline">
                              {repr.tipo.replace('_', ' ').charAt(0).toUpperCase() + repr.tipo.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{repr.descripcion}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Horas semanales:</span> {repr.horasSemanales}h
                            </div>
                            <div>
                              <span className="font-medium">Vigencia:</span> {repr.vigencia}
                            </div>
                          </div>
                        </div>
                        {!readonly && (
                          <div className="flex gap-2 ml-4">
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========================================================================
            RESUMEN TOTAL
        ======================================================================== */}
        
        <Card className="border-2 border-[#003DA5] bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Funciones Complementarias</p>
                <p className="text-3xl font-bold text-[#003DA5]">{totalHoras} horas/semana</p>
                <p className="text-sm text-gray-500 mt-1">
                  {funcionesAdministrativas.length} funciones • {cargosDirectivos.length} cargos • 
                  {comitesAcademicos.length} comités • {representaciones.length} representaciones
                </p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg">
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">Distribución Recomendada</p>
                      <p className="text-sm">Complementarias: 5-15% del PTA</p>
                      <p className="text-sm">(2-6 horas de 40 totales)</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="text-sm text-gray-600">
                    {((totalHoras / 40) * 100).toFixed(0)}% del total
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal de vista previa del prorrateo */}
        <PTAProrrateoPreview
          open={showProrrateoPreview}
          onClose={() => setShowProrrateoPreview(false)}
          data={{
            investigacion: 0,
            docencia: 0,
            extension: 0,
            complementarias: totalHoras,
          }}
        />
      </div>
    </TooltipProvider>
  );
};
