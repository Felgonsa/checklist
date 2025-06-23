import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './SignaturePad.css';
import { toast } from 'react-toastify';

const SignaturePad = ({ onSave, onClose }) => {
  const sigCanvas = useRef({});
  // NOVO: Estado para guardar os dados da assinatura enquanto o usuário desenha
  const [signatureData, setSignatureData] = useState(null);

  // NOVO: Efeito para restaurar o desenho se o componente for recriado
  useEffect(() => {
    // Se já temos um desenho salvo no estado, e o canvas está pronto...
    if (sigCanvas.current && signatureData) {
      // ...nós o carregamos de volta na tela.
      sigCanvas.current.fromDataURL(signatureData);
    }
  }, [signatureData]); // Não precisa de mais dependências

  // NOVO: Função que salva o estado da assinatura toda vez que o usuário termina um traço
  const handleDrawEnd = () => {
    setSignatureData(sigCanvas.current.toDataURL('image/png'));
  };

  const clear = () => {
    sigCanvas.current.clear();
    setSignatureData(null); // Limpa também o nosso estado salvo
  };

  const save = () => {
    if (sigCanvas.current.isEmpty()) {
      toast.warning('Por favor, forneça uma assinatura.');
      return;
    }
    // Agora, em vez de gerar a imagem na hora, usamos a que já está salva no estado
    onSave(signatureData);
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
            onEnd={handleDrawEnd} // NOVO: Chama a função para salvar após cada traço
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