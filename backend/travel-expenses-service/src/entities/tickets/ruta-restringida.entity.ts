import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Catálogo de rutas geográficas cuya conexión aérea está restringida
 * (RF-LIQ-003). Se consulta en el endpoint `/api/v1/tickets/validate`
 * para devolver al frontend el flag `requires_route_exception`.
 *
 * Tabla física: `travel_expenses.rutas_restringidas`.
 */
@Entity({ schema: 'travel_expenses', name: 'rutas_restringidas' })
@Index('idx_rutas_restringidas_origen_destino', [
  'origenCiudad',
  'destinoCiudad',
])
@Index('idx_rutas_restringidas_activo', ['activo'])
export class RutaRestringidaEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'origen_ciudad', type: 'varchar', length: 100 })
  origenCiudad: string;

  @Column({ name: 'destino_ciudad', type: 'varchar', length: 100 })
  destinoCiudad: string;

  @Column({
    name: 'descripcion_restriccion',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  descripcionRestriccion: string | null;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
