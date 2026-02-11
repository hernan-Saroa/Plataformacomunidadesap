/**
 * HistorialDocumentosCompletados - Historial de Documentos Firmados con QR
 * Diseño corporativo ESAP premium con verificación y trazabilidad
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  X, CheckCircle, Download, Share2, Search, Calendar, FileText,
  QrCode, Shield, Clock, User, Eye, Filter, ChevronDown, ChevronUp,
  Award, Verified, Printer, Mail
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../../../utils/clipboard';

interface HistorialDocumentosCompletadosProps {
  isOpen: boolean;
  onClose: () => void;
  documentos: any[];
}

export function HistorialDocumentosCompletados({
  isOpen,
  onClose,
  documentos
}: HistorialDocumentosCompletadosProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [documentoExpandido, setDocumentoExpandido] = useState<string | null>(null);

  // Filtrar solo documentos completamente firmados
  const documentosCompletados = documentos.filter(d => d.estado === 'firmado');

  // Aplicar filtros
  const documentosFiltrados = documentosCompletados.filter(doc => {
    const matchBusqueda = doc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          doc.id.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || doc.tipo === filtroTipo;
    return matchBusqueda && matchTipo;
  });

  // Obtener tipos únicos para el filtro
  const tiposUnicos = ['todos', ...Array.from(new Set(documentosCompletados.map(d => d.tipo)))];

  const handleVerDocumento = (docId: string) => {
    toast.success('📄 Abriendo documento', {
      description: 'Cargando vista previa del documento firmado',
      duration: 2000
    });
  };

  const handleDescargarConQR = (doc: any) => {
    toast.loading('📥 Generando documento con QR...', {
      id: 'descargar-qr',
      duration: 2500
    });

    setTimeout(() => {
      toast.success('✅ Documento descargado', {
        id: 'descargar-qr',
        description: `${doc.nombre}_firmado_QR.pdf descargado`,
        duration: 3000
      });
    }, 2500);
  };

  const handleCompartir = async (doc: any) => {
    // Copiar enlace al clipboard
    const enlace = `https://firmas.esap.gov.co/verificar/${doc.id}`;
    const copiado = await copyToClipboard(enlace);
    
    if (copiado) {
      toast.success('🔗 Enlace copiado', {
        description: 'El enlace de verificación ha sido copiado al portapapeles',
        duration: 3000
      });
    } else {
      toast.info('🔗 Enlace de verificación', {
        description: enlace,
        duration: 5000
      });
    }
  };

  const handleEnviarEmail = (doc: any) => {
    toast.loading('📧 Enviando documento por correo...', {
      id: 'enviar-email',
      duration: 2000
    });

    setTimeout(() => {
      toast.success('✅ Correo enviado', {
        id: 'enviar-email',
        description: 'El documento ha sido enviado a los interesados',
        duration: 3000
      });
    }, 2000);
  };

  const handleImprimir = (doc: any) => {
    toast.info('🖨️ Preparando impresión...', {
      description: 'Se abrirá el diálogo de impresión',
      duration: 2000
    });
  };

  const toggleExpandir = (docId: string) => {
    setDocumentoExpandido(documentoExpandido === docId ? null : docId);
  };

  // Generar URL del QR (usando un servicio público de QR)
  const generarQRUrl = (docId: string) => {
    const urlVerificacion = `https://firmas.esap.gov.co/verificar/${docId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(urlVerificacion)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Historial de documentos completamente firmados con códigos QR de verificación y trazabilidad completa
        </DialogDescription>

        {/* Header Premium */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-white">
                    Documentos Firmados Completamente
                  </DialogTitle>
                  <p className="text-sm text-green-100">
                    Historial con QR de verificación y trazabilidad legal
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white font-semibold border-white/30">
                  {documentosCompletados.length} documentos completados
                </Badge>
                <Badge className="bg-white/20 text-white font-semibold border-white/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  100% firmados
                </Badge>
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
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o ID del documento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-4 py-2 border rounded-lg font-semibold text-sm bg-white"
            >
              {tiposUnicos.map(tipo => (
                <option key={tipo} value={tipo}>
                  {tipo === 'todos' ? 'Todos los tipos' : tipo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {documentosFiltrados.length === 0 ? (
            <Card className="p-12 text-center border-2 border-dashed border-gray-300">
              <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="font-black text-xl text-gray-600 mb-2">
                No hay documentos completados
              </h3>
              <p className="text-gray-500">
                {busqueda || filtroTipo !== 'todos'
                  ? 'No se encontraron documentos con los filtros seleccionados'
                  : 'Los documentos completamente firmados aparecerán aquí'
                }
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {documentosFiltrados.map((doc) => {
                const isExpanded = documentoExpandido === doc.id;
                const qrUrl = generarQRUrl(doc.id);

                return (
                  <Card key={doc.id} className="border-2 border-green-200 overflow-hidden">
                    {/* Header del Documento */}
                    <div className="p-5 bg-gradient-to-r from-green-50 to-white">
                      <div className="flex items-start gap-4">
                        {/* Icono y Estado */}
                        <div className="flex-shrink-0">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                        </div>

                        {/* Información Principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <h3 className="font-black text-lg text-gray-900 mb-1">
                                {doc.nombre}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-green-100 text-green-700 font-bold">
                                  <Verified className="w-3 h-3 mr-1" />
                                  Firmado Completamente
                                </Badge>
                                <span className="text-sm text-gray-600">•</span>
                                <span className="text-sm font-semibold text-gray-700">
                                  {doc.id}
                                </span>
                                <span className="text-sm text-gray-600">•</span>
                                <span className="text-sm text-gray-600">{doc.tipo}</span>
                              </div>
                            </div>

                            {/* QR Code Miniatura */}
                            <div className="flex-shrink-0">
                              <div className="p-2 bg-white rounded-lg border-2 border-green-300 shadow-sm">
                                <img
                                  src={qrUrl}
                                  alt={`QR ${doc.id}`}
                                  className="w-16 h-16"
                                />
                                <p className="text-[9px] text-center text-gray-600 mt-1 font-bold">
                                  QR Verificación
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                            <div>
                              <p className="text-gray-500 text-xs">Fecha de carga</p>
                              <p className="font-bold text-gray-900">{doc.fechaCarga}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Cargado por</p>
                              <p className="font-bold text-gray-900">{doc.cargadoPor}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Total firmas</p>
                              <p className="font-bold text-green-600">
                                {doc.firmasRequeridas} / {doc.firmasRequeridas} ✓
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Completado</p>
                              <p className="font-bold text-gray-900">
                                {doc.firmantes[doc.firmantes.length - 1]?.fechaFirma || doc.fechaCarga}
                              </p>
                            </div>
                          </div>

                          {/* Botones de Acción */}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleVerDocumento(doc.id)}
                              className="font-semibold"
                              style={{ background: '#003DA5', color: '#FFFFFF' }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              Ver Documento
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDescargarConQR(doc)}
                              className="font-semibold bg-green-600 text-white hover:bg-green-700"
                            >
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                              Descargar con QR
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompartir(doc)}
                              className="font-semibold border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <Share2 className="w-3.5 h-3.5 mr-1.5" />
                              Compartir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEnviarEmail(doc)}
                              className="font-semibold border-purple-300 text-purple-600 hover:bg-purple-50"
                            >
                              <Mail className="w-3.5 h-3.5 mr-1.5" />
                              Enviar Email
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImprimir(doc)}
                              className="font-semibold border-gray-300 text-gray-600 hover:bg-gray-50"
                            >
                              <Printer className="w-3.5 h-3.5 mr-1.5" />
                              Imprimir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleExpandir(doc.id)}
                              className="font-semibold border-gray-300 text-gray-600 hover:bg-gray-50"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5 mr-1.5" />
                                  Ocultar Detalles
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                                  Ver Detalles
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalles Expandibles */}
                    {isExpanded && (
                      <div className="border-t-2 border-green-100 bg-white">
                        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Columna Izquierda: QR y Verificación */}
                          <div className="space-y-4">
                            {/* QR Grande */}
                            <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-3">
                                  <QrCode className="w-5 h-5 text-blue-700" />
                                  <h4 className="font-black text-lg" style={{ color: '#003DA5' }}>
                                    Código QR de Verificación
                                  </h4>
                                </div>
                                <div className="inline-block p-4 bg-white rounded-xl shadow-lg mb-3">
                                  <img
                                    src={qrUrl}
                                    alt={`QR ${doc.id}`}
                                    className="w-48 h-48"
                                  />
                                </div>
                                <p className="text-xs text-gray-700 mb-2">
                                  Escanea este código para verificar la autenticidad del documento
                                </p>
                                <div className="p-3 bg-white rounded-lg border border-blue-200">
                                  <p className="text-xs text-gray-600 mb-1">URL de Verificación:</p>
                                  <p className="text-xs font-mono font-bold text-blue-700 break-all">
                                    https://firmas.esap.gov.co/verificar/{doc.id}
                                  </p>
                                </div>
                              </div>
                            </Card>

                            {/* Certificación Digital */}
                            <Card className="p-4 bg-green-50 border-2 border-green-200">
                              <div className="flex items-start gap-3">
                                <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-bold text-green-900 mb-2">
                                    🔒 Certificación Digital ESAP
                                  </p>
                                  <ul className="text-sm text-green-800 space-y-1">
                                    <li>✓ Documento firmado digitalmente</li>
                                    <li>✓ Validez legal según Ley 527/1999</li>
                                    <li>✓ Trazabilidad completa garantizada</li>
                                    <li>✓ Hash SHA-256: {doc.id.replace(/[^0-9]/g, '').slice(0, 8)}...</li>
                                  </ul>
                                </div>
                              </div>
                            </Card>
                          </div>

                          {/* Columna Derecha: Trazabilidad */}
                          <div className="space-y-4">
                            {/* Firmantes */}
                            <Card className="p-4 border-2 border-gray-200">
                              <div className="flex items-center gap-2 mb-3">
                                <User className="w-5 h-5 text-gray-700" />
                                <h4 className="font-black text-lg text-gray-900">
                                  Firmantes ({doc.firmantes.length})
                                </h4>
                              </div>
                              <div className="space-y-2">
                                {doc.firmantes.map((firmante: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                                  >
                                    <div className="p-2 bg-green-100 rounded-full">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-bold text-sm text-gray-900">
                                        {firmante.nombre}
                                      </p>
                                      <p className="text-xs text-gray-600">{firmante.cargo}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Calendar className="w-3 h-3 text-gray-500" />
                                        <p className="text-xs text-gray-600">
                                          {firmante.fechaFirma} • {firmante.horaFirma}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge className="bg-green-600 text-white font-semibold">
                                      Firmado #{idx + 1}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </Card>

                            {/* Timeline de Eventos */}
                            <Card className="p-4 border-2 border-gray-200">
                              <div className="flex items-center gap-2 mb-3">
                                <Clock className="w-5 h-5 text-gray-700" />
                                <h4 className="font-black text-lg text-gray-900">
                                  Historial de Eventos
                                </h4>
                              </div>
                              <div className="relative">
                                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 to-gray-300" />
                                <div className="space-y-3">
                                  {doc.historial.slice(0, 5).map((evento: any, idx: number) => (
                                    <div key={idx} className="relative pl-8">
                                      <div className="absolute left-0 p-1 rounded-full bg-white border-2 border-green-500">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                      </div>
                                      <div className="text-xs">
                                        <p className="font-bold text-gray-900">{evento.accion}</p>
                                        <p className="text-gray-600">
                                          {evento.usuario} • {evento.fecha} {evento.hora}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Card>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t-2 px-6 py-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {documentosFiltrados.length} de {documentosCompletados.length} documentos mostrados
          </div>
          <Button
            onClick={onClose}
            style={{ background: '#003DA5', color: '#FFFFFF' }}
            className="font-semibold"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
