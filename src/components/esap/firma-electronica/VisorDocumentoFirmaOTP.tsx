/**
 * VisorDocumentoFirmaOTP - Visor World-Class con Firma Digital y OTP
 * Diseño premium con canvas de firma y validación OTP de 6 dígitos
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import {
  X, Download, PenTool, CheckCircle, AlertCircle, FileText,
  Eye, Trash2, RotateCcw, Save, Mail, Shield, Lock, Key
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';

interface VisorDocumentoFirmaOTPProps {
  isOpen: boolean;
  onClose: () => void;
  documento: any;
  onDocumentoFirmado?: (docId: string) => void;
  onFirmaCompletada?: () => void;
  onDevolver?: () => void;
  modoPortalTransaccional?: boolean;
}

export function VisorDocumentoFirmaOTP({
  isOpen,
  onClose,
  documento,
  onDocumentoFirmado,
  onFirmaCompletada,
  onDevolver,
  modoPortalTransaccional = false
}: VisorDocumentoFirmaOTPProps) {
  const [paso, setPaso] = useState<'documento' | 'firma' | 'otp' | 'completado'>('documento');
  const [firmando, setFirmando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [firmaVacia, setFirmaVacia] = useState(true);
  
  // Estados OTP
  const [otpGenerado, setOtpGenerado] = useState('');
  const [otpIngresado, setOtpIngresado] = useState(['', '', '', '', '', '']);
  const [verificandoOTP, setVerificandoOTP] = useState(false);
  const [errorOTP, setErrorOTP] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(300); // 5 minutos
  
  // Refs para inputs OTP
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer para OTP
  useEffect(() => {
    if (paso === 'otp' && tiempoRestante > 0) {
      const interval = setInterval(() => {
        setTiempoRestante(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [paso, tiempoRestante]);

  // Configurar canvas
  useEffect(() => {
    if (paso === 'firma' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#003DA5';
      }
    }
  }, [paso]);

  // Funciones de Canvas
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

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaVacia(true);
    toast.info('🗑️ Firma limpiada', { duration: 1500 });
  };

  // Generar OTP de 6 dígitos
  const generarOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Enviar OTP al correo
  const enviarOTPAlCorreo = () => {
    const otp = generarOTP();
    setOtpGenerado(otp);
    
    // Simulación de envío
    toast.loading('📧 Enviando código de verificación...', {
      id: 'enviar-otp',
      duration: 2000
    });

    setTimeout(() => {
      toast.success('✅ Código enviado', {
        id: 'enviar-otp',
        description: `Se envió un código de 6 dígitos a ${documento.firmantes[0].email}`,
        duration: 4000
      });
      
      // Para desarrollo, mostrar el OTP en consola
      console.log('🔐 OTP Generado:', otp);
      
      // Toast informativo para desarrollo
      toast.info(`🔐 Código OTP: ${otp}`, {
        description: 'Este mensaje es solo para desarrollo',
        duration: 8000
      });
    }, 2000);
  };

  // Manejar firma
  const handleContinuarFirma = () => {
    if (firmaVacia) {
      toast.error('⚠️ Firma requerida', {
        description: 'Debes dibujar tu firma en el pad de firma'
      });
      return;
    }

    setFirmando(true);
    
    // Cambiar a paso OTP y enviar código
    setTimeout(() => {
      setPaso('otp');
      enviarOTPAlCorreo();
      setTiempoRestante(300); // Reset timer
      setFirmando(false);
    }, 1500);
  };

  // Manejar cambio en input OTP
  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Solo números

    const newOTP = [...otpIngresado];
    newOTP[index] = value.slice(-1); // Solo último dígito
    setOtpIngresado(newOTP);
    setErrorOTP(false);

    // Auto-focus al siguiente input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Manejar tecla en input OTP
  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpIngresado[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Pegar código OTP
  const handleOTPPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOTP = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setOtpIngresado(newOTP);
    
    // Focus al último input lleno
    const lastIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[lastIndex]?.focus();
  };

  // Reenviar OTP
  const handleReenviarOTP = () => {
    setOtpIngresado(['', '', '', '', '', '']);
    setErrorOTP(false);
    setTiempoRestante(300);
    enviarOTPAlCorreo();
    otpInputRefs.current[0]?.focus();
  };

  // Verificar OTP
  const handleVerificarOTP = () => {
    const otpCompleto = otpIngresado.join('');
    
    if (otpCompleto.length !== 6) {
      toast.error('⚠️ Código incompleto', {
        description: 'Debes ingresar los 6 dígitos del código'
      });
      return;
    }

    setVerificandoOTP(true);

    setTimeout(() => {
      if (otpCompleto === otpGenerado) {
        // OTP correcto
        toast.success('✅ Código verificado', {
          description: 'Firma digital registrada exitosamente',
          duration: 3000
        });
        
        setPaso('completado');
        
        setTimeout(() => {
          onDocumentoFirmado?.(documento.id);
          handleCerrar();
        }, 2000);
      } else {
        // OTP incorrecto
        setErrorOTP(true);
        setVerificandoOTP(false);
        setOtpIngresado(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        
        toast.error('❌ Código incorrecto', {
          description: 'El código ingresado no es válido. Intenta nuevamente.',
          duration: 4000
        });
      }
    }, 1500);
  };

  // Formatear tiempo restante
  const formatearTiempo = (segundos: number): string => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCerrar = () => {
    setPaso('documento');
    setFirmaVacia(true);
    setOtpIngresado(['', '', '', '', '', '']);
    setErrorOTP(false);
    setTiempoRestante(300);
    onClose();
  };

  const handleDescargar = () => {
    toast.success('📥 Descargando documento...', {
      description: `${documento.nombre}.pdf`,
      duration: 2000
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Visor de documento {documento.nombre} con firma electrónica y verificación OTP
        </DialogDescription>

        {/* Header Limpio - Estilo Portal Transaccional */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {paso === 'documento' && 'Vista del Documento'}
                {paso === 'firma' && 'Firma Digital'}
                {paso === 'otp' && 'Verificación de Seguridad'}
                {paso === 'completado' && 'Firma Completada'}
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                {documento.nombre}
              </p>
            </div>

            <Button
              onClick={handleCerrar}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Steps - Diseño limpio */}
          <div className="mt-4 flex items-center gap-2">
            <div className={`flex-1 h-1 rounded-full transition-all ${ 
              paso === 'documento' || paso === 'firma' || paso === 'otp' || paso === 'completado' 
                ? 'bg-[#1e5da8]' : 'bg-gray-200'
            }`} />
            <div className={`flex-1 h-1 rounded-full transition-all ${ 
              paso === 'firma' || paso === 'otp' || paso === 'completado' 
                ? 'bg-[#F57C00]' : 'bg-gray-200'
            }`} />
            <div className={`flex-1 h-1 rounded-full transition-all ${ 
              paso === 'otp' || paso === 'completado' 
                ? 'bg-[#1e5da8]' : 'bg-gray-200'
            }`} />
            <div className={`flex-1 h-1 rounded-full transition-all ${ 
              paso === 'completado' ? 'bg-green-600' : 'bg-gray-200'
            }`} />
          </div>

          {/* Steps labels */}
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className={paso === 'documento' ? 'text-[#1e5da8] font-semibold' : 'text-gray-500'}>
              1. Revisar
            </span>
            <span className={paso === 'firma' ? 'text-[#F57C00] font-semibold' : 'text-gray-500'}>
              2. Firmar
            </span>
            <span className={paso === 'otp' ? 'text-[#1e5da8] font-semibold' : 'text-gray-500'}>
              3. Verificar
            </span>
            <span className={paso === 'completado' ? 'text-green-600 font-semibold' : 'text-gray-500'}>
              4. Completado
            </span>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* PASO 1: Vista del Documento - COMPLETA Y FUNCIONAL */}
          {paso === 'documento' && (
            <div className="p-6">
              <div className="max-w-5xl mx-auto space-y-4">
                {/* Info del documento */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">ID Documento</p>
                      <p className="font-semibold text-gray-900">{documento.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Tipo</p>
                      <p className="font-semibold text-gray-900">{documento.tipo}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Tamaño</p>
                      <p className="font-semibold text-gray-900">{documento.tamaño}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Fecha</p>
                      <p className="font-semibold text-gray-900">{documento.fechaCarga}</p>
                    </div>
                  </div>
                </div>

                {/* Visor de PDF - Diseño realista */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Toolbar del visor */}
                  <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Vista previa del documento
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleDescargar}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Descargar PDF
                      </Button>
                    </div>
                  </div>

                  {/* Área de contenido del documento */}
                  <div className="p-8 bg-gray-100 min-h-[500px]">
                    <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-12 border border-gray-300">
                      {/* Simulación de contenido de documento */}
                      <div className="space-y-4">
                        <div className="text-center mb-8">
                          <div className="w-16 h-16 bg-[#1e5da8] rounded-full mx-auto mb-4 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {documento.nombre}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Documento ID: {documento.id}
                          </p>
                        </div>

                        <div className="border-t border-b border-gray-200 py-4 my-6">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            <strong className="text-gray-900">Descripción:</strong> Este documento contiene información oficial de la ESAP 
                            que requiere tu revisión y firma digital. Por favor lee cuidadosamente todo el contenido 
                            antes de proceder con la firma electrónica.
                          </p>
                        </div>

                        <div className="space-y-3 text-sm text-gray-700">
                          <p className="leading-relaxed">
                            📄 <strong>Contenido del documento:</strong> Este es un documento oficial que contiene {documento.paginas} página(s) 
                            de información importante que requiere tu atención y firma digital.
                          </p>
                          
                          <div className="bg-blue-50 border-l-4 border-[#1e5da8] p-4 my-4">
                            <p className="text-sm text-blue-900">
                              <strong>ℹ️ Nota:</strong> En un entorno de producción, aquí se mostraría el contenido completo 
                              del documento PDF utilizando una librería como <code className="bg-blue-100 px-2 py-1 rounded">react-pdf</code> o 
                              <code className="bg-blue-100 px-2 py-1 rounded ml-1">pdf.js</code>.
                            </p>
                          </div>

                          <p className="leading-relaxed">
                            El documento ha sido enviado por <strong>{documento.firmantes?.[0]?.nombre || 'Remitente'}</strong> 
                            y requiere tu firma digital para ser procesado.
                          </p>

                          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-600 mb-2 font-semibold">
                              INFORMACIÓN DEL ARCHIVO:
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                              <div>• Formato: PDF</div>
                              <div>• Páginas: {documento.paginas}</div>
                              <div>• Tamaño: {documento.tamaño}</div>
                              <div>• Tipo: {documento.tipo}</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <p className="text-xs text-gray-500 text-center">
                            Este documento es de carácter oficial y confidencial de la ESAP
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instrucciones */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900 mb-1">
                        Revisa el documento completo
                      </p>
                      <p className="text-sm text-blue-700">
                        Por favor lee todo el contenido antes de firmar. Si encuentras algún error o necesitas 
                        aclaraciones, puedes devolver el documento con comentarios al remitente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Firma Digital */}
          {paso === 'firma' && (
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <Card className="border-2 border-orange-200 bg-orange-50 p-6 mb-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Instrucciones de Firma</h4>
                      <p className="text-sm text-gray-700">
                        Dibuja tu firma en el recuadro usando el mouse o tu dedo (en dispositivos táctiles). 
                        Esta firma será vinculada legalmente al documento y verificada con un código de seguridad.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Canvas de Firma */}
                <Card className="border-2 border-gray-300 p-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                      ✍️ Dibuja tu Firma Digital
                    </h3>
                    <p className="text-sm text-gray-600">
                      Firma en el área gris a continuación
                    </p>
                  </div>

                  <div className="mb-4">
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={300}
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
                  </div>

                  <div className="flex justify-between items-center">
                    <Button
                      onClick={limpiarFirma}
                      variant="outline"
                      size="sm"
                      className="font-medium"
                      disabled={firmaVacia}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Limpiar Firma
                    </Button>

                    <div className="text-xs text-gray-500">
                      {firmaVacia ? '⚠️ Firma vacía' : '✓ Firma capturada'}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* PASO 3: Verificación OTP */}
          {paso === 'otp' && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                <Card className="border-2 border-purple-200 bg-purple-50 p-8">
                  <div className="text-center mb-6">
                    <div className="p-4 rounded-full bg-purple-100 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Shield className="w-10 h-10 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-2xl text-gray-900 mb-2">
                      Verificación de Seguridad
                    </h3>
                    <p className="text-gray-700 mb-1">
                      Se ha enviado un código de verificación a:
                    </p>
                    <p className="font-bold text-purple-700 mb-4">
                      📧 {documento.firmantes[0]?.email || 'tu correo electrónico'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Ingresa el código de 6 dígitos para confirmar tu firma digital
                    </p>
                  </div>

                  {/* Inputs OTP */}
                  <div className="mb-6">
                    <div className="flex justify-center gap-2 mb-4" onPaste={handleOTPPaste}>
                      {otpIngresado.map((digit, index) => (
                        <Input
                          key={index}
                          ref={(el) => (otpInputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOTPChange(index, e.target.value)}
                          onKeyDown={(e) => handleOTPKeyDown(index, e)}
                          className={`w-14 h-14 text-center text-2xl font-bold border-2 ${
                            errorOTP 
                              ? 'border-red-500 bg-red-50' 
                              : digit 
                              ? 'border-purple-500 bg-white' 
                              : 'border-gray-300 bg-white'
                          }`}
                          disabled={verificandoOTP}
                        />
                      ))}
                    </div>

                    {errorOTP && (
                      <div className="flex items-center justify-center gap-2 text-red-600 text-sm mb-4">
                        <AlertCircle className="w-4 h-4" />
                        <span>Código incorrecto. Intenta nuevamente.</span>
                      </div>
                    )}

                    {/* Timer */}
                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-600">
                        Tiempo restante: <span className="font-bold text-purple-700">{formatearTiempo(tiempoRestante)}</span>
                      </p>
                    </div>

                    {/* Reenviar código */}
                    <div className="text-center">
                      <button
                        onClick={handleReenviarOTP}
                        className="text-sm text-purple-600 hover:text-purple-700 font-semibold underline"
                        disabled={tiempoRestante > 240} // Solo permitir después de 1 minuto
                      >
                        {tiempoRestante > 240 ? 'Espera para reenviar...' : '📧 Reenviar código'}
                      </button>
                    </div>
                  </div>

                  {/* Info de desarrollo */}
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Key className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-yellow-800">
                        <p className="font-bold mb-1">💡 Modo Desarrollo:</p>
                        <p>El código OTP se muestra en la consola del navegador y en una notificación temporal.</p>
                        <p className="mt-1">En producción, el código solo se enviará por correo electrónico.</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* PASO 4: Completado */}
          {paso === 'completado' && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                <Card className="border-2 border-green-200 bg-green-50 p-12">
                  <div className="text-center">
                    <div className="p-4 rounded-full bg-green-100 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <CheckCircle className="w-14 h-14 text-green-600" />
                    </div>
                    <h3 className="font-bold text-3xl text-gray-900 mb-3">
                      ¡Firma Registrada Exitosamente!
                    </h3>
                    <p className="text-lg text-gray-700 mb-6">
                      Tu firma digital ha sido validada y registrada en el documento
                    </p>
                    
                    <div className="bg-white rounded-lg border-2 border-green-200 p-6 mb-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Documento</p>
                          <p className="font-bold text-gray-900">{documento.id}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Fecha y Hora</p>
                          <p className="font-bold text-gray-900">
                            {new Date().toLocaleDateString('es-CO')} {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-600 mb-1">Firmante Verificado</p>
                          <p className="font-bold text-gray-900">{documento.firmantes[0]?.nombre || 'Usuario'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span>Firma validada con certificación digital ESAP</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="border-t bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {paso === 'documento' && 'Revisa el documento antes de firmar'}
              {paso === 'firma' && 'Dibuja tu firma para continuar'}
              {paso === 'otp' && 'Verifica tu identidad con el código OTP'}
              {paso === 'completado' && 'Proceso completado exitosamente'}
            </div>

            <div className="flex gap-2">
              {paso === 'documento' && (
                <>
                  {modoPortalTransaccional && onDevolver && (
                    <Button
                      onClick={() => {
                        handleCerrar();
                        onDevolver();
                      }}
                      variant="outline"
                      className="font-medium border-2 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Devolver con Comentarios
                    </Button>
                  )}
                  <Button
                    onClick={() => setPaso('firma')}
                    className="font-medium"
                    style={{ background: '#F57C00', color: '#FFFFFF' }}
                  >
                    <PenTool className="w-4 h-4 mr-2" />
                    Continuar a Firma
                  </Button>
                </>
              )}

              {paso === 'firma' && (
                <>
                  <Button
                    onClick={() => setPaso('documento')}
                    variant="outline"
                    className="font-medium"
                  >
                    Volver
                  </Button>
                  <Button
                    onClick={handleContinuarFirma}
                    className="font-medium"
                    disabled={firmaVacia || firmando}
                    style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                  >
                    {firmando ? (
                      <>Procesando...</>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Continuar a Verificación
                      </>
                    )}
                  </Button>
                </>
              )}

              {paso === 'otp' && (
                <>
                  <Button
                    onClick={() => {
                      setPaso('firma');
                      setOtpIngresado(['', '', '', '', '', '']);
                      setErrorOTP(false);
                    }}
                    variant="outline"
                    className="font-medium"
                    disabled={verificandoOTP}
                  >
                    Volver
                  </Button>
                  <Button
                    onClick={handleVerificarOTP}
                    className="font-medium"
                    disabled={verificandoOTP || otpIngresado.join('').length !== 6}
                    style={{ background: '#10B981', color: '#FFFFFF' }}
                  >
                    {verificandoOTP ? (
                      <>Verificando...</>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verificar y Firmar
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}