import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('sequences')
export class Sequence {
  @PrimaryColumn()
  name: string; // Ej: "DISCIPLINARY_NEWS", "DISCIPLINARY_PROCESS"

  @Column({ default: 0 })
  currentValue: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
