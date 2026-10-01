import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { GameIcon } from './GameIcon';

export function Modal({ title, label, onClose, children, wide = false }: { title: string; label?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closer.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Tab') {
        const items = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); previous?.focus(); };
  }, [onClose]);
  return createPortal(<div className="jr-modal-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={panel} className={`jr-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="jr-modal-header"><div>{label && <span className="jr-eyebrow">{label}</span>}<h2>{title}</h2></div>
        <button ref={closer} className="jr-icon-button" onClick={onClose} aria-label="닫기"><GameIcon name="close" /></button>
      </header>
      <div className="jr-modal-body">{children}</div>
    </div>
  </div>, document.body);
}