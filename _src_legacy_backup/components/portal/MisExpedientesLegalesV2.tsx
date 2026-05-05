/**
 * ════════════════════════════════════════════════════════════════════════════
 * MIS EXPEDIENTES LEGALES V2.0 - ENTERPRISE LEVEL
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Vista profesional para gestión de expedientes disciplinarios y legales
 * Alineado con diseño Microsoft Dynamics del Portal V5.0
 * 
 * FEATURES:
 * ✓ Header profesional con alertas contextuales
 * ✓ Tabs para organizar expedientes por estado
 * ✓ Cards de expediente con información completa
 * ✓ Timeline de actuaciones
 * ✓ Upload de descargos inline
 * ✓ Información contextual clara
 * ✓ Diseño corporativo ESAP
 * 
 * ACTUALIZADO: Diciembre 24, 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scale,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  X as XIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  Download,
  Eye,
  Paperclip,
  Calendar,
  CheckCircle,
  ArrowLeft,
  History,
  Info,
  AlertCircle,
  User,
  FileCheck,
  MoreVertical,
  Filter,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface MisExpedientesLegalesV2Props {
  onVolver?: () => void;
}

interface Expediente {
  id: string;
  numero: string;
  etapaActual: string;
  fechaNotificacion: string;
  fechaLimiteRespuesta: string | null;
  diasRestantes: number | null;
  tipoFalta: 'Leve' | 'Grave' | 'Gravísima';
  abogadoAsignado: string;
  estadoRespuesta: 'Pendiente' | 'Presentado' | 'Vencido' | 'No Aplica';
  hechos: string;
  documentosSubidos: number;
  ultimaActuacion: string;
  fechaUltimaActuacion: string;
  puedeSubirDescargos: boolean;
  historial: ActuacionHistorial[];
}

interface ActuacionHistorial {
  fecha: string;
  titulo: string;
  descripcion: string;
  tipo: 'notificacion' | 'respuesta' | 'auto' | 'termino';
}

const EXPEDIENTES_MOCK: Expediente[] = [
  {
    id: '1',
    numero: 'PD-2025-0125',
    etapaActual: 'Traslado Descargos',
    fechaNotificacion: '2025-01-05',
    fechaLimiteRespuesta: '2025-01-20',
    diasRestantes: 3,
    tipoFalta: 'Grave',
    abogadoAsignado: 'Dr. Carlos Mendoza',
    estadoRespuesta: 'Pendiente',
    hechos: 'Presunto incumplimiento de funciones administrativas relacionadas con el proceso de matrícula del periodo 2024-2.',
    documentosSubidos: 2,
    ultimaActuacion: 'Auto de avocamiento notificado',
    fechaUltimaActuacion: '2025-01-05',
    puedeSubirDescargos: true,
    historial: [
      {
        fecha: '2025-01-05',
        titulo: 'Notificación Auto de Avocamiento',
        descripcion: 'Se notifica auto que define procedimiento y se da traslado para presentar descargos en término de 10 días hábiles.',
        tipo: 'notificacion'
      },
      {
        fecha: '2025-01-02',
        titulo: 'Expediente Recibido',
        descripcion: 'La Oficina Jurídica recibe el expediente desde la OCID para iniciar etapa de juzgamiento.',
        tipo: 'auto'
      }
    ]
  },
  {
    id: '2',
    numero: 'PD-2024-0234',
    etapaActual: 'Práctica Pruebas',
    fechaNotificacion: '2024-08-20',
    fechaLimiteRespuesta: null,
    diasRestantes: null,
    tipoFalta: 'Grave',
    abogadoAsignado: 'Dra. Ana Rodríguez',
    estadoRespuesta: 'Presentado',
    hechos: 'Presunta violación al régimen de incompatibilidades e inhabilidades.',
    documentosSubidos: 5,
    ultimaActuacion: 'Descargos presentados',
    fechaUltimaActuacion: '2024-10-12',
    puedeSubirDescargos: false,
    historial: [
      {
        fecha: '2024-10-12',
        titulo: 'Presentación de Descargos',
        descripcion: 'El investigado presentó descargos dentro del término establecido con 5 anexos.',
        tipo: 'respuesta'
      },
      {
        fecha: '2024-08-20',
        titulo: 'Notificación de Cargos',
        descripcion: 'Se notifican los cargos formulados y se concede traslado de 10 días hábiles.',
        tipo: 'notificacion'
      }
    ]
  }
];

export function MisExpedientesLegalesV2({ onVolver }: MisExpedientesLegalesV2Props) {
  const [expedientes] = useState<Expediente[]>(EXPEDIENTES_MOCK);
  const [selectedTab, setSelectedTab] = useState<'todos' | 'requieren-atencion' | 'en-proceso' | 'finalizados'>('todos');
  const [expandedExpediente, setExpandedExpediente] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter expedientes based on tab
  const filteredExpedientes = expedientes.filter(exp => {
    const matchesSearch = exp.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exp.hechos.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (selectedTab) {
      case 'requieren-atencion':
        return exp.estadoRespuesta === 'Pendiente' && exp.puedeSubirDescargos;
      case 'en-proceso':
        return exp.estadoRespuesta === 'Presentado';
      case 'finalizados':
        return exp.estadoRespuesta === 'Vencido' || exp.estadoRespuesta === 'No Aplica';
      default:
        return true;
    }
  });

  // Count for badges
  const counts = {
    todos: expedientes.length,
    requierenAtencion: expedientes.filter(e => e.estadoRespuesta === 'Pendiente' && e.puedeSubirDescargos).length,
    enProceso: expedientes.filter(e => e.estadoRespuesta === 'Presentado').length,
    finalizados: expedientes.filter(e => e.estadoRespuesta === 'Vencido' || e.estadoRespuesta === 'No Aplica').length
  };

  const toggleExpediente = (id: string) => {
    setExpandedExpediente(expandedExpediente === id ? null : id);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Pendiente</Badge>;
      case 'Presentado':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Presentado</Badge>;
      case 'Vencido':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Vencido</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{estado}</Badge>;
    }
  };

  const getTipoFaltaBadge = (tipo: string) => {
    switch (tipo) {
      case 'Gravísima':
        return <Badge className="bg-red-600 text-white">Gravísima</Badge>;
      case 'Grave':
        return <Badge className="bg-orange-600 text-white">Grave</Badge>;
      case 'Leve':
        return <Badge className="bg-yellow-600 text-white">Leve</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">{tipo}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            {onVolver && (
              <Button
                variant="ghost"
                onClick={onVolver}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Panel Administrativo
              </Button>
            )}
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#1e5da8] rounded-lg flex items-center justify-center text-white flex-shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900">Mis Procesos Legales</h1>
              <p className="text-sm text-gray-600 mt-1">Expedientes disciplinarios</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Alert Banner - Requires Attention */}
        {counts.requierenAtencion > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-l-4 border-l-orange-500 bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-900">
                      Tienes {counts.requierenAtencion} expediente(s) en término para responder
                    </h3>
                    <p className="text-sm text-orange-700 mt-1">
                      Es muy importante que presentes tus descargos antes de la fecha límite
                    </p>
                  </div>
                  <Badge className="bg-orange-600 text-white">
                    {counts.requierenAtencion}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-1 inline-flex gap-1">
          <Button
            variant={selectedTab === 'todos' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('todos')}
            className={selectedTab === 'todos' ? 'bg-[#1e5da8]' : ''}
          >
            Todos
            <Badge className="ml-2 bg-gray-200 text-gray-700">{counts.todos}</Badge>
          </Button>
          <Button
            variant={selectedTab === 'requieren-atencion' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('requieren-atencion')}
            className={selectedTab === 'requieren-atencion' ? 'bg-[#1e5da8]' : ''}
          >
            <Clock className="w-4 h-4 mr-2" />
            Requieren Respuesta
            {counts.requierenAtencion > 0 && (
              <Badge className="ml-2 bg-orange-600 text-white">{counts.requierenAtencion}</Badge>
            )}
          </Button>
          <Button
            variant={selectedTab === 'en-proceso' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('en-proceso')}
            className={selectedTab === 'en-proceso' ? 'bg-[#1e5da8]' : ''}
          >
            <Shield className="w-4 h-4 mr-2" />
            En Proceso
            {counts.enProceso > 0 && (
              <Badge className="ml-2 bg-gray-200 text-gray-700">{counts.enProceso}</Badge>
            )}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por número de expediente o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300"
            />
          </div>
        </div>

        {/* Expedientes List */}
        <div className="space-y-4">
          {filteredExpedientes.map((expediente) => (
            <Card key={expediente.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                {/* Expediente Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{expediente.numero}</h3>
                      {getTipoFaltaBadge(expediente.tipoFalta)}
                      {getEstadoBadge(expediente.estadoRespuesta)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{expediente.hechos}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Fecha límite: {expediente.fechaLimiteRespuesta || 'No aplica'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span>Etapa: {expediente.etapaActual}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span>Abogado: {expediente.abogadoAsignado}</span>
                      </div>
                    </div>
                  </div>

                  {expediente.diasRestantes !== null && expediente.diasRestantes <= 5 && (
                    <div className="flex-shrink-0 ml-4">
                      <div className="bg-orange-100 border border-orange-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-orange-700">{expediente.diasRestantes}</div>
                        <div className="text-xs text-orange-600">días restantes</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Alert if pending */}
                {expediente.puedeSubirDescargos && expediente.estadoRespuesta === 'Pendiente' && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 text-sm text-yellow-800">
                        <p className="font-semibold mb-1">Información importante:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>Los términos procesales se cuentan en días hábiles</li>
                          <li>Puedes presentar descargos antes de la fecha límite</li>
                          <li>Los documentos deben estar en formato PDF</li>
                          <li>Si necesitas asesoría legal, contacta a tu abogado asignado</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {expediente.puedeSubirDescargos && (
                    <Button className="gap-2 bg-[#1e5da8] hover:bg-[#1557a0]">
                      <Upload className="w-4 h-4" />
                      Presentar Descargos
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="gap-2 border-gray-300"
                    onClick={() => toggleExpediente(expediente.id)}
                  >
                    <History className="w-4 h-4" />
                    Ver Historial
                    {expandedExpediente === expediente.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  {expediente.documentosSubidos > 0 && (
                    <Button variant="outline" className="gap-2 border-gray-300">
                      <Download className="w-4 h-4" />
                      Documentos ({expediente.documentosSubidos})
                    </Button>
                  )}
                </div>

                {/* Expandable Timeline */}
                <AnimatePresence>
                  {expandedExpediente === expediente.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <Separator className="my-4" />
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <History className="w-4 h-4" />
                          Historial de Actuaciones
                        </h4>
                        <div className="relative border-l-2 border-gray-200 pl-6 space-y-4 ml-2">
                          {expediente.historial.map((actuacion, idx) => (
                            <div key={idx} className="relative">
                              <div className="absolute -left-[27px] top-1.5 w-4 h-4 rounded-full bg-[#1e5da8] border-2 border-white" />
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-start justify-between mb-1">
                                  <h5 className="font-semibold text-sm text-gray-900">{actuacion.titulo}</h5>
                                  <span className="text-xs text-gray-600">{actuacion.fecha}</span>
                                </div>
                                <p className="text-sm text-gray-700">{actuacion.descripcion}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ))}

          {filteredExpedientes.length === 0 && (
            <Card className="border border-gray-200">
              <CardContent className="p-12 text-center">
                <Scale className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron expedientes</h3>
                <p className="text-gray-600">
                  {searchQuery ? 'Intenta con otros términos de búsqueda' : 'No tienes expedientes en esta categoría'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
