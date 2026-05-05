/**
 * MODAL: COMPARTIR EXPEDIENTE ELECTRÓNICO - RESPONSIVE WORLD-CLASS
 * Permite compartir expediente mediante:
 * - Link directo (con/sin clave)
 * - Código QR
 * - Envío por correo electrónico
 * Diseño corporativo ESAP con gradientes azules
 * ADAPTABLE: Mobile, Tablet y Desktop
 */

import { useState } from 'react';
import { 
  X, 
  Link2, 
  QrCode, 
  Mail, 
  Copy, 
  Check, 
  Lock, 
  Unlock,
  Eye,
  EyeOff,
  Share2,
  Download,
  Send,
  Shield,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '../../ui/button';
import { toast } from 'sonner';
import { ResponsiveModalWrapper } from './ResponsiveModalWrapper';
import { ResponsiveFormGrid, FormFieldGroup, FormActions } from './ResponsiveFormGrid';
import { useResponsive } from './hooks/useResponsive';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

interface ModalCompartirExpedienteProps {
  expediente: {
    id: string;
    radicado: string;
    nombreDisciplinado: string;
    estado: string;
  };
  onClose: () => void;
}

export function ModalCompartirExpediente({ expediente, onClose }: ModalCompartirExpedienteProps) {
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<'link' | 'qr' | 'email'>('link');
  const [requiereClave, setRequiereClave] = useState(false);
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [emailDestino, setEmailDestino] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tiempoExpiracion, setTiempoExpiracion] = useState<'24h' | '7d' | '30d' | 'never'>('7d');
  const [enviando, setEnviando] = useState(false);
  const [generandoEnlace, setGenerandoEnlace] = useState(false);
  const [enlaceGenerado, setEnlaceGenerado] = useState<{
    url: string;
    token: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Convertir tiempo de expiración a horas
  const tiempoExpiracionHoras = () => {
    switch (tiempoExpiracion) {
      case '24h': return 24;
      case '7d': return 24 * 7;
      case '30d': return 24 * 30;
      case 'never': return null;
      default: return 24 * 7;
    }
  };

  // Generar enlace con el backend
  const generarEnlace = async () => {
    setGenerandoEnlace(true);
    try {
      const tipoCompartido = metodoSeleccionado === 'link' ? 'LINK' : metodoSeleccionado === 'qr' ? 'QR' : 'EMAIL';
      
      const result = await disciplinaryService.crearEnlaceCompartido(expediente.id, {
        tipoCompartido,
        requiereClave,
        clave: requiereClave ? clave : undefined,
        tiempoExpiracionHoras: tiempoExpiracionHoras() || undefined,
        emailDestinatario: metodoSeleccionado === 'email' ? emailDestino : undefined,
        mensajeAdicional: metodoSeleccionado === 'email' ? mensaje : undefined,
        esPublico: true
      });

      setEnlaceGenerado({
        url: result.url,
        token: result.token
      });

      // Si es QR, generar la imagen del código QR
      if (metodoSeleccionado === 'qr') {
        generarQR(result.url);
      }

      toast.success('Enlace generado correctamente');
    } catch (error: any) {
      console.error('[DEBUG] Error al generar enlace:', error);
      
      // Manejo específico de errores de autenticación
      if (error.status === 401) {
        toast.error('Sesión expirada', {
          description: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente para continuar.',
          duration: 5000
        });
        // No redirigir automáticamente para no perder los datos del formulario
      } else if (error.status === 403) {
        toast.error('Acceso denegado', {
          description: 'No tienes permisos para generar enlaces de este expediente.'
        });
      } else if (error.status === 404) {
        toast.error('Expediente no encontrado', {
          description: 'El expediente seleccionado no existe o ha sido eliminado.'
        });
      } else {
        toast.error('Error al generar enlace', {
          description: error.message || 'No se pudo crear el enlace de compartido'
        });
      }
    } finally {
      setGenerandoEnlace(false);
    }
  };

  // Generar código QR usando una librería de terceros
  const generarQR = async (url: string) => {
    try {
      // Usar una API pública para generar el QR o una librería
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
      setQrDataUrl(qrApiUrl);
    } catch (error) {
      console.error('Error al generar QR:', error);
    }
  };

  // Descargar código QR
  const descargarQR = async () => {
    if (!qrDataUrl) return;
    
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_${expediente.radicado}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('QR descargado correctamente');
    } catch (error) {
      console.error('Error al descargar QR:', error);
      toast.error('Error al descargar QR');
    }
  };

  // Copiar link al portapapeles
  const copiarLink = async () => {
    if (!enlaceGenerado) return;
    
    try {
      // Intentar usar la API del portapapeles
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(enlaceGenerado.url);
        setLinkCopiado(true);
        toast.success('Link copiado', {
          description: 'El enlace ha sido copiado al portapapeles'
        });
        setTimeout(() => setLinkCopiado(false), 2000);
      } else {
        // Fallback para navegadores que no soportan la API o en contextos no seguros
        // Crear un textarea temporal para copiar
        const textArea = document.createElement('textarea');
        textArea.value = enlaceGenerado.url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setLinkCopiado(true);
          toast.success('Link copiado', {
            description: 'El enlace ha sido copiado al portapapeles'
          });
          setTimeout(() => setLinkCopiado(false), 2000);
        } catch (err) {
          console.error('Fallback copy failed:', err);
          toast.error('Error al copiar', {
            description: 'No se pudo copiar el enlace. Por favor, copie manualmente.'
          });
        }
        
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Error al copiar link:', error);
      toast.error('Error al copiar', {
        description: 'No se pudo copiar el enlace'
      });
    }
  };

  // Generar clave aleatoria
  const generarClaveAleatoria = () => {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let claveGenerada = '';
    for (let i = 0; i < 8; i++) {
      claveGenerada += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    setClave(claveGenerada);
    toast.success('Clave generada', {
      description: 'Clave de seguridad creada automáticamente'
    });
  };

  // Enviar por correo
  const enviarPorCorreo = async () => {
    if (!emailDestino) {
      toast.error('Email requerido', {
        description: 'Por favor ingrese un correo electrónico válido'
      });
      return;
    }

    setEnviando(true);
    
    try {
      // El correo se envía al crear el enlace
      if (!enlaceGenerado) {
        await generarEnlace();
      }
      
      toast.success('Expediente compartido', {
        description: `Enviado exitosamente a ${emailDestino}`
      });
      onClose();
    } catch (error: any) {
      toast.error('Error al enviar', {
        description: error.message || 'No se pudo enviar el correo'
      });
    } finally {
      setEnviando(false);
    }
  };

  // Manejar el clic en el botón principal según el método
  const handleAccionPrincipal = () => {
    if (metodoSeleccionado === 'email') {
      enviarPorCorreo();
    } else if (!enlaceGenerado) {
      generarEnlace();
    } else if (metodoSeleccionado === 'link') {
      copiarLink();
    } else {
      descargarQR();
    }
  };

  // Configuración de los métodos de compartir
  const metodos = [
    {
      id: 'link' as const,
      nombre: 'Link Directo',
      descripcion: 'Comparte un enlace para acceder al expediente',
      icon: Link2,
      color: '#2962FF',
      bgColor: '#EEF2FF'
    },
    {
      id: 'qr' as const,
      nombre: 'Código QR',
      descripcion: 'Genera un código QR para acceso rápido',
      icon: QrCode,
      color: '#8B5CF6',
      bgColor: '#F3E8FF'
    },
    {
      id: 'email' as const,
      nombre: 'Correo Electrónico',
      descripcion: 'Envía el expediente por email',
      icon: Mail,
      color: '#10B981',
      bgColor: '#D1FAE5'
    }
  ];

  return (
    <ResponsiveModalWrapper
      isOpen={true}
      onClose={onClose}
      title="Compartir Expediente"
      subtitle={`${expediente.radicado} • ${expediente.nombreDisciplinado}`}
      maxWidth="3xl"
      showBackButton={true}
    >
      {/* Content */}
      <div className="space-y-6 bg-white">
        {/* Selección de método */}
        <div>
          <h3 className={`font-bold text-gray-900 mb-3 flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
            <Share2 className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-blue-600`} />
            Método de Compartir
          </h3>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {metodos.map((metodo) => {
              const Icon = metodo.icon;
              const isSelected = metodoSeleccionado === metodo.id;
              return (
                <button
                  key={metodo.id}
                  onClick={() => {
                    setMetodoSeleccionado(metodo.id);
                    setEnlaceGenerado(null);
                    setQrDataUrl(null);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected 
                      ? 'border-blue-600 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ 
                    backgroundColor: isSelected ? metodo.bgColor : 'white'
                  }}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: isSelected ? metodo.color : '#F3F4F6',
                        color: isSelected ? 'white' : metodo.color
                      }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{metodo.nombre}</p>
                      <p className="text-xs text-gray-600 mt-1">{metodo.descripcion}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Configuración de seguridad */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">
                Configuración de Seguridad
              </h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={requiereClave}
                  onChange={(e) => setRequiereClave(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {requiereClave ? <Lock className="w-4 h-4 inline" /> : <Unlock className="w-4 h-4 inline" />}
                {' '}Proteger con clave
              </span>
            </label>
          </div>

          {requiereClave && (
            <div className="space-y-3 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    <strong>Protección adicional:</strong> El destinatario necesitará esta clave para acceder al expediente.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={mostrarClave ? 'text' : 'password'}
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    placeholder="Ingrese una clave de acceso"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarClave(!mostrarClave)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    {mostrarClave ? 
                      <EyeOff className="w-4 h-4 text-gray-500" /> : 
                      <Eye className="w-4 h-4 text-gray-500" />
                    }
                  </button>
                </div>
                <Button
                  onClick={generarClaveAleatoria}
                  variant="outline"
                  size="sm"
                  className="border-blue-600 text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                >
                  Generar
                </Button>
              </div>

              {clave && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-800">
                    ✓ Clave configurada: <span className="font-mono font-bold">{clave}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tiempo de expiración */}
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Tiempo de Expiración
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: '24h', label: '24 horas' },
                { value: '7d', label: '7 días' },
                { value: '30d', label: '30 días' },
                { value: 'never', label: 'Sin expiración' }
              ].map((opcion) => (
                <button
                  key={opcion.value}
                  onClick={() => setTiempoExpiracion(opcion.value as any)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    tiempoExpiracion === opcion.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-600'
                  }`}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contenido específico por método */}
        {metodoSeleccionado === 'link' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              Link de Acceso Directo
            </h3>
            
            {enlaceGenerado ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={enlaceGenerado.url}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono text-gray-700"
                  />
                  <Button
                    onClick={copiarLink}
                    variant="outline"
                    className={
                      linkCopiado 
                        ? 'border-green-600 text-green-700 bg-green-50' 
                        : 'border-blue-600 text-blue-700 hover:bg-blue-50'
                    }
                  >
                    {linkCopiado ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Instrucciones:</strong> Comparte este enlace con las personas autorizadas. 
                    {requiereClave && ' Deberán ingresar la clave para acceder al contenido.'}
                    {tiempoExpiracion !== 'never' && ` El enlace expirará en ${tiempoExpiracion === '24h' ? '24 horas' : tiempoExpiracion === '7d' ? '7 días' : '30 días'}.`}
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-sm text-yellow-800">
                  Haz clic en "Generar Link" para crear el enlace de acceso
                </p>
              </div>
            )}
          </div>
        )}

        {metodoSeleccionado === 'qr' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-purple-600" />
              Código QR de Acceso
            </h3>

            {qrDataUrl ? (
              <div className="flex flex-col items-center justify-center bg-white border-2 border-purple-200 rounded-lg p-6">
                <img 
                  src={qrDataUrl} 
                  alt="Código QR" 
                  className="w-48 h-48 mb-4"
                />
                <p className="text-sm text-gray-600 text-center mb-4">
                  Escanea este código para acceder al expediente
                </p>
                <Button
                  onClick={descargarQR}
                  variant="outline"
                  className="border-purple-600 text-purple-700 hover:bg-purple-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar QR
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
                <QrCode className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-sm text-gray-500 text-center mb-4">
                  Genera el enlace para ver el código QR
                </p>
              </div>
            )}

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs text-purple-800">
                <strong>Uso del código QR:</strong> Cualquier persona con un lector QR puede escanear este código para acceder al expediente.
                {requiereClave && ' Se solicitará la clave de acceso después de escanear.'}
              </p>
            </div>
          </div>
        )}

        {metodoSeleccionado === 'email' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-green-600" />
              Enviar por Correo Electrónico
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo del Destinatario *
              </label>
              <input
                type="email"
                value={emailDestino}
                onChange={(e) => setEmailDestino(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensaje Adicional (Opcional)
              </label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={4}
                placeholder="Incluye un mensaje personalizado para el destinatario..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{mensaje.length} caracteres</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-800">
                <strong>Vista previa del email:</strong> Se enviará un correo con el link de acceso al expediente {expediente.radicado}.
                {requiereClave && ' La clave de acceso se incluirá en el email.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer con botones */}
      <div className={`flex-shrink-0 flex ${isMobile ? 'flex-col gap-2' : 'flex-row justify-between items-center'} px-6 py-4 border-t border-gray-200 bg-gray-50`}>
        <Button
          onClick={onClose}
          variant="outline"
          className={isMobile ? 'w-full' : ''}
        >
          Cancelar
        </Button>

        <Button
          onClick={handleAccionPrincipal}
          disabled={generandoEnlace || enviando || (metodoSeleccionado === 'email' && !emailDestino) || (requiereClave && !clave)}
          style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)', color: '#FFFFFF' }}
          className={isMobile ? 'w-full' : ''}
        >
          {generandoEnlace || enviando ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {enviando ? 'Enviando...' : 'Generando...'}
            </>
          ) : metodoSeleccionado === 'link' ? (
            enlaceGenerado ? (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                Generar Link
              </>
            )
          ) : metodoSeleccionado === 'qr' ? (
            enlaceGenerado ? (
              <>
                <Download className="w-4 h-4 mr-2" />
                Descargar QR
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-2" />
                Generar QR
              </>
            )
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar Email
            </>
          )}
        </Button>
      </div>
    </ResponsiveModalWrapper>
  );
}
