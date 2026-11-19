import React, { useRef } from 'react';
import { CheckCircle, Eye, FilePlus2, FileText, Replace, ShieldAlert } from 'lucide-react';
import { rundActorName } from '../../../utils/rundActorName';
import { RUND_MAX_ARCHIVO_MB, RUND_MAX_EVIDENCES_PER_TYPE, rundDocumentDecision, rundEvidenceDecision, type RundEvidenceField } from '../../../utils/rundEvidenceRules';
import './RundCheckpointEvidence.css';

type Props = {
  field: RundEvidenceField & { campo: string; documento: string };
  evidences: any[];
  /** Shared files list their tools once, on the first row with data. */
  showTools: boolean;
  showHeading?: boolean;
  reviewFields?: RundEvidenceField[];
  canManage: boolean;
  canValidate: boolean;
  disabled: boolean;
  busy: string | null;
  onView: (evidence: any, number: number) => void;
  onReview: (evidence: any, estado: 'Aprobado' | 'Rechazado') => void;
  onReplace: (evidence: any, file: File) => void;
  onAdd: (file: File) => void;
  visibleEvidenceIds?: string[];
  renderActions?: (evidence: any) => React.ReactNode;
  renderDetails?: (evidence: any) => React.ReactNode;
};

const STATE_LABELS: Record<string, string> = { Aprobado: 'Admitida', Rechazado: 'Devuelta', Pendiente: 'Pendiente de revisión' };

/** Keyboard-operable button that opens a hidden PDF picker (a label around a hidden input cannot take focus). */
export function RundPdfPicker({ label, title, className, disabled, onFile, children, style }: {
  label: string; title?: string; className: string; disabled: boolean; onFile: (file: File) => void; children: React.ReactNode; style?: React.CSSProperties;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <>
    <button type="button" className={className} title={title} style={style} disabled={disabled} onClick={() => input.current?.click()}>{children}</button>
    <input ref={input} type="file" accept="application/pdf,.pdf" hidden aria-label={label} disabled={disabled} tabIndex={-1} onChange={event => {
      const file = event.target.files?.[0];
      if (file) onFile(file);
      event.target.value = '';
    }} />
  </>;
}

const formatDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleString('es-CO') : null;
};

export function RundCheckpointEvidence({ field, evidences, showTools, showHeading = true, reviewFields, canManage, canValidate, disabled, busy, onView, onReview, onReplace, onAdd, visibleEvidenceIds, renderActions, renderDetails }: Props) {
  const several = evidences.length > 1;
  const canAdd = showTools && canManage && evidences.length < RUND_MAX_EVIDENCES_PER_TYPE;

  return <div className="rund-checkpoint-evidence">
    {showHeading && <div className="rund-checkpoint-evidence__heading">
      <span className="rund-checkpoint-evidence__icon"><FileText size={16} aria-hidden="true" /></span>
      <div>
        <strong>{field.documento}</strong>
        <small>{evidences.length} {several ? 'soportes vigentes' : 'soporte vigente'} · una decisión por archivo</small>
        {!showTools && <small className="rund-checkpoint-evidence__shared">Documento compartido: se consulta y reemplaza en la primera fila de este soporte.</small>}
      </div>
    </div>}
    <ol className="rund-checkpoint-evidence__list" aria-label={`Evidencias de ${field.campo}`}>
      {evidences.map((evidence, index) => {
        if (visibleEvidenceIds && !visibleEvidenceIds.includes(evidence.id)) return null;
        const number = index + 1;
        const decision = reviewFields ? rundDocumentDecision(evidence, reviewFields) : rundEvidenceDecision(evidence, field);
        const reviewing = busy === `review-${evidence.id}`;
        const replacing = busy === `reemplazar-${evidence.id}`;
        const uploaded = formatDate(evidence.createdAt);
        const reviewed = formatDate(decision.fechaRevision || undefined);
        return <li key={evidence.id} className="rund-checkpoint-evidence__item" data-state={decision.estado}>
          <div className="rund-checkpoint-evidence__main">
            {several && <span className="rund-checkpoint-evidence__number">Evidencia {number}</span>}
            {showTools && <>
              <span className="rund-checkpoint-evidence__file" title={evidence.nombre_archivo}>{evidence.nombre_archivo || `Evidencia ${number}`}</span>
              <span className="rund-checkpoint-evidence__meta">
                {rundActorName(evidence.cargadoPorNombre, evidence.cargado_por)}{uploaded ? ` · ${uploaded}` : ''}
              </span>
            </>}
            <span className="rund-checkpoint-evidence__state" data-state={decision.estado}>
              {decision.estado === 'Aprobado' ? <CheckCircle size={12} aria-hidden="true" /> : decision.estado === 'Rechazado' ? <ShieldAlert size={12} aria-hidden="true" /> : null}
              {STATE_LABELS[decision.estado]}
              {decision.estado !== 'Pendiente' && decision.revisadoPorNombre ? ` · ${decision.revisadoPorNombre}` : ''}
              {decision.estado !== 'Pendiente' && reviewed ? ` · ${reviewed}` : ''}
            </span>
            {decision.estado === 'Rechazado' && decision.observacion && <p className="rund-checkpoint-evidence__note">{decision.observacion}</p>}
            {showTools && renderDetails?.(evidence)}
          </div>
          <div className="rund-checkpoint-evidence__actions">
            {showTools && <button type="button" className="rund-checkpoint-evidence__button" onClick={() => onView(evidence, number)}
              title={several ? `Ver evidencia ${number}` : undefined}>
              <Eye size={14} aria-hidden="true" /> Ver
            </button>}
            {showTools && canManage && <RundPdfPicker className="rund-checkpoint-evidence__button rund-checkpoint-evidence__icon-button"
              label={`Archivo para reemplazar ${several ? `la evidencia ${number}` : 'el documento'}`}
              title={`Reemplazar ${several ? `evidencia ${number}` : 'documento'} (PDF, máximo ${RUND_MAX_ARCHIVO_MB} MB). Se conserva la versión anterior.`}
              disabled={disabled || replacing} onFile={file => onReplace(evidence, file)}>
              <Replace size={13} aria-hidden="true" />
              <span className="rund-checkpoint-evidence__sr">Reemplazar {several ? `evidencia ${number}` : 'documento'}</span>
            </RundPdfPicker>}
            {showTools && renderActions?.(evidence)}
            {canValidate && decision.estado === 'Pendiente' && <>
              <button type="button" className="rund-checkpoint-evidence__button" data-variant="approve" disabled={disabled || reviewing}
                title={several ? `Admitir la evidencia ${number}: ${reviewFields ? field.documento : field.campo}` : undefined} onClick={() => onReview(evidence, 'Aprobado')}>
                <CheckCircle size={14} aria-hidden="true" /> Validar soporte
              </button>
              <button type="button" className="rund-checkpoint-evidence__button" data-variant="return" disabled={disabled || reviewing}
                title={several ? `Devolver la evidencia ${number}: ${reviewFields ? field.documento : field.campo}` : undefined} onClick={() => onReview(evidence, 'Rechazado')}>
                <ShieldAlert size={14} aria-hidden="true" /> Devolver soporte
              </button>
            </>}
          </div>
        </li>;
      })}
    </ol>
    {canAdd && <RundPdfPicker className="rund-checkpoint-evidence__add" label={`Archivo de otra evidencia para ${field.campo}`}
      disabled={disabled || busy === `subir-${field.campo}`} onFile={onAdd}>
      <FilePlus2 size={14} aria-hidden="true" />
      {busy === `subir-${field.campo}` ? 'Cargando…' : 'Agregar otra evidencia'}
    </RundPdfPicker>}
    {showTools && canManage && !canAdd && <p className="rund-checkpoint-evidence__limit">Máximo {RUND_MAX_EVIDENCES_PER_TYPE} evidencias vigentes. Reemplace o retire una para agregar otra.</p>}
  </div>;
}
