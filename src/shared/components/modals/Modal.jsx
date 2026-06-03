import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children }) => {
  // Impede o scroll do fundo da tela quando o modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} // Impede que clicar dentro do modal o feche
      >
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>
        
        {title && (
          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '20px', paddingRight: '30px' }}>
            {title}
          </h2>
        )}
        
        {children}
      </div>
    </div>
  );
};