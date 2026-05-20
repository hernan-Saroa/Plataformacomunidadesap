/**
 * Portal Dashboard - Orchestrator (Legacy PTA)
 *
 * Migrado desde `PlataformaDeGestion-PTA-mergue_full` para que el layout académico
 * quede idéntico al portal transaccional original.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RoleSelector } from './RoleSelector';
import { AuthenticatedPortalNavbar } from './AuthenticatedPortalNavbar';
import { PortalTransaccional } from './PortalTransaccional';

interface PortalDashboardProps {
  userName: string;
  userEmail: string;
  userPersonId: string;
  userRoles: string[];
  userPermissions?: string[];
  userData?: any;
  onActiveRoleChange?: (role: string) => void;
  onLogout?: () => void;
  hasBothSystemsAccess?: boolean;
  onSystemChange?: (system: 'backoffice' | 'portal') => void;
}

const normalizePortalRoleCode = (role?: string | null) =>
  String(role || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');

const displayPortalRoleFromCode = (roleCode?: string | null) => {
  const code = normalizePortalRoleCode(roleCode);
  const labels: Record<string, string> = {
    DOCENTE: 'Docente',
    ESTUDIANTE: 'Estudiante',
    GRADUADO: 'Graduado',
    EGRESADO: 'Graduado',
    ASPIRANTE: 'Aspirante',
    ADMINISTRATIVO: 'Administrativo',
    FUNCIONARIO: 'Administrativo',
    SUPER_ADMIN: 'Super Administrador',
  };
  return labels[code] || roleCode || 'Estudiante';
};

export function PortalDashboard({
  userName,
  userEmail,
  userPersonId,
  userRoles,
  userPermissions,
  userData,
  onActiveRoleChange,
  onLogout,
  hasBothSystemsAccess = false,
  onSystemChange,
}: PortalDashboardProps) {
  const portalRoleCodes = useMemo(
    () =>
      Array.from(
        new Set(((Array.isArray(userData?.roles) && userData.roles.length ? userData.roles : userRoles) || []).map(normalizePortalRoleCode).filter(Boolean)),
      ),
    [userData?.roles, userRoles],
  );
  const initialRoleCode = normalizePortalRoleCode(userData?.rol_principal || portalRoleCodes[0] || 'ESTUDIANTE');
  const [activeRoleCode, setActiveRoleCode] = useState<string>(initialRoleCode);
  const activeRole = displayPortalRoleFromCode(activeRoleCode);
  const [navbarNavigateTo, setNavbarNavigateTo] = useState<string | null>(null);
  const navCounter = useRef(0);
  const [currentSection, setCurrentSection] = useState<string>('inicio');

  useEffect(() => {
    const storageKey = `portal_active_role_${userPersonId}`;
    const savedRole = localStorage.getItem(storageKey);

    const savedRoleCode = normalizePortalRoleCode(savedRole);
    const savedRoleMatches = savedRoleCode && portalRoleCodes.includes(savedRoleCode);

    if (savedRoleMatches) {
      setActiveRoleCode(savedRoleCode);
      onActiveRoleChange?.(displayPortalRoleFromCode(savedRoleCode));
    } else {
      const validRoleCode = portalRoleCodes.find((roleCode) =>
        ['ESTUDIANTE', 'DOCENTE', 'GRADUADO', 'EGRESADO', 'ASPIRANTE', 'ADMINISTRATIVO'].includes(roleCode),
      );
      if (validRoleCode) {
        setActiveRoleCode(validRoleCode);
        onActiveRoleChange?.(displayPortalRoleFromCode(validRoleCode));
      }
    }
  }, [userPersonId, portalRoleCodes, onActiveRoleChange]);

  useEffect(() => {
    const storageKey = `portal_active_role_${userPersonId}`;
    localStorage.setItem(storageKey, activeRoleCode);
    onActiveRoleChange?.(activeRole);
  }, [activeRoleCode, activeRole, userPersonId, onActiveRoleChange]);

  const handleRoleChange = (newRole: string) => {
    const selectedCode =
      portalRoleCodes.find((roleCode) => displayPortalRoleFromCode(roleCode) === newRole) ||
      normalizePortalRoleCode(newRole);
    setActiveRoleCode(selectedCode);
    onActiveRoleChange?.(displayPortalRoleFromCode(selectedCode));
  };

  const handleNavbarNavigate = useCallback((section: string) => {
    navCounter.current += 1;
    setCurrentSection(section === 'dashboard' ? 'inicio' : section);
    setNavbarNavigateTo(`${section}::${navCounter.current}`);
  }, []);

  const roleData = userData?.datos_por_rol || {};
  const portalDisplayRoles = Array.from(new Set(portalRoleCodes.map(displayPortalRoleFromCode)));

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
        roles={portalDisplayRoles}
        userRoles={portalDisplayRoles}
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
            activeRoleCode={activeRoleCode}
            userPermissions={userPermissions}
            adminData={roleData?.Administrativo}
            onLogout={onLogout}
            navbarNavigateTo={navbarNavigateTo}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
