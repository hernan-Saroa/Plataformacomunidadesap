import React from 'react';

export function BuilderSurfaceStyles() {
  return (
    <style>{`
      .pta-config-builder .config-block-card input:not([title^="Posición"]):not([title^="Orden"]),
      .pta-config-builder .config-block-card select,
      .pta-config-builder .config-block-card textarea {
        background-color: #f8fafc;
        border-color: #b8c6d8;
        box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.05);
        transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
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
        background: linear-gradient(145deg, #eef2f7 0%, #f8fafc 55%, #eef2ff 100%);
      }
      .pta-config-builder .config-block-body > div {
        margin-bottom: 0.85rem;
        overflow: hidden;
        border: 1px solid #cbd5e1;
        border-radius: 0.85rem;
        background: #ffffff;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.07);
      }
      .pta-config-builder .config-block-body > div:nth-child(even) {
        border-color: #c7d2fe;
        background: #f7f8ff;
      }
      .pta-config-builder .config-block-body > div:last-child {
        margin-bottom: 0;
      }
      .pta-config-builder .config-activity-entry {
        margin-bottom: 0.65rem;
        border-width: 1px;
        border-left-width: 5px;
        border-radius: 0.75rem;
        padding: 0.55rem;
        box-shadow: 0 2px 5px rgba(15, 23, 42, 0.06);
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
        border-color: rgba(148, 163, 184, 0.55);
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.07);
      }
      .pta-config-builder .config-detail-panel {
        border: 1px solid rgba(148, 163, 184, 0.45);
        border-radius: 0.55rem;
        background: rgba(255, 255, 255, 0.72);
        padding: 0.45rem 0.6rem;
      }
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
