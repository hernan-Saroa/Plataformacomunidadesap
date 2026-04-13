/**
 * VisorDocumentoFirma - Visor de Documentos con Firma Electrónica
 * Diseño corporativo ESAP premium con pad de firma integrado
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import {
  X, Download, PenTool, CheckCircle, AlertCircle, FileText,
  Eye, Trash2, RotateCcw, Save
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface VisorDocumentoFirmaProps {
  isOpen: boolean;
  onClose: () => void;
  documento: any;
  onDocumentoFirmado: (docId: string) => void;
}

export function VisorDocumentoFirma({
  isOpen,
  onClose,
  documento,
  onDocumentoFirmado
}: VisorDocumentoFirmaProps) {
  const [modoFirma, setModoFirma] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [firmaVacia, setFirmaVacia] = useState(true);

  useEffect(() => {
    if (modoFirma && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#003DA5';
      }
    }
  }, [modoFirma]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setFirmaVacia(false);
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaVacia(true);
    toast.info('🗑️ Firma limpiada', { duration: 1500 });
  };

  const handleFirmarDocumento = () => {
    if (firmaVacia) {
      toast.error('⚠️ Firma requerida', {
        description: 'Debes dibujar tu firma en el pad de firma'
      });
      return;
    }

    setFirmando(true);
    toast.loading('✍️ Procesando firma electrónica...', {
      id: 'firmar-documento',
      duration: 2500
    });

    setTimeout(() => {
      onDocumentoFirmado(documento.id);

      toast.success('✅ Documento firmado exitosamente', {
        id: 'firmar-documento',
        description: `${documento.nombre} ha sido firmado correctamente`,
        duration: 4000
      });

      setModoFirma(false);
      setFirmando(false);
      onClose();
    }, 2500);
  };

  const handleDescargar = () => {
    toast.loading('📥 Descargando documento...', {
      id: 'descargar-doc',
      duration: 1500
    });

    setTimeout(() => {
      toast.success('✅ Descarga completada', {
        id: 'descargar-doc',
        description: `${documento.nombre}.pdf descargado`,
        duration: 3000
      });
    }, 1500);
  };

  const yaFirmado = documento.firmantes.some((f: any) => f.estado === 'firmado' && f.nombre === 'Usuario Actual');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
        <DialogDescription className="sr-only">
          Visor de documento {documento.nombre} con funcionalidad de firma electrónica
        </DialogDescription>

        {/* Header Premium */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white">
                  {documento.nombre}
                </DialogTitle>
                <p className="text-xs text-blue-100">
                  {documento.id} • {documento.tipo} • {documento.tamaño}
                </p>
              </div>
            </div>

            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Estado y Acciones */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center gap-2">
              <Badge
                className="font-bold"
                style={{
                  background: documento.estado === 'firmado' ? '#10B981' :
                              documento.estado === 'en_proceso' ? '#F59E0B' : '#EF4444',
                  color: '#FFFFFF'
                }}
              >
                {documento.estado === 'firmado' ? 'Firmado Completamente' :
                 documento.estado === 'en_proceso' ? 'En Proceso de Firma' :
                 'Pendiente de Firma'}
              </Badge>
              <span className="text-xs text-blue-100">
                {documento.firmasCompletadas} de {documento.firmasRequeridas} firmas
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDescargar}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white backdrop-blur font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar
              </Button>

              {!yaFirmado && documento.estado !== 'firmado' && !modoFirma && (
                <Button
                  onClick={() => setModoFirma(true)}
                  size="sm"
                  className="font-bold"
                  style={{ background: '#F57C00', color: '#FFFFFF' }}
                >
                  <PenTool className="w-3.5 h-3.5 mr-1.5" />
                  Firmar Documento
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {!modoFirma ? (
            // Vista previa del documento
            <div className="max-w-4xl mx-auto">
              <Card className="p-12 bg-white shadow-2xl border-4 border-gray-200">
                {/* Contenido del documento simulado */}
                <div className="space-y-6">
                  {/* Header del documento */}
                  <div className="text-center border-b-4 border-[#003DA5] pb-6 mb-8">
                    <h1 className="text-2xl font-black text-[#003DA5] mb-2">
                      ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA
                    </h1>
                    <p className="text-sm text-gray-600 mb-1">ESAP - República de Colombia</p>
                    <p className="text-xs text-gray-500">NIT: 899.999.063-7</p>
                  </div>

                  {/* Título del documento */}
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-black text-[#F57C00] mb-2">
                      {documento.nombre.toUpperCase()}
                    </h2>
                    <p className="text-sm text-gray-600">{documento.tipo} • {documento.id}</p>
                  </div>

                  {/* Metadata */}
                  <div className="bg-gray-50 border-l-4 border-[#F57C00] p-4 mb-6">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-bold text-gray-700">Fecha de emisión:</span>
                        <span className="ml-2 text-gray-900">{documento.fechaCarga}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Emitido por:</span>
                        <span className="ml-2 text-gray-900">{documento.cargadoPor}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Tipo:</span>
                        <span className="ml-2 text-gray-900">{documento.tipo}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Estado:</span>
                        <span className="ml-2 text-gray-900">
                          {documento.estado === 'firmado' ? 'Firmado' :
                           documento.estado === 'en_proceso' ? 'En Proceso' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contenido del documento */}
                  <div className="space-y-4 text-sm text-gray-800 leading-relaxed text-justify">
                    <div>
                      <h3 className="font-black text-gray-900 mb-2">CONSIDERANDO:</h3>
                      <p>
                        Que es necesario formalizar mediante el presente documento los términos y condiciones
                        acordados entre las partes para el desarrollo de las actividades establecidas en el
                        marco del presente {documento.tipo.toLowerCase()}.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-black text-gray-900 mb-2">CLÁUSULAS:</h3>
                      <p>
                        <strong>PRIMERA. OBJETO:</strong> El presente documento tiene por objeto establecer
                        los lineamientos, términos y condiciones específicas para la ejecución de las
                        actividades previstas, en concordancia con las disposiciones legales vigentes y
                        las políticas institucionales de ESAP.
                      </p>
                    </div>

                    <div>
                      <p>
                        <strong>SEGUNDA. OBLIGACIONES:</strong> Las partes se comprometen a cumplir con
                        las obligaciones establecidas en el presente documento, respetando los plazos,
                        términos y condiciones acordadas.
                      </p>
                    </div>

                    <div>
                      <p>
                        <strong>TERCERA. VIGENCIA:</strong> El presente documento tendrá vigencia a partir
                        de la fecha de la última firma y mantendrá su validez conforme a los términos
                        establecidos.
                      </p>
                    </div>
                  </div>

                  {/* Sección de Firmas */}
                  <div className="mt-12 pt-8 border-t-2 border-gray-300">
                    <h3 className="font-black text-gray-900 mb-6 text-center">FIRMAS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {documento.firmantes.map((firmante: any, idx: number) => (
                        <div key={idx} className="text-center">
                          {firmante.estado === 'firmado' ? (
                            <div className="mb-4">
                              <div className="h-20 flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg mb-2">
                                <div className="text-center">
                                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-1" />
                                  <p className="text-xs font-bold text-green-700">Firmado Digitalmente</p>
                                  <p className="text-xs text-gray-600">{firmante.fechaFirma} • {firmante.horaFirma}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-20 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg mb-2">
                              <p className="text-xs font-bold text-gray-400">Pendiente de Firma</p>
                            </div>
                          )}
                          <div className="pt-2 border-t-2 border-gray-400">
                            <p className="font-bold text-sm text-gray-900">{firmante.nombre}</p>
                            <p className="text-xs text-gray-600">{firmante.cargo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer del documento */}
                  <div className="mt-12 pt-6 border-t-2 border-gray-300 text-center">
                    <p className="text-xs text-gray-500">
                      Documento generado por el Sistema de Firma Electrónica ESAP
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {documento.id} • {new Date().toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Información de firmantes */}
              <Card className="mt-6 p-5 border-2 border-blue-200 bg-blue-50">
                <h3 className="font-black text-lg mb-4" style={{ color: '#003DA5' }}>
                  Estado de Firmas
                </h3>
                <div className="space-y-2">
                  {documento.firmantes.map((firmante: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-3">
                        {firmante.estado === 'firmado' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        )}
                        <div>
                          <p className="font-bold text-sm">{firmante.nombre}</p>
                          <p className="text-xs text-gray-600">{firmante.cargo}</p>
                        </div>
                      </div>
                      <Badge
                        className="font-semibold"
                        style={{
                          background: firmante.estado === 'firmado' ? '#D1FAE5' : '#FED7AA',
                          color: firmante.estado === 'firmado' ? '#065F46' : '#92400E'
                        }}
                      >
                        {firmante.estado === 'firmado'
                          ? `Firmado ${firmante.fechaFirma}`
                          : 'Pendiente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            // Modo de firma
            <div className="max-w-3xl mx-auto">
              <Card className="p-8 border-4 border-blue-300 bg-white shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <PenTool className="w-8 h-8 text-[#003DA5]" />
                  <div>
                    <h3 className="font-black text-2xl" style={{ color: '#003DA5' }}>
                      Firma Electrónica
                    </h3>
                    <p className="text-sm text-gray-600">
                      Dibuja tu firma en el recuadro de abajo
                    </p>
                  </div>
                </div>

                {/* Pad de Firma */}
                <div className="mb-6">
                  <div className="border-4 border-gray-300 rounded-lg overflow-hidden bg-white">
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={300}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="w-full cursor-crosshair"
                      style={{ touchAction: 'none' }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-gray-500">
                      Haz clic y arrastra para firmar
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={limpiarFirma}
                      className="font-semibold border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Limpiar
                    </Button>
                  </div>
                </div>

                {/* Información del Firmante */}
                <Card className="p-4 bg-blue-50 border-2 border-blue-200 mb-6">
                  <p className="text-sm font-bold text-blue-900 mb-2">
                    📋 Información del Firmante
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Nombre:</span>
                      <span className="ml-2 font-bold text-gray-900">Usuario Actual</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Cargo:</span>
                      <span className="ml-2 font-bold text-gray-900">Cargo actual</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Fecha:</span>
                      <span className="ml-2 font-bold text-gray-900">
                        {new Date().toLocaleDateString('es-CO')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Hora:</span>
                      <span className="ml-2 font-bold text-gray-900">
                        {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Advertencia Legal */}
                <Card className="p-4 bg-orange-50 border-2 border-orange-200 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-orange-900 mb-1">
                        ⚠️ Declaración Legal
                      </p>
                      <p className="text-sm text-orange-800 leading-relaxed">
                        Al firmar este documento, declaro que he leído, entendido y acepto el contenido
                        del mismo. Esta firma electrónica tiene la misma validez legal que una firma
                        manuscrita conforme a la Ley 527 de 1999 y el Decreto 2364 de 2012.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Botones de Acción */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setModoFirma(false)}
                    variant="outline"
                    className="flex-1 font-semibold"
                    disabled={firmando}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleFirmarDocumento}
                    disabled={firmaVacia || firmando}
                    className="flex-1 font-bold"
                    style={{
                      background: !firmaVacia && !firmando ? '#10B981' : '#9CA3AF',
                      color: '#FFFFFF',
                      cursor: !firmaVacia && !firmando ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {firmando ? 'Firmando...' : 'Confirmar Firma'}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
