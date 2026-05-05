import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Award,
  BookMarked,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  Send,
  Filter,
  Search,
  Plus,
  MoreVertical,
  User,
  Calendar,
  Mail,
  Phone,
  FileCheck,
  Printer,
  DollarSign,
  Package,
  TrendingUp,
  BarChart3,
  Edit,
  Trash2,
  MessageSquare,
  CreditCard,
  CheckCircle2,
  Zap,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { InlineTip } from '../shared/InlineTip';
import { EmptyStatePremium } from './EmptyStatesPremium';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { BreadcrumbNav } from './BreadcrumbNav';
import { usePersistentTip } from '../../hooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { Textarea } from '../ui/textarea';

interface CertificateRequestsModuleProps {
  onClose?: () => void;
  hideHeader?: boolean;
  onPendingCountChange?: (count: number) => void;
}

type RequestStatus = 'pending' | 'in_process' | 'approved' | 'ready' | 'delivered' | 'rejected' | 'cancelled';
type CertificateType = 'notas' | 'estudios' | 'grado' | 'matricula' | 'programa';
type DeliveryMethod = 'digital' | 'presencial' | 'correo';
type PaymentStatus = 'pending' | 'paid' | 'exempted';

interface CertificateRequest {
  id: number;
  requestNumber: string;
  type: CertificateType;
  typeName: string;
  student: {
    name: string;
    id: string;
    email: string;
    phone: string;
    program: string;
    avatar: string;
  };
  requestDate: string;
  deadline?: string;
  status: RequestStatus;
  copies: number;
  reason: string;
  deliveryMethod: DeliveryMethod;
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  notes?: string;
  processedBy?: string;
  processedDate?: string;
  documentUrl?: string;
  trackingNumber?: string;
}

export function CertificateRequestsModule({ onClose, hideHeader = false, onPendingCountChange }: CertificateRequestsModuleProps) {
  const [activeTab, setActiveTab] = useState('requests');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<CertificateRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTip, setShowTip] = usePersistentTip('tip_certificados', true);

  // Mock data - Solicitudes de certificados
  const mockRequests: CertificateRequest[] = [
    {
      id: 1,
      requestNumber: 'CERT-2025-001234',
      type: 'notas',
      typeName: 'Certificado de Notas',
      student: {
        name: 'María Fernández García',
        id: '2021-0234',
        email: 'maria.fernandez@esap.edu.co',
        phone: '+57 310 456 7890',
        program: 'Administración Pública Territorial',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      },
      requestDate: '15 Nov 2025',
      deadline: '20 Nov 2025',
      status: 'pending',
      copies: 2,
      reason: 'Proceso de selección laboral en el Ministerio de Hacienda',
      deliveryMethod: 'digital',
      paymentStatus: 'paid',
      paymentAmount: 25000,
    },
    {
      id: 2,
      requestNumber: 'CERT-2025-001235',
      type: 'estudios',
      typeName: 'Certificado de Estudios',
      student: {
        name: 'Carlos Rodríguez López',
        id: '2022-0156',
        email: 'carlos.rodriguez@esap.edu.co',
        phone: '+57 315 123 4567',
        program: 'Administración Pública',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      },
      requestDate: '14 Nov 2025',
      deadline: '19 Nov 2025',
      status: 'in_process',
      copies: 1,
      reason: 'Aplicación a maestría en Universidad Nacional',
      deliveryMethod: 'presencial',
      paymentStatus: 'paid',
      paymentAmount: 20000,
      processedBy: 'Dra. Ana Martínez',
      notes: 'El estudiante pasará a recoger el certificado mañana en la tarde.',
    },
    {
      id: 3,
      requestNumber: 'CERT-2025-001236',
      type: 'grado',
      typeName: 'Certificado de Grado',
      student: {
        name: 'Ana María Gómez',
        id: '2020-0089',
        email: 'ana.gomez@esap.edu.co',
        phone: '+57 320 987 6543',
        program: 'Gestión y Desarrollo Territorial',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      },
      requestDate: '13 Nov 2025',
      deadline: '18 Nov 2025',
      status: 'approved',
      copies: 3,
      reason: 'Trámite de apostilla para trabajo en el exterior',
      deliveryMethod: 'digital',
      paymentStatus: 'paid',
      paymentAmount: 40000,
      processedBy: 'Dra. Ana Martínez',
      processedDate: '14 Nov 2025',
      documentUrl: '/certificates/cert-2025-001236.pdf',
    },
    {
      id: 4,
      requestNumber: 'CERT-2025-001237',
      type: 'notas',
      typeName: 'Certificado de Notas',
      student: {
        name: 'Jorge Luis Pérez',
        id: '2023-0421',
        email: 'jorge.perez@esap.edu.co',
        phone: '+57 312 654 0987',
        program: 'Administración Pública',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      },
      requestDate: '12 Nov 2025',
      status: 'ready',
      copies: 1,
      reason: 'Solicitud de beca universitaria',
      deliveryMethod: 'correo',
      paymentStatus: 'paid',
      paymentAmount: 35000,
      processedBy: 'Dr. Pedro Ramírez',
      processedDate: '14 Nov 2025',
      documentUrl: '/certificates/cert-2025-001237.pdf',
      trackingNumber: 'COORD-789456123',
    },
    {
      id: 5,
      requestNumber: 'CERT-2025-001238',
      type: 'estudios',
      typeName: 'Certificado de Estudios',
      student: {
        name: 'Laura Sánchez Villa',
        id: '2021-0567',
        email: 'laura.sanchez@esap.edu.co',
        phone: '+57 318 234 5678',
        program: 'Administración Pública Territorial',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      },
      requestDate: '11 Nov 2025',
      status: 'delivered',
      copies: 2,
      reason: 'Proceso de vinculación laboral',
      deliveryMethod: 'digital',
      paymentStatus: 'paid',
      paymentAmount: 40000,
      processedBy: 'Dra. Ana Martínez',
      processedDate: '13 Nov 2025',
      documentUrl: '/certificates/cert-2025-001238.pdf',
    },
    {
      id: 6,
      requestNumber: 'CERT-2025-001239',
      type: 'notas',
      typeName: 'Certificado de Notas',
      student: {
        name: 'Diego Martínez Torres',
        id: '2022-0890',
        email: 'diego.martinez@esap.edu.co',
        phone: '+57 311 567 8901',
        program: 'Administración Pública',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop',
      },
      requestDate: '10 Nov 2025',
      status: 'rejected',
      copies: 1,
      reason: 'Solicitud de certificado',
      deliveryMethod: 'digital',
      paymentStatus: 'pending',
      paymentAmount: 25000,
      notes: 'Solicitud rechazada: El estudiante tiene materias pendientes por aprobar.',
    },
    {
      id: 7,
      requestNumber: 'CERT-2025-001240',
      type: 'programa',
      typeName: 'Certificado de Programa',
      student: {
        name: 'Carolina Rojas Díaz',
        id: '2020-0234',
        email: 'carolina.rojas@esap.edu.co',
        phone: '+57 316 890 1234',
        program: 'Gestión y Desarrollo Territorial',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
      },
      requestDate: '9 Nov 2025',
      status: 'pending',
      copies: 1,
      reason: 'Homologación de estudios',
      deliveryMethod: 'presencial',
      paymentStatus: 'exempted',
      paymentAmount: 0,
    },
  ];

  // Estadísticas generales
  const certificateStats = {
    totalRequests: 156,
    pendingRequests: 23,
    inProcessRequests: 12,
    readyForDelivery: 8,
    deliveredToday: 15,
    rejectedRequests: 4,
    averageProcessingTime: '2.3 días',
    revenue: 4850000,
  };

  // Notificar al componente padre sobre el conteo de solicitudes pendientes
  useEffect(() => {
    if (onPendingCountChange) {
      onPendingCountChange(certificateStats.pendingRequests);
    }
  }, [certificateStats.pendingRequests, onPendingCountChange]);

  const getStatusBadge = (status: RequestStatus) => {
    const configs = {
      pending: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200', label: 'Pendiente', icon: Clock },
      in_process: { color: 'bg-blue-500/10 text-blue-600 border-blue-200', label: 'En Proceso', icon: RefreshCw },
      approved: { color: 'bg-green-500/10 text-green-600 border-green-200', label: 'Aprobado', icon: CheckCircle },
      ready: { color: 'bg-purple-500/10 text-purple-600 border-purple-200', label: 'Listo', icon: Package },
      delivered: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', label: 'Entregado', icon: CheckCircle2 },
      rejected: { color: 'bg-red-500/10 text-red-600 border-red-200', label: 'Rechazado', icon: XCircle },
      cancelled: { color: 'bg-gray-500/10 text-gray-600 border-gray-200', label: 'Cancelado', icon: XCircle },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} border font-medium flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    const configs = {
      pending: { color: 'bg-orange-500/10 text-orange-600 border-orange-200', label: 'Pendiente Pago' },
      paid: { color: 'bg-green-500/10 text-green-600 border-green-200', label: 'Pagado' },
      exempted: { color: 'bg-blue-500/10 text-blue-600 border-blue-200', label: 'Exento' },
    };
    const config = configs[status];
    return (
      <Badge variant="outline" className={`${config.color} border text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const getCertificateIcon = (type: CertificateType) => {
    const icons = {
      notas: FileCheck,
      estudios: BookMarked,
      grado: Award,
      matricula: FileText,
      programa: FileText,
    };
    return icons[type] || FileText;
  };

  const renderStatsCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Solicitudes Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-gray-900">{certificateStats.pendingRequests}</div>
          <p className="text-xs text-gray-500 mt-1">{certificateStats.inProcessRequests} en proceso</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Listos para Entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-gray-900">{certificateStats.readyForDelivery}</div>
          <p className="text-xs text-gray-500 mt-1">{certificateStats.deliveredToday} entregados hoy</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Total Solicitudes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-gray-900">{certificateStats.totalRequests}</div>
          <p className="text-xs text-gray-500 mt-1">Este mes</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Tiempo Promedio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-gray-900">{certificateStats.averageProcessingTime}</div>
          <p className="text-xs text-gray-500 mt-1">de procesamiento</p>
        </CardContent>
      </Card>
    </div>
  );

  const handleStatusChange = (requestId: number, newStatus: RequestStatus) => {
    toast.success('Estado actualizado', {
      description: `La solicitud ha sido marcada como ${newStatus}`,
    });
  };

  const handleGenerateCertificate = (requestId: number) => {
    toast.loading('Generando certificado...', { duration: 1500 });
    setTimeout(() => {
      toast.success('¡Certificado generado!', {
        description: 'El certificado está listo para descargar',
      });
      handleStatusChange(requestId, 'ready');
    }, 1500);
  };

  const renderRequestsTab = () => (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por número de solicitud, nombre del estudiante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>
          <Button className="gap-2 bg-[#1e5da8] hover:bg-[#174a8a]">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Tabs de estado */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
          className={statusFilter === 'all' ? 'bg-[#1e5da8]' : ''}
        >
          Todas ({certificateStats.totalRequests})
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('pending')}
          className={statusFilter === 'pending' ? 'bg-[#1e5da8]' : ''}
        >
          Pendientes ({certificateStats.pendingRequests})
        </Button>
        <Button
          variant={statusFilter === 'in_process' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('in_process')}
        >
          En Proceso ({certificateStats.inProcessRequests})
        </Button>
        <Button
          variant={statusFilter === 'ready' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('ready')}
        >
          Listos ({certificateStats.readyForDelivery})
        </Button>
      </div>

      {/* Lista de solicitudes o Empty State */}
      {mockRequests.length === 0 ? (
        <EmptyStatePremium
          type={searchQuery || statusFilter !== 'all' ? 'no-search' : 'no-certificates'}
          title={searchQuery || statusFilter !== 'all' 
            ? 'No se encontraron solicitudes' 
            : '¡No hay solicitudes de certificados!'}
          description={searchQuery || statusFilter !== 'all'
            ? 'No hay solicitudes que coincidan con tus filtros. Intenta ajustarlos.'
            : 'Las solicitudes de certificados académicos aparecerán aquí. Los estudiantes pueden solicitarlos desde el Portal.'}
          actionLabel={searchQuery || statusFilter !== 'all' ? undefined : 'Ver Configuración'}
          onAction={searchQuery || statusFilter !== 'all' ? undefined : () => toast.info('Abriendo configuración de certificados...')}
          secondaryActionLabel={searchQuery || statusFilter !== 'all' ? 'Limpiar filtros' : undefined}
          onSecondaryAction={searchQuery || statusFilter !== 'all' ? () => {
            setSearchQuery('');
            setStatusFilter('all');
            toast.success('Filtros limpiados');
          } : undefined}
          tips={[
            'Los certificados se generan automáticamente desde plantillas',
            'Puedes configurar precios por tipo de certificado',
            'El sistema valida pagos antes de generar documentos',
            'Los tracking numbers permiten rastreo de envíos físicos'
          ]}
          showTips={true}
        />
      ) : (
        <div className="grid gap-4">
          {mockRequests.map((request) => {
          const CertIcon = getCertificateIcon(request.type);
          return (
            <Card key={request.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-[#1e5da8]">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Avatar y Info básica */}
                  <div className="flex gap-4 flex-1">
                    <Avatar className="w-14 h-14 flex-shrink-0">
                      <AvatarImage src={request.student.avatar} />
                      <AvatarFallback>{request.student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CertIcon className="w-5 h-5 text-[#1e5da8]" />
                            <h3 className="text-lg font-bold text-gray-900">{request.typeName}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">{request.student.name}</span> • {request.student.id}
                          </p>
                          <p className="text-sm text-gray-500">{request.student.program}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(request.status)}
                          <Badge variant="outline" className="text-xs">
                            {request.requestNumber}
                          </Badge>
                        </div>
                      </div>

                      {/* Detalles de la solicitud */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Solicitado: {request.requestDate}</span>
                        </div>
                        {request.deadline && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>Entrega: {request.deadline}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Package className="w-4 h-4" />
                          <span>{request.copies} {request.copies === 1 ? 'copia' : 'copias'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Send className="w-4 h-4" />
                          <span className="capitalize">{request.deliveryMethod}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPaymentBadge(request.paymentStatus)}
                          {request.paymentAmount > 0 && (
                            <span className="text-sm text-gray-600">
                              ${request.paymentAmount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Motivo */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-xs text-gray-500 mb-1">Motivo de la solicitud:</p>
                        <p className="text-sm text-gray-700">{request.reason}</p>
                      </div>

                      {/* Notas (si existen) */}
                      {request.notes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Notas:
                          </p>
                          <p className="text-sm text-blue-900">{request.notes}</p>
                        </div>
                      )}

                      {/* Información de procesamiento */}
                      {request.processedBy && (
                        <div className="text-xs text-gray-500 mb-3">
                          Procesado por <span className="font-medium">{request.processedBy}</span>
                          {request.processedDate && ` el ${request.processedDate}`}
                        </div>
                      )}

                      {/* Acciones */}
                      <div className="flex flex-wrap gap-2">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="gap-2 bg-[#1e5da8] hover:bg-[#174a8a]"
                              onClick={() => handleStatusChange(request.id, 'in_process')}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Iniciar Proceso
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 text-red-600 hover:bg-red-50"
                              onClick={() => handleStatusChange(request.id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4" />
                              Rechazar
                            </Button>
                          </>
                        )}

                        {request.status === 'in_process' && (
                          <Button
                            size="sm"
                            className="gap-2 bg-green-600 hover:bg-green-700"
                            onClick={() => handleGenerateCertificate(request.id)}
                          >
                            <FileCheck className="w-4 h-4" />
                            Generar Certificado
                          </Button>
                        )}

                        {request.status === 'approved' && (
                          <Button
                            size="sm"
                            className="gap-2 bg-purple-600 hover:bg-purple-700"
                            onClick={() => handleStatusChange(request.id, 'ready')}
                          >
                            <Package className="w-4 h-4" />
                            Marcar como Listo
                          </Button>
                        )}

                        {request.status === 'ready' && (
                          <Button
                            size="sm"
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleStatusChange(request.id, 'delivered')}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Marcar como Entregado
                          </Button>
                        )}

                        {request.documentUrl && (
                          <Button size="sm" variant="outline" className="gap-2">
                            <Download className="w-4 h-4" />
                            Descargar PDF
                          </Button>
                        )}

                        <Button size="sm" variant="outline" className="gap-2">
                          <Mail className="w-4 h-4" />
                          Enviar Email
                        </Button>

                        <Button size="sm" variant="outline" className="gap-2">
                          <Eye className="w-4 h-4" />
                          Ver Detalles
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar solicitud
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Agregar notas
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="w-4 h-4 mr-2" />
                              Imprimir
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Cancelar solicitud
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Tracking number */}
                      {request.trackingNumber && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 w-fit">
                          <Package className="w-3 h-3" />
                          <span>Tracking: <span className="font-mono font-medium">{request.trackingNumber}</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Crecimiento Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">+18%</div>
            <p className="text-xs text-gray-500 mt-1">vs. mes anterior</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Tasa de Aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">97.4%</div>
            <p className="text-xs text-gray-500 mt-1">{certificateStats.rejectedRequests} rechazadas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Ingresos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">
              ${(certificateStats.revenue / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-gray-500 mt-1">COP {certificateStats.revenue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribución por tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Certificados por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Certificado de Notas', value: 45, icon: FileCheck },
              { label: 'Certificado de Estudios', value: 32, icon: BookMarked },
              { label: 'Certificado de Grado', value: 15, icon: Award },
              { label: 'Certificado de Matrícula', value: 5, icon: FileText },
              { label: 'Certificado de Programa', value: 3, icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#1e5da8]" />
                      <span className="text-gray-600">{item.label}</span>
                    </div>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#1e5da8] h-2 rounded-full transition-all"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tiempo de procesamiento */}
      <Card>
        <CardHeader>
          <CardTitle>Tiempo de Procesamiento Promedio</CardTitle>
          <CardDescription>Por tipo de certificado (en días hábiles)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { type: 'Certificado de Notas', time: 2.1 },
              { type: 'Certificado de Estudios', time: 2.5 },
              { type: 'Certificado de Grado', time: 3.2 },
              { type: 'Certificado de Matrícula', time: 1.8 },
              { type: 'Certificado de Programa', time: 2.7 },
            ].map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(item.time / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-16">{item.time} días</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métodos de entrega */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Digital (Email)', value: 68 },
                { label: 'Presencial', value: 24 },
                { label: 'Correo Certificado', value: 8 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estados de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Pagado', value: 84, color: 'bg-green-500' },
                { label: 'Pendiente', value: 11, color: 'bg-orange-500' },
                { label: 'Exento', value: 5, color: 'bg-blue-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const pendingRequestsCount = mockRequests.filter(r => r.status === 'pending').length;

  return (
    <div className={`${hideHeader ? '' : 'h-full'} flex flex-col ${hideHeader ? '' : 'bg-gray-50'}`}>
      {/* Header */}
      {!hideHeader && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <BreadcrumbNav
            items={[
              { label: 'Gestión Académica', href: '#' },
              { label: 'Solicitudes de Certificados', href: '#', current: true },
            ]}
          />
          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-[#1e5da8]/10 rounded-lg">
                  <FileText className="w-6 h-6 text-[#1e5da8]" />
                </div>
                Gestión de Solicitudes de Certificados
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Administra y procesa solicitudes de certificados académicos
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Contextual Tip */}
          <AnimatePresence>
            {showTip && pendingRequestsCount > 0 && (
              <div className="mt-4">
                <InlineTip
                  title="⚡ Solicitudes Pendientes"
                  message={`Tienes ${pendingRequestsCount} solicitudes de certificados esperando procesamiento. Revísalas para mantener un tiempo de respuesta óptimo.`}
                  variant="warning"
                  icon={<Zap className="w-5 h-5" />}
                  dismissible={true}
                  onDismiss={() => setShowTip(false)}
                />
              </div>
            )}
            {showTip && pendingRequestsCount === 0 && (
              <div className="mt-4">
                <InlineTip
                title="📄 Sistema de Certificados Académicos"
                message="Gestiona solicitudes de certificados de notas, grado y estudios. El sistema genera documentos automáticamente y notifica a los estudiantes."
                variant="success"
                icon={<Lightbulb className="w-5 h-5" />}
                dismissible={true}
                onDismiss={() => setShowTip(false)}
              />
            </div>
          )}
        </AnimatePresence>
        </div>
      )}

      {/* Contenido */}
      <div className={`flex-1 overflow-auto ${hideHeader ? '' : 'px-6 py-6'}`}>
        {!hideHeader && renderStatsCards()}

        <Tabs value={activeTab} onValueChange={setActiveTab} className={`space-y-6 ${hideHeader ? 'mt-0' : ''}`}>
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="requests" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Solicitudes</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analíticas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4 mt-0">
            {renderRequestsTab()}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-0">
            {renderAnalyticsTab()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
