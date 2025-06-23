// ARQUIVO: frontend/src/components/OficinaModal.jsx
import React, { useState, useEffect } from 'react';

const OficinaModal = ({ isOpen, onClose, onSave, oficinaParaEditar }) => {
  const [formData, setFormData] = useState({ nome_fantasia: '', cnpj: '', email: '', telefone: '' });

  useEffect(() => {
    if (oficinaParaEditar) {
      setFormData(oficinaParaEditar);
    } else {
      setFormData({ nome_fantasia: '', cnpj: '', email: '', telefone: '' });
    }
  }, [oficinaParaEditar, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{oficinaParaEditar ? 'Editar Oficina' : 'Cadastrar Nova Oficina'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome Fantasia*</label>
            <input type="text" name="nome_fantasia" value={formData.nome_fantasia} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>CNPJ</label>
            <input type="text" name="cnpj" value={formData.cnpj || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>E-mail de Contato</label>
            <input type="email" name="email" value={formData.email || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Telefone de Contato</label>
            <input type="text" name="telefone" value={formData.telefone || ''} onChange={handleChange} />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OficinaModal;