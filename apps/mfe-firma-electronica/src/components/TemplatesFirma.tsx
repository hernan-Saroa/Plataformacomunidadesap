/**
 * TemplatesFirma - Gestión de Templates de Firma Guardados
 * Permite guardar múltiples firmas y usarlas con un click
 */

import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Input } from '@esap-mfe/shared-ui/input';
import {
  X, Save, Trash2, Edit2, Star, PenTool, Plus, Check
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface Template {
  id: string;
  nombre: string;
  imagenData: string;
  fechaCreacion: string;
  favorito: boolean;
}

interface TemplatesFirmaProps {
  isOpen: boolean;
  onClose: () => void;
  onSeleccionarTemplate: (imagenData: string) => void;
}

export function TemplatesFirma({ isOpen, onClose, onSeleccionarTemplate }: TemplatesFirmaProps) {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: '1',
      nombre: 'Firma Oficial',
      imagenData: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0yMCA0MEw2MCAyMEw5MCA2MEwxNDAgMzBMMTgwIDUwIiBzdHJva2U9IiMwMDNEQTUiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+',
      fechaCreacion: '15/12/2024',
      favorito: true
    }
  ]);
  
  const [modoCrear, setModoCrear] = useState(false);
  const [nombreNuevaFirma, setNombreNuevaFirma] = useState('');
  const [firmaVacia, setFirmaVacia] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [templateEditando, setTemplateEditando] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (modoCrear && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#003DA5';
      }
    }
  }, [modoCrear]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setFirmaVacia(false);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const limpiarCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaVacia(true);
    toast.info('🗑️ Canvas limpiado', { duration: 1500 });
  };

  const guardarTemplate = () => {
    if (!nombreNuevaFirma.trim()) {
      toast.error('⚠️ Nombre requerido', {
        description: 'Debes ingresar un nombre para la firma'
      });
      return;
    }

    if (firmaVacia) {
      toast.error('⚠️ Firma vacía', {
        description: 'Debes dibujar una firma antes de guardar'
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const imagenData = canvas.toDataURL('image/png');
    
    const nuevoTemplate: Template = {
      id: Date.now().toString(),
      nombre: nombreNuevaFirma,
      imagenData,
      fechaCreacion: new Date().toLocaleDateString('es-CO'),
      favorito: false
    };

    setTemplates([...templates, nuevoTemplate]);
    setModoCrear(false);
    setNombreNuevaFirma('');
    setFirmaVacia(true);

    toast.success('✅ Firma guardada', {
      description: `"${nombreNuevaFirma}" se guardó exitosamente`,
      duration: 3000
    });
  };

  const eliminarTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast.success('🗑️ Firma eliminada', { duration: 2000 });
  };

  const toggleFavorito = (id: string) => {
    setTemplates(templates.map(t => 
      t.id === id ? { ...t, favorito: !t.favorito } : t
    ));
  };

  const usarTemplate = (imagenData: string) => {
    onSeleccionarTemplate(imagenData);
    toast.success('✅ Firma aplicada', {
      description: 'La firma se ha cargado en el documento',
      duration: 2000
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Mis Firmas Guardadas</h2>
              <p className="text-sm text-indigo-100">Gestiona tus templates de firma digital</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!modoCrear && (
              <Button
                onClick={() => setModoCrear(true)}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white font-medium"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Nueva Firma
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {modoCrear ? (
            // Modo Crear Nueva Firma
            <div className="max-w-3xl mx-auto">
              <Card className="p-6 border-2 border-indigo-200 bg-indigo-50 mb-4">
                <h3 className="font-bold text-lg text-gray-900 mb-3">
                  ✍️ Crear Nueva Firma
                </h3>
                <Input
                  placeholder="Ej: Firma Oficial, Firma Rápida, Firma Formal..."
                  value={nombreNuevaFirma}
                  onChange={(e) => setNombreNuevaFirma(e.target.value)}
                  className="mb-4"
                />
                <p className="text-sm text-gray-600 mb-4">
                  Dibuja tu firma en el área gris. Esta firma quedará guardada para uso futuro.
                </p>
              </Card>

              <Card className="border-2 border-gray-300 p-6">
                <canvas
                  ref={canvasRef}
                  width={700}
                  height={250}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 cursor-crosshair touch-none"
                  style={{ touchAction: 'none' }}
                />
                
                <div className="flex justify-between items-center mt-4">
                  <Button
                    onClick={limpiarCanvas}
                    variant="outline"
                    size="sm"
                    disabled={firmaVacia}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Limpiar
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setModoCrear(false);
                        setNombreNuevaFirma('');
                        setFirmaVacia(true);
                      }}
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={guardarTemplate}
                      className="font-medium"
                      style={{ background: '#003DA5', color: '#FFFFFF' }}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Firma
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            // Galería de Firmas
            <div>
              {templates.length === 0 ? (
                <Card className="p-16 text-center border-2 border-dashed border-gray-200">
                  <div className="max-w-md mx-auto">
                    <div className="p-4 rounded-full bg-gray-100 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <PenTool className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                      No hay firmas guardadas
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Crea tu primera firma digital para usarla en múltiples documentos
                    </p>
                    <Button
                      onClick={() => setModoCrear(true)}
                      style={{ background: '#003DA5', color: '#FFFFFF' }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Primera Firma
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className={`border-2 hover:shadow-lg transition-all ${
                        template.favorito ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900">{template.nombre}</h3>
                              {template.favorito && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600">
                              Creada: {template.fechaCreacion}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleFavorito(template.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                template.favorito ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Preview de la Firma */}
                        <div className="mb-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200 flex items-center justify-center min-h-[120px]">
                          <img
                            src={template.imagenData}
                            alt={template.nombre}
                            className="max-w-full max-h-[100px]"
                          />
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => usarTemplate(template.imagenData)}
                            className="flex-1 font-medium"
                            style={{ background: '#003DA5', color: '#FFFFFF' }}
                          >
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            Usar Firma
                          </Button>
                          <Button
                            onClick={() => eliminarTemplate(template.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!modoCrear && templates.length > 0 && (
          <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {templates.length} firma{templates.length > 1 ? 's' : ''} guardada{templates.length > 1 ? 's' : ''}
            </p>
            <Button onClick={onClose} variant="outline">
              Cerrar
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
