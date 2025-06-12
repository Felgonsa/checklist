import React, { useState, useEffect } from "react";
import { createOrdemServico, updateOrdemServico } from "../services/api";

const AddChecklistModal = ({
  isOpen,
  onClose,
  onSaveSuccess,
  ordemParaEditar,
}) => {
  // --- 1. ESTADOS DO COMPONENTE ---
  const [clienteNome, setClienteNome] = useState("");
  const [seguradora, setSeguradora] = useState("");
  const [veiculo, setVeiculo] = useState("");
  const [placa, setPlaca] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 2. FUNÇÕES AUXILIARES ---
  const resetForm = () => {
    setClienteNome("");
    setSeguradora("");
    setVeiculo("");
    setPlaca("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clienteNome || !veiculo || !placa) {
      setError("Por favor, preencha os campos obrigatórios.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    const dadosOS = {
      cliente_nome: clienteNome,
      seguradora_nome: seguradora,
      veiculo_modelo: veiculo,
      veiculo_placa: placa,
    };

    try {
      let response;
      if (ordemParaEditar) {
        response = await updateOrdemServico(ordemParaEditar.id, dadosOS);
      } else {
        response = await createOrdemServico(dadosOS);
      }
      onSaveSuccess(response.data);
      handleClose();
    } catch (err) {
      setError("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 3. EFEITO PARA PREENCHER/LIMPAR O FORMULÁRIO ---
  // Esta parte estava faltando no seu código.
  useEffect(() => {
    if (isOpen) {
      if (ordemParaEditar) {
        // Modo Edição: Preenche o formulário
        setClienteNome(ordemParaEditar.cliente_nome || "");
        setSeguradora(ordemParaEditar.seguradora_nome || "");
        setVeiculo(ordemParaEditar.veiculo_modelo || "");
        setPlaca(ordemParaEditar.veiculo_placa || "");
      } else {
        // Modo Criação: Limpa o formulário
        resetForm();
      }
    }
  }, [ordemParaEditar, isOpen]); // Roda quando o modal abre ou o item a ser editado muda

  
  // --- 4. RENDERIZAÇÃO ---
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{ordemParaEditar ? 'Editar Ordem de Serviço' : 'Criar Novo Checklist'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome do Cliente*</label>
            <input
              type="text"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Seguradora</label>
            <input
              type="text"
              value={seguradora}
              onChange={(e) => setSeguradora(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Veículo* (Ex: Toyota Corolla)</label>
            <input
              type="text"
              value={veiculo}
              onChange={(e) => setVeiculo(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Placa*</label>
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Salvando..."
                : ordemParaEditar
                ? "Salvar Alterações"
                : "Criar e Abrir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddChecklistModal;