import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type CategoriaPlantilla =
  | 'actas'
  | 'evidencias'
  | 'oficios'
  | 'pruebas'
  | 'comunicaciones'
  | 'notificaciones'
  | 'documentos-generales';

@Entity('plantillas_documentos', { schema: 'legal_management' })
export class PlantillaDocumento {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 500 })
    nombre: string;

    @Column({ length: 100 })
    categoria: string; // actas | evidencias | oficios | pruebas | comunicaciones | notificaciones | documentos-generales

    @Column({ name: 'nombre_original', length: 500 })
    nombreOriginal: string;

    @Column({ name: 'mime_type', length: 100 })
    mimeType: string;

    @Column({ name: 'tamano' })
    tamano: number;

    @Column({ name: 'contenido_base64', type: 'text' })
    contenidoBase64: string;

    @Column({ name: 'subido_por', length: 255, nullable: true })
    subidoPor: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
