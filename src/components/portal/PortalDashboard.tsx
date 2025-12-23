/**
 * Portal Dashboard - Orchestrator
 * 
 * Componente principal que maneja la visualización de diferentes vistas
 * según los roles activos del Usuario Persona.
 * 
 * ARQUITECTURA:
 * - Soporta múltiples roles simultáneos
 * - Selector de roles para cambiar entre vistas
 * - Persistencia del rol seleccionado
 * - Vista única si solo tiene un rol
 * 
 * ALINEADO CON: PROMPT_LOGICA_USUARIOS_ESAP_v2_ALINEADO.md
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RoleSelector } from './RoleSelector';
import { StudentView } from './StudentView';
import { TeacherView } from './TeacherView';
import { GraduateView } from './GraduateView';
import { AdminView } from './AdminView';
import { AspirantView } from './AspirantView';
import { AuthenticatedPortalNavbar } from './AuthenticatedPortalNavbar';

interface PortalDashboardProps {
  userName: string;
  userEmail: string;
  userPersonId: string;
  userRoles: string[];
  userData?: any; // Datos completos del usuario del backend
  onActiveRoleChange?: (role: string) => void;
  onLogout?: () => void;
}

export function PortalDashboard({
  userName,
  userEmail,
  userPersonId,
  userRoles,
  userData,
  onActiveRoleChange,
  onLogout,
}: PortalDashboardProps) {
  // Determinar rol inicial (principal o primero de la lista)
  const initialRole = userData?.rol_principal || userRoles[0] || 'Estudiante';
  const [activeRole, setActiveRole] = useState<string>(initialRole);

  // Cargar rol persistido en localStorage al montar
  useEffect(() => {
    const storageKey = `portal_active_role_${userPersonId}`;
    const savedRole = localStorage.getItem(storageKey);
    
    // Solo cargar si el rol guardado está en la lista de roles actuales
    if (savedRole && userRoles.includes(savedRole)) {
      setActiveRole(savedRole);
      onActiveRoleChange?.(savedRole);
    } else {
      // Si no hay rol guardado o no es válido, usar un rol del portal si existe
      const portalRoles = ['Estudiante', 'Docente', 'Graduado', 'Aspirante', 'Administrativo'];
      const validRole = userRoles.find(role => portalRoles.includes(role));
      if (validRole) {
        setActiveRole(validRole);
        onActiveRoleChange?.(validRole);
      }
    }
  }, [userPersonId, userRoles, onActiveRoleChange]);

  // Persistir rol seleccionado cuando cambia
  useEffect(() => {
    const storageKey = `portal_active_role_${userPersonId}`;
    localStorage.setItem(storageKey, activeRole);
    onActiveRoleChange?.(activeRole);
  }, [activeRole, userPersonId, onActiveRoleChange]);

  // Handler para cambio de rol
  const handleRoleChange = (newRole: string) => {
    setActiveRole(newRole);
    onActiveRoleChange?.(newRole);
  };

  // Extraer datos específicos por rol
  const roleData = userData?.datos_por_rol || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Autenticado */}
      {onLogout && (
        <AuthenticatedPortalNavbar
          userName={userName}
          userEmail={userEmail}
          userRoles={userRoles}
          activeRole={activeRole}
          onLogout={onLogout}
          currentSection="inicio"
        />
      )}

      {/* Selector de roles (solo si tiene múltiples) */}
      <RoleSelector
        userRoles={userRoles}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
      />

      {/* Vista según rol activo con animación */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeRole}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeRole === 'Estudiante' && (
            <StudentView
              userName={userName}
              userEmail={userEmail}
              studentData={roleData.Estudiante}
            />
          )}

          {activeRole === 'Docente' && (
            <TeacherView
              userName={userName}
              userEmail={userEmail}
              teacherData={roleData.Docente}
            />
          )}

          {activeRole === 'Graduado' && (
            <GraduateView
              userName={userName}
              userEmail={userEmail}
              graduateData={roleData.Graduado}
            />
          )}

          {activeRole === 'Administrativo' && (
            <AdminView
              userName={userName}
              userEmail={userEmail}
              adminData={roleData.Administrativo}
            />
          )}

          {activeRole === 'Aspirante' && (
            <AspirantView
              userName={userName}
              userEmail={userEmail}
              aspirantData={roleData.Aspirante}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}