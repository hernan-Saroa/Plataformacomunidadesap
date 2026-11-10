import React from 'react';
import { FileText, FolderOpen, UploadCloud } from 'lucide-react';
import { RundCheckpointEvidence, RundPdfPicker } from './RundCheckpointEvidence';
import type { RundEvidenceField } from '../../../utils/rundEvidenceRules';

type SupportField = RundEvidenceField & { campo: string; documento: string };
export type RundSupportGroup = {
  field: SupportField;
  fields: SupportField[];
  evidences: any[];
  uploadField: SupportField;
  canUpload: boolean;
  canManage: boolean;
  dataSummary?: string;
};

export type RundSupportReview = {
  groups: RundSupportGroup[];
  canValidate: boolean;
  disabled: boolean;
  busy: string | null;
  onView: (evidence: any, group: RundSupportGroup, number: number) => void;
  onReview: (evidence: any, group: RundSupportGroup, estado: 'Aprobado' | 'Rechazado') => void;
  onUpload: (file: File, group: RundSupportGroup, evidence?: any) => void;
};

/** The workspace owns search, history and document tools; each evidence appears once. */
export function RundSupportList({ groups, canValidate, disabled, busy, onView, onReview, onUpload,
  matches = () => true, renderActions, renderDetails, filtered = false,
}: RundSupportReview & {
  matches?: (evidence: any, group: RundSupportGroup) => boolean;
  renderActions?: (evidence: any) => React.ReactNode;
  renderDetails?: (evidence: any) => React.ReactNode;
  filtered?: boolean;
}) {
  const available = groups.filter(group => group.evidences.length || group.canUpload);
  const unavailable = groups.filter(group => !group.evidences.length && !group.canUpload);
  const entries = available.map(group => ({ group, visible: group.evidences.filter(evidence => matches(evidence, group)) }))
    .filter(entry => !filtered || entry.visible.length > 0);
  const attached = entries.filter(entry => entry.group.evidences.length > 0);
  const empty = entries.filter(entry => entry.group.evidences.length === 0);
  const canAdd = empty.some(entry => entry.group.canManage && entry.group.canUpload);
  const renderGroup = ({ group, visible }: typeof entries[number]) => {
      return <article key={group.field.tipoSoporte} className={`rund-support-review__group${visible.length ? '' : ' rund-support-review__group--empty'}`}>
        <div className="rund-support-group-heading"><span className="rund-support-group-icon"><FileText size={17} aria-hidden="true" /></span>
          <div className="rund-support-group-copy">
            <div className="rund-support-group-title"><h4>{group.fields.length === 1 ? group.field.campo : group.field.documento}</h4>
              <span>{group.fields.length > 1 ? `${group.fields.length} datos asociados` : group.field.documento}</span>
            </div>
            {group.dataSummary && <p title={group.dataSummary}>{group.dataSummary}</p>}
            {group.field.tipoSoporte === 'convalidacion_men' && <small>Solo si corresponde a un título obtenido en el exterior.</small>}
            {!visible.length && !group.canManage && <small>El cargador puede adjuntar un PDF para respaldar este dato.</small>}
          </div>
          <div className="rund-support-group-controls">
            {group.evidences.length > 0 && <span className="rund-support-group-count">{group.evidences.length} {group.evidences.length === 1 ? 'archivo' : 'archivos'}</span>}
            {!visible.length && group.canManage && group.canUpload && <RundPdfPicker className="rund-checkpoint-upload"
              label={'Archivo de soporte para ' + group.uploadField.campo} disabled={disabled}
              onFile={file => onUpload(file, group)}><UploadCloud size={14} /> Adjuntar soporte</RundPdfPicker>}
          </div>
        </div>
        {visible.length > 0 && <div className="rund-support-group-files"><RundCheckpointEvidence field={group.field} evidences={group.evidences}
          visibleEvidenceIds={visible.map(evidence => evidence.id)} reviewFields={group.fields} showTools showHeading={false}
          canManage={group.canManage && group.canUpload} canValidate={canValidate}
          disabled={disabled} busy={busy} renderActions={renderActions} renderDetails={renderDetails}
          onView={(evidence, number) => onView(evidence, group, number)}
          onReview={(evidence, estado) => onReview(evidence, group, estado)}
          onReplace={(evidence, file) => onUpload(file, group, evidence)}
          onAdd={file => onUpload(file, group)} /></div>}
      </article>;
  };
  return <div className={`rund-support-list${attached.length && empty.length ? ' rund-support-list--mixed' : ''}`} role="group" aria-label="Soportes de esta sección">
    {!filtered && !available.length && <div className="rund-support-empty">
      <span><FileText size={22} aria-hidden="true" /></span>
      <div><strong>Aún no hay soportes para mostrar</strong>
        <p>Puedes continuar con la revisión de los datos. La carga se habilita cuando el dato correspondiente está registrado.</p></div>
    </div>}
    {attached.length > 0 && <section className="rund-support-attached" aria-label="Documentos adjuntos">
      <header className="rund-support-zone-heading"><span><FolderOpen size={18} aria-hidden="true" /></span>
        <div><strong>Documentos adjuntos</strong><p>{canValidate ? 'Consulta cada archivo y registra su revisión.' : 'Consulta los archivos asociados a esta sección.'}</p></div>
        <span className="rund-support-zone-count">{attached.reduce((count, entry) => count + entry.visible.length, 0)}</span>
      </header>
      <div className="rund-support-group-list">{attached.map(renderGroup)}</div>
    </section>}
    {empty.length > 0 && <section className="rund-support-upload-zone" aria-label="Soportes sin archivos">
      <header className="rund-support-zone-heading"><span><UploadCloud size={18} aria-hidden="true" /></span>
        <div><strong>{canAdd ? 'Agregar soportes' : 'Sin archivos adjuntos'}</strong><p>Carga opcional para los datos del perfil.</p></div>
        <span className="rund-support-zone-count">{empty.length}</span>
      </header>
      <div className="rund-support-upload-grid">{empty.map(renderGroup)}</div>
    </section>}
    {!filtered && unavailable.length > 0 && <details className="rund-support-unavailable">
      <summary>Otros soportes <span>{unavailable.length} sin dato registrado</span></summary>
      <p>Estos soportes se habilitan al registrar la información correspondiente en Editar datos.</p>
      <ul>{unavailable.map(group => <li key={group.field.tipoSoporte}>{group.field.campo}</li>)}</ul>
    </details>}
  </div>;
}
