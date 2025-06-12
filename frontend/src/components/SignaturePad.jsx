import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './SignaturePad.css'; // Criaremos este arquivo de estilo

const SignaturePad = ({ onSave, onClose }) => {
  const sigCanvas = useRef({});

  const clear = () => {
    sigCanvas.current.clear();
  };

  // Dentro de SignaturePad.jsx

const save = () => {
    if (sigCanvas.current.isEmpty()) {
      alert('Por favor, forneça uma assinatura.');
      return;
    }

    const signatureImage = sigCanvas.current.getCanvas().toDataURL('image/png');
    onSave(signatureImage);
};

  return (
    <div className="modal-overlay">
      <div className="modal-content signature-modal">
        <h2>Assinatura do Cliente</h2>
        <div className="signature-canvas-container">
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{ className: 'signature-canvas' }}
          />
        </div>
        <div className="modal-actions">
          <button onClick={clear} className="btn-secondary">Limpar</button>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={save} className="btn-primary">Salvar Assinatura</button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;