import {  Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn , BeforeInsert, BeforeUpdate } from 'typeorm';
import { SedeEntity } from './sede.entity';

@Entity({ schema: 'academic_work_plan', name: 'Territorial' })
export class TerritorialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  codigo: string | null;

  @OneToMany(() => SedeEntity, (sede) => sede.territorial)
  sedes: SedeEntity[];

  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
