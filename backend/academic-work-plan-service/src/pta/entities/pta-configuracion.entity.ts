import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'ConfiguracionSistema' })
export class PtaConfiguracionEntity {
  @PrimaryColumn({ name: 'clave', type: 'text' })
  id: string;

  @Column({ name: 'valor', type: 'jsonb', nullable: true })
  rules: any | null;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}
