import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string | number;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 440,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div
        className="glass-raised relative z-10 w-full p-6 shadow-2xl animate-fade-rise"
        style={{
          maxWidth,
          borderRadius: 'var(--r-panel)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between pb-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-[--hover-bg]"
            style={{ color: 'var(--text-3)' }}
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
