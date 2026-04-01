import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DisciplinaryNews } from './disciplinary-news.entity';
import { DisciplinaryProcess } from './disciplinary-process.entity';

@Entity('disciplinary_news_processes')
export class DisciplinaryNewsProcess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DisciplinaryNews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'newsId' })
  news: DisciplinaryNews;

  @Column({ name: 'news_id', type: 'uuid' })
  newsId: string;

  @ManyToOne(() => DisciplinaryProcess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'process_id' })
  process: DisciplinaryProcess;

  @Column({ name: 'process_id', type: 'uuid' })
  processId: string;

  @Column({
    name: 'fecha_asociacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaAsociacion: Date;

  @Column({ name: 'justificacion', type: 'text', nullable: true })
  justificacion: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}