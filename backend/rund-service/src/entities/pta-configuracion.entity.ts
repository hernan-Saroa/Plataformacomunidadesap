import {  Column, Entity, PrimaryColumn, BeforeInsert, BeforeUpdate } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'ConfiguracionSistema' })
export class PtaConfiguracionEntity {
  @PrimaryColumn({ name: 'clave', type: 'text' })
  id: string;

  @Column({ name: 'valor', type: 'jsonb', nullable: true })
  rules: any | null;

  @Column({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  setTimestamps() {
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
