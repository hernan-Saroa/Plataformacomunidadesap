import {  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn , BeforeInsert, BeforeUpdate } from 'typeorm';
import { TerritorialEntity } from './territorial.entity';

@Entity({ schema: 'academic_work_plan', name: 'Sede' })
export class SedeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'territorialId', type: 'text', nullable: true })
  territorialId: string | null;

  @ManyToOne(() => TerritorialEntity, (territorial) => territorial.sedes, { nullable: true })
  @JoinColumn({ name: 'territorialId' })
  territorial: TerritorialEntity;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  municipio: string | null;

  @Column({ type: 'text', nullable: true })
  codigo: string | null;

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
