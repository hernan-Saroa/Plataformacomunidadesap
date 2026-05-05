/**
 * Portal Dashboard - Orchestrator (Legacy PTA)
 *
 * Migrado desde `PlataformaDeGestion-PTA-mergue_full` para que el layout académico
 * quede idéntico al portal transaccional original.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RoleSelector } from './RoleSelector';
import { AuthenticatedPortalNavbar } from './AuthenticatedPortalNavbar';
import { PortalTransaccional } from './PortalTransaccional';

interface PortalDashboardProps {
  userName: string;
  userEmail: string;
  userPersonId: string;
  userRoles: string[];
  userData?: any;
  onActiveRoleChange?: (role: string) => void;
  onLogout?: () => void;
  hasBothSystemsAccess?: boolean;
  onSystemChange?: (system: 'backoffice' | 'portal') => void;
}

export function PortalDashboard({
  userName,
  userEmail,
  userPersonId,
  userRoles,
  userData,
  onActiveRoleChange,
  onLogout,
  hasBothSystemsAccess = false,
  onSystemChange,
}: PortalDashboardProps) {
  const initialRole = userData?.rol_principal || userRoles[0] || 'Estudiante';
  const [activeRole, setActiveRole] = useState<string>(initialRole);
  const [navbarNavigateTo, setNavbarNavigateTo] = useState<string | null>(null);
  const navCounter = useRef(0);
  const [currentSection, setCurrentSection] = useState<string>('inicio');

  useEffect(() => {
    const storageKey = `portal_active_role_${userPersonId}`;
    const savedRole = localStorage.getItem(storageKey);

    if (savedRole && userRoles.includes(savedRole)) {
      setActiveRole(savedRole);
      onActiveRoleChange?.(savedRole);
    } else {
      const portalRoles = ['Estudiante', 'Docente', 'Graduado', 'Aspirante', 'Administrativo'];
      const validRole = userRoles.find((role) => portalRoles.includes(role));
      if (validRole) {
        setActiveRole(validRole);
        onActiveRoleChange?.(validRole);
      }
    }
  }, [userPersonId, userRoles, onActiveRoleChange]);

  useEffect(() => {
    const storageKey = `portal_active_role_${userPersonId}`;
    localStorage.setItem(storageKey, activeRole);
    onActiveRoleChange?.(activeRole);
  }, [activeRole, userPersonId, onActiveRoleChange]);

  const handleRoleChange = (newRole: string) => {
    setActiveRole(newRole);
    onActiveRoleChange?.(newRole);
  };

  const handleNavbarNavigate = useCallback((section: string) => {
    navCounter.current += 1;
    setCurrentSection(section === 'dashboard' ? 'inicio' : section);
    setNavbarNavigateTo(`${section}::${navCounter.current}`);
  }, []);

  const roleData = userData?.datos_por_rol || {};

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>
      <AuthenticatedPortalNavbar
        userName={userName}
        userEmail={userEmail}
        userRoles={userRoles}
        activeRole={activeRole}
        onLogout={onLogout || (() => {})}
        onNavigate={handleNavbarNavigate}
        currentSection={currentSection}
        hasBothSystemsAccess={hasBothSystemsAccess}
        onSystemChange={onSystemChange}
      />

      <RoleSelector
        roles={userRoles}
        userRoles={userRoles}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeRole}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <PortalTransaccional
            userName={userName}
            userEmail={userEmail}
            userPersonId={userPersonId}
            activeRole={activeRole}
            adminData={roleData?.Administrativo}
            onLogout={onLogout}
            navbarNavigateTo={navbarNavigateTo}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
