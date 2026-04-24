import { useMemo } from 'react';
import '../styles/esap-theme.css';
import '../styles/modo-compacto.css';
import '../styles/responsive.css';
import '../styles/globals.css';
import '../styles/accessibility.css';
import '../styles/pta-world-class.css';
import { PtaBackofficeModule } from './pta/PtaBackofficeModule';
import { NotificationsProvider } from './esap/NotificationsContext';
import { AuthProvider } from '../contexts/AuthContext';

export type PTAModuleProps = {
  userPersonId?: string;
  userName?: string;
  userEmail?: string;
  userRoles?: string[];
  /**
   * Cuando el MFE se renderiza embebido dentro del Shell (Backoffice ESAP),
   * ocultamos el "chrome" propio (header/toggles) para evitar UI duplicada.
   */
  embedded?: boolean;
};

function deriveIsSuperUser(userRoles?: string[]) {
  if (!Array.isArray(userRoles)) return false;
  return userRoles.some((role) => String(role).toLowerCase().includes('super'));
}

export function PTAModule({
  userPersonId,
  userName,
  userEmail,
  userRoles,
  embedded = false,
}: PTAModuleProps) {
  const title = useMemo(() => 'Backoffice PTA', []);
  const isSuperUser = deriveIsSuperUser(userRoles);

  return (
    <AuthProvider
      userPersonId={userPersonId}
      userEmail={userEmail}
      userName={userName}
      userRole={userRoles?.[0]}
      isSuperUser={isSuperUser}
      permisos={[]}
      sessionRol={userRoles?.[0]}
    >
      <NotificationsProvider>
        <div className="min-h-screen">
          {!embedded && (
            <div className="sticky top-0 z-10 bg-white border-b">
              <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-500">PTA</div>
                  <div className="text-base font-semibold text-gray-900">{title}</div>
                </div>
              </div>
            </div>
          )}

          <div className={embedded ? undefined : 'mx-auto max-w-[1400px]'}>
            <PtaBackofficeModule />
          </div>
        </div>
      </NotificationsProvider>
    </AuthProvider>
  );
}

export { PTAModule as PTAKanbanModule };

export default PTAModule;
