import { useState } from 'react';
import { Menu, Search, Bell, Settings, LogOut, User, HelpCircle, ChevronDown, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import esapLogo from 'figma:asset/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { SystemSwitcher } from '../esap/SystemSwitcher';
import { NotificacionesArquitectura } from './NotificacionesArquitectura';

interface AuthenticatedPortalNavbarProps {
  userName: string;
  userEmail: string;
  userRoles?: string[];
  activeRole?: string;
  onLogout: () => void;
  onNavigate?: (section: string) => void;
  onSystemChange?: (system: 'backoffice' | 'portal') => void;
  currentSection?: string;
  hasBothSystemsAccess?: boolean;
}

export function AuthenticatedPortalNavbar({
  userName,
  userEmail,
  userRoles,
  activeRole = 'Estudiante',
  onLogout,
  onNavigate,
  onSystemChange,
  currentSection = 'inicio',
  hasBothSystemsAccess,
}: AuthenticatedPortalNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const navigationItems = [
    { id: 'inicio', label: 'Inicio', href: '#' },
    { id: 'servicios', label: 'Servicios', href: '#servicios' },
    { id: 'certificado', label: 'Certificado', href: '#certificado' },
    { id: 'empleo', label: 'Empleo', href: '#empleo' },
    { id: 'convocatorias', label: 'Convocatorias', href: '#convocatorias' },
    { id: 'investigacion', label: 'Investigación', href: '#investigacion' },
    { id: 'eventos', label: 'Eventos', href: '#eventos' },
  ];

  const notifications = [
    {
      id: 1,
      title: 'Nueva Oferta de Empleo',
      description: 'Analista de Políticas Públicas - Bogotá',
      time: 'Hace 2 horas',
      type: 'empleo',
      unread: true,
    },
    {
      id: 2,
      title: 'Certificado Generado',
      description: 'Tu certificado de notas está disponible',
      time: 'Hace 5 horas',
      type: 'certificado',
      unread: true,
    },
    {
      id: 3,
      title: 'Nuevo Evento',
      description: 'Webinar: Transformación Digital en el Sector Público',
      time: 'Hace 1 día',
      type: 'evento',
      unread: false,
    },
  ];

  const handleNavClick = (section: string) => {
    onNavigate?.(section);
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    toast.info('Cerrando sesión...', {
      description: 'Nos vemos pronto en la Comunidad ESAP',
      duration: 2000,
    });
    setTimeout(() => {
      onLogout();
    }, 500);
  };

  const handleNotificationClick = (notif: typeof notifications[0]) => {
    toast.success('Notificación', {
      description: notif.description,
    });
    setNotificationsOpen(false);
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  // Get initials for avatar
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Nombre */}
          <div className="flex items-center gap-3">
            {/* Logo ESAP */}
            <div className="flex items-center gap-2">
              <img 
                src={esapLogo} 
                alt="ESAP - Escuela Superior de Administración Pública" 
                className="h-10 w-auto"
              />
            </div>
          </div>

          {/* Acciones Derecha */}
          <div className="flex items-center gap-2">
            {/* Búsqueda - Solo Desktop */}
            <div className="hidden xl:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar..."
                  className="pl-9 w-64 h-9 bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
            </div>

            {/* Botón Búsqueda Mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="xl:hidden"
              onClick={() => {
                toast.info('Búsqueda', {
                  description: 'Función de búsqueda disponible en la barra inferior',
                });
              }}
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Notificaciones */}
            <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[11px] flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[90vw] sm:w-96">
                <SheetHeader>
                  <SheetTitle className="flex items-center justify-between">
                    <span>Notificaciones</span>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        {unreadCount} nuevas
                      </Badge>
                    )}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-3">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        notif.unread
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold text-sm text-gray-900">
                          {notif.title}
                        </h4>
                        {notif.unread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{notif.description}</p>
                      <span className="text-xs text-gray-500">{notif.time}</span>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            {/* Notificaciones de Arquitectura Empresarial */}
            <NotificacionesArquitectura userRole={activeRole} />

            {/* System Switcher - Solo para usuarios con acceso dual */}
            {hasBothSystemsAccess && onSystemChange && (
              <SystemSwitcher
                currentSystem="portal"
                onSystemChange={onSystemChange}
              />
            )}

            {/* Menú Usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-all">
                  <Avatar className="w-8 h-8 border-2 border-[#1e5da8]">
                    <AvatarImage
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop"
                      alt={userName}
                    />
                    <AvatarFallback className="bg-[#1e5da8] text-white text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      {userName}
                    </p>
                    <p className="text-xs text-gray-600 leading-tight">Estudiante ESAP</p>
                  </div>
                  <ChevronDown className="hidden sm:block w-4 h-4 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-semibold text-sm">{userName}</p>
                    <p className="text-xs text-gray-600">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    toast.info('Mi Perfil', {
                      description: 'Módulo en desarrollo',
                    });
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast.info('Configuración', {
                      description: 'Módulo en desarrollo',
                    });
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast.info('Centro de Ayuda', {
                      description: 'Próximamente disponible',
                    });
                  }}
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Centro de Ayuda
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogoutClick}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menú Mobile */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[80vw] sm:w-80">
                <SheetHeader>
                  <SheetTitle>Menú</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-1">
                  {navigationItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        currentSection === item.id
                          ? 'text-[#1e5da8] bg-blue-50'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}