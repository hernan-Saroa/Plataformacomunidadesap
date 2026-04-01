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

  @Column('uuid')
  newsId: string;

  @ManyToOne(() => DisciplinaryProcess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'processId' })
  process: DisciplinaryProcess;

  @Column('uuid')
  processId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaAsociacion: Date;

  @Column({ type: 'text', nullable: true })
  justificacion: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}