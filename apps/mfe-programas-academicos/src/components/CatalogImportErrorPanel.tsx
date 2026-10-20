import { useId } from 'react';
import { AlertTriangle, ArrowLeft, FileSpreadsheet, Upload } from 'lucide-react';
import type { CatalogImportFailure } from '../utils/catalogImportError';
import './CatalogImportErrorPanel.css';

interface Props {
  failure: CatalogImportFailure;
  fileName?: string;
  periodo: string;
  onChangeFile: () => void;
  onBack: () => void;
}

export function CatalogImportErrorPanel({ failure, fileName, periodo, onChangeFile, onBack }: Props) {
  const headingId = useId();
  const listId = useId();
  const validation = failure.kind === 'validation';
  return (
    <section aria-labelledby={headingId} className="catalog-import-error">
      <div className="catalog-import-error__overview">
        <div className="catalog-import-error__summary" role="alert">
          <div className="catalog-import-error__symbol">
            <AlertTriangle aria-hidden="true" />
          </div>
          <div className="catalog-import-error__intro">
            <h2 id={headingId} className="catalog-import-error__title">{failure.title}</h2>
            <p className="catalog-import-error__description">{failure.description}</p>
          </div>
        </div>
        <div className="catalog-import-error__metadata">
          {fileName && (
            <span className="catalog-import-error__file">
              <FileSpreadsheet aria-hidden="true" />
              <span title={fileName}>{fileName}</span>
            </span>
          )}
          <span className="catalog-import-error__period">Período {periodo}</span>
        </div>
      </div>

      {failure.problems.length > 0 && (
        <div className="catalog-import-error__content">
          <div className="catalog-import-error__list-heading">
            <h3 id={listId}>Qué debes corregir</h3>
            <span className="catalog-import-error__count">
              {failure.problems.length} {failure.problems.length === 1 ? 'problema' : 'problemas'}
            </span>
          </div>
          <ol aria-labelledby={listId} tabIndex={0} className="catalog-import-error__list">
            {failure.problems.map((problem, index) => (
              <li key={index} className="catalog-import-error__problem">
                <div className="catalog-import-error__problem-heading">
                  <span className="catalog-import-error__row">{problem.row ? `Fila ${problem.row}` : `Problema ${index + 1}`}</span>
                  {problem.sheet && <span className="catalog-import-error__sheet">Hoja {problem.sheet}</span>}
                  {problem.reference && <span className="catalog-import-error__reference">{problem.reference}</span>}
                </div>
                <p className="catalog-import-error__message">{problem.message}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="catalog-import-error__actions">
        <button onClick={onBack} className="catalog-import-error__button catalog-import-error__button--secondary">
          <ArrowLeft aria-hidden="true" />Volver a programas
        </button>
        <button onClick={onChangeFile} className="catalog-import-error__button catalog-import-error__button--primary">
          <Upload aria-hidden="true" />{validation ? 'Cargar archivo corregido' : 'Seleccionar archivo'}
        </button>
      </div>
    </section>
  );
}
