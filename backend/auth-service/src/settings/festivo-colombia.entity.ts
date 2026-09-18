import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidad que almacena los días festivos oficiales de Colombia en el esquema 'auth'
 * como catálogo maestro transversal para todos los microservicios de la ESAP.
 */
@Entity({ name: 'festivos_colombia', schema: 'auth' })
@Index('idx_auth_festivos_fecha', ['fecha'])
export class FestivoColombia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'fecha', type: 'date', unique: true })
  fecha: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 150 })
  descripcion: string;

  @Column({
    name: 'origen',
    type: 'varchar',
    length: 150,
    nullable: true,
    default: 'Ley 51/1983',
  })
  origen: string;

  @Column({
    name: 'regla',
    type: 'varchar',
    length: 50,
    nullable: true,
    default: 'fixed',
  })
  regla: string;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp' })
  actualizadoEn: Date;
}
