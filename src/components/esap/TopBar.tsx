import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { DarkModeToggle } from './DarkModeToggle';
import { UserMenu } from './UserMenu';
import { NotificationsPanelV2 } from './NotificationsPanelV2';
import { HelpCenter } from './HelpCenter';
import { GlobalSearch } from '../shared/GlobalSearch';
import { SystemSwitcher } from './SystemSwitcher';
import { toast } from 'sonner';
import { useNotifications } from './NotificationsContext';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopBarProps {
  onToggleSidebar: () => void;
  density: 'compact' | 'comfortable';
  onDensityChange: (density: 'compact' | 'comfortable') => void;
  onLogout?: () => void;
  onViewProfile?: () => void;
  onBackToSystemSelector?: () => void;
  onSystemChange?: (system: 'backoffice' | 'portal') => void;
  currentSystem?: 'backoffice' | 'portal';
  hasBothSystemsAccess?: boolean;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userInitials?: string;
  userId?: string;
  currentRole?: string;
  onRoleChange?: (roleId: string, roleName: string) => void;
  breadcrumbs?: BreadcrumbItem[];
  moduleTitle?: string;
}

export function TopBar({ 
  onToggleSidebar, 
  density, 
  onDensityChange,
  onLogout,
  onViewProfile,
  onBackToSystemSelector,
  onSystemChange,
  currentSystem,
  hasBothSystemsAccess,
  userName = 'Héctor Admin',
  userEmail = 'hadmin@esap.edu.co',
  userRole = 'Super Administrador',
  userInitials = 'HA',
  userId = '1',
  currentRole = 'Administrativo',
  onRoleChange,
  breadcrumbs = [],
  moduleTitle = 'Dashboard'
}: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();
  
  return (
    <div
      className="bg-white border-b border-[--esap-gray-200] px-4 md:px-6 lg:px-4 xl:px-6 2xl:px-8 py-3 lg:py-2.5 xl:py-3 2xl:py-4 flex items-center justify-between sticky top-0 z-[101]"
      style={{ boxShadow: 'var(--esap-shadow-sm)' }}
    >
      <div className="flex items-center gap-3 lg:gap-2.5 xl:gap-3 2xl:gap-4 flex-1">
        {/* Mobile Menu Button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-1.5">
          {/* Breadcrumb Dinámico - Mobile First */}
          <div className="flex items-center gap-2 text-sm lg:text-xs xl:text-sm overflow-x-auto">
            {/* Mostrar breadcrumbs si existen */}
            {breadcrumbs.length > 0 ? (
              <>
                {breadcrumbs.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 flex-shrink-0">
                    <span className={index === breadcrumbs.length - 1 
                      ? "text-[--esap-gray-900] font-semibold" 
                      : "text-[--esap-gray-600] hidden sm:inline"}>
                      {item.label}
                    </span>
                    {index < breadcrumbs.length - 1 && (
                      <span className="text-[--esap-gray-400] hidden sm:inline">›</span>
                    )}
                  </div>
                ))}
              </>
            ) : (
              /* Fallback: solo mostrar título del módulo */
              <span className="text-[--esap-gray-900] font-semibold truncate max-w-[200px] lg:max-w-[150px] xl:max-w-[200px]">
                {moduleTitle}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-1.5 xl:gap-2 2xl:gap-3">
        {/* Notifications V2 */}
        <button
          onClick={() => setShowNotifications(true)}
          className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
          aria-label="Notificaciones"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Badge temporal - reemplazar con unreadCount del hook */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        <NotificationsPanelV2
          userId={userId}
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />

        {/* Dark Mode Toggle */}
        <DarkModeToggle />

        <HelpCenter />

        {/* System Switcher - Solo para usuarios con acceso dual */}
        {hasBothSystemsAccess && currentSystem && onSystemChange && (
          <SystemSwitcher
            currentSystem={currentSystem}
            onSystemChange={onSystemChange}
          />
        )}

        <UserMenu
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userInitials={userInitials}
          onLogout={onLogout}
          onViewProfile={onViewProfile}
          onBackToSystemSelector={onBackToSystemSelector}
          onSystemChange={onSystemChange}
          currentSystem={currentSystem}
          hasBothSystemsAccess={hasBothSystemsAccess}
        />
      </div>
    </div>
  );
}