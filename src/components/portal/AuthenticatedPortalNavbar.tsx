import image_1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba from 'figma:asset/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';
import React, { useState } from 'react';
import { Search, Bell, ChevronDown, User, Settings, HelpCircle, LogOut, Menu } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
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
import { NotificacionesDropdown } from './NotificacionesDropdown';

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
  userRoles = [],
  activeRole,
  onLogout,
  onNavigate,
  onSystemChange,
  currentSection = 'inicio',
  hasBothSystemsAccess = false,
}: AuthenticatedPortalNavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.info(`Buscando: ${searchQuery}`);
    }
  };

  const handleLogout = () => {
    toast.success('Sesión cerrada exitosamente');
    onLogout();
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo y Nombre */}
          <div className="flex items-center gap-3">
            {/* Logo ESAP */}
            <div className="flex items-center gap-2">
              <img src={image_1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba} alt="ESAP Logo" className="h-10 w-auto object-contain ml-[150px]" />
            </div>
          </div>

          {/* Búsqueda (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-md">
            <form onSubmit={handleSearch} className="w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar servicios, trámites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 w-full bg-gray-50 border-gray-200 focus:bg-white"
              />
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* System Switcher (si tiene acceso a ambos sistemas) */}
            {hasBothSystemsAccess && onSystemChange && (
              <div className="hidden md:block">
                <SystemSwitcher
                  currentSystem="portal"
                  onSystemChange={onSystemChange}
                />
              </div>
            )}

            {/* Notificaciones */}
            <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Notificaciones</SheetTitle>
                </SheetHeader>
                <NotificacionesDropdown />
              </SheetContent>
            </Sheet>

            {/* Menú de Usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userName}`} />
                    <AvatarFallback className="bg-[#1e5da8] text-white text-sm">
                      {userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-semibold text-gray-900">{userName}</span>
                    {activeRole && (
                      <span className="text-xs text-gray-500">{activeRole}</span>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{userName}</p>
                    <p className="text-xs text-gray-500">{userEmail}</p>
                    {activeRole && (
                      <Badge variant="secondary" className="w-fit mt-1 text-xs">
                        {activeRole}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Ayuda
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Búsqueda Mobile */}
        <div className="lg:hidden pb-3">
          <form onSubmit={handleSearch} className="w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar servicios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 w-full bg-gray-50 border-gray-200"
            />
          </form>
        </div>
      </div>
    </header>
  );
}