/**
 * ModalCompartir - Modal para compartir expedientes
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Header azul corporativo con gradiente
 * ✅ Diseño limpio tipo SAP Fiori
 */

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { 
  Share, X, Copy, Mail, Link2, Download,
  CheckCircle, ExternalLink, QrCode, Users
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import type { ExpedienteJudicial } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';

interface ModalCompartirProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

export function ModalCompartir({ isOpen, onClose, expediente }: ModalCompartirProps) {
  const [emailDestino, setEmailDestino] = useState('');
  const [copiando, setCopiando] = useState(false);

  // Generar URL del expediente
  const expedienteUrl = `${window.location.origin}/gestion-legal/defensa-judicial?expediente=${encodeURIComponent(expediente.id)}`;
  
  // URL corta simulada
  const urlCorta = `esap.gov.co/exp/${expediente.id.split('/')[0]}`;

  const handleCopiarEnlace = async () => {
    setCopiando(true);
    try {
      await navigator.clipboard.writeText(expedienteUrl);
      toast.success('✅ Enlace copiado al portapapeles', {
        description: 'El enlace está listo para compartir',
        duration: 3000
      });
    } catch (error) {
      toast.info('📋 Enlace del expediente', {
        description: expedienteUrl,
        duration: 6000
      });
    }
    setTimeout(() => setCopiando(false), 1000);
  };

  const handleCopiarUrlCorta = async () => {
    try {
      await navigator.clipboard.writeText(`https://${urlCorta}`);
      toast.success('✅ URL corta copiada', {
        description: 'Enlace corto copiado al portapapeles',
        duration: 3000
      });
    } catch (error) {
      toast.info('📋 URL corta', {
        description: `https://${urlCorta}`,
        duration: 6000
      });
    }
  };

  const handleCompartirPorEmail = () => {
    if (!emailDestino.trim()) {
      toast.error('⚠️ Ingresa un email', {
        description: 'Debes especificar el email del destinatario'
      });
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailDestino)) {
      toast.error('⚠️ Email inválido', {
        description: 'Verifica que el email esté correctamente escrito'
      });
      return;
    }

    // Simular envío de email
    toast.loading('📧 Enviando email...', { id: 'email-envio', duration: 1500 });
    
    setTimeout(() => {
      toast.success('✅ Email enviado exitosamente', {
        id: 'email-envio',
        description: `Expediente compartido con ${emailDestino}`,
        duration: 4000
      });

      console.log('📧 EMAIL COMPARTIR EXPEDIENTE:', {
        destinatario: emailDestino,
        expediente: expediente.id,
        url: expedienteUrl,
        fecha: new Date().toISOString()
      });

      setEmailDestino('');
    }, 1500);
  };

  const handleDescargarQR = () => {
    toast.success('📱 Generando código QR', {
      description: 'El código QR se descargará automáticamente',
      duration: 3000
    });

    // Simular generación de QR
    setTimeout(() => {
      toast.info('✅ Código QR generado', {
        description: `QR_Expediente_${expediente.id.replace(/\//g, '_')}.png`,
        duration: 3000
      });
    }, 1000);
  };

  const handleAbrirEnNuevaPestana = () => {
    window.open(expedienteUrl, '_blank', 'noopener,noreferrer');
    toast.success('🪟 Expediente abierto', {
      description: 'Se abrió el expediente en una nueva pestaña',
      duration: 2000
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">
          Compartir Expediente - {expediente.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Compartir expediente {expediente.id}
        </DialogDescription>

        {/* ==================== HEADER LIMPIO Y USABLE ==================== */}
        <ModalHeaderClean
          titulo="Compartir Expediente"
          subtitulo={`${expediente.id} - ${expediente.demandante}`}
          icono={Share}
          colorIcono="blue"
          badgePrincipal={expediente.etapa}
          onClose={onClose}
        />

        {/* ==================== CONTENIDO ==================== */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Enlace directo */}
          <Card className="p-4 border-2 border-blue-200 bg-blue-50">
            <Label className="text-sm font-bold mb-3 block flex items-center gap-2" style={{ color: '#2962FF' }}>
              <Link2 className="w-4 h-4" />
              Enlace directo al expediente
            </Label>
            <div className="flex items-center gap-2 mb-3">
              <Input
                value={expedienteUrl}
                readOnly
                className="font-mono text-xs bg-white font-semibold"
              />
              <Button
                size="sm"
                onClick={handleCopiarEnlace}
                disabled={copiando}
                className="font-bold text-white"
                style={{ background: '#2962FF' }}
              >
                {copiando ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs" style={{ color: '#1E54E8' }}>
              Copia este enlace para compartir el expediente con personas autorizadas
            </p>
          </Card>

          {/* URL corta */}
          <Card className="p-4 border-2 border-gray-200">
            <Label className="text-sm font-bold text-gray-900 mb-3 block flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Enlace corto
            </Label>
            <div className="flex items-center gap-2 mb-3">
              <Input
                value={`https://${urlCorta}`}
                readOnly
                className="font-mono text-sm bg-gray-50 font-bold"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopiarUrlCorta}
                className="font-bold"
                style={{ borderColor: '#2962FF', color: '#2962FF' }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-600">
              URL corta más fácil de compartir y recordar
            </p>
          </Card>

          {/* Compartir por email */}
          <Card className="p-4 border-2 border-green-200 bg-green-50">
            <Label className="text-sm font-bold text-green-900 mb-3 block flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Compartir por correo electrónico
            </Label>
            <div className="flex items-center gap-2 mb-3">
              <Input
                type="email"
                value={emailDestino}
                onChange={(e) => setEmailDestino(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="bg-white font-semibold"
              />
              <Button
                size="sm"
                onClick={handleCompartirPorEmail}
                className="font-bold text-white"
                style={{ background: '#4CAF50' }}
              >
                <Mail className="w-4 h-4 mr-1" />
                Enviar
              </Button>
            </div>
            <p className="text-xs text-green-800">
              Se enviará un correo con el enlace y resumen del expediente
            </p>
          </Card>

          {/* Opciones adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col items-start font-bold"
              onClick={handleDescargarQR}
              style={{ borderColor: '#2962FF' }}
            >
              <div className="flex items-center gap-2 mb-1" style={{ color: '#2962FF' }}>
                <QrCode className="w-5 h-5" />
                <span className="font-black">Código QR</span>
              </div>
              <span className="text-xs font-semibold text-gray-600">
                Generar código QR para compartir
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex-col items-start font-bold"
              onClick={handleAbrirEnNuevaPestana}
              style={{ borderColor: '#2962FF' }}
            >
              <div className="flex items-center gap-2 mb-1" style={{ color: '#2962FF' }}>
                <ExternalLink className="w-5 h-5" />
                <span className="font-black">Nueva pestaña</span>
              </div>
              <span className="text-xs font-semibold text-gray-600">
                Abrir expediente en nueva pestaña
              </span>
            </Button>
          </div>

          {/* Información de seguridad */}
          <Card className="p-3 bg-amber-50 border-amber-300">
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900 mb-1">
                  🔒 Compartir de forma segura
                </p>
                <p className="text-xs text-amber-800">
                  Solo comparte este expediente con personas autorizadas. El acceso requiere autenticación 
                  y permisos en el sistema SIGL ESAP.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ==================== FOOTER STICKY CON BOTONES ==================== */}
        <div 
          className="flex-shrink-0 bg-white border-t-2 px-6 py-4"
          style={{ 
            borderTopColor: '#2962FF',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="flex items-center justify-end">
            <Button variant="outline" onClick={onClose} className="font-bold">
              <X className="w-4 h-4 mr-1.5" />
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}