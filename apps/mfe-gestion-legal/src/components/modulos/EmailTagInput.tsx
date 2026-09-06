/**
 * EmailTagInput - Campo de destinatarios tipo Outlook (chips ilimitados,
 * autocompletado de contactos institucionales). Compartido entre los modales
 * de Nueva Comunicación, Reenviar y Responder correo.
 */

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { correosJuridicosService, type DestinatarioSugerido } from '../../../../services/api/legal.service';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SOURCE_LABEL: Record<DestinatarioSugerido['source'], string> = {
  contacto: 'Contacto',
  frecuente: 'Frecuente',
  directorio: 'Directorio',
};

// ── Chip de email individual ──────────────────────────────────────────────────
function EmailChip({
  email,
  onRemove,
  readOnly = false,
}: {
  email: string;
  onRemove: () => void;
  readOnly?: boolean;
}) {
  const valid = EMAIL_REGEX.test(email);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border select-none ${
        valid
          ? 'bg-blue-50 text-blue-800 border-blue-200'
          : 'bg-red-50 text-red-700 border-red-300'
      }`}
    >
      {email}
      {!readOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
          aria-label={`Eliminar ${email}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// ── Campo de destinatarios tipo Outlook ───────────────────────────────────────
export function EmailTagInput({
  id,
  emails,
  onEmailsChange,
  placeholder = 'nombre@ejemplo.com',
  readOnly = false,
  buzon,
}: {
  id: string;
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
  buzon?: string;
}) {
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<DestinatarioSugerido[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  // Autocompletado: busca contactos institucionales de Outlook (contactos, personas
  // frecuentes y directorio) 300ms después de que el usuario deja de escribir.
  useEffect(() => {
    if (readOnly) return;
    const q = inputValue.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchDone(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const reqId = ++requestIdRef.current;
    setSearchDone(false);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const results = await correosJuridicosService.buscarDestinatarios(q, buzon);
        if (reqId !== requestIdRef.current) return;
        setSuggestions(results.filter((r) => !emails.includes(r.email)));
        setShowSuggestions(true);
        setActiveSuggestion(0);
      } catch {
        if (reqId === requestIdRef.current) setSuggestions([]);
      } finally {
        if (reqId === requestIdRef.current) {
          setLoadingSuggestions(false);
          setSearchDone(true);
        }
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `emails` sólo se usa para filtrar, no debe re-disparar la búsqueda
  }, [inputValue, buzon, readOnly]);

  const commitInput = (raw: string) => {
    const trimmed = raw.trim().replace(/[,;]+$/, '').trim();
    if (!trimmed) return;
    if (!emails.includes(trimmed)) {
      onEmailsChange([...emails, trimmed]);
    }
    setInputValue('');
  };

  const selectSuggestion = (suggestion?: DestinatarioSugerido) => {
    if (!suggestion) return;
    if (!emails.includes(suggestion.email)) {
      onEmailsChange([...emails, suggestion.email]);
    }
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestion(0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectSuggestion(suggestions[activeSuggestion]);
        return;
      }
    }
    if (['Enter', ',', ';', 'Tab'].includes(e.key)) {
      e.preventDefault();
      commitInput(inputValue);
      return;
    }
    // Backspace sobre campo vacío → elimina el último chip
    if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      onEmailsChange(emails.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const candidates = pasted.split(/[,;\s\n\r]+/).map((s) => s.trim()).filter(Boolean);
    const newEmails = [...emails];
    for (const c of candidates) {
      if (!newEmails.includes(c)) newEmails.push(c);
    }
    onEmailsChange(newEmails);
    setInputValue('');
  };

  const handleBlur = () => {
    commitInput(inputValue);
    setFocused(false);
    setShowSuggestions(false);
  };

  const removeEmail = (idx: number) => {
    onEmailsChange(emails.filter((_, i) => i !== idx));
  };

  const invalidCount = emails.filter((e) => !EMAIL_REGEX.test(e)).length;

  return (
    <div className="space-y-1">
      <div
        ref={containerRef}
        onClick={() => !readOnly && inputRef.current?.focus()}
        className={`relative min-h-[42px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-md border bg-white cursor-text transition-colors ${
          readOnly
            ? 'bg-gray-100 cursor-not-allowed border-gray-200'
            : focused
            ? 'border-blue-500 ring-2 ring-blue-100'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {emails.map((email, idx) => (
          <EmailChip key={idx} email={email} onRemove={() => removeEmail(idx)} readOnly={readOnly} />
        ))}
        {!readOnly && (
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => {
              setFocused(true);
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={handleBlur}
            placeholder={emails.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[180px] outline-none text-sm bg-transparent placeholder:text-gray-400 text-gray-900"
            autoComplete="off"
          />
        )}

        {!readOnly && showSuggestions && (loadingSuggestions || suggestions.length > 0 || searchDone) && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
            {loadingSuggestions ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Buscando en Outlook…
              </div>
            ) : suggestions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400">
                Sin resultados en Outlook
              </div>
            ) : (
              suggestions.map((s, idx) => (
                <button
                  key={s.email}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(s)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    idx === activeSuggestion ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-900">{s.name}</span>
                    <span className="block truncate text-xs text-gray-500">{s.email}</span>
                  </span>
                  <span className="flex-shrink-0 text-[10px] uppercase tracking-wide text-gray-400">
                    {SOURCE_LABEL[s.source]}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {invalidCount > 0 && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {invalidCount} dirección{invalidCount > 1 ? 'es inválidas' : ' inválida'} (se resaltan en rojo)
        </p>
      )}
      {!readOnly && (
        <p className="text-xs text-gray-400">
          Presione <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">Enter</kbd>,{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">,</kbd> o{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">Tab</kbd>{' '}
          para agregar · Pegue múltiples correos a la vez · Escriba un nombre para ver sugerencias de Outlook
        </p>
      )}
    </div>
  );
}
