import React from 'react';

// Solo énfasis en texto; React conserva el escape de HTML y no crea enlaces ejecutables.
export function ChatMessageText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) => /^\*\*[^*\n]+\*\*$/.test(part)
    ? <strong key={index}>{part.slice(2, -2)}</strong> : part)}</>;
}
