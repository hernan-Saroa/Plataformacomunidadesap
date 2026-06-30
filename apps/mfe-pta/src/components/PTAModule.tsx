import { useMemo } from 'react';
// import '../styles/esap-theme.css';
// import '../styles/responsive.css';
// import '../styles/globals.css';
// import '../styles/accessibility.css';
import '../styles/pta-world-class.css';
import { PtaBackofficeModule } from './pta/PtaBackofficeModule';
import { NotificationsProvider } from './esap/NotificationsContext';
import { AuthProvider } from '../contexts/AuthContext';
import { Toaster } from '@esap-mfe/shared-ui/sonner';

export type PTAModuleProps = {
  userPersonId?: string;
  userName?: string;
  userEmail?: string;
  userRoles?: string[];
  userPermissions?: string[];
  embedded?: boolean;
  /** Vista inicial al montar el módulo (ej: 'banco_docentes') */
  initialView?: string;
};

function deriveIsSuperUser(userRoles?: string[], userEmail?: string) {
  if (userEmail && String(userEmail).toLowerCase().trim() === 'desarrollo.ccd@esap.edu.co') return true;
  if (!Array.isArray(userRoles)) return false;
  return userRoles.some((role) => {
    const r = String(role).toLowerCase();
    return r.includes('super') || r.includes('admin');
  });
}

export function PTAModule({
  userPersonId,
  userName,
  userEmail,
  userRoles,
  userPermissions = [],
  embedded = false,
  initialView,
}: PTAModuleProps) {
  const title = useMemo(() => 'Backoffice PTA', []);
  const isSuperUser = deriveIsSuperUser(userRoles, userEmail);

  return (
    <AuthProvider
      userPersonId={userPersonId}
      userEmail={userEmail}
      userName={userName}
      userRole={userRoles?.[0]}
      isSuperUser={isSuperUser}
      permisos={userPermissions}
      sessionRol={userRoles?.[0]}
    >
      <NotificationsProvider>
        <>
          <Toaster 
            position="bottom-right" 
            richColors 
            closeButton 
            toastOptions={{
              classNames: {
                closeButton: 'left-2 right-auto hover:bg-gray-200 bg-white border-gray-200'
              }
            }}
          />
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
              <PtaBackofficeModule initialView={initialView} />
            </div>
          </div>
        </>
      </NotificationsProvider>
    </AuthProvider>
  );
}

export { PTAModule as PTAKanbanModule };

export default PTAModule;
