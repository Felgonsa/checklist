import React, { useState, useEffect } from "react"; // Importa hooks essenciais do React para estado e efeitos colaterais.
import { useParams, Link } from "react-router-dom"; // Importa hooks do React Router para acessar parâmetros da URL e navegação.
import SignaturePad from "../components/SignaturePad"; // Importa um componente personalizado para a assinatura.
import {
  getOrdemServicoById, // Função para buscar dados de uma OS específica.
  getItens, // Função para buscar os itens padrão do checklist.
  saveRespostas, // Função para salvar as respostas do checklist.
  uploadFotos, // Função para enviar fotos para o servidor/S3.
  deleteFoto, // Função para deletar fotos.
  API_BASE_URL, // URL base da API (para construir a URL do PDF).
  saveAssinatura, // Função para salvar a assinatura.
} from "../services/api"; // Importa todas as funções de interação com a API de um arquivo de serviços.

// Componente funcional principal para a página de Checklist.
const ChecklistPage = () => {
  // Extrai o 'id' da OS da URL, usando o hook `useParams` do React Router.
  const { id } = useParams();

  // Estados locais do componente usando o hook `useState`:
  const [osData, setOsData] = useState(null); // Armazena os dados da Ordem de Serviço.
  const [checklistItens, setChecklistItens] = useState([]); // Armazena a lista de itens padrão do checklist.
  const [respostas, setRespostas] = useState({}); // Armazena as respostas do usuário para cada item do checklist.
  const [loading, setLoading] = useState(true); // Indica se os dados estão sendo carregados (para mostrar um spinner, por exemplo).
  const [error, setError] = useState(null); // Armazena qualquer mensagem de erro que possa ocorrer.
  const [saving, setSaving] = useState(false); // Indica se o checklist está sendo salvo.
  const [selectedFiles, setSelectedFiles] = useState(null); // Armazena os arquivos de foto selecionados para upload.
  const [uploading, setUploading] = useState(false); // Indica se as fotos estão sendo enviadas.
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false); // Controla a visibilidade do modal de assinatura.

  // Hook `useEffect` para buscar os dados iniciais da OS e dos itens do checklist.
  // Ele é executado uma vez quando o componente é montado e sempre que o 'id' muda.
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Ativa o estado de carregamento.
      setError(null); // Limpa qualquer erro anterior.
      try {
        // Usa `Promise.all` para buscar os dados da OS e os itens do checklist em paralelo.
        const [osResponse, itensResponse] = await Promise.all([
          getOrdemServicoById(id), // Busca os dados da OS pelo ID.
          getItens(), // Busca todos os itens padrão do checklist.
        ]);

        setOsData(osResponse.data); // Atualiza o estado com os dados da OS.
        setChecklistItens(itensResponse.data); // Atualiza o estado com os itens do checklist.

        // Inicializa o objeto de respostas com valores padrão para todos os itens do checklist.
        const respostasIniciais = {};
        itensResponse.data.forEach((item) => {
          respostasIniciais[item.id] = { status: "", observacao: "" };
        });

        // Preenche as respostas iniciais com os dados existentes da OS (se houver).
        // Isso garante que o formulário reflita o estado salvo do checklist.
        osResponse.data.respostas.forEach((resposta) => {
          respostasIniciais[resposta.item_id] = {
            status: resposta.status,
            observacao: resposta.observacao || "", // Garante que observacao seja string vazia se for null/undefined.
          };
        });
        setRespostas(respostasIniciais); // Define as respostas iniciais no estado.
      } catch (err) {
        // Em caso de erro na busca de dados, define a mensagem de erro.
        setError("Falha ao carregar os dados do checklist.");
        console.error(err); // Loga o erro no console para depuração.
      } finally {
        setLoading(false); // Desativa o estado de carregamento, independentemente do sucesso ou falha.
      }
    };
    fetchData(); // Chama a função assíncrona para buscar os dados.
  }, [id]); // O efeito é re-executado se o 'id' da OS mudar.

  // --- Funções de Manipulação de Eventos ---

  // Lida com a mudança de valor nos campos de resposta do checklist.
  const handleRespostaChange = (itemId, campo, valor) => {
    // Atualiza o estado 'respostas' de forma imutável.
    setRespostas((prev) => ({
      ...prev, // Copia todas as respostas anteriores.
      [itemId]: {
        ...prev[itemId], // Copia a resposta específica do item.
        [campo]: valor, // Atualiza o campo específico (status ou observacao) com o novo valor.
      },
    }));
  };

  // Lida com o salvamento das respostas do checklist.
  const handleSave = async () => {
    setSaving(true); // Ativa o estado de salvamento.
    // Transforma o objeto 'respostas' em um array de objetos no formato que a API espera.
    const respostasParaSalvar = Object.keys(respostas).map((itemId) => ({
      item_id: parseInt(itemId), // Garante que o ID do item seja um número.
      status: respostas[itemId].status,
      observacao: respostas[itemId].observacao,
    }));
    try {
      // Chama a função da API para salvar as respostas.
      await saveRespostas({
        os_id: id,
        respostas: respostasParaSalvar,
      });
      alert("Checklist salvo com sucesso!"); // Exibe um alerta de sucesso.
    } catch (err) {
      alert("Erro ao salvar o checklist."); // Exibe um alerta de erro.
      console.error(err); // Loga o erro no console.
    } finally {
      setSaving(false); // Desativa o estado de salvamento.
    }
  };

  // Lida com a seleção de arquivos de foto pelo usuário.
  const handleFileSelect = (event) => {
    setSelectedFiles(event.target.files); // Armazena os arquivos selecionados no estado.
  };

  // Lida com o upload das fotos selecionadas.
  const handlePhotoUpload = async () => {
    // Validação: verifica se algum arquivo foi selecionado.
    if (!selectedFiles || selectedFiles.length === 0) {
      alert("Por favor, selecione ao menos um arquivo.");
      return;
    }
    setUploading(true); // Ativa o estado de upload.
    const formData = new FormData(); // Cria um objeto FormData para enviar os arquivos.
    formData.append("os_id", id); // Adiciona o ID da OS ao FormData.
    // Itera sobre os arquivos selecionados e os adiciona ao FormData com a chave 'fotos'.
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("fotos", selectedFiles[i]);
    }
    try {
      // Chama a função da API para fazer o upload das fotos.
      const response = await uploadFotos(formData);
      // Atualiza o estado 'osData' para incluir as novas fotos sem recarregar a página inteira.
      setOsData((prevData) => ({
        ...prevData,
        fotos: [...prevData.fotos, ...response.data.data], // Adiciona as fotos retornadas pela API.
      }));
      setSelectedFiles(null); // Limpa os arquivos selecionados do estado.
      document.getElementById("file-input").value = null; // Limpa o valor do input de arquivo para permitir novo upload.
      alert("Fotos enviadas com sucesso!"); // Exibe um alerta de sucesso.
    } catch (err) {
      alert("Erro ao enviar fotos."); // Exibe um alerta de erro.
      console.error(err); // Loga o erro no console.
    } finally {
      setUploading(false); // Desativa o estado de upload.
    }
  };

  // Lida com a exclusão de uma foto existente.
  const handlePhotoDelete = async (fotoId) => {
    // Pede confirmação ao usuário antes de deletar.
    if (!window.confirm("Tem certeza que deseja deletar esta foto?")) {
      return;
    }
    try {
      // Chama a função da API para deletar a foto.
      await deleteFoto(fotoId);
      // Atualiza o estado 'osData' removendo a foto deletada para refletir a mudança na UI.
      setOsData((prevData) => ({
        ...prevData,
        fotos: prevData.fotos.filter((foto) => foto.id !== fotoId), // Filtra a foto deletada.
      }));
      alert("Foto deletada com sucesso!"); // Exibe um alerta de sucesso.
    } catch (err) {
      alert("Erro ao deletar foto."); // Exibe um alerta de erro.
      console.error(err); // Loga o erro no console.
    }
  };

  // Lida com o salvamento da assinatura coletada.
  const handleSaveSignature = async (signatureImage) => {
    try {
      // Chama a função da API para salvar a assinatura.
      await saveAssinatura(id, signatureImage);
      // Atualiza o estado 'osData' com a nova assinatura para exibição (se aplicável).
      setOsData((prev) => ({ ...prev, assinatura_cliente: signatureImage }));
      setIsSignatureModalOpen(false); // Fecha o modal de assinatura.
      alert("Assinatura salva com sucesso!"); // Exibe um alerta de sucesso.
    } catch (err) {
      alert("Erro ao salvar assinatura."); // Exibe um alerta de erro.
      console.error(err); // Loga o erro no console.
    }
  };

  // Lida com a geração e abertura do PDF.
  const handleGeneratePdf = () => {
    // 1. Gera um "cache buster" (número único baseado na data/hora atual).
    // Isso é feito para garantir que o navegador sempre solicite uma nova versão do PDF
    // e não use uma versão em cache antiga, especialmente após atualizações no checklist.
    const cacheBuster = `?t=${Date.now()}`;

    // 2. Constrói a URL completa para o endpoint do PDF, adicionando o cache buster.
    const pdfUrl = `${API_BASE_URL}/api/checklist/ordem-servico/${id}/pdf${cacheBuster}`;

    // Loga a URL que será aberta para fins de depuração.
    console.log("Abrindo URL do PDF com cache buster:", pdfUrl);

    // 3. Abre a URL do PDF em uma nova aba do navegador.
    window.open(pdfUrl, "_blank");
  };

  // --- Renderização Condicional ---

  // Exibe mensagem de carregamento enquanto os dados estão sendo buscados.
  if (loading) return <p>Carregando checklist...</p>;
  // Exibe mensagem de erro se algo falhou no carregamento.
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  // Exibe mensagem se os dados da OS não forem encontrados (após carregamento).
  if (!osData) return <p>Ordem de serviço não encontrada.</p>;

  // --- Renderização do Componente Principal ---
  return (
    <div className="checklist-page">
      {/* Link para voltar à página anterior (lista de OSs). */}
      <Link to="/home" className="back-link">
        ← Voltar para a lista
      </Link>

      {/* Seção de detalhes da Ordem de Serviço */}
      <div className="os-details">
        <h2>Checklist para: {osData.cliente_nome}</h2>
        <p>Veículo: {osData.veiculo_modelo}</p>
        <p>Placa: {osData.veiculo_placa}</p>
        <p>Seguradora: {osData.seguradora_nome || "N/A"}</p> {/* Mostra "N/A" se não houver seguradora */}
      </div>

      ---
      {/* ======================================================= */}
      {/* 1. FORMULÁRIO DO CHECKLIST */}
      {/* ======================================================= */}
      <div className="checklist-form">
        {/* Mapeia sobre cada item do checklist e renderiza um formulário para ele. */}
        {checklistItens.map((item) => (
          <div key={item.id} className="checklist-item">
            {/* Cabeçalho do item do checklist, alinhando nome e campo de input. */}
            <div className="item-header">
              <label className="item-name">
                {item.ordem}. {item.nome} {/* Exibe a ordem e o nome do item. */}
              </label>

              <div className="item-input-area">
                {/* Renderização condicional baseada no 'tipo' do item. */}

                {/* TIPO: 'options' (Botões de Rádio para Status) */}
                {item.tipo === "options" && (
                  <div className="status-options">
                    {/* Mapeia as opções de status (ex: "ok", "irregular", "não aplicável"). */}
                    {item.opcoes?.map((statusOption) => (
                      <label key={statusOption}>
                        <input
                          type="radio"
                          name={`status-${item.id}`} // Nome para agrupar os rádios do mesmo item.
                          value={statusOption}
                          checked={respostas[item.id]?.status === statusOption} // Marca o rádio se for a resposta atual.
                          onChange={(e) =>
                            handleRespostaChange(
                              item.id,
                              "status", // Campo a ser atualizado.
                              e.target.value // Novo valor.
                            )
                          }
                        />
                        {/* Exibe a opção com a primeira letra maiúscula. */}
                        <span>
                          {statusOption.charAt(0).toUpperCase() +
                            statusOption.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* TIPO: 'range' (Slider para Nível de Combustível/Outros Ranges) */}
                {item.tipo === "range" &&
                  (() => {
                    // Lógica para garantir que o valor do slider seja numérico e dentro do range (0-100).
                    const valorDoBanco = parseInt(
                      respostas[item.id]?.observacao,
                      10
                    );
                    const valorValido =
                      !isNaN(valorDoBanco) &&
                      valorDoBanco >= 0 &&
                      valorDoBanco <= 100;
                    const valorDoSlider = valorValido ? valorDoBanco : 50; // Padrão 50% se inválido.
                    return (
                      <div className="range-slider-container">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="2.5" // Passos de 2.5%
                          className="range-slider"
                          value={valorDoSlider} // Valor atual do slider.
                          onChange={(e) =>
                            handleRespostaChange(
                              item.id,
                              "observacao", // Campo 'observacao' é usado para o valor do range.
                              e.target.value
                            )
                          }
                        />
                        {/* Exibe o valor percentual ao lado do slider. */}
                        <span className="range-slider-value">
                          {valorDoSlider}%
                        </span>
                      </div>
                    );
                  })()}

                {/* TIPO: 'number' (Campo para Quilometragem/Outros Números) */}
                {item.tipo === "number" && (
                  <input
                    type="number"
                    className="text-input"
                    placeholder="Digite o valor..."
                    value={respostas[item.id]?.observacao || ""} // Usa 'observacao' para o valor numérico.
                    onChange={(e) =>
                      handleRespostaChange(
                        item.id,
                        "observacao",
                        e.target.value
                      )
                    }
                  />
                )}
              </div>
            </div>

            {/* Área de Observação: aparece APENAS para itens do tipo 'options'. */}
            {/* Em itens de 'range' ou 'number', a 'observacao' é o próprio valor. */}
            {item.tipo === "options" && (
              <textarea
                placeholder="Observações..."
                value={respostas[item.id]?.observacao || ""} // Garante que é uma string.
                onChange={(e) =>
                  handleRespostaChange(item.id, "observacao", e.target.value)
                }
              />
            )}
          </div>
        ))}
      </div>

      ---
      {/* ======================================================= */}
      {/* 2. SEÇÃO DE FOTOS */}
      {/* ======================================================= */}
      <div className="photos-section">
        <h3>Fotos Anexadas</h3>
        {/* Condicionalmente renderiza a galeria de fotos se houver fotos na OS. */}
        {osData?.fotos?.length > 0 ? (
          <div className="photo-gallery">
            {/* Mapeia e exibe cada foto anexada. */}
            {osData.fotos.map((foto) => (
              <div key={foto.id} className="photo-container">
                <img src={foto.caminho_arquivo} alt={`Foto ${foto.id}`} />
                {/* Botão para deletar a foto. */}
                <button
                  onClick={() => handlePhotoDelete(foto.id)}
                  className="delete-photo-btn"
                >
                  &times; {/* Caractere 'X' para fechar/deletar. */}
                </button>
              </div>
            ))}
          </div>
        ) : (
          // Mensagem exibida se não houver fotos.
          <p>Nenhuma foto anexada a este checklist.</p>
        )}

        {/* Formulário para upload de novas fotos. */}
        <div className="upload-form">
          <h4>Anexar Novas Fotos</h4>
          <input
            id="file-input" // ID para limpar o input após o upload.
            type="file"
            multiple // Permite selecionar múltiplos arquivos.
            onChange={handleFileSelect} // Chama a função ao selecionar arquivos.
            accept="image/png, image/jpeg, image/webp" // Define os tipos de arquivo aceitos.
          />
          <button
            onClick={handlePhotoUpload} // Chama a função para upload.
            disabled={!selectedFiles || uploading} // Desabilita o botão se não houver arquivos ou se já estiver enviando.
            className="btn-primary"
          >
            {uploading ? "Enviando..." : "Enviar Fotos"} {/* Texto dinâmico do botão. */}
          </button>
        </div>
      </div>

      ---
      {/* ======================================================= */}
      {/* 3. BOTÕES DE AÇÃO PRINCIPAIS */}
      {/* ======================================================= */}
      <div className="checklist-actions">
        {/* Botão para salvar o checklist. */}
        <button onClick={handleSave} disabled={saving} className="btn-save">
          {saving ? "Salvando..." : "Salvar Checklist"}
        </button>
        {/* Botão para gerar o PDF do checklist. */}
        <button onClick={handleGeneratePdf} className="btn-pdf">
          Gerar PDF
        </button>
        {/* Botão para abrir o modal de coleta de assinatura. */}
        <button
          onClick={() => setIsSignatureModalOpen(true)}
          className="btn-signature"
        >
          Coletar Assinatura
        </button>
      </div>

      {/* Renderiza o componente SignaturePad (modal de assinatura) condicionalmente. */}
      {isSignatureModalOpen && (
        <SignaturePad
          onClose={() => setIsSignatureModalOpen(false)} // Função para fechar o modal.
          onSave={handleSaveSignature} // Função para salvar a assinatura.
        />
      )}
    </div>
  );
};

export default ChecklistPage; // Exporta o componente para ser usado em outras partes da aplicação.