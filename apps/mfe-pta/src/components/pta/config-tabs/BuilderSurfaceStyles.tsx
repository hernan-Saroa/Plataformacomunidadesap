import React from 'react';

export function BuilderSurfaceStyles() {
  return (
    <style>{`
      .pta-config-builder .config-block-card input:not([title^="Posición"]):not([title^="Orden"]),
      .pta-config-builder .config-block-card select,
      .pta-config-builder .config-block-card textarea {
        color: #1e293b;
        background-color: #f1f5f9;
        border-color: #94a3b8;
        box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.07), 0 1px 2px rgba(15, 23, 42, 0.06);
        transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
      }
      .pta-config-builder .config-block-card input::placeholder,
      .pta-config-builder .config-block-card textarea::placeholder {
        color: #64748b;
        opacity: 0.85;
      }
      .pta-config-builder .config-block-card input:not([title^="Posición"]):not([title^="Orden"]):hover,
      .pta-config-builder .config-block-card select:hover,
      .pta-config-builder .config-block-card textarea:hover {
        background-color: #ffffff;
        border-color: #7c8da5;
      }
      .pta-config-builder .config-block-card input:not([title^="Posición"]):not([title^="Orden"]):focus,
      .pta-config-builder .config-block-card select:focus,
      .pta-config-builder .config-block-card textarea:focus {
        background-color: #ffffff;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
      }
      .pta-config-builder .config-block-body {
        border-top: 1px solid #cbd5e1;
        background: linear-gradient(145deg, #e2e8f0 0%, #f1f5f9 52%, #e0e7ff 100%);
      }
      .pta-config-builder .config-block-body > div {
        margin-bottom: 0.85rem;
        overflow: hidden;
        border: 1px solid #aab8ca;
        border-radius: 0.85rem;
        background: #f8fafc;
        box-shadow: 0 3px 8px rgba(15, 23, 42, 0.09);
      }
      .pta-config-builder .config-block-body > div:nth-child(even) {
        border-color: #a5b4fc;
        background: #eef2ff;
      }
      .pta-config-builder .config-block-body > div:last-child {
        margin-bottom: 0;
      }
      .pta-config-builder .config-activity-entry {
        margin-bottom: 0.65rem;
        border-width: 1px;
        border-left-width: 4px;
        border-radius: 0.75rem;
        padding: 0.55rem;
        box-shadow: 0 3px 7px rgba(15, 23, 42, 0.09);
      }
      .pta-config-builder .config-activity-entry:last-child {
        margin-bottom: 0;
      }
      .pta-config-builder .config-activity-entry:nth-of-type(3n + 1) {
        border-color: #93c5fd;
        border-left-color: #2563eb;
        background: #eaf3ff;
      }
      .pta-config-builder .config-activity-entry:nth-of-type(3n + 2) {
        border-color: #c4b5fd;
        border-left-color: #7c3aed;
        background: #f2edff;
      }
      .pta-config-builder .config-activity-entry:nth-of-type(3n) {
        border-color: #99f6e4;
        border-left-color: #0f766e;
        background: #e9fbf7;
      }
      .pta-config-builder .config-activity-main-row {
        border-color: #a8b6c8;
        background: #ffffff;
        box-shadow: 0 2px 5px rgba(15, 23, 42, 0.09);
      }
      .pta-config-builder .config-detail-panel {
        border: 1px solid #aebdce;
        border-left: 3px solid #60a5fa;
        border-radius: 0.6rem;
        background: #f1f5f9;
        padding: 0.5rem 0.65rem;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.07);
      }
      .pta-config-builder .config-detail-panel span {
        color: #475569;
      }
      .pta-config-builder .config-column-delete,
      .pta-config-builder .config-inline-delete,
      .pta-config-builder .config-block-delete {
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        border: 1px solid #fecaca;
        background: #fff1f2;
        color: #dc2626;
        opacity: 1;
        box-shadow: 0 1px 2px rgba(127, 29, 29, 0.08);
        transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
      }
      .pta-config-builder .config-column-delete {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 0.45rem;
      }
      .pta-config-builder .config-inline-delete {
        min-width: 1.65rem;
        width: 1.65rem;
        height: 1.65rem;
        border-radius: 0.45rem;
      }
      .pta-config-builder .config-block-delete {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.6rem;
      }
      .pta-config-builder .config-column-delete:hover,
      .pta-config-builder .config-inline-delete:hover,
      .pta-config-builder .config-block-delete:hover {
        border-color: #fca5a5;
        background: #fee2e2;
        color: #b91c1c;
        box-shadow: 0 2px 5px rgba(185, 28, 28, 0.16);
      }
      .pta-config-builder .config-column-delete:focus-visible,
      .pta-config-builder .config-inline-delete:focus-visible,
      .pta-config-builder .config-block-delete:focus-visible {
        outline: 2px solid #ef4444;
        outline-offset: 2px;
      }
      .pta-config-builder .config-column-delete svg,
      .pta-config-builder .config-inline-delete svg {
        width: 0.8rem;
        height: 0.8rem;
        stroke-width: 2.4;
      }
      .pta-config-builder .config-block-delete svg {
        width: 1rem;
        height: 1rem;
        stroke-width: 2.25;
      }
      /* ── Columnas de detalle en escalera (DetailColumnChain) ── */
      .pta-config-builder .config-chain-panel {
        min-width: 0;
        overflow: hidden;
        border: 1px solid #aebdce;
        border-left-width: 3px;
        border-radius: 0.6rem;
        background: #f8fafc;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.07);
      }
      .pta-config-builder .config-chain-panel + .config-chain-panel {
        margin-top: 0.45rem;
      }
      .pta-config-builder .config-chain-header {
        padding: 0.3rem 0.55rem;
        background: rgba(241, 245, 249, 0.85);
        border-bottom: 1px solid rgba(148, 163, 184, 0.35);
      }
      .pta-config-builder .config-chain-header > span {
        font-size: 10px;
        letter-spacing: 0.07em;
      }
      .pta-config-builder .config-chain-body {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.5rem;
        min-width: 0;
      }
      /* Cada valor y sus niveles anidados se agrupan en una tarjeta blanca,
         para distinguir dónde termina un grupo y empieza el siguiente. */
      .pta-config-builder .config-chain-value {
        min-width: 0;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 0.55rem;
        padding: 0.35rem 0.4rem;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
      }
      .pta-config-builder .config-chain-children {
        position: relative;
        margin-top: 0.4rem;
        margin-left: 1rem;
        padding-left: 0.6rem;
      }
      .pta-config-builder .config-chain-children::before {
        content: '';
        position: absolute;
        left: 0;
        top: -0.35rem;
        bottom: 0.6rem;
        width: 0.6rem;
        border-left: 2px solid #b9c5d6;
        border-bottom: 2px solid #b9c5d6;
        border-bottom-left-radius: 0.45rem;
      }
      .pta-config-builder .config-chain-empty {
        padding: 0.3rem 0.55rem;
      }
      .pta-config-builder .config-chain-add {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.2rem 0.6rem;
        border: 1px dashed #93c5fd;
        border-radius: 0.5rem;
        background: #ffffff;
        color: #3b82f6;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease;
      }
      .pta-config-builder .config-chain-add:hover {
        border-color: #60a5fa;
        background: #eff6ff;
        color: #1d4ed8;
      }
      .pta-config-builder .config-chain-add svg {
        width: 0.65rem;
        height: 0.65rem;
        stroke-width: 2.4;
      }
      /* Identidad de color por nivel de la escalera: borde, fondo, cabecera y
         título del panel, para diferenciar de un vistazo cada profundidad. */
      .pta-config-builder .config-chain-depth-0 { border-color: #93c5fd; border-left-color: #3b82f6; background: #f0f7ff; }
      .pta-config-builder .config-chain-depth-0 > .config-chain-header { background: #dbeafe; }
      .pta-config-builder .config-chain-depth-0 > .config-chain-header > span,
      .pta-config-builder .config-chain-depth-0 > .config-chain-header > svg { color: #1d4ed8; }
      .pta-config-builder .config-chain-depth-1 { border-color: #c4b5fd; border-left-color: #7c3aed; background: #f7f4ff; }
      .pta-config-builder .config-chain-depth-1 > .config-chain-header { background: #ede9fe; }
      .pta-config-builder .config-chain-depth-1 > .config-chain-header > span,
      .pta-config-builder .config-chain-depth-1 > .config-chain-header > svg { color: #6d28d9; }
      .pta-config-builder .config-chain-depth-2 { border-color: #5eead4; border-left-color: #0d9488; background: #effcf9; }
      .pta-config-builder .config-chain-depth-2 > .config-chain-header { background: #ccfbf1; }
      .pta-config-builder .config-chain-depth-2 > .config-chain-header > span,
      .pta-config-builder .config-chain-depth-2 > .config-chain-header > svg { color: #0f766e; }
      .pta-config-builder .config-chain-depth-3 { border-color: #fcd34d; border-left-color: #d97706; background: #fffaeb; }
      .pta-config-builder .config-chain-depth-3 > .config-chain-header { background: #fef3c7; }
      .pta-config-builder .config-chain-depth-3 > .config-chain-header > span,
      .pta-config-builder .config-chain-depth-3 > .config-chain-header > svg { color: #b45309; }
      .pta-config-builder .config-chain-depth-4 { border-color: #f9a8d4; border-left-color: #db2777; background: #fdf2f8; }
      .pta-config-builder .config-chain-depth-4 > .config-chain-header { background: #fce7f3; }
      .pta-config-builder .config-chain-depth-4 > .config-chain-header > span,
      .pta-config-builder .config-chain-depth-4 > .config-chain-header > svg { color: #be185d; }
      .pta-config-builder .hour-limit-control input,
      .pta-config-builder .hour-limit-control input:hover,
      .pta-config-builder .hour-limit-control input:focus,
      .pta-config-builder .hour-limit-control select,
      .pta-config-builder .hour-limit-control select:hover,
      .pta-config-builder .hour-limit-control select:focus {
        border: 0;
        background: transparent;
        box-shadow: none;
      }
    `}</style>
  );
}
