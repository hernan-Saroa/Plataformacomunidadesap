import { DataSource } from 'typeorm';
import { PlanAnual5Roles } from './entities/plan-anual-5-roles.entity';
import { RolPlanAnual5 } from './entities/rol-plan-anual-5.entity';
import { ActividadPlanAnual5 } from './entities/actividad-plan-anual-5.entity';

/**
 * Seed del Plan Anual 5 Roles
 * 
 * NOTA: Este seed ha sido deshabilitado.
 * Los datos hardcodeados han sido removidos.
 * Los planes anuales deben crearse manualmente a través de la API del sistema.
 */

export async function seedPlanAnual5Roles(dataSource: DataSource): Promise<void> {
  console.log('⚠️  Seed de Plan Anual 5 Roles deshabilitado.');
  console.log('   Los planes deben crearse manualmente a través de la API.');
  return;
}
