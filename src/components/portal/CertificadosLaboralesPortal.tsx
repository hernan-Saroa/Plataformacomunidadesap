import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { FileText, Sparkles, Download, Eye, Calendar, DollarSign, CheckCircle, Loader2, ArrowLeft, User, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { toast } from 'sonner@2.0.3';
import { Badge } from '../ui/badge';

interface CertificadoLaboralPortalProps {
  onBack: () => void;
  userEmail: string;
  userName: string;
}

interface Certificado {
  id: string;
  numero_radicado: string;
  tipo_certificado: string;
  fecha_solicitud: string;
  incluye_salario: boolean;
  estado: 'FIRMADO' | 'GENERANDO';
  destinatario?: string;
}

// Mock data: certificados del usuario autenticado
const CERTIFICADOS_MOCK: Certificado[] = [
  {
    id: '1',
    numero_radicado: '045-2025-TH',
    tipo_certificado: 'Certificado Laboral Estándar',
    fecha_solicitud: '2025-11-15',
    incluye_salario: true,
    estado: 'FIRMADO',
  },
  {
    id: '2',
    numero_radicado: '123-2025-TH',
    tipo_certificado: 'Certificado para Trámites Bancarios',
    fecha_solicitud: '2025-11-20',
    incluye_salario: true,
    estado: 'GENERANDO',
  },
];

export function CertificadosLaboralesPortal({ onBack, userEmail, userName }: CertificadoLaboralPortalProps) {
  const [certificados, setCertificados] = useState<Certificado[]>(CERTIFICADOS_MOCK);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // Estado del formulario
  const [tipoCertificado, setTipoCertificado] = useState('');
  const [incluyeSalario, setIncluyeSalario] = useState('con-salario');
  const [destinatario, setDestinatario] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [generando, setGenerando] = useState(false);

  // Calcular estadísticas
  const totalSolicitados = certificados.length;
  const listos = certificados.filter(c => c.estado === 'FIRMADO').length;
  const enProceso = certificados.filter(c => c.estado === 'GENERANDO').length;

  const handleSolicitarNuevo = () => {
    setMostrarFormulario(true);
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setTipoCertificado('');
    setIncluyeSalario('con-salario');
    setDestinatario('');
    setObservaciones('');
  };

  const handleGenerarCertificado = async () => {
    if (!tipoCertificado) {
      toast.error('Por favor selecciona el tipo de certificado');
      return;
    }

    setGenerando(true);

    // Simular generación
    await new Promise(resolve => setTimeout(resolve, 2000));

    const nuevoCertificado: Certificado = {
      id: `cert-${Date.now()}`,
      numero_radicado: `${String(totalSolicitados + 1).padStart(3, '0')}-2025-TH`,
      tipo_certificado: tipoCertificado,
      fecha_solicitud: new Date().toISOString().split('T')[0],
      incluye_salario: incluyeSalario === 'con-salario',
      estado: 'GENERANDO',
      destinatario: destinatario || undefined,
    };

    setCertificados([nuevoCertificado, ...certificados]);
    setGenerando(false);
    setMostrarFormulario(false);
    
    toast.success('¡Certificado solicitado exitosamente!', {
      description: 'Tu certificado estará listo en menos de 5 minutos'
    });

    // Simular que después de 3 segundos pasa a FIRMADO
    setTimeout(() => {
      setCertificados(prev => 
        prev.map(cert => 
          cert.id === nuevoCertificado.id 
            ? { ...cert, estado: 'FIRMADO' }
            : cert
        )
      );
      toast.success('¡Certificado firmado y listo!', {
        description: `Certificado ${nuevoCertificado.numero_radicado} disponible para descargar`
      });
    }, 3000);

    // Limpiar formulario
    handleCancelar();
  };

  const handleVerDetalle = (cert: Certificado) => {
    toast.info('Abriendo vista previa del certificado...');
  };

  const handleDescargar = (cert: Certificado) => {
    if (cert.estado === 'GENERANDO') {
      toast.warning('El certificado aún se está generando', {
        description: 'Por favor espera unos momentos'
      });
      return;
    }
    toast.success(`Descargando certificado ${cert.numero_radicado}...`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-20">
      {/* Botón Volver */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mb-6">
        <motion.button
          onClick={onBack}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02, x: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-700 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Volver al Inicio</span>
        </motion.button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {!mostrarFormulario ? (
            <motion.div
              key="lista"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-[320px_1fr] gap-6"
            >
              {/* Sidebar Izquierdo */}
              <div className="space-y-4">
                {/* Card: Certificados Automáticos */}
                <Card className="bg-gradient-to-br from-[#003DA5] to-[#1e5da8] text-white border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-1">Certificados Automáticos</h3>
                      </div>
                    </div>
                    <p className="text-sm text-blue-100 leading-relaxed">
                      Tu certificado estará listo en menos de 5 minutos. Lo recibirás firmado digitalmente y podrás descargarlo inmediatamente.
                    </p>
                  </CardContent>
                </Card>

                {/* Botón: Solicitar Nuevo Certificado */}
                <Button
                  onClick={handleSolicitarNuevo}
                  className="w-full h-14 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] hover:from-[#002d7a] hover:to-[#164a8f] text-white font-bold shadow-lg"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Solicitar Nuevo Certificado
                </Button>

                {/* Card: Estadísticas */}
                <Card className="border-2 border-gray-200 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Estadísticas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total solicitados</span>
                      <span className="font-bold text-gray-900 text-lg">{totalSolicitados}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Listos</span>
                      <span className="font-bold text-green-600 text-lg">{listos}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">En proceso</span>
                      <span className="font-bold text-amber-600 text-lg">{enProceso}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Área Principal: Mis Certificados */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Mis Certificados</h2>

                <div className="space-y-4">
                  {certificados.map((cert, index) => (
                    <motion.div
                      key={cert.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border-2 border-gray-200 hover:border-[#003DA5] transition-all hover:shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            {/* Información del certificado */}
                            <div className="flex-1 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-[#003DA5] text-lg">
                                  {cert.numero_radicado}
                                </span>
                                {cert.estado === 'FIRMADO' ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-300">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Firmado
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Generando
                                  </Badge>
                                )}
                              </div>

                              <div className="text-gray-900 font-medium">
                                {cert.tipo_certificado}
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{new Date(cert.fecha_solicitud).toLocaleDateString('es-CO', { 
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}</span>
                                </div>
                                {cert.incluye_salario && (
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4" />
                                    <span>Con salario</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex gap-2 lg:flex-col lg:items-end">
                              <Button
                                onClick={() => handleVerDetalle(cert)}
                                variant="outline"
                                size="sm"
                                className="flex-1 lg:flex-none border-2"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver Detalle
                              </Button>
                              <Button
                                onClick={() => handleDescargar(cert)}
                                size="sm"
                                disabled={cert.estado === 'GENERANDO'}
                                className="flex-1 lg:flex-none bg-gradient-to-r from-[#003DA5] to-[#1e5da8] hover:from-[#002d7a] hover:to-[#164a8f] disabled:opacity-50"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Descargar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}

                  {certificados.length === 0 && (
                    <Card className="border-2 border-dashed border-gray-300">
                      <CardContent className="p-12 text-center">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="font-bold text-gray-900 mb-2">No tienes certificados</h3>
                        <p className="text-gray-600 mb-6">
                          Solicita tu primer certificado laboral y lo tendrás listo en minutos
                        </p>
                        <Button
                          onClick={handleSolicitarNuevo}
                          className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] hover:from-[#002d7a] hover:to-[#164a8f]"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Solicitar Certificado
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            /* Formulario de Solicitud */
            <motion.div
              key="formulario"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto"
            >
              <Card className="border-2 border-gray-200 shadow-xl">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#003DA5] to-[#1e5da8] rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    Solicitar Nuevo Certificado Laboral
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {/* Información del Solicitante */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="w-5 h-5 text-[#003DA5]" />
                      Información del Solicitante
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Nombre:</span>
                        <p className="font-semibold text-gray-900">{userName}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Correo:</span>
                        <p className="font-semibold text-gray-900">{userEmail}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tipo de Certificado */}
                  <div>
                    <Label htmlFor="tipo-certificado" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Tipo de Certificado *
                    </Label>
                    <Select value={tipoCertificado} onValueChange={setTipoCertificado}>
                      <SelectTrigger className="h-12 border-2">
                        <SelectValue placeholder="Selecciona el tipo de certificado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Certificado Laboral Estándar">Certificado Laboral Estándar</SelectItem>
                        <SelectItem value="Certificado para Trámites Bancarios">Certificado para Trámites Bancarios</SelectItem>
                        <SelectItem value="Certificado para Visa">Certificado para Visa</SelectItem>
                        <SelectItem value="Certificado de Ingresos">Certificado de Ingresos</SelectItem>
                        <SelectItem value="Certificado de Tiempo de Servicio">Certificado de Tiempo de Servicio</SelectItem>
                        <SelectItem value="Certificado para Subsidio">Certificado para Subsidio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Incluir Salario */}
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                      ¿Incluir información salarial? *
                    </Label>
                    <RadioGroup value={incluyeSalario} onValueChange={setIncluyeSalario}>
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="con-salario" id="con-salario" />
                        <Label htmlFor="con-salario" className="cursor-pointer">
                          Sí, con salario
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sin-salario" id="sin-salario" />
                        <Label htmlFor="sin-salario" className="cursor-pointer">
                          No, sin salario
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Destinatario (Opcional) */}
                  <div>
                    <Label htmlFor="destinatario" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Destinatario (Opcional)
                    </Label>
                    <Input
                      id="destinatario"
                      type="text"
                      placeholder="Ej: Banco de Bogotá, Embajada de España, etc."
                      value={destinatario}
                      onChange={(e) => setDestinatario(e.target.value)}
                      className="h-12 border-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Si el certificado es para una entidad específica, indícala aquí
                    </p>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <Label htmlFor="observaciones" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Observaciones Adicionales (Opcional)
                    </Label>
                    <Textarea
                      id="observaciones"
                      placeholder="Ingresa cualquier información adicional relevante..."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      className="min-h-24 border-2"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {observaciones.length}/500 caracteres
                    </p>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleCancelar}
                      variant="outline"
                      className="flex-1 h-12 border-2"
                      disabled={generando}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleGenerarCertificado}
                      className="flex-1 h-12 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] hover:from-[#002d7a] hover:to-[#164a8f] font-bold"
                      disabled={generando}
                    >
                      {generando ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generar Certificado
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
