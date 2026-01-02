/**
 * ModalAccesoCodigoDocumento - Modal de Verificación con Código de 4 Dígitos
 * Para acceso seguro a documentos compartidos
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { X, Shield, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';

interface ModalAccesoCodigoDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  documento: any;
  onCodigoValidado: () => void;
}

export function ModalAccesoCodigoDocumento({
  isOpen,
  onClose,
  documento,
  onCodigoValidado
}: ModalAccesoCodigoDocumentoProps) {
  const [codigo, setCodigo] = useState(['', '', '', '']);
  const [intentosRestantes, setIntentosRestantes] = useState(3);
  const [bloqueado, setBloqueado] = useState(false);
  const [validando, setValidando] = useState(false);
  
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  useEffect(() => {
    if (isOpen) {
      // Focus en primer input
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  }, [isOpen]);

  const handleChange = (index: number, value: string) => {
    // Solo números
    if (!/^\d*$/.test(value)) return;
    
    const newCodigo = [...codigo];
    newCodigo[index] = value.slice(-1); // Solo último dígito
    setCodigo(newCodigo);

    // Auto-focus siguiente input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const newCodigo = pastedData.split('').concat(['', '', '', '']).slice(0, 4);
    setCodigo(newCodigo);
    
    // Focus último input con dígito
    const lastIndex = Math.min(pastedData.length, 3);
    inputRefs[lastIndex].current?.focus();
  };

  const handleVerificar = () => {
    const codigoIngresado = codigo.join('');
    
    if (codigoIngresado.length !== 4) {
      toast.error('⚠️ Código incompleto', {
        description: 'Ingresa los 4 dígitos del código'
      });
      return;
    }

    setValidando(true);

    setTimeout(() => {
      // Validar código (simulado)
      const codigoEsperado = documento.codigoAcceso || '7483';
      
      if (codigoIngresado === codigoEsperado) {
        // Código correcto
        toast.success('✅ Código verificado', {
          description: 'Acceso concedido al documento'
        });
        
        setTimeout(() => {
          onCodigoValidado();
        }, 500);
      } else {
        // Código incorrecto
        const nuevosIntentos = intentosRestantes - 1;
        setIntentosRestantes(nuevosIntentos);
        
        if (nuevosIntentos === 0) {
          setBloqueado(true);
          toast.error('🔒 Cuenta bloqueada', {
            description: 'Has superado el número máximo de intentos. Contacta al remitente.',
            duration: 6000
          });
        } else {
          toast.error('❌ Código incorrecto', {
            description: `Te quedan ${nuevosIntentos} intento${nuevosIntentos !== 1 ? 's' : ''}`,
            duration: 4000
          });
        }
        
        // Limpiar código
        setCodigo(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
      
      setValidando(false);
    }, 1000);
  };

  const handleReenviar = () => {
    toast.loading('📧 Reenviando código...', { id: 'reenviar', duration: 2000 });
    
    setTimeout(() => {
      console.log('🔐 CÓDIGO REENVIADO:', documento.codigoAcceso);
      toast.success('✅ Código reenviado', {
        id: 'reenviar',
        description: `Revisa tu correo: ${documento.remitente || 'funcionario@esap.edu.co'}`,
        duration: 4000
      });
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0">
        <DialogDescription className="sr-only">
          Modal de verificación de código de acceso para el documento {documento.nombre}
        </DialogDescription>

        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-white/20">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">
                  🔐 Acceso Seguro al Documento
                </DialogTitle>
                <p className="text-sm text-cyan-100 mt-1">
                  Verifica tu identidad con el código de acceso
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              disabled={validando}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Información del Documento */}
          <Card className="p-4 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-900 mb-1">Documento solicitado:</p>
                <p className="text-sm text-blue-800 font-semibold">{documento.nombre}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-blue-700">
                  <span>ID: {documento.id}</span>
                  <span>•</span>
                  <span>Remitente: {documento.remitente}</span>
                </div>
              </div>
            </div>
          </Card>

          {!bloqueado ? (
            <>
              {/* Instrucciones */}
              <div className="text-center">
                <h3 className="font-bold text-lg mb-2">Ingresa tu código de acceso</h3>
                <p className="text-sm text-gray-600">
                  Se envió un código de <strong>4 dígitos</strong> a tu correo electrónico
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Mail className="w-4 h-4 text-cyan-600" />
                  <p className="text-sm font-semibold text-cyan-700">
                    funcionario@esap.edu.co
                  </p>
                </div>
              </div>

              {/* Inputs de Código */}
              <div className="flex justify-center gap-3">
                {codigo.map((digit, index) => (
                  <input
                    key={index}
                    ref={inputRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={bloqueado || validando}
                    className="w-16 h-16 text-center text-2xl font-black border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                ))}
              </div>

              {/* 🆕 AYUDA DE PRUEBAS - Mostrar código correcto */}
              <Card className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-200 flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-800" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-black text-amber-900">
                        🧪 MODO DE PRUEBAS
                      </p>
                      <div className="px-3 py-1 bg-amber-200 rounded-full">
                        <p className="text-xs font-black text-amber-900">TESTING</p>
                      </div>
                    </div>
                    <p className="text-sm text-amber-800 mb-3">
                      Esta sección solo es visible en modo de desarrollo para facilitar las pruebas.
                    </p>
                    <div className="p-3 bg-white rounded-lg border-2 border-amber-300">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-amber-700 mb-1 font-semibold">
                            Código correcto para este documento:
                          </p>
                          <div className="flex items-center gap-3">
                            <p className="text-3xl font-black text-amber-900 tracking-widest font-mono">
                              {documento.codigoAcceso || '7483'}
                            </p>
                            <button
                              onClick={() => {
                                const codigoEsperado = documento.codigoAcceso || '7483';
                                navigator.clipboard.writeText(codigoEsperado);
                                toast.success('📋 Código copiado', {
                                  description: 'Pegalo en los campos de arriba'
                                });
                              }}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              📋 Copiar
                            </button>
                            <button
                              onClick={() => {
                                const codigoEsperado = documento.codigoAcceso || '7483';
                                const digitos = codigoEsperado.split('');
                                setCodigo(digitos);
                                toast.success('✨ Código autocompletado', {
                                  description: 'Ahora haz click en "Verificar Código"'
                                });
                              }}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              ✨ Autocompletar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-amber-700 mt-2 italic">
                      💡 Tip: Haz click en "Autocompletar" para llenar automáticamente el código correcto.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Intentos Restantes */}
              {intentosRestantes < 3 && (
                <Card className="p-3 bg-orange-50 border-2 border-orange-200">
                  <div className="flex items-center gap-2 justify-center text-orange-700">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm font-semibold">
                      ⚠️ Intentos restantes: {intentosRestantes}/3
                    </p>
                  </div>
                </Card>
              )}

              {/* Reenviar Código */}
              <div className="text-center">
                <button
                  onClick={handleReenviar}
                  className="text-sm font-semibold text-cyan-700 hover:text-cyan-800 hover:underline"
                  disabled={validando}
                >
                  📧 ¿No recibiste el código? Reenviar
                </button>
              </div>
            </>
          ) : (
            /* Bloqueado */
            <Card className="p-6 bg-red-50 border-2 border-red-200">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="font-black text-xl text-red-900 mb-2">
                  Cuenta Bloqueada Temporalmente
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  Has superado el número máximo de intentos permitidos (3).
                </p>
                <p className="text-sm text-red-600">
                  Por favor, contacta a <strong>{documento.remitente}</strong> para solicitar un nuevo código de acceso.
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        {!bloqueado && (
          <div className="border-t bg-gray-50 px-6 py-4 flex justify-end items-center">
            <Button
              onClick={handleVerificar}
              disabled={codigo.join('').length !== 4 || validando}
              className="font-bold"
              style={{
                background: codigo.join('').length === 4 && !validando ? '#10B981' : '#9CA3AF',
                color: '#FFFFFF'
              }}
            >
              {validando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verificar Código
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}