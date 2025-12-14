/**
 * PTAInvestigacionForm.tsx
 * 
 * Formulario para registrar actividades de Investigación en el PTA
 * Incluye: Proyectos de investigación, Semilleros, Publicaciones
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
import { Plus, Trash2, Edit2, BookOpen, Users, FileText, AlertCircle, Eye, Info } from 'lucide-react';
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

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface ProyectoInvestigacion {
  id: string;
  titulo: string;
  rol: 'investigador_principal' | 'coinvestigador' | 'auxiliar';
  horasSemanales: number;
  estado: 'formulacion' | 'ejecucion' | 'finalizacion';
  tipoProyecto: 'interno' | 'externo' | 'convocatoria';
  fechaInicio: string;
  fechaFin: string;
  grupoInvestigacion?: string;
}

interface Semillero {
  id: string;
  nombre: string;
  rol: 'coordinador' | 'tutor';
  horasSemanales: number;
  numeroEstudiantes: number;
  areaConocimiento: string;
}

interface Publicacion {
  id: string;
  titulo: string;
  tipo: 'articulo_a1' | 'articulo_a2' | 'libro' | 'capitulo' | 'ponencia';
  estado: 'preparacion' | 'enviado' | 'revision' | 'aceptado' | 'publicado';
  horasSemanales: number;
  coautores: number;
}

interface PTAInvestigacionFormProps {
  data?: {
    proyectos: ProyectoInvestigacion[];
    semilleros: Semillero[];
    publicaciones: Publicacion[];
  };
  onChange?: (data: any) => void;
  readonly?: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const ROLES_PROYECTO = [
  { value: 'investigador_principal', label: 'Investigador Principal', horas: 8 },
  { value: 'coinvestigador', label: 'Coinvestigador', horas: 4 },
  { value: 'auxiliar', label: 'Auxiliar de Investigación', horas: 2 },
];

const ESTADOS_PROYECTO = [
  { value: 'formulacion', label: 'Formulación', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'ejecucion', label: 'En Ejecución', color: 'bg-green-100 text-green-800' },
  { value: 'finalizacion', label: 'Finalización', color: 'bg-blue-100 text-blue-800' },
];

const TIPOS_PUBLICACION = [
  { value: 'articulo_a1', label: 'Artículo A1 (Q1)', horas: 6 },
  { value: 'articulo_a2', label: 'Artículo A2 (Q2-Q4)', horas: 4 },
  { value: 'libro', label: 'Libro', horas: 8 },
  { value: 'capitulo', label: 'Capítulo de Libro', horas: 3 },
  { value: 'ponencia', label: 'Ponencia', horas: 2 },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const PTAInvestigacionForm: React.FC<PTAInvestigacionFormProps> = ({
  data,
  onChange,
  readonly = false,
}) => {
  // Estado local
  const [proyectos, setProyectos] = useState<ProyectoInvestigacion[]>(data?.proyectos || []);
  const [semilleros, setSemilleros] = useState<Semillero[]>(data?.semilleros || []);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>(data?.publicaciones || []);
  
  const [showProyectoModal, setShowProyectoModal] = useState(false);
  const [showSemilleroModal, setShowSemilleroModal] = useState(false);
  const [showPublicacionModal, setShowPublicacionModal] = useState(false);
  const [showProrrateoPreview, setShowProrrateoPreview] = useState(false);
  
  const [editingProyecto, setEditingProyecto] = useState<ProyectoInvestigacion | null>(null);
  const [editingSemillero, setEditingSemillero] = useState<Semillero | null>(null);
  const [editingPublicacion, setEditingPublicacion] = useState<Publicacion | null>(null);

  // ============================================================================
  // CÁLCULO DE TOTALES
  // ============================================================================

  const calcularTotalHoras = () => {
    const horasProyectos = proyectos.reduce((sum, p) => sum + p.horasSemanales, 0);
    const horasSemilleros = semilleros.reduce((sum, s) => sum + s.horasSemanales, 0);
    const horasPublicaciones = publicaciones.reduce((sum, p) => sum + p.horasSemanales, 0);
    return horasProyectos + horasSemilleros + horasPublicaciones;
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
  // HANDLERS - PROYECTOS
  // ============================================================================

  const handleAgregarProyecto = (proyecto: ProyectoInvestigacion) => {
    const nuevosProyectos = editingProyecto
      ? proyectos.map(p => p.id === proyecto.id ? proyecto : p)
      : [...proyectos, { ...proyecto, id: Date.now().toString() }];
    
    setProyectos(nuevosProyectos);
    onChange?.({ proyectos: nuevosProyectos, semilleros, publicaciones });
    setShowProyectoModal(false);
    setEditingProyecto(null);
  };

  const handleEliminarProyecto = (id: string) => {
    const nuevosProyectos = proyectos.filter(p => p.id !== id);
    setProyectos(nuevosProyectos);
    onChange?.({ proyectos: nuevosProyectos, semilleros, publicaciones });
  };

  // ============================================================================
  // HANDLERS - SEMILLEROS
  // ============================================================================

  const handleAgregarSemillero = (semillero: Semillero) => {
    const nuevosSemilleros = editingSemillero
      ? semilleros.map(s => s.id === semillero.id ? semillero : s)
      : [...semilleros, { ...semillero, id: Date.now().toString() }];
    
    setSemilleros(nuevosSemilleros);
    onChange?.({ proyectos, semilleros: nuevosSemilleros, publicaciones });
    setShowSemilleroModal(false);
    setEditingSemillero(null);
  };

  const handleEliminarSemillero = (id: string) => {
    const nuevosSemilleros = semilleros.filter(s => s.id !== id);
    setSemilleros(nuevosSemilleros);
    onChange?.({ proyectos, semilleros: nuevosSemilleros, publicaciones });
  };

  // ============================================================================
  // HANDLERS - PUBLICACIONES
  // ============================================================================

  const handleAgregarPublicacion = (publicacion: Publicacion) => {
    const nuevasPublicaciones = editingPublicacion
      ? publicaciones.map(p => p.id === publicacion.id ? publicacion : p)
      : [...publicaciones, { ...publicacion, id: Date.now().toString() }];
    
    setPublicaciones(nuevasPublicaciones);
    onChange?.({ proyectos, semilleros, publicaciones: nuevasPublicaciones });
    setShowPublicacionModal(false);
    setEditingPublicacion(null);
  };

  const handleEliminarPublicacion = (id: string) => {
    const nuevasPublicaciones = publicaciones.filter(p => p.id !== id);
    setPublicaciones(nuevasPublicaciones);
    onChange?.({ proyectos, semilleros, publicaciones: nuevasPublicaciones });
  };

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
              <BookOpen className="h-5 w-5 text-[#003DA5]" />
              <h3 className="text-lg font-semibold">Investigación</h3>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="font-semibold mb-1">🔬 Componente de Investigación</p>
                  <p className="text-sm">
                    Registre todas sus actividades de investigación: proyectos, semilleros y publicaciones.
                    El sistema calculará automáticamente las horas según su rol y tipo de actividad.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Proyectos, semilleros y producción académica
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
              Total actual en Investigación: {totalHoras} horas.
            </AlertDescription>
          </Alert>
        )}

        {/* ========================================================================
            SECCIÓN 1: PROYECTOS DE INVESTIGACIÓN
        ======================================================================== */}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#003DA5]" />
                <CardTitle className="text-base">Proyectos de Investigación</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-1">📚 Proyectos de Investigación</p>
                    <p className="text-sm mb-2">
                      Proyectos avalados por la institución o en convocatorias externas.
                    </p>
                    <p className="text-sm font-semibold">Horas recomendadas:</p>
                    <ul className="text-xs space-y-1 mt-1">
                      <li>• Investigador Principal: 8h/semana</li>
                      <li>• Coinvestigador: 4h/semana</li>
                      <li>• Auxiliar: 2h/semana</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              {!readonly && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingProyecto(null);
                    setShowProyectoModal(true);
                  }}
                  className="gap-2"
                  disabled={totalHoras >= 40}
                >
                  <Plus className="h-4 w-4" />
                  Agregar Proyecto
                </Button>
              )}
            </div>
            <CardDescription>
              Proyectos de investigación activos y en formulación
            </CardDescription>
          </CardHeader>
          <CardContent>
            {proyectos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay proyectos de investigación registrados</p>
                <p className="text-sm mt-1">Agregue sus proyectos activos para calcular el PTA</p>
              </div>
            ) : (
              <div className="space-y-3">
                {proyectos.map((proyecto) => (
                  <Card key={proyecto.id} className="border-l-4 border-l-[#003DA5]">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{proyecto.titulo}</h4>
                            <Badge className={
                              ESTADOS_PROYECTO.find(e => e.value === proyecto.estado)?.color
                            }>
                              {ESTADOS_PROYECTO.find(e => e.value === proyecto.estado)?.label}
                            </Badge>
                            <Badge variant="outline">
                              {ROLES_PROYECTO.find(r => r.value === proyecto.rol)?.label}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Horas semanales:</span> {proyecto.horasSemanales}h
                            </div>
                            <div>
                              <span className="font-medium">Tipo:</span> {
                                proyecto.tipoProyecto === 'interno' ? 'Interno' :
                                proyecto.tipoProyecto === 'externo' ? 'Externo' : 'Convocatoria'
                              }
                            </div>
                            <div>
                              <span className="font-medium">Inicio:</span> {new Date(proyecto.fechaInicio).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Fin:</span> {new Date(proyecto.fechaFin).toLocaleDateString()}
                            </div>
                          </div>
                          {proyecto.grupoInvestigacion && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium">Grupo:</span> {proyecto.grupoInvestigacion}
                            </div>
                          )}
                        </div>
                        {!readonly && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProyecto(proyecto);
                                setShowProyectoModal(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminarProyecto(proyecto.id)}
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
            SECCIÓN 2: SEMILLEROS DE INVESTIGACIÓN
        ======================================================================== */}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#003DA5]" />
                <CardTitle className="text-base">Semilleros de Investigación</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-1">🌱 Semilleros de Investigación</p>
                    <p className="text-sm mb-2">
                      Grupos de estudiantes que desarrollan proyectos de investigación formativa.
                    </p>
                    <p className="text-sm font-semibold">Horas recomendadas:</p>
                    <ul className="text-xs space-y-1 mt-1">
                      <li>• Coordinador: 3-4h/semana</li>
                      <li>• Tutor: 2-3h/semana</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              {!readonly && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingSemillero(null);
                    setShowSemilleroModal(true);
                  }}
                  className="gap-2"
                  disabled={totalHoras >= 40}
                >
                  <Plus className="h-4 w-4" />
                  Agregar Semillero
                </Button>
              )}
            </div>
            <CardDescription>
              Dirección y tutoría de semilleros de investigación
            </CardDescription>
          </CardHeader>
          <CardContent>
            {semilleros.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay semilleros registrados</p>
                <p className="text-sm mt-1">Agregue los semilleros que coordina o tutoriza</p>
              </div>
            ) : (
              <div className="space-y-3">
                {semilleros.map((semillero) => (
                  <Card key={semillero.id} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{semillero.nombre}</h4>
                            <Badge variant="outline">
                              {semillero.rol === 'coordinador' ? 'Coordinador' : 'Tutor'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Horas semanales:</span> {semillero.horasSemanales}h
                            </div>
                            <div>
                              <span className="font-medium">Estudiantes:</span> {semillero.numeroEstudiantes}
                            </div>
                            <div className="col-span-2">
                              <span className="font-medium">Área:</span> {semillero.areaConocimiento}
                            </div>
                          </div>
                        </div>
                        {!readonly && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSemillero(semillero);
                                setShowSemilleroModal(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminarSemillero(semillero.id)}
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
            SECCIÓN 3: PUBLICACIONES ACADÉMICAS
        ======================================================================== */}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#003DA5]" />
                <CardTitle className="text-base">Publicaciones Académicas</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-1">📄 Publicaciones Académicas</p>
                    <p className="text-sm mb-2">
                      Artículos, libros y ponencias en preparación o publicación.
                    </p>
                    <p className="text-sm font-semibold">Horas recomendadas:</p>
                    <ul className="text-xs space-y-1 mt-1">
                      <li>• Artículo A1 (Q1): 6h/semana</li>
                      <li>• Artículo A2 (Q2-Q4): 4h/semana</li>
                      <li>• Libro: 8h/semana</li>
                      <li>• Capítulo: 3h/semana</li>
                      <li>• Ponencia: 2h/semana</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              {!readonly && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPublicacion(null);
                    setShowPublicacionModal(true);
                  }}
                  className="gap-2"
                  disabled={totalHoras >= 40}
                >
                  <Plus className="h-4 w-4" />
                  Agregar Publicación
                </Button>
              )}
            </div>
            <CardDescription>
              Producción académica en preparación o publicación
            </CardDescription>
          </CardHeader>
          <CardContent>
            {publicaciones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay publicaciones registradas</p>
                <p className="text-sm mt-1">Agregue artículos, libros o ponencias en preparación</p>
              </div>
            ) : (
              <div className="space-y-3">
                {publicaciones.map((publicacion) => (
                  <Card key={publicacion.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{publicacion.titulo}</h4>
                            <Badge variant="outline">
                              {TIPOS_PUBLICACION.find(t => t.value === publicacion.tipo)?.label}
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-800">
                              {publicacion.estado.charAt(0).toUpperCase() + publicacion.estado.slice(1)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Horas semanales:</span> {publicacion.horasSemanales}h
                            </div>
                            <div>
                              <span className="font-medium">Coautores:</span> {publicacion.coautores}
                            </div>
                          </div>
                        </div>
                        {!readonly && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPublicacion(publicacion);
                                setShowPublicacionModal(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminarPublicacion(publicacion.id)}
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
            RESUMEN TOTAL
        ======================================================================== */}
        
        <Card className="border-2 border-[#003DA5] bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Investigación</p>
                <p className="text-3xl font-bold text-[#003DA5]">{totalHoras} horas/semana</p>
                <p className="text-sm text-gray-500 mt-1">
                  {proyectos.length} proyectos • {semilleros.length} semilleros • {publicaciones.length} publicaciones
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
                      <p className="text-sm">Investigación: 20-30% del PTA</p>
                      <p className="text-sm">(8-12 horas de 40 totales)</p>
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

        {/* Modales para agregar/editar (implementación básica) */}
        <ModalProyecto
          open={showProyectoModal}
          onClose={() => {
            setShowProyectoModal(false);
            setEditingProyecto(null);
          }}
          onSave={handleAgregarProyecto}
          proyecto={editingProyecto}
          validarHoras={validarHoras}
        />

        <ModalSemillero
          open={showSemilleroModal}
          onClose={() => {
            setShowSemilleroModal(false);
            setEditingSemillero(null);
          }}
          onSave={handleAgregarSemillero}
          semillero={editingSemillero}
          validarHoras={validarHoras}
        />

        <ModalPublicacion
          open={showPublicacionModal}
          onClose={() => {
            setShowPublicacionModal(false);
            setEditingPublicacion(null);
          }}
          onSave={handleAgregarPublicacion}
          publicacion={editingPublicacion}
          validarHoras={validarHoras}
        />

        {/* Modal de vista previa del prorrateo */}
        <PTAProrrateoPreview
          open={showProrrateoPreview}
          onClose={() => setShowProrrateoPreview(false)}
          data={{
            investigacion: totalHoras,
            docencia: 0,
            extension: 0,
            complementarias: 0,
          }}
        />
      </div>
    </TooltipProvider>
  );
};

// ============================================================================
// MODALES AUXILIARES
// ============================================================================

interface ModalProyectoProps {
  open: boolean;
  onClose: () => void;
  onSave: (proyecto: ProyectoInvestigacion) => void;
  proyecto: ProyectoInvestigacion | null;
  validarHoras: (horas: number) => string | null;
}

const ModalProyecto: React.FC<ModalProyectoProps> = ({ open, onClose, onSave, proyecto, validarHoras }) => {
  const [formData, setFormData] = useState<Partial<ProyectoInvestigacion>>(
    proyecto || {
      titulo: '',
      rol: 'coinvestigador',
      horasSemanales: 4,
      estado: 'formulacion',
      tipoProyecto: 'interno',
      fechaInicio: '',
      fechaFin: '',
      grupoInvestigacion: '',
    }
  );

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!formData.titulo || !formData.fechaInicio || !formData.fechaFin) {
      setError('Complete todos los campos obligatorios');
      return;
    }

    const errorHoras = validarHoras(formData.horasSemanales || 0);
    if (errorHoras) {
      setError(errorHoras);
      return;
    }

    onSave(formData as ProyectoInvestigacion);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {proyecto ? 'Editar Proyecto de Investigación' : 'Agregar Proyecto de Investigación'}
          </DialogTitle>
          <DialogDescription>
            Complete la información del proyecto de investigación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="titulo">Título del Proyecto *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Análisis de políticas públicas en Colombia"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rol">Rol en el Proyecto *</Label>
              <Select
                value={formData.rol}
                onValueChange={(value: any) => {
                  const rol = ROLES_PROYECTO.find(r => r.value === value);
                  setFormData({ ...formData, rol: value, horasSemanales: rol?.horas || 4 });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_PROYECTO.map((rol) => (
                    <SelectItem key={rol.value} value={rol.value}>
                      {rol.label} ({rol.horas}h sugeridas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="horasSemanales">Horas Semanales *</Label>
              <Input
                id="horasSemanales"
                type="number"
                min="1"
                max="20"
                value={formData.horasSemanales}
                onChange={(e) => setFormData({ ...formData, horasSemanales: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estado">Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(value: any) => setFormData({ ...formData, estado: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_PROYECTO.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tipoProyecto">Tipo de Proyecto *</Label>
              <Select
                value={formData.tipoProyecto}
                onValueChange={(value: any) => setFormData({ ...formData, tipoProyecto: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="externo">Externo</SelectItem>
                  <SelectItem value="convocatoria">Convocatoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fechaInicio">Fecha de Inicio *</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="fechaFin">Fecha de Fin *</Label>
              <Input
                id="fechaFin"
                type="date"
                value={formData.fechaFin}
                onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="grupoInvestigacion">Grupo de Investigación (Opcional)</Label>
            <Input
              id="grupoInvestigacion"
              value={formData.grupoInvestigacion}
              onChange={(e) => setFormData({ ...formData, grupoInvestigacion: e.target.value })}
              placeholder="Ej: Grupo de Investigación en Administración Pública"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {proyecto ? 'Actualizar' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ModalSemilleroProps {
  open: boolean;
  onClose: () => void;
  onSave: (semillero: Semillero) => void;
  semillero: Semillero | null;
  validarHoras: (horas: number) => string | null;
}

const ModalSemillero: React.FC<ModalSemilleroProps> = ({ open, onClose, onSave, semillero, validarHoras }) => {
  const [formData, setFormData] = useState<Partial<Semillero>>(
    semillero || {
      nombre: '',
      rol: 'tutor',
      horasSemanales: 2,
      numeroEstudiantes: 0,
      areaConocimiento: '',
    }
  );

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!formData.nombre || !formData.areaConocimiento) {
      setError('Complete todos los campos obligatorios');
      return;
    }

    const errorHoras = validarHoras(formData.horasSemanales || 0);
    if (errorHoras) {
      setError(errorHoras);
      return;
    }

    onSave(formData as Semillero);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {semillero ? 'Editar Semillero' : 'Agregar Semillero de Investigación'}
          </DialogTitle>
          <DialogDescription>
            Complete la información del semillero
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="nombre">Nombre del Semillero *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Semillero de Políticas Públicas"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rol">Rol *</Label>
              <Select
                value={formData.rol}
                onValueChange={(value: any) => setFormData({ ...formData, rol: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coordinador">Coordinador</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="horasSemanales">Horas Semanales *</Label>
              <Input
                id="horasSemanales"
                type="number"
                min="1"
                max="10"
                value={formData.horasSemanales}
                onChange={(e) => setFormData({ ...formData, horasSemanales: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="numeroEstudiantes">Número de Estudiantes *</Label>
            <Input
              id="numeroEstudiantes"
              type="number"
              min="1"
              value={formData.numeroEstudiantes}
              onChange={(e) => setFormData({ ...formData, numeroEstudiantes: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <Label htmlFor="areaConocimiento">Área de Conocimiento *</Label>
            <Input
              id="areaConocimiento"
              value={formData.areaConocimiento}
              onChange={(e) => setFormData({ ...formData, areaConocimiento: e.target.value })}
              placeholder="Ej: Administración Pública"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {semillero ? 'Actualizar' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ModalPublicacionProps {
  open: boolean;
  onClose: () => void;
  onSave: (publicacion: Publicacion) => void;
  publicacion: Publicacion | null;
  validarHoras: (horas: number) => string | null;
}

const ModalPublicacion: React.FC<ModalPublicacionProps> = ({ open, onClose, onSave, publicacion, validarHoras }) => {
  const [formData, setFormData] = useState<Partial<Publicacion>>(
    publicacion || {
      titulo: '',
      tipo: 'articulo_a2',
      estado: 'preparacion',
      horasSemanales: 4,
      coautores: 0,
    }
  );

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!formData.titulo) {
      setError('Complete todos los campos obligatorios');
      return;
    }

    const errorHoras = validarHoras(formData.horasSemanales || 0);
    if (errorHoras) {
      setError(errorHoras);
      return;
    }

    onSave(formData as Publicacion);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {publicacion ? 'Editar Publicación' : 'Agregar Publicación Académica'}
          </DialogTitle>
          <DialogDescription>
            Complete la información de la publicación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="titulo">Título de la Publicación *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Análisis de la gestión pública en Colombia"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo">Tipo de Publicación *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value: any) => {
                  const tipo = TIPOS_PUBLICACION.find(t => t.value === value);
                  setFormData({ ...formData, tipo: value, horasSemanales: tipo?.horas || 4 });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PUBLICACION.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label} ({tipo.horas}h)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estado">Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(value: any) => setFormData({ ...formData, estado: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preparacion">En Preparación</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="revision">En Revisión</SelectItem>
                  <SelectItem value="aceptado">Aceptado</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="horasSemanales">Horas Semanales *</Label>
              <Input
                id="horasSemanales"
                type="number"
                min="1"
                max="10"
                value={formData.horasSemanales}
                onChange={(e) => setFormData({ ...formData, horasSemanales: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="coautores">Número de Coautores</Label>
              <Input
                id="coautores"
                type="number"
                min="0"
                value={formData.coautores}
                onChange={(e) => setFormData({ ...formData, coautores: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {publicacion ? 'Actualizar' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
