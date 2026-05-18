import React, { useState, forwardRef, useEffect } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ESAPLogo } from '../assets/ESAPLogo';
import { PortalCommandPalette } from './PortalCommandPalette';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { toast } from 'sonner';
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

const NotificationButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { unreadCount?: number }
>((props, ref) => {
  const { unreadCount = 0, ...rest } = props;
  return (
    <button
      ref={ref}
      {...rest}
      className="relative flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      style={{
        minWidth: 40,
        minHeight: 40,
        width: 40,
        height: 40,
        borderRadius: 10,
        background: '#F3F4F6',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#E5E7EB';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#F3F4F6';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
    >
      <Bell style={{ width: 20, height: 20, color: '#374151', strokeWidth: 2 }} />
      {unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            minWidth: 18,
            minHeight: 18,
            padding: '0 4px',
            background: '#EF4444',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
          aria-hidden="true"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
});
NotificationButton.displayName = 'NotificationButton';

const UserMenuButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { userName: string; activeRole?: string }
>((props, ref) => {
  const { userName, activeRole, ...rest } = props;

  const safeUserName = userName || 'Usuario';
  const initials = safeUserName.substring(0, 2).toUpperCase();

  return (
    <button
      ref={ref}
      {...rest}
      className="flex items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      style={{
        paddingLeft: 8,
        paddingRight: 12,
        minHeight: 40,
        height: 40,
        borderRadius: 10,
        background: '#F3F4F6',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#E5E7EB';
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#F3F4F6';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      aria-label={`Menú de usuario: ${safeUserName}`}
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className="bg-[#003DA5] text-white text-[13px] font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="hidden sm:flex flex-col items-start min-w-0">
        <span className="text-[13px] md:text-[14px] lg:text-[15px] font-semibold text-gray-900 leading-snug whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px] md:max-w-[140px]">
          {safeUserName}
        </span>
        {activeRole && (
          <span className="text-[11px] md:text-[12px] font-medium text-gray-500 leading-snug whitespace-nowrap">
            {activeRole}
          </span>
        )}
      </div>
      <ChevronDown style={{ width: 16, height: 16, color: '#6B7280', flexShrink: 0 }} className="hidden sm:block" />
    </button>
  );
});
UserMenuButton.displayName = 'UserMenuButton';

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
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleLogout = () => {
    toast.success('Sesión cerrada exitosamente');
    onLogout();
  };

  const handleNotificationNavigate = (section: string) => {
    setShowNotifications(false);
    onNavigate?.(section);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key) {
          case 's':
          case 'S':
            e.preventDefault();
            setCommandOpen(true);
            break;
          case 'n':
          case 'N':
            e.preventDefault();
            setShowNotifications((prev) => !prev);
            break;
          case 'p':
          case 'P':
            e.preventDefault();
            onNavigate?.('mi-perfil');
            break;
          case '1':
            e.preventDefault();
            onNavigate?.('dashboard');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm transition-colors duration-300">
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 xl:px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4" style={{ minHeight: 64, height: 64 }}>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <ESAPLogo variant="color" className="h-8 sm:h-9 md:h-10 w-auto" />
            </div>
          </div>

          <div className="hidden lg:flex flex-1 max-w-md xl:max-w-lg relative">
            <button
              onClick={() => setCommandOpen(true)}
              className="w-full flex items-center justify-between pl-3 pr-2 h-10 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl transition-all shadow-sm text-sm text-gray-500 cursor-text group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span>Buscar servicios o comandos...</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded bg-white border border-gray-200 px-1.5 font-mono text-[10px] font-medium text-gray-500 shadow-sm">
                  <span className="text-[11px]">⌘</span>K
                </kbd>
              </div>
            </button>
          </div>

          <PortalCommandPalette
            open={commandOpen}
            onOpenChange={setCommandOpen}
            onNavigate={(route) => {
              if (route.startsWith('/')) {
                window.location.href = route;
              } else {
                onNavigate?.(route);
              }
            }}
            onLogout={handleLogout}
          />

          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            {hasBothSystemsAccess && onSystemChange && (
              <SystemSwitcher
                currentSystem="portal"
                onSystemChange={onSystemChange}
              />
            )}

            <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
              <DropdownMenuTrigger asChild>
                <NotificationButton unreadCount={0} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[380px] p-0">
                <NotificacionesDropdown onNavigate={handleNotificationNavigate} />
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() => onNavigate?.('configuracion')}
              className="relative flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{
                minWidth: 40,
                minHeight: 40,
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#F3F4F6',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E5E7EB';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F3F4F6';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              aria-label="Configuración"
            >
              <Settings style={{ width: 20, height: 20, color: '#374151', strokeWidth: 2 }} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <UserMenuButton userName={userName} activeRole={activeRole} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuLabel className="px-2 py-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-gray-900">{userName}</span>
                    <span className="text-xs text-gray-500">{userEmail}</span>
                    {activeRole && (
                      <Badge className="mt-1 w-fit bg-blue-100 text-blue-700">
                        {activeRole}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate?.('mi-perfil')} className="gap-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate?.('configuracion')} className="gap-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate?.('ayuda')} className="gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-500" />
                  Ayuda
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 text-red-500" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              className="lg:hidden w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="p-0">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle>Menú</SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <SheetDescription>Accesos rápidos del portal</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => { onNavigate?.('dashboard'); setMobileMenuOpen(false); }}>
              Inicio
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => { onNavigate?.('mi-perfil'); setMobileMenuOpen(false); }}>
              Perfil
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => { onNavigate?.('configuracion'); setMobileMenuOpen(false); }}>
              Configuración
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => { onNavigate?.('ayuda'); setMobileMenuOpen(false); }}>
              Ayuda
            </Button>
            <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
