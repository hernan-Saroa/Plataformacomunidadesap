import React from 'react';

// React conserva el escape de HTML. Solo se activan enlaces HTTP/HTTPS sin credenciales.
export function ChatMessageText({ text }: { text: string }) {
  return <>{text.split(/(\[[^\]\n]{1,100}\]\((?:https?:\/\/[^\s)]+|\/[a-zA-Z0-9/_-]+)\)|\*\*[^*\n]+\*\*|https?:\/\/[^\s<>\u0000-\u001f]+)/g).map((part, index) => {
    const markdown = /^\[([^\]\n]+)\]\(([^\s)]+)\)$/.exec(part);
    if (markdown) {
      const href = markdown[2];
      if (/^\/(?!\/)[a-zA-Z0-9/_-]+$/.test(href)) return <a key={index} href={href} style={{ overflowWrap: 'anywhere', textDecoration: 'underline' }}>{markdown[1]}</a>;
      try {
        const url = new URL(href);
        if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return <a key={index} href={url.href} target="_blank" rel="noopener noreferrer">{markdown[1]}</a>;
      } catch { /* mantener texto */ }
    }
    if (/^\*\*[^*\n]+\*\*$/.test(part)) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part)) {
      const href = part.replace(/[),.;]+$/, '');
      try {
        const url = new URL(href);
        if (!url.username && !url.password) return <React.Fragment key={index}><a href={url.href} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere', textDecoration: 'underline' }}>{href}</a>{part.slice(href.length)}</React.Fragment>;
      } catch { /* conservar texto sin interpretar */ }
    }
    return part;
  })}</>;
}
