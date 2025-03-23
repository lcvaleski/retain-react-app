import React from 'react';
import ReactDOM from 'react-dom';
import '../../styles/Modal.css';

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-root">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-container">
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="modal-close-button" onClick={onClose}>
            ×
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Modal; 