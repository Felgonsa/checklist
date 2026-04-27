import { useEffect, useState } from "react"; // Importa hooks essenciais do React para estado e efeitos colaterais.
import { Link, useParams } from "react-router-dom"; // Importa hooks do React Router para acessar parâmetros da URL e navegação.
import { toast } from "react-toastify";
import Header from "../components/Header";
import SignaturePad from "../components/SignaturePad"; // Importa um componente personalizado para a assinatura.
import {
  deleteFoto, // Função para buscar dados de uma OS específica.
  getItens,
  getOrdemServicoById, // URL base da API (para construir a URL do PDF).
  getPdf, // Função para obter o PDF da API
  saveAssinatura, // Função para buscar os itens padrão do checklist.
  saveRespostas, // Função para salvar as respostas do checklist.
  uploadFotos
} from "../services/api"; // Importa todas as funções de interação com a API de um arquivo de serviços.

import ChecklistReport from "../components/ChecklistReport";

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfFile, setPdfFile] = useState(null); // Estado para armazenar o arquivo PDF preparado
  const [pendingPhotos, setPendingPhotos] = useState([]); // Fotos capturadas/selecionadas em memória (ainda não enviadas)
  const [photoPreviews, setPhotoPreviews] = useState([]); // URLs de preview das fotos em memória

  // Carrega rascunho do localStorage na montagem do componente
  useEffect(() => {
    const savedDraft = localStorage.getItem(`checklist_rascunho_${id}`);
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        if (draftData.respostas) {
          setRespostas(draftData.respostas);
        }
      } catch (err) {
        console.error("Erro ao carregar rascunho do localStorage:", err);
      }
    }
  }, [id]); // Executa apenas na montagem

  // Hook `useEffect` para buscar os dados iniciais da OS e dos itens do checklist.
  // Ele é executado uma vez quando o componente é montado e sempre que o 'id' muda.
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Ativa o estado de carregamento.
      setError(null); // Limpa qualquer erro anterior.
      try {
        // 1. Primeiro busca os dados da OS para obter o oficina_id
        const osResponse = await getOrdemServicoById(id);
        setOsData(osResponse.data); // Atualiza o estado com os dados da OS.

        // 2. Depois busca os itens do checklist filtrando pela oficina da OS
        //    Isso garante que mesmo o superadmin veja apenas os itens da oficina correta
        const itensResponse = await getItens(osResponse.data.oficina_id);
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

        // Mescla as respostas: mantém o rascunho do localStorage, mas sobrescreve com dados da API
        // quando a API tem dados salvos (não vazios)
        setRespostas(prevRespostas => {
          const mergedRespostas = { ...prevRespostas };
          let rascunhoAplicado = false;
          
          // Para cada item do checklist
          itensResponse.data.forEach((item) => {
            const itemId = item.id;
            const respostaApi = respostasIniciais[itemId];
            const respostaLocal = prevRespostas[itemId];
            
            // Verifica se a API tem dados salvos (status ou observacao não vazios)
            const apiTemDados = respostaApi && 
              (respostaApi.status !== "" || respostaApi.observacao !== "");
            
            // Se a API tem dados salvos, usa os dados da API
            // Caso contrário, mantém o rascunho local se existir
            if (apiTemDados) {
              mergedRespostas[itemId] = respostaApi;
            } else if (respostaLocal) {
              // Mantém o rascunho local se a API não tem dados
              mergedRespostas[itemId] = respostaLocal;
              rascunhoAplicado = true;
            } else {
              // Se não tem nem API nem local, usa os valores padrão
              mergedRespostas[itemId] = { status: "", observacao: "" };
            }
          });
          
          // Mostra notificação apenas se algum rascunho local foi aplicado
          if (rascunhoAplicado) {
            toast.info("Rascunho do checklist restaurado do armazenamento local.");
          }
          
          return mergedRespostas;
        });
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

  // Auto-save para localStorage: salva as respostas sempre que mudam
  useEffect(() => {
    if (Object.keys(respostas).length > 0) {
      const draftData = {
        osId: id,
        respostas,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`checklist_rascunho_${id}`, JSON.stringify(draftData));
    }
  }, [respostas, id]);

  // Cleanup effect para revocar ObjectURLs quando o componente desmontar
  useEffect(() => {
    return () => {
      // Revoga todas as URLs de preview para evitar vazamentos de memória
      photoPreviews.forEach(preview => {
        URL.revokeObjectURL(preview.url);
      });
    };
  }, [photoPreviews]);

  // Aviso de abandono: alerta se o usuário tentar sair com fotos pendentes ou itens não salvos
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Verifica se há fotos pendentes de upload
      const hasPendingPhotos = pendingPhotos.length > 0;
      
      // Verifica se há itens não salvos (comparando com o localStorage)
      const savedDraft = localStorage.getItem(`checklist_rascunho_${id}`);
      let hasUnsavedChanges = false;
      
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          // Se há rascunho no localStorage, significa que há alterações não salvas
          hasUnsavedChanges = true;
        } catch (err) {
          console.error("Erro ao verificar rascunho:", err);
        }
      }
      
      // Se há fotos pendentes OU itens não salvos, mostra alerta
      if (hasPendingPhotos || hasUnsavedChanges) {
        const message = 
          (hasPendingPhotos && hasUnsavedChanges) 
            ? "Você tem fotos pendentes de upload e alterações não salvas no checklist. Tem certeza que deseja sair?" 
            : hasPendingPhotos 
              ? "Você tem fotos pendentes de upload. Tem certeza que deseja sair?" 
              : "Você tem alterações não salvas no checklist. Tem certeza que deseja sair?";
        
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    // Adiciona o event listener para beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup: remove o event listener quando o componente desmonta
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pendingPhotos, id, photoPreviews]);

  // Função 1: Preparar o PDF (trabalho pesado assíncrono)
  const prepararPdf = async () => {
    setIsGeneratingPdf(true);

    console.log(osData);
    

    try {
      const response = await getPdf(id);
      const file = new File([response.data], `Checklist_${osData?.veiculo_modelo}_${osData?.veiculo_placa || id}.pdf`, { type: 'application/pdf' });
      setPdfFile(file);
      toast.success("PDF preparado com sucesso!");
    } catch (error) {
      console.error("Erro ao preparar PDF:", error);
      toast.error("Erro ao buscar o PDF no servidor.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Função 2: Compartilhar PDF (ação instantânea)
  const compartilharPdf = async () => {
    if (!pdfFile) return;

    // Verifica apenas se a API de share básica existe (ignora o canShare restritivo)
    if (navigator.share) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Checklist OS`,
          text: `Segue o checklist da ordem de serviço.`
        });
        console.log('Compartilhamento nativo acionado com sucesso.');
      } catch (error) {
        // Se o usuário abriu a gaveta do WhatsApp e fechou, não faça nada.
        if (error.name === 'AbortError') {
          console.log('Ação cancelada pelo usuário na interface do celular.');
          return;
        }
        // Se o celular realmente rejeitar o arquivo ou não suportar, faz o download.
        console.error("Falha ao forçar o Web Share. Acionando download:", error);
        baixarPdf();
      }
    } else {
      // Fallback limpo para Desktop (Windows/Mac sem suporte a share)
      console.log('Web Share não suportado no navegador. Baixando arquivo.');
      baixarPdf();
    }
  };

  // Função 3: Baixar PDF (fallback)
  const baixarPdf = () => {
    if (!pdfFile) {
      toast.warning("Por favor, prepare o PDF primeiro.");
      return;
    }

    const url = URL.createObjectURL(pdfFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Função para limpar o PDF preparado
  const limparPdf = () => {
    setPdfFile(null);
    toast.info("PDF limpo. Você pode gerar um novo.");
  };


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
      toast.success("Checklist salvo com sucesso!"); // Exibe um alerta de sucesso.
      
      // Limpa o rascunho do localStorage após salvar com sucesso
      localStorage.removeItem(`checklist_rascunho_${id}`);
    } catch (err) {
      toast.error("Erro ao salvar o checklist."); // Exibe um alerta de erro.
      console.error(err); // Loga o erro no console.
    } finally {
      setSaving(false); // Desativa o estado de salvamento.
    }
  };

  // Lida com a seleção de arquivos de foto pelo usuário (Upload Automático One-Touch)
  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Cria previews das fotos usando URL.createObjectURL
    const newPreviews = [];
    const newPendingPhotos = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      newPreviews.push({
        id: `pending-${Date.now()}-${i}`, // ID temporário
        url: previewUrl,
        file: file
      });
      newPendingPhotos.push(file);
    }
    
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
    setPendingPhotos(prev => [...prev, ...newPendingPhotos]);
    
    // Limpa o input para permitir nova seleção
    event.target.value = null;
    
    // Upload automático One-Touch: inicia o upload imediatamente
    if (newPendingPhotos.length > 0) {
      await handlePhotoUploadAuto(newPendingPhotos, newPreviews);
    }
  };
  
  // Função de upload automático (One-Touch)
  const handlePhotoUploadAuto = async (photosToUpload, previewsToUpload) => {
    if (photosToUpload.length === 0) return;
    
    setUploading(true); // Ativa o estado de upload
    
    const formData = new FormData();
    formData.append("os_id", id);
    
    for (let i = 0; i < photosToUpload.length; i++) {
      formData.append("fotos", photosToUpload[i]);
    }
    
    try {
      const response = await uploadFotos(formData);
      
      // Atualiza o estado 'osData' para incluir as novas fotos
      setOsData((prevData) => ({
        ...prevData,
        fotos: [...prevData.fotos, ...response.data.data],
      }));
      
      // Libera as URLs de preview das fotos enviadas
      previewsToUpload.forEach(preview => {
        URL.revokeObjectURL(preview.url);
      });
      
      // Remove as fotos enviadas dos estados pendentes
      setPendingPhotos(prev => prev.filter(photo => 
        !photosToUpload.includes(photo)
      ));
      setPhotoPreviews(prev => prev.filter(preview => 
        !previewsToUpload.find(p => p.id === preview.id)
      ));
      
      toast.success("Fotos enviadas automaticamente com sucesso!");
    } catch (err) {
      toast.error("Erro ao enviar fotos automaticamente.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Lida com o upload das fotos selecionadas.
  const handlePhotoUpload = async () => {
    // Validação: verifica se há fotos pendentes para upload.
    if (pendingPhotos.length === 0) {
      toast.warning("Por favor, selecione ao menos uma foto.");
      return;
    }
    setUploading(true); // Ativa o estado de upload.
    const formData = new FormData(); // Cria um objeto FormData para enviar os arquivos.
    formData.append("os_id", id); // Adiciona o ID da OS ao FormData.
    // Itera sobre as fotos pendentes e as adiciona ao FormData com a chave 'fotos'.
    for (let i = 0; i < pendingPhotos.length; i++) {
      formData.append("fotos", pendingPhotos[i]);
    }
    try {
      // Chama a função da API para fazer o upload das fotos.
      const response = await uploadFotos(formData);
      // Atualiza o estado 'osData' para incluir as novas fotos sem recarregar a página inteira.
      setOsData((prevData) => ({
        ...prevData,
        fotos: [...prevData.fotos, ...response.data.data], // Adiciona as fotos retornadas pela API.
      }));
      
      // Libera as URLs de preview antes de limpar os estados
      photoPreviews.forEach(preview => {
        URL.revokeObjectURL(preview.url);
      });
      
      // Limpa as fotos pendentes e previews
      setPendingPhotos([]);
      setPhotoPreviews([]);
      setSelectedFiles(null);
      
      toast.success("Fotos enviadas com sucesso!"); // Exibe um alerta de sucesso.
    } catch (err) {
      toast.error("Erro ao enviar fotos."); // Exibe um alerta de erro.
      console.error(err); // Loga o erro no console.
    } finally {
      setUploading(false); // Desativa o estado de upload.
    }
  };

  // Lida com a exclusão de uma foto pendente (em memória)
  const handlePendingPhotoDelete = (previewId) => {
    const previewIndex = photoPreviews.findIndex(p => p.id === previewId);
    if (previewIndex === -1) return;
    
    // Libera a URL do objeto
    URL.revokeObjectURL(photoPreviews[previewIndex].url);
    
    // Remove a foto dos estados
    const updatedPreviews = photoPreviews.filter(p => p.id !== previewId);
    const updatedPendingPhotos = pendingPhotos.filter((_, index) => index !== previewIndex);
    
    setPhotoPreviews(updatedPreviews);
    setPendingPhotos(updatedPendingPhotos);
    
    // Atualiza selectedFiles se necessário
    if (updatedPendingPhotos.length === 0) {
      setSelectedFiles(null);
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
      toast.success("Foto deletada com sucesso!"); // Exibe um alerta de sucesso.
    } catch (err) {
      toast.error("Erro ao deletar foto."); // Exibe um alerta de erro.
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
      toast.success("Assinatura salva com sucesso!"); // Exibe um alerta de sucesso.
    } catch (err) {
      toast.error("Erro ao salvar assinatura."); // Exibe um alerta de erro.
      console.error(err); // Loga o erro no console.
    }
  };

  // Função para verificar se há alterações não salvas antes de navegar
  const checkUnsavedChanges = (e) => {
    // Verifica se há fotos pendentes de upload
    const hasPendingPhotos = pendingPhotos.length > 0;
    
    // Verifica se há itens não salvos (comparando com o localStorage)
    const savedDraft = localStorage.getItem(`checklist_rascunho_${id}`);
    let hasUnsavedChanges = false;
    
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        // Se há rascunho no localStorage, significa que há alterações não salvas
        hasUnsavedChanges = true;
      } catch (err) {
        console.error("Erro ao verificar rascunho:", err);
      }
    }
    
    // Se há fotos pendentes OU itens não salvos, pede confirmação
    if (hasPendingPhotos || hasUnsavedChanges) {
      const message = 
        (hasPendingPhotos && hasUnsavedChanges) 
          ? "Você tem fotos pendentes de upload e alterações não salvas no checklist. Tem certeza que deseja sair?" 
          : hasPendingPhotos 
            ? "Você tem fotos pendentes de upload. Tem certeza que deseja sair?" 
            : "Você tem alterações não salvas no checklist. Tem certeza que deseja sair?";
      
      if (!window.confirm(message)) {
        e.preventDefault();
        return false;
      }
    }
    return true;
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
    <>
      <Header />
      <div className="checklist-page teste">
        {/* Link para voltar à página anterior (lista de OSs). */}
        <Link 
          to="/home" 
          className="back-link"
          onClick={checkUnsavedChanges}
        >
          ← Voltar para a lista
        </Link>

        {/* Seção de detalhes da Ordem de Serviço */}
        <div className="os-details">
          <h2>Checklist para: {osData.cliente_nome}</h2>
          <p>Veículo: {osData.veiculo_modelo}</p>
          <p>Placa: {osData.veiculo_placa}</p>
          <p>Seguradora: {osData.seguradora_nome || "N/A"}</p>{" "}
          {/* Mostra "N/A" se não houver seguradora */}
        </div>

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
                  {item.ordem}. {item.nome}{" "}
                  {/* Exibe a ordem e o nome do item. */}
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
                            checked={
                              respostas[item.id]?.status === statusOption
                            } // Marca o rádio se for a resposta atual.
                            onChange={(e) =>
                              handleRespostaChange(
                                item.id,
                                "status", // Campo a ser atualizado.
                                e.target.value // Novo valor.
                              )
                            }
                          />
                          {/* Exibe a opção com ícone e texto com primeira letra maiúscula. */}
                          <span>
                            {statusOption === "ok" && "✅ "}
                            {statusOption === "irregular" && "⚠️ "}
                            {(statusOption === "não aplicável" || statusOption === "na" || statusOption === "n/a") && "➖ "}
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
                          <div className="range-slider-with-markers">
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
                            {/* Marcadores visuais para o slider */}
                            <div className="range-markers">
                              <span className="range-marker" style={{ left: '0%' }}>⛽ Vazio</span>
                              <span className="range-marker" style={{ left: '50%' }}>½ 1/2</span>
                              <span className="range-marker" style={{ left: '100%' }}>🟢 Cheio</span>
                            </div>
                          </div>
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
                  <img src={`${foto.caminho_arquivo}`} />
                  {/* Botão para deletar a foto. */}
                  <button
                    type="button"
                    onClick={() => handlePhotoDelete(foto.id)}
                    className="delete-photo-btn"
                  >
                    🗑️ 
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // Mensagem exibida se não houver fotos.
            <p>Nenhuma foto anexada a este checklist.</p>
          )}

          {/* Seção de fotos pendentes (em memória) */}
          {photoPreviews.length > 0 && (
            <div className="pending-photos-section">
              <h4>Fotos Pendentes ({photoPreviews.length})</h4>
              <p className="pending-photos-info">
                Estas fotos estão armazenadas localmente e serão enviadas quando você clicar em "Enviar Fotos".
              </p>
              <div className="photo-gallery">
                {photoPreviews.map((preview) => (
                  <div key={preview.id} className="photo-container pending">
                    <img src={preview.url} alt="Preview" />
                    {/* Botão para deletar a foto pendente. */}
                    <button
                      type="button"
                      onClick={() => handlePendingPhotoDelete(preview.id)}
                      className="delete-photo-btn"
                    >
                      🗑️
                    </button>
                    <div className="pending-badge">Pendente</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulário para upload de novas fotos. */}
          <div className="upload-form">
            <h4>Anexar Novas Fotos</h4>
            
            {/* Inputs ocultos para upload de fotos */}
            <input
              id="camera-input"
              type="file"
              accept="image/*"
              capture="environment" // Força a câmera traseira em dispositivos móveis
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <input
              id="gallery-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            {/* Botões estilizados para acionar os inputs */}
            <div className="upload-buttons">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('camera-input').click();
                }}
                className="btn-camera"
              >
                📷 Tirar Foto
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('gallery-input').click();
                }}
                className="btn-gallery"
              >
                🖼️ Selecionar da Galeria
              </button>
            </div>
            
            {/* Botão para enviar as fotos selecionadas */}
            <button
              type="button"
              onClick={handlePhotoUpload}
              disabled={pendingPhotos.length === 0 || uploading}
              className="btn-primary upload-submit-btn"
              style={uploading ? { backgroundColor: '#ff9800', color: '#000000' } : {}}
            >
              {uploading ? "⏳ Enviando imagem... Aguarde" : `Enviar Fotos (${pendingPhotos.length})`}
            </button>
          </div>
        </div>

        {/* ======================================================= */}
        {/* 3. BOTÕES DE AÇÃO PRINCIPAIS */}
        {/* ======================================================= */}
        <div className="checklist-actions">
          {/* Botão para salvar o checklist. */}
          <button 
            type="button"
            onClick={handleSave} 
            disabled={saving} 
            className="btn-save"
          >
            {saving ? "Salvando..." : "Salvar Checklist"}
          </button>
          
          {/* Renderização condicional para botões de PDF */}
          {!pdfFile ? (
            // Se não tem PDF preparado: botão para preparar
            <button
              type="button"
              onClick={prepararPdf}
              disabled={isGeneratingPdf}
              className="btn-pdf"
            >
              {isGeneratingPdf ? "Preparando PDF..." : "Gerar PDF"}
            </button>
          ) : (
            // Se tem PDF preparado: botões de compartilhar e baixar
            <div className="pdf-actions-container">
              <button
                type="button"
                onClick={compartilharPdf}
                className="btn-share"
              >
                📱 Compartilhar
              </button>
              <button
                type="button"
                onClick={baixarPdf}
                className="btn-download"
              >
                ⬇️ Baixar PDF
              </button>
              <button
                type="button"
                onClick={limparPdf}
                className="btn-clear-pdf"
                title="Limpar PDF"
              >
                ×
              </button>
            </div>
          )}
          
          {/* Botão para abrir o modal de coleta de assinatura. */}
          <button
            type="button"
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

      {/* O componente do relatório fica "escondido" aqui,
          pronto para ser "impresso" pelo html2canvas. */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {osData && (
          <ChecklistReport
            osData={osData}
            checklistItens={checklistItens}
            respostasMap={new Map(Object.entries(respostas))} // Cria o map aqui
            // logoUrl={logo} // Descomente se tiver o logo
          />
        )}
      </div>
    </>
  );
};

export default ChecklistPage; // Exporta o componente para ser usado em outras partes da aplicação.
