/**
 * ModalCompartirFirma - Modal para Compartir Documentos para Firma
 * Diseño corporativo ESAP premium
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Share2, X, Plus, Trash2, Mail, User, Briefcase, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ModalCompartirFirmaProps {
  isOpen: boolean;
  onClose: () => void;
  documento: any;
  onCompartido: (docId: string, firmantes: any[]) => void;
}

export function ModalCompartirFirma({ isOpen, onClose, documento, onCompartido }: ModalCompartirFirmaProps) {
  const [firmantes, setFirmantes] = useState<Array<{ nombre: string; cargo: string; correo: string }>>([
    { nombre: '', cargo: '', correo: '' }
  ]);
  const [mensaje, setMensaje] = useState('');

  const agregarFirmante = () => {
    setFirmantes([...firmantes, { nombre: '', cargo: '', correo: '' }]);
  };

  const eliminarFirmante = (index: number) => {
    if (firmantes.length > 1) {
      setFirmantes(firmantes.filter((_, i) => i !== index));
    }
  };

  const actualizarFirmante = (index: number, campo: string, valor: string) => {
    const nuevosFirmantes = [...firmantes];
    nuevosFirmantes[index] = { ...nuevosFirmantes[index], [campo]: valor };
    setFirmantes(nuevosFirmantes);
  };

  const validarEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleCompartir = () => {
    // Validaciones
    const firmantesVacios = firmantes.filter(f => !f.nombre || !f.cargo || !f.correo);
    if (firmantesVacios.length > 0) {
      toast.error('⚠️ Campos incompletos', {
        description: 'Todos los firmantes deben tener nombre, cargo y correo completos'
      });
      return;
    }

    const correosInvalidos = firmantes.filter(f => !validarEmail(f.correo));
    if (correosInvalidos.length > 0) {
      toast.error('⚠️ Correos inválidos', {
        description: 'Verifica que todos los correos electrónicos sean válidos'
      });
      return;
    }

    // Generar códigos de 4 dígitos para cada firmante
    const firmantesConCodigo = firmantes.map(f => {
      const codigoAcceso = Math.floor(1000 + Math.random() * 9000).toString(); // 4 dígitos
      return {
        ...f,
        codigoAcceso
      };
    });

    // Simular envío de códigos
    toast.loading('📧 Generando códigos de acceso y enviando invitaciones...', {
      id: 'compartir-documento',
      duration: 3000
    });

    setTimeout(() => {
      // Mostrar códigos generados (en desarrollo)
      console.log('🔐 CÓDIGOS DE ACCESO GENERADOS:');
      firmantesConCodigo.forEach((f, index) => {
        console.log(`${index + 1}. ${f.nombre} (${f.correo}): ${f.codigoAcceso}`);
      });

      const firmantesProcesados = firmantesConCodigo.map(f => ({
        nombre: f.nombre,
        cargo: f.cargo,
        email: f.correo,
        estado: 'pendiente' as const,
        codigoAcceso: f.codigoAcceso
      }));

      onCompartido(documento.id, firmantesProcesados);

      // Toast de éxito detallado
      toast.success('✅ Documento compartido exitosamente', {
        id: 'compartir-documento',
        description: `Se enviaron ${firmantes.length} invitación(es) con código de acceso de 4 dígitos`,
        duration: 5000
      });

      // Mostrar notificación adicional
      setTimeout(() => {
        toast.info('🔐 Códigos de acceso enviados', {
          description: 'Cada firmante recibió un código único de 4 dígitos en su correo',
          duration: 4000
        });
      }, 1000);

      // Limpiar formulario
      setFirmantes([{ nombre: '', cargo: '', correo: '' }]);
      setMensaje('');
      onClose();
    }, 3000);
  };

  const handleCancelar = () => {
    const tieneContenido = firmantes.some(f => f.nombre || f.cargo || f.correo) || mensaje;
    if (tieneContenido) {
      if (confirm('⚠️ ¿Estás seguro de cancelar? Se perderán los datos ingresados.')) {
        setFirmantes([{ nombre: '', cargo: '', correo: '' }]);
        setMensaje('');
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancelar}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Formulario para compartir el documento {documento.nombre} con otros usuarios para firma electrónica
        </DialogDescription>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] text-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-white">
                    Compartir para Firma
                  </DialogTitle>
                  <p className="text-sm text-blue-100">
                    {documento.nombre}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCancelar}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información del Documento */}
          <Card className="p-5 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 mb-2">
                  📄 Documento a Compartir
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700">ID:</span>
                    <span className="ml-2 font-bold text-blue-900">{documento.id}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Tipo:</span>
                    <span className="ml-2 font-bold text-blue-900">{documento.tipo}</span>
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Los firmantes recibirán un correo electrónico con el enlace para firmar el documento
                </p>
              </div>
            </div>
          </Card>

          {/* Lista de Firmantes */}
          <Card className="p-5 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg" style={{ color: '#003DA5' }}>
                Firmantes ({firmantes.length})
              </h3>
              <Button
                size="sm"
                onClick={agregarFirmante}
                style={{ background: '#F57C00', color: '#FFFFFF' }}
                className="font-semibold"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Agregar Firmante
              </Button>
            </div>

            <div className="space-y-4">
              {firmantes.map((firmante, index) => (
                <Card key={index} className="p-4 bg-gray-50 border-2 border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-sm text-gray-700">
                      Firmante #{index + 1}
                    </h4>
                    {firmantes.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => eliminarFirmante(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-auto p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Nombre */}
                    <div>
                      <Label htmlFor={`nombre-${index}`} className="text-xs font-bold mb-1.5 block">
                        Nombre Completo *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id={`nombre-${index}`}
                          value={firmante.nombre}
                          onChange={(e) => actualizarFirmante(index, 'nombre', e.target.value)}
                          placeholder="Ej: Carlos Mendoza"
                          className="pl-10 text-sm"
                        />
                      </div>
                    </div>

                    {/* Cargo */}
                    <div>
                      <Label htmlFor={`cargo-${index}`} className="text-xs font-bold mb-1.5 block">
                        Cargo *
                      </Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id={`cargo-${index}`}
                          value={firmante.cargo}
                          onChange={(e) => actualizarFirmante(index, 'cargo', e.target.value)}
                          placeholder="Ej: Director Jurídico"
                          className="pl-10 text-sm"
                        />
                      </div>
                    </div>

                    {/* Correo */}
                    <div>
                      <Label htmlFor={`correo-${index}`} className="text-xs font-bold mb-1.5 block">
                        Correo Electrónico *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id={`correo-${index}`}
                          type="email"
                          value={firmante.correo}
                          onChange={(e) => actualizarFirmante(index, 'correo', e.target.value)}
                          placeholder="correo@esap.gov.co"
                          className="pl-10 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Mensaje Personalizado (Opcional) */}
          <Card className="p-5 border-2 border-gray-200">
            <h3 className="font-black text-lg mb-4" style={{ color: '#003DA5' }}>
              Mensaje Personalizado <span className="text-sm font-normal text-gray-500">(Opcional)</span>
            </h3>
            <Label htmlFor="mensaje" className="text-sm text-gray-600 mb-2 block">
              Agrega un mensaje que se incluirá en el correo de invitación
            </Label>
            <textarea
              id="mensaje"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Ej: Por favor revisa y firma este documento a la mayor brevedad posible. Cualquier duda, no dudes en contactarme."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <p className="text-xs text-gray-500 mt-1">
              {mensaje.length} / 500 caracteres
            </p>
          </Card>

          {/* Información Importante */}
          <Card className="p-4 bg-orange-50 border-2 border-orange-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-900 mb-1">
                  🔐 Sistema de Seguridad - Código de Acceso
                </p>
                <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                  <li><strong>Código de 4 dígitos:</strong> Cada firmante recibirá un código único de acceso</li>
                  <li><strong>Correo automático:</strong> El código se enviará al correo del Directorio Activo o al ingresado aquí</li>
                  <li><strong>Acceso seguro:</strong> Deberán ingresar el código para visualizar el documento</li>
                  <li><strong>Firma con OTP:</strong> Después de revisar, firmarán con verificación OTP de 6 dígitos</li>
                  <li><strong>Trazabilidad completa:</strong> Todas las acciones quedan registradas con fecha y hora</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Resumen */}
          <Card className="p-5 bg-green-50 border-2 border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-900 mb-2">
                  📊 Resumen de Compartir
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-green-700">Documento:</span>
                    <span className="ml-2 font-bold text-green-900">{documento.nombre}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Firmantes a invitar:</span>
                    <span className="ml-2 font-bold text-green-900">{firmantes.length}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Total de firmas requeridas:</span>
                    <span className="ml-2 font-bold text-green-900">
                      {documento.firmasRequeridas + firmantes.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700">Método de notificación:</span>
                    <span className="ml-2 font-bold text-green-900">Correo electrónico</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer Sticky */}
        <div className="sticky bottom-0 bg-white border-t-2 px-6 py-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            * Campos obligatorios
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelar}
              className="font-semibold"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleCompartir}
              disabled={firmantes.length === 0}
              className="font-bold"
              style={{
                background: firmantes.length > 0 ? '#10B981' : '#9CA3AF',
                color: '#FFFFFF',
                cursor: firmantes.length > 0 ? 'pointer' : 'not-allowed'
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartir Documento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}