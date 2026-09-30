import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { BancoDocentesPTA } from './pta/banco-docentes/BancoDocentesPTA';
import '../styles/pta-world-class.css';
import '../styles/pta-notifications.css';

export interface RundModulePremiumProps {
  userPersonId?: string;
  userName?: string;
  userEmail?: string;
  userRoles?: string[];
  userPermissions?: string[];
  embedded?: boolean;
  usuario?: {
    nombre: string;
    email: string;
    rol: string;
    cedula?: string;
  };
  onLogout?: () => void;
}

function deriveIsSuperUser(userRoles?: string[], userEmail?: string) {
  if (userEmail && String(userEmail).toLowerCase().trim() === 'desarrollo.ccd@esap.edu.co') return true;
  if (!Array.isArray(userRoles)) return false;
  return userRoles.some((role) => {
    const code = String(typeof role === 'string' ? role : ((role as any)?.code ?? '')).toUpperCase().trim();
    return code === 'SUPER_ADMIN';
  });
}

export const RundModulePremium: React.FC<RundModulePremiumProps> = ({
  userPersonId,
  userName,
  userEmail,
  userRoles = [],
  userPermissions = [],
  embedded = false,
  usuario,
  onLogout,
}) => {
  const effectiveEmail = userEmail || usuario?.email;
  const effectiveName = userName || usuario?.nombre;
  const effectiveRoles = userRoles.length > 0 ? userRoles : (usuario?.rol ? [usuario.rol] : []);
  const isSuperUser = deriveIsSuperUser(effectiveRoles, effectiveEmail);

  return (
    <AuthProvider
      userPersonId={userPersonId}
      userEmail={effectiveEmail}
      userName={effectiveName}
      userRole={effectiveRoles[0]}
      isSuperUser={isSuperUser}
      permisos={userPermissions}
      sessionRol={effectiveRoles[0]}
    >
      <div className="min-h-screen bg-slate-50/50">
        <BancoDocentesPTA />
      </div>
    </AuthProvider>
  );
};

export default RundModulePremium;
