// ARQUIVO: frontend/src/components/UsuarioModal.jsx
import React, { useState, useEffect } from 'react';

const UsuarioModal = ({ isOpen, onClose, onSave, usuarioParaEditar, oficinas }) => {
  const [formData, setFormData] = useState({ nome: '', email: '', senha: '', role: 'membro', oficina_id: '' });

  useEffect(() => {
    if (usuarioParaEditar) {
      // Preenche o formulário com os dados do usuário para edição
      // A senha fica em branco por segurança, só é alterada se for preenchida
      setFormData({ ...usuarioParaEditar, senha: '' });
    } else {
      // Limpa o formulário para criação
      setFormData({ nome: '', email: '', senha: '', role: 'membro', oficina_id: '' });
    }
  }, [usuarioParaEditar, isOpen]);

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
        <h2>{usuarioParaEditar ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome Completo*</label>
            <input type="text" name="nome" value={formData.nome} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>E-mail (Login)*</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Senha* (Deixe em branco para não alterar)</label>
            <input type="password" name="senha" value={formData.senha} onChange={handleChange} placeholder={usuarioParaEditar ? 'Nova Senha' : 'Senha Provisória'} />
          </div>
          <div className="form-group">
            <label>Cargo (Role)*</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="admin">Admin da Oficina</option>
              <option value="membro">Membro</option>
            </select>
          </div>
          <div className="form-group">
            <label>Oficina*</label>
            <select name="oficina_id" value={formData.oficina_id} onChange={handleChange} required>
              <option value="">Selecione a Oficina</option>
              {oficinas.map((oficina) => (
                <option key={oficina.id} value={oficina.id}>{oficina.nome_fantasia}</option>
              ))}
            </select>
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

export default UsuarioModal;