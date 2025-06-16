import React, { useState, useEffect } from "react"; // Importa hooks do React para gerenciar estado e efeitos colaterais.
import { createOrdemServico, updateOrdemServico } from "../services/api"; // Importa as funções da API para criar e atualizar ordens de serviço.

// Componente funcional para um modal de adição/edição de checklist (Ordem de Serviço).
// Recebe props para controlar sua visibilidade, fechar, lidar com sucesso e os dados para edição.
const AddChecklistModal = ({
  isOpen, // Booleano que indica se o modal deve estar aberto ou fechado.
  onClose, // Função para ser chamada quando o modal for fechado.
  onSaveSuccess, // Função para ser chamada após salvar/atualizar com sucesso.
  ordemParaEditar, // Objeto com os dados da OS se estivermos em modo de edição (null se for criação).
}) => {
  // --- 1. ESTADOS DO COMPONENTE ---
  // Estados para armazenar os valores dos campos do formulário.
  const [clienteNome, setClienteNome] = useState("");
  const [seguradora, setSeguradora] = useState("");
  const [veiculo, setVeiculo] = useState("");
  const [placa, setPlaca] = useState("");
  // Estado para armazenar mensagens de erro de validação do formulário.
  const [error, setError] = useState("");
  // Estado para indicar se o formulário está sendo submetido (para desabilitar o botão e mostrar "Salvando...").
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 2. FUNÇÕES AUXILIARES ---

  // Reseta todos os campos do formulário e as mensagens de erro para seus valores iniciais.
  const resetForm = () => {
    setClienteNome("");
    setSeguradora("");
    setVeiculo("");
    setPlaca("");
    setError("");
  };

  // Lida com o fechamento do modal. Primeiro, reseta o formulário, depois chama a função onClose passada via props.
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Lida com a submissão do formulário (ao clicar no botão "Salvar" ou "Criar").
  const handleSubmit = async (e) => {
    e.preventDefault(); // Previne o comportamento padrão de recarregar a página.

    // Validação básica: verifica se os campos obrigatórios estão preenchidos.
    if (!clienteNome || !veiculo || !placa) {
      setError("Por favor, preencha os campos obrigatórios."); // Define uma mensagem de erro.
      return; // Interrompe a função se a validação falhar.
    }

    setError(""); // Limpa qualquer mensagem de erro anterior se a validação passou.
    setIsSubmitting(true); // Ativa o estado de submissão para desabilitar o botão.

    // Cria um objeto com os dados da Ordem de Serviço a serem enviados para a API.
    const dadosOS = {
      cliente_nome: clienteNome,
      seguradora_nome: seguradora, // Pode ser uma string vazia ou null se não preenchida.
      veiculo_modelo: veiculo,
      veiculo_placa: placa,
    };

    try {
      let response;
      // Verifica se estamos no modo de edição (se 'ordemParaEditar' existe).
      if (ordemParaEditar) {
        // Se sim, chama a função de atualização da API.
        response = await updateOrdemServico(ordemParaEditar.id, dadosOS);
      } else {
        // Se não, estamos no modo de criação, então chama a função de criação da API.
        response = await createOrdemServico(dadosOS);
      }
      // Chama a função 'onSaveSuccess' passada via props, enviando os dados retornados pela API.
      onSaveSuccess(response.data);
      // Fecha o modal e reseta o formulário após o sucesso.
      handleClose();
    } catch (err) {
      // Em caso de erro na requisição à API, define uma mensagem de erro genérica.
      setError("Erro ao salvar. Tente novamente.");
      console.error(err); // Loga o erro completo no console para depuração.
    } finally {
      // Sempre desativa o estado de submissão, independentemente do sucesso ou falha.
      setIsSubmitting(false);
    }
  };

  // --- 3. EFEITO PARA PREENCHER/LIMPAR O FORMULÁRIO ---
  // Este `useEffect` é executado sempre que o modal é aberto ('isOpen' muda para true)
  // ou quando os dados da 'ordemParaEditar' mudam.
  useEffect(() => {
    if (isOpen) {
      // Se o modal estiver aberto:
      if (ordemParaEditar) {
        // Se 'ordemParaEditar' existir, significa modo de edição.
        // Preenche os campos do formulário com os dados da OS a ser editada.
        setClienteNome(ordemParaEditar.cliente_nome || "");
        setSeguradora(ordemParaEditar.seguradora_nome || "");
        setVeiculo(ordemParaEditar.veiculo_modelo || "");
        setPlaca(ordemParaEditar.veiculo_placa || "");
      } else {
        // Se 'ordemParaEditar' não existir, significa modo de criação.
        // Limpa o formulário para uma nova entrada.
        resetForm();
      }
    }
  }, [ordemParaEditar, isOpen]); // Dependências do useEffect: ele roda quando essas variáveis mudam.

  // --- 4. RENDERIZAÇÃO ---
  // Se 'isOpen' for falso, o modal não é renderizado (retorna null).
  if (!isOpen) {
    return null;
  }

  // Renderiza a estrutura do modal se 'isOpen' for verdadeiro.
  return (
    <div className="modal-overlay"> {/* Camada escura que cobre o fundo da tela */}
      <div className="modal-content"> {/* Conteúdo principal do modal */}
        {/* Título do modal, que muda dependendo se é criação ou edição. */}
        <h2>{ordemParaEditar ? 'Editar Ordem de Serviço' : 'Criar Novo Checklist'}</h2>
        <form onSubmit={handleSubmit}> {/* Formulário para os dados da OS */}
          {/* Grupo de formulário para o nome do cliente */}
          <div className="form-group">
            <label>Nome do Cliente*</label>
            <input
              type="text"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)} // Atualiza o estado ao digitar.
            />
          </div>
          {/* Grupo de formulário para a seguradora */}
          <div className="form-group">
            <label>Seguradora</label>
            <input
              type="text"
              value={seguradora}
              onChange={(e) => setSeguradora(e.target.value)}
            />
          </div>
          {/* Grupo de formulário para o modelo do veículo */}
          <div className="form-group">
            <label>Veículo* (Ex: Toyota Corolla)</label>
            <input
              type="text"
              value={veiculo}
              onChange={(e) => setVeiculo(e.target.value)}
            />
          </div>
          {/* Grupo de formulário para a placa do veículo */}
          <div className="form-group">
            <label>Placa*</label>
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
            />
          </div>

          {/* Exibe a mensagem de erro se o estado 'error' não estiver vazio. */}
          {error && <p className="error-message">{error}</p>}

          {/* Botões de ação do modal */}
          <div className="modal-actions">
            <button
              type="button" // Tipo "button" para não submeter o formulário.
              onClick={handleClose} // Chama a função para fechar o modal.
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit" // Tipo "submit" para enviar o formulário.
              className="btn-primary"
              disabled={isSubmitting} // Desabilita o botão enquanto a submissão está em andamento.
            >
              {/* Texto do botão dinâmico: "Salvando...", "Salvar Alterações" ou "Criar e Abrir". */}
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

export default AddChecklistModal; // Exporta o componente para ser usado em outras partes da aplicação.