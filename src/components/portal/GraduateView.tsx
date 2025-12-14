/**
 * Vista de Graduado - Portal Transaccional
 * 
 * Vista especializada para usuarios con rol GRADUADO activo.
 * Muestra red de egresados, oportunidades laborales, eventos y beneficios.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Briefcase,
  Users,
  Calendar,
  TrendingUp,
  GraduationCap,
  ChevronRight,
  MapPin,
  Building,
  Star,
  Heart,
  MessageSquare,
  Share2,
  Download,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { JobBoardPortal } from './JobBoardPortal';
import { CertificadosLaboralesPortal } from './CertificadosLaboralesPortal';

interface GraduateViewProps {
  userName: string;
  userEmail: string;
  graduateData?: {
    fecha_grado: string;
    titulo: string;
    programa: string;
    distincion: string;
    numero_diploma: string;
    esta_trabajando: boolean;
    empresa_actual: string;
    cargo_actual: string;
  };
}

export function GraduateView({ userName, userEmail, graduateData }: GraduateViewProps) {
  const [showJobBoard, setShowJobBoard] = useState(false);
  const [showCertificadosLaborales, setShowCertificadosLaborales] = useState(false);
  
  // Datos mock si no se proveen
  const data = graduateData || {
    fecha_grado: '2020-12-15',
    titulo: 'Administrador Público',
    programa: 'Administración Pública Territorial',
    distincion: 'Cum Laude',
    numero_diploma: 'DIP-2020-789',
    esta_trabajando: true,
    empresa_actual: 'Alcaldía de Bogotá',
    cargo_actual: 'Asesor de Planeación',
  };

  const yearsSinceGraduation = new Date().getFullYear() - new Date(data.fecha_grado).getFullYear();

  // Si está viendo la Bolsa de Empleo, mostrar ese componente
  if (showJobBoard) {
    return (
      <JobBoardPortal 
        userRole="Graduado"
        userName={userName}
        userEmail={userEmail}
        onBack={() => setShowJobBoard(false)}
      />
    );
  }

  // Si está viendo los Certificados Laborales, mostrar ese componente
  if (showCertificadosLaborales) {
    return (
      <CertificadosLaboralesPortal 
        onBack={() => setShowCertificadosLaborales(false)}
        userName={userName}
        userEmail={userEmail}
      />
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header graduado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold">
                ¡Bienvenido(a), {userName.split(' ')[0]}!
              </h1>
            </div>
            <p className="text-amber-100 text-sm sm:text-base mb-1">
              {data.titulo}
            </p>
            <p className="text-amber-50 text-xs mb-4">
              Graduado hace {yearsSinceGraduation} año{yearsSinceGraduation !== 1 ? 's' : ''} • {data.distincion}
            </p>
            <div className="flex flex-wrap gap-4">
              {data.esta_trabajando && (
                <>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                    <p className="text-xs text-amber-100">Empresa</p>
                    <p className="text-sm font-bold">{data.empresa_actual}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                    <p className="text-xs text-amber-100">Cargo</p>
                    <p className="text-sm font-bold">{data.cargo_actual}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <Badge className="bg-green-500 text-white border-none">
            Egresado ESAP
          </Badge>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          icon={<Briefcase className="w-6 h-6" />}
          title="Bolsa de Empleo"
          description="Ver ofertas"
          color="from-blue-500 to-blue-600"
          onClick={() => setShowJobBoard(true)}
        />
        <QuickActionCard
          icon={<Users className="w-6 h-6" />}
          title="Red de Egresados"
          description="Conectar"
          color="from-purple-500 to-purple-600"
          onClick={() => console.log('Red egresados')}
        />
        <QuickActionCard
          icon={<Calendar className="w-6 h-6" />}
          title="Eventos"
          description="Ver próximos"
          color="from-emerald-500 to-emerald-600"
          onClick={() => console.log('Eventos')}
        />
        <QuickActionCard
          icon={<GraduationCap className="w-6 h-6" />}
          title="Educación Continua"
          description="Descuentos 20%"
          color="from-amber-500 to-amber-600"
          onClick={() => console.log('Educación')}
        />
        <QuickActionCard
          icon={<FileText className="w-6 h-6" />}
          title="Certificados Laborales"
          description="Ver certificados"
          color="from-sky-500 to-blue-600"
          onClick={() => setShowCertificadosLaborales(true)}
        />
      </div>

      {/* Cards principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Oportunidades laborales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-600" />
              Ofertas Destacadas
            </CardTitle>
            <CardDescription>
              Oportunidades para egresados ESAP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                cargo: 'Director de Planeación',
                empresa: 'Alcaldía de Medellín',
                ubicacion: 'Medellín, Antioquia',
                tipo: 'Tiempo completo',
                salario: '$8M - $12M',
                publicado: 'Hace 2 días',
              },
              {
                cargo: 'Asesor en Políticas Públicas',
                empresa: 'Ministerio del Interior',
                ubicacion: 'Bogotá D.C.',
                tipo: 'Contrato',
                salario: '$6M - $9M',
                publicado: 'Hace 5 días',
              },
              {
                cargo: 'Coordinador de Proyectos',
                empresa: 'Gobernación de Cundinamarca',
                ubicacion: 'Cundinamarca',
                tipo: 'Tiempo completo',
                salario: '$5M - $7M',
                publicado: 'Hace 1 semana',
              },
            ].map((oferta, index) => (
              <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-sm mb-1">{oferta.cargo}</h4>
                    <p className="text-xs font-medium text-gray-700">{oferta.empresa}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {oferta.tipo}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {oferta.ubicacion}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {oferta.salario}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{oferta.publicado}</span>
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    Ver más <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Eventos para egresados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Próximos Eventos
            </CardTitle>
            <CardDescription>
              Exclusivos para egresados ESAP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                nombre: 'Networking Egresados 2025',
                fecha: '25 de Noviembre',
                hora: '6:00 PM - 9:00 PM',
                lugar: 'Sede ESAP Bogotá',
                asistentes: 45,
                tipo: 'Networking',
              },
              {
                nombre: 'Foro: Transformación Digital en el Sector Público',
                fecha: '2 de Diciembre',
                hora: '2:00 PM - 5:00 PM',
                lugar: 'Virtual',
                asistentes: 120,
                tipo: 'Académico',
              },
              {
                nombre: 'Taller: Liderazgo en Gestión Pública',
                fecha: '10 de Diciembre',
                hora: '9:00 AM - 12:00 PM',
                lugar: 'Auditorio Principal',
                asistentes: 30,
                tipo: 'Taller',
              },
            ].map((evento, index) => (
              <div key={index} className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-sm">{evento.nombre}</h4>
                  <Badge className="bg-amber-100 text-amber-700 border-none text-xs">
                    {evento.tipo}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-gray-600 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {evento.fecha} • {evento.hora}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    {evento.lugar}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    {evento.asistentes} confirmados
                  </div>
                </div>
                <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-xs h-8">
                  Registrarme
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Red de egresados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            Red de Egresados ESAP
          </CardTitle>
          <CardDescription>
            Conecta con otros profesionales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-3xl font-bold text-amber-600">3,248</p>
              <p className="text-xs text-gray-600 mt-1">Egresados Activos</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">156</p>
              <p className="text-xs text-gray-600 mt-1">Empresas Conectadas</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">89</p>
              <p className="text-xs text-gray-600 mt-1">Ofertas Activas</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">24</p>
              <p className="text-xs text-gray-600 mt-1">Eventos al Mes</p>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Beneficios */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Tus Beneficios como Egresado</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  icono: <GraduationCap className="w-5 h-5" />,
                  titulo: '20% Descuento',
                  descripcion: 'En educación continua y posgrados',
                },
                {
                  icono: <Briefcase className="w-5 h-5" />,
                  titulo: 'Bolsa de Empleo',
                  descripcion: 'Acceso prioritario a ofertas',
                },
                {
                  icono: <Users className="w-5 h-5" />,
                  titulo: 'Red de Contactos',
                  descripcion: 'Directorio de egresados',
                },
                {
                  icono: <Calendar className="w-5 h-5" />,
                  titulo: 'Eventos Exclusivos',
                  descripcion: 'Networking y capacitaciones',
                },
              ].map((beneficio, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-amber-300 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    {beneficio.icono}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm mb-0.5">{beneficio.titulo}</h5>
                    <p className="text-xs text-gray-600">{beneficio.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente auxiliar para Quick Actions
interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}

function QuickActionCard({ icon, title, description, color, onClick }: QuickActionCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-amber-600 transition-all bg-white p-4 text-left"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity`} />
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3 shadow-md`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-600">{description}</p>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors absolute top-4 right-4" />
    </motion.button>
  );
}