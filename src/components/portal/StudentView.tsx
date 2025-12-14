/**
 * Vista de Estudiante - Portal Transaccional
 * 
 * Wrapper que renderiza el StudentDashboard completo con red social.
 * Mantiene compatibilidad con el sistema de múltiples roles.
 */

import { StudentDashboard } from './StudentDashboard';

interface StudentViewProps {
  userName: string;
  userEmail: string;
  studentData?: any;
}

export function StudentView({ userName, userEmail, studentData }: StudentViewProps) {
  // Simplemente renderizar el StudentDashboard completo
  return <StudentDashboard userName={userName} userEmail={userEmail} />;
}
