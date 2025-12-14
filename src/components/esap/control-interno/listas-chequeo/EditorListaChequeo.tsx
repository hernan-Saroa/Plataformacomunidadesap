/**
 * EDITOR DE LISTA DE CHEQUEO
 * 
 * Componente completo para crear y editar listas de chequeo con:
 * - Editor de información general
 * - Gestión de secciones
 * - Gestión de ítems de verificación
 * - Configuración avanzada
 * - Vista previa
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Settings,
  FileText,
  List,
  Target,
  BookOpen,
  Edit3,
  X,
  MoveUp,
  MoveDown
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Badge } from '../../../ui/badge';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../ui/tabs';
import { Switch } from '../../../ui/switch';
import { Separator } from '../../../ui/separator';
import { ScrollArea } from '../../../ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../ui/accordion';

// Tipos
interface ItemVerificacion {
  id: string;
  numero: string;
  criterio: string;
  normativaReferencia: string;
  esCritico: boolean;
}

interface SeccionLista {
  id: string;
  orden: number;
  nombre: string;
  descripcion: string;
  items: ItemVerificacion[];
}

interface ListaChequeo {
  id?: string;
  codigo?: string;
  nombre: string;
  version: string;
  proceso: string;
  subproceso?: string;
  categoria: 'normativa' | 'procesos' | 'controles' | 'riesgos' | 'personalizada';
  normativaAplicable: string;
  descripcion: string;
  objetivo: string;
  secciones: SeccionLista[];
  
  // Configuración
  permiteNoAplica: boolean;
  requiereEvidencias: boolean;
  generaHallazgosAutomaticos: boolean;
  
  // Metadata
  estado?: 'borrador' | 'activa' | 'archivada';
  totalItems?: number;
}

interface EditorListaChequeoProps {
  listaInicial?: ListaChequeo;
  modoEdicion?: boolean;
  procesos: string[];
  categorias: Array<{ value: string; label: string; icon: any }>;
  onGuardar: (lista: ListaChequeo) => void;
  onCancelar: () => void;
}

export function EditorListaChequeo({
  listaInicial,
  modoEdicion = false,
  procesos,
  categorias,
  onGuardar,
  onCancelar
}: EditorListaChequeoProps) {
  // Estado del formulario
  const [lista, setLista] = useState<ListaChequeo>(
    listaInicial || {
      nombre: '',
      version: '1.0',
      proceso: '',
      subproceso: '',
      categoria: 'personalizada',
      normativaAplicable: '',
      descripcion: '',
      objetivo: '',
      secciones: [],
      permiteNoAplica: true,
      requiereEvidencias: false,
      generaHallazgosAutomaticos: true,
      estado: 'borrador'
    }
  );

  const [tabActiva, setTabActiva] = useState('general');
  const [seccionExpandida, setSeccionExpandida] = useState<string | null>(null);
  const [modoVistaPrevia, setModoVistaPrevia] = useState(false);
  
  // Modal de agregar sección
  const [isAgregarSeccionOpen, setIsAgregarSeccionOpen] = useState(false);
  const [seccionEditando, setSeccionEditando] = useState<SeccionLista | null>(null);
  
  // Modal de agregar ítem
  const [isAgregarItemOpen, setIsAgregarItemOpen] = useState(false);
  const [seccionActual, setSeccionActual] = useState<string | null>(null);
  const [itemEditando, setItemEditando] = useState<ItemVerificacion | null>(null);

  // ==================== FUNCIONES DE GESTIÓN ====================

  const handleAgregarSeccion = () => {
    setSeccionEditando(null);
    setIsAgregarSeccionOpen(true);
  };

  const handleEditarSeccion = (seccion: SeccionLista) => {
    setSeccionEditando(seccion);
    setIsAgregarSeccionOpen(true);
  };

  const handleGuardarSeccion = (seccion: SeccionLista) => {
    if (seccionEditando) {
      // Editar sección existente
      setLista(prev => ({
        ...prev,
        secciones: prev.secciones.map(s => s.id === seccion.id ? seccion : s)
      }));
      toast.success('Sección actualizada');
    } else {
      // Nueva sección
      const nuevaSeccion: SeccionLista = {
        ...seccion,
        id: `SEC-${Date.now()}`,
        orden: lista.secciones.length + 1,
        items: []
      };
      setLista(prev => ({
        ...prev,
        secciones: [...prev.secciones, nuevaSeccion]
      }));
      toast.success('Sección agregada');
    }
    setIsAgregarSeccionOpen(false);
  };

  const handleEliminarSeccion = (seccionId: string) => {
    if (confirm('¿Eliminar esta sección y todos sus ítems?')) {
      setLista(prev => ({
        ...prev,
        secciones: prev.secciones.filter(s => s.id !== seccionId)
      }));
      toast.info('Sección eliminada');
    }
  };

  const handleMoverSeccion = (seccionId: string, direccion: 'up' | 'down') => {
    const index = lista.secciones.findIndex(s => s.id === seccionId);
    if (
      (direccion === 'up' && index === 0) ||
      (direccion === 'down' && index === lista.secciones.length - 1)
    ) return;

    const newIndex = direccion === 'up' ? index - 1 : index + 1;
    const newSecciones = [...lista.secciones];
    [newSecciones[index], newSecciones[newIndex]] = [newSecciones[newIndex], newSecciones[index]];
    
    // Actualizar orden
    newSecciones.forEach((s, i) => {
      s.orden = i + 1;
    });

    setLista(prev => ({ ...prev, secciones: newSecciones }));
  };

  const handleAgregarItem = (seccionId: string) => {
    setSeccionActual(seccionId);
    setItemEditando(null);
    setIsAgregarItemOpen(true);
  };

  const handleEditarItem = (seccionId: string, item: ItemVerificacion) => {
    setSeccionActual(seccionId);
    setItemEditando(item);
    setIsAgregarItemOpen(true);
  };

  const handleGuardarItem = (item: ItemVerificacion) => {
    if (!seccionActual) return;

    setLista(prev => ({
      ...prev,
      secciones: prev.secciones.map(seccion => {
        if (seccion.id === seccionActual) {
          if (itemEditando) {
            // Editar ítem existente
            return {
              ...seccion,
              items: seccion.items.map(i => i.id === item.id ? item : i)
            };
          } else {
            // Nuevo ítem
            const nuevoItem: ItemVerificacion = {
              ...item,
              id: `ITEM-${Date.now()}`,
              numero: `${seccion.orden}.${seccion.items.length + 1}`
            };
            return {
              ...seccion,
              items: [...seccion.items, nuevoItem]
            };
          }
        }
        return seccion;
      })
    }));

    toast.success(itemEditando ? 'Ítem actualizado' : 'Ítem agregado');
    setIsAgregarItemOpen(false);
  };

  const handleEliminarItem = (seccionId: string, itemId: string) => {
    if (confirm('¿Eliminar este ítem de verificación?')) {
      setLista(prev => ({
        ...prev,
        secciones: prev.secciones.map(seccion => {
          if (seccion.id === seccionId) {
            return {
              ...seccion,
              items: seccion.items.filter(i => i.id !== itemId)
            };
          }
          return seccion;
        })
      }));
      toast.info('Ítem eliminado');
    }
  };

  const handleGuardarLista = () => {
    // Validaciones
    if (!lista.nombre.trim()) {
      toast.error('El nombre es requerido');
      setTabActiva('general');
      return;
    }
    if (!lista.proceso) {
      toast.error('Selecciona un proceso');
      setTabActiva('general');
      return;
    }
    if (lista.secciones.length === 0) {
      toast.error('Agrega al menos una sección');
      setTabActiva('secciones');
      return;
    }

    const totalItems = lista.secciones.reduce((sum, s) => sum + s.items.length, 0);
    if (totalItems === 0) {
      toast.error('Agrega al menos un ítem de verificación');
      setTabActiva('secciones');
      return;
    }

    // Calcular total de ítems
    const listaCompleta: ListaChequeo = {
      ...lista,
      totalItems: totalItems
    };

    onGuardar(listaCompleta);
  };

  const calcularTotalItems = () => {
    return lista.secciones.reduce((sum, s) => sum + s.items.length, 0);
  };

  // ==================== RENDER ====================

  if (modoVistaPrevia) {
    return (
      <VistaPrevia
        lista={lista}
        onVolver={() => setModoVistaPrevia(false)}
        categorias={categorias}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900">
            {modoEdicion ? 'Editar Lista de Chequeo' : 'Nueva Lista de Chequeo'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {modoEdicion ? `Editando: ${lista.nombre}` : 'Completa la información y agrega secciones con ítems'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setModoVistaPrevia(true)} className="gap-2">
            <Eye className="w-4 h-4" />
            Vista Previa
          </Button>
          <Button variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button onClick={handleGuardarLista} className="bg-[#003DA5] hover:bg-[#002873] gap-2">
            <Save className="w-4 h-4" />
            {modoEdicion ? 'Guardar Cambios' : 'Crear Lista'}
          </Button>
        </div>
      </div>

      {/* Progreso */}
      <Card className="p-4 bg-blue-50 border-2 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-5 h-5 ${lista.nombre && lista.proceso ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-700">Información general</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-5 h-5 ${lista.secciones.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-700">Secciones ({lista.secciones.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-5 h-5 ${calcularTotalItems() > 0 ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-700">Ítems ({calcularTotalItems()})</span>
            </div>
          </div>
          <Badge className="bg-blue-600 text-white">
            v{lista.version}
          </Badge>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={tabActiva} onValueChange={setTabActiva} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="gap-2">
            <FileText className="w-4 h-4" />
            Información General
          </TabsTrigger>
          <TabsTrigger value="secciones" className="gap-2">
            <List className="w-4 h-4" />
            Secciones e Ítems
          </TabsTrigger>
          <TabsTrigger value="configuracion" className="gap-2">
            <Settings className="w-4 h-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Tab: Información General */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-gray-900">
                  Nombre de la lista <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={lista.nombre}
                  onChange={(e) => setLista({ ...lista, nombre: e.target.value })}
                  placeholder="Ej: Verificación de Controles Contractuales"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900">
                    Proceso <span className="text-red-500">*</span>
                  </Label>
                  <Select value={lista.proceso} onValueChange={(value) => setLista({ ...lista, proceso: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar proceso" />
                    </SelectTrigger>
                    <SelectContent>
                      {procesos.map(proc => (
                        <SelectItem key={proc} value={proc}>{proc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-900">Subproceso (Opcional)</Label>
                  <Input
                    value={lista.subproceso || ''}
                    onChange={(e) => setLista({ ...lista, subproceso: e.target.value })}
                    placeholder="Ej: Contratación Directa"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900">
                    Categoría <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={lista.categoria}
                    onValueChange={(value: any) => setLista({ ...lista, categoria: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-900">Versión</Label>
                  <Input
                    value={lista.version}
                    onChange={(e) => setLista({ ...lista, version: e.target.value })}
                    placeholder="1.0"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-900">
                  Normativa Aplicable <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={lista.normativaAplicable}
                  onChange={(e) => setLista({ ...lista, normativaAplicable: e.target.value })}
                  placeholder="Ej: Ley 1150 de 2007, Decreto 1082 de 2015, Manual de Contratación ESAP v3.0"
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-gray-900">Descripción</Label>
                <Textarea
                  value={lista.descripcion}
                  onChange={(e) => setLista({ ...lista, descripcion: e.target.value })}
                  placeholder="Describe brevemente el propósito de esta lista de chequeo"
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-gray-900">Objetivo</Label>
                <Textarea
                  value={lista.objetivo}
                  onChange={(e) => setLista({ ...lista, objetivo: e.target.value })}
                  placeholder="¿Qué se busca verificar con esta lista?"
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Secciones e Ítems */}
        <TabsContent value="secciones" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-900">Secciones de la Lista</h3>
              <p className="text-sm text-gray-600">
                Organiza los ítems de verificación en secciones temáticas
              </p>
            </div>
            <Button onClick={handleAgregarSeccion} className="bg-[#003DA5] hover:bg-[#002873] gap-2">
              <Plus className="w-4 h-4" />
              Agregar Sección
            </Button>
          </div>

          {lista.secciones.length === 0 ? (
            <Card className="p-12 text-center">
              <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">No hay secciones</h3>
              <p className="text-sm text-gray-600 mb-4">
                Comienza agregando una sección para organizar los ítems
              </p>
              <Button onClick={handleAgregarSeccion} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Agregar Primera Sección
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {lista.secciones.map((seccion, index) => (
                <Card key={seccion.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          Sección {seccion.orden}
                        </Badge>
                        <h4 className="text-gray-900">{seccion.nombre}</h4>
                        <Badge variant="outline" className="text-xs">
                          {seccion.items.length} ítems
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{seccion.descripcion}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleMoverSeccion(seccion.id, 'up')}
                        disabled={index === 0}
                      >
                        <MoveUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleMoverSeccion(seccion.id, 'down')}
                        disabled={index === lista.secciones.length - 1}
                      >
                        <MoveDown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditarSeccion(seccion)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEliminarSeccion(seccion.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Ítems de la sección */}
                  <div className="space-y-2">
                    {seccion.items.length === 0 ? (
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-sm text-gray-600 mb-2">No hay ítems en esta sección</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAgregarItem(seccion.id)}
                          className="gap-2"
                        >
                          <Plus className="w-3 h-3" />
                          Agregar Ítem
                        </Button>
                      </div>
                    ) : (
                      <>
                        {seccion.items.map(item => (
                          <div key={item.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {item.numero}
                                </Badge>
                                {item.esCritico && (
                                  <Badge className="bg-red-100 text-red-800 border-0 text-xs">
                                    Crítico
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-900 mb-1">{item.criterio}</p>
                              <p className="text-xs text-gray-600">{item.normativaReferencia}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditarItem(seccion.id, item)}
                                className="h-8 w-8"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEliminarItem(seccion.id, item.id)}
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAgregarItem(seccion.id)}
                          className="w-full gap-2 mt-2"
                        >
                          <Plus className="w-3 h-3" />
                          Agregar Ítem a esta Sección
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Configuración */}
        <TabsContent value="configuracion" className="space-y-4 mt-4">
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Opciones de la Lista</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-gray-900 mb-1">Permitir respuesta &quot;No Aplica&quot;</p>
                  <p className="text-sm text-gray-600">
                    Los auditores podrán marcar ítems como no aplicables
                  </p>
                </div>
                <Switch
                  checked={lista.permiteNoAplica}
                  onCheckedChange={(checked) => setLista({ ...lista, permiteNoAplica: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-gray-900 mb-1">Requerir evidencias</p>
                  <p className="text-sm text-gray-600">
                    Obligar a adjuntar evidencias para cada ítem verificado
                  </p>
                </div>
                <Switch
                  checked={lista.requiereEvidencias}
                  onCheckedChange={(checked) => setLista({ ...lista, requiereEvidencias: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-gray-900 mb-1">Generar hallazgos automáticamente</p>
                  <p className="text-sm text-gray-600">
                    Crear hallazgos automáticamente desde ítems marcados como &quot;No Cumple&quot;
                  </p>
                </div>
                <Switch
                  checked={lista.generaHallazgosAutomaticos}
                  onCheckedChange={(checked) => setLista({ ...lista, generaHallazgosAutomaticos: checked })}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">Recomendaciones</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Activa &quot;Permitir No Aplica&quot; para listas con criterios opcionales</li>
                  <li>Requiere evidencias en auditorías de alto riesgo o críticas</li>
                  <li>La generación automática de hallazgos agiliza el proceso de documentación</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modales */}
      <ModalSeccion
        isOpen={isAgregarSeccionOpen}
        onClose={() => {
          setIsAgregarSeccionOpen(false);
          setSeccionEditando(null);
        }}
        onGuardar={handleGuardarSeccion}
        seccionInicial={seccionEditando}
      />

      <ModalItem
        isOpen={isAgregarItemOpen}
        onClose={() => {
          setIsAgregarItemOpen(false);
          setItemEditando(null);
        }}
        onGuardar={handleGuardarItem}
        itemInicial={itemEditando}
      />
    </div>
  );
}

// ==================== MODAL SECCIÓN ====================

interface ModalSeccionProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (seccion: SeccionLista) => void;
  seccionInicial: SeccionLista | null;
}

function ModalSeccion({ isOpen, onClose, onGuardar, seccionInicial }: ModalSeccionProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  React.useEffect(() => {
    if (seccionInicial) {
      setNombre(seccionInicial.nombre);
      setDescripcion(seccionInicial.descripcion);
    } else {
      setNombre('');
      setDescripcion('');
    }
  }, [seccionInicial, isOpen]);

  const handleGuardar = () => {
    if (!nombre.trim()) {
      toast.error('El nombre de la sección es requerido');
      return;
    }

    const seccion: SeccionLista = {
      id: seccionInicial?.id || '',
      orden: seccionInicial?.orden || 0,
      nombre,
      descripcion,
      items: seccionInicial?.items || []
    };

    onGuardar(seccion);
    setNombre('');
    setDescripcion('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {seccionInicial ? 'Editar Sección' : 'Nueva Sección'}
          </DialogTitle>
          <DialogDescription>
            Las secciones agrupan ítems de verificación relacionados
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Nombre de la sección *</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Documentación Precontractual"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe qué se verifica en esta sección"
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleGuardar} className="bg-[#003DA5] hover:bg-[#002873]">
            {seccionInicial ? 'Actualizar' : 'Agregar'} Sección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== MODAL ÍTEM ====================

interface ModalItemProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (item: ItemVerificacion) => void;
  itemInicial: ItemVerificacion | null;
}

function ModalItem({ isOpen, onClose, onGuardar, itemInicial }: ModalItemProps) {
  const [criterio, setCriterio] = useState('');
  const [normativa, setNormativa] = useState('');
  const [esCritico, setEsCritico] = useState(false);

  React.useEffect(() => {
    if (itemInicial) {
      setCriterio(itemInicial.criterio);
      setNormativa(itemInicial.normativaReferencia);
      setEsCritico(itemInicial.esCritico);
    } else {
      setCriterio('');
      setNormativa('');
      setEsCritico(false);
    }
  }, [itemInicial, isOpen]);

  const handleGuardar = () => {
    if (!criterio.trim()) {
      toast.error('El criterio de verificación es requerido');
      return;
    }

    const item: ItemVerificacion = {
      id: itemInicial?.id || '',
      numero: itemInicial?.numero || '',
      criterio,
      normativaReferencia: normativa,
      esCritico
    };

    onGuardar(item);
    setCriterio('');
    setNormativa('');
    setEsCritico(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {itemInicial ? 'Editar Ítem' : 'Nuevo Ítem de Verificación'}
          </DialogTitle>
          <DialogDescription>
            Define el criterio a verificar durante la auditoría
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Criterio de verificación (Pregunta) *</Label>
            <Textarea
              value={criterio}
              onChange={(e) => setCriterio(e.target.value)}
              placeholder="Ej: ¿El expediente contiene estudios previos debidamente justificados?"
              className="mt-1"
              rows={3}
            />
            <p className="text-xs text-gray-600 mt-1">
              Formula como pregunta cerrada que pueda responderse con Sí/No
            </p>
          </div>
          <div>
            <Label>Normativa de referencia</Label>
            <Input
              value={normativa}
              onChange={(e) => setNormativa(e.target.value)}
              placeholder="Ej: Artículo 2.2.1.1.2.1.1 Decreto 1082/2015"
              className="mt-1"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-gray-900 mb-1">Marcar como ítem crítico</p>
              <p className="text-sm text-gray-600">
                Los ítems críticos son de verificación obligatoria
              </p>
            </div>
            <Switch
              checked={esCritico}
              onCheckedChange={setEsCritico}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleGuardar} className="bg-[#003DA5] hover:bg-[#002873]">
            {itemInicial ? 'Actualizar' : 'Agregar'} Ítem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== VISTA PREVIA ====================

interface VistaPreviaProps {
  lista: ListaChequeo;
  onVolver: () => void;
  categorias: Array<{ value: string; label: string; icon: any }>;
}

function VistaPrevia({ lista, onVolver, categorias }: VistaPreviaProps) {
  const categoria = categorias.find(c => c.value === lista.categoria);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-gray-900">Vista Previa</h2>
        <Button variant="outline" onClick={onVolver} className="gap-2">
          <X className="w-4 h-4" />
          Cerrar Vista Previa
        </Button>
      </div>

      <Card className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary">{lista.codigo || 'LC-PREVIEW'}</Badge>
            <Badge className="bg-blue-600 text-white">v{lista.version}</Badge>
            {categoria && (
              <Badge variant="outline">{categoria.label}</Badge>
            )}
          </div>
          <h1 className="text-2xl text-gray-900 mb-2">{lista.nombre}</h1>
          <p className="text-gray-600">{lista.descripcion}</p>
        </div>

        <Separator className="my-6" />

        {/* Información */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-gray-600">Proceso</p>
            <p className="text-gray-900">{lista.proceso}</p>
          </div>
          {lista.subproceso && (
            <div>
              <p className="text-gray-600">Subproceso</p>
              <p className="text-gray-900">{lista.subproceso}</p>
            </div>
          )}
          <div>
            <p className="text-gray-600">Normativa Aplicable</p>
            <p className="text-gray-900">{lista.normativaAplicable}</p>
          </div>
          <div>
            <p className="text-gray-600">Objetivo</p>
            <p className="text-gray-900">{lista.objetivo}</p>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Secciones */}
        <div>
          <h3 className="text-gray-900 mb-4">Secciones e Ítems de Verificación</h3>
          {lista.secciones.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No hay secciones definidas</p>
          ) : (
            <div className="space-y-6">
              {lista.secciones.map(seccion => (
                <div key={seccion.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Sección {seccion.orden}</Badge>
                    <h4 className="text-gray-900">{seccion.nombre}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{seccion.descripcion}</p>
                  
                  {seccion.items.length === 0 ? (
                    <p className="text-sm text-gray-600 italic">No hay ítems en esta sección</p>
                  ) : (
                    <div className="space-y-3">
                      {seccion.items.map(item => (
                        <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{item.numero}</Badge>
                            {item.esCritico && (
                              <Badge className="bg-red-100 text-red-800 border-0 text-xs">Crítico</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 mb-1">{item.criterio}</p>
                          {item.normativaReferencia && (
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Normativa:</span> {item.normativaReferencia}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Configuración */}
        <div>
          <h3 className="text-gray-900 mb-4">Configuración</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              {lista.permiteNoAplica ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-gray-700">Permite No Aplica</span>
            </div>
            <div className="flex items-center gap-2">
              {lista.requiereEvidencias ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-gray-700">Requiere Evidencias</span>
            </div>
            <div className="flex items-center gap-2">
              {lista.generaHallazgosAutomaticos ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-gray-700">Hallazgos Automáticos</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
