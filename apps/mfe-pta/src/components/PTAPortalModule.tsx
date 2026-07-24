import { useMemo } from 'react';
// import '../styles/esap-theme.css';
// import '../styles/modo-compacto.css';
// import '../styles/responsive.css';
// import '../styles/globals.css';
// import '../styles/accessibility.css';
import '../styles/pta-world-class.css';
import { NotificationsProvider } from './esap/NotificationsContext';
import { AuthProvider } from '../contexts/AuthContext';
import { PortalDocentePTA } from './portal/pta/PortalDocentePTA';
import { Toaster } from '@esap-mfe/shared-ui/sonner';

export type PTAPortalModuleProps = {
  onBack: () => void;
  userPersonId: string;
  userName?: string;
  userEmail?: string;
  userRoles?: string[];
  /**
   * Cuando el MFE se renderiza embebido dentro del Shell, ocultamos cualquier chrome propio.
   */
  embedded?: boolean;
};

function deriveIsSuperUser(userRoles?: string[]) {
  if (!Array.isArray(userRoles)) return false;
  return userRoles.some((role) => {
    const r = String(role).toLowerCase();
    return r.includes('super') || r.includes('admin');
  });
}

export function PTAPortalModule({
  onBack,
  userPersonId,
  userName,
  userEmail,
  userRoles,
  embedded = true,
}: PTAPortalModuleProps) {
  const isSuperUser = deriveIsSuperUser(userRoles);
  const title = useMemo(() => 'Portal Docente PTA', []);

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
                <div className="mx-auto max-w-[1400px] px-4 py-3">
                  <div className="text-sm text-gray-500">PTA</div>
                  <div className="text-base font-semibold text-gray-900">{title}</div>
                </div>
              </div>
            )}

            <div className={embedded ? undefined : 'mx-auto max-w-[1400px]'}>
              <PortalDocentePTA
                onBack={onBack}
                userPersonId={userPersonId}
                userName={userName}
                userEmail={userEmail}
              />
            </div>
          </div>
        </>
      </NotificationsProvider>
    </AuthProvider>
  );
}

export default PTAPortalModule;
