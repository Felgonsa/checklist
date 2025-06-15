import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import SignaturePad from "../components/SignaturePad";
import {
  getOrdemServicoById,
  getItens,
  saveRespostas,
  uploadFotos,
  deleteFoto,
  API_BASE_URL,
  saveAssinatura,
} from "../services/api";

const ChecklistPage = () => {
  const { id } = useParams();
  const [osData, setOsData] = useState(null);
  const [checklistItens, setChecklistItens] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [osResponse, itensResponse] = await Promise.all([
          getOrdemServicoById(id),
          getItens(),
        ]);
        setOsData(osResponse.data);
        setChecklistItens(itensResponse.data);

        const respostasIniciais = {};
        itensResponse.data.forEach((item) => {
          respostasIniciais[item.id] = { status: "", observacao: "" };
        });
        osResponse.data.respostas.forEach((resposta) => {
          respostasIniciais[resposta.item_id] = {
            status: resposta.status,
            observacao: resposta.observacao || "",
          };
        });
        setRespostas(respostasIniciais);
      } catch (err) {
        setError("Falha ao carregar os dados do checklist.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleRespostaChange = (itemId, campo, valor) => {
    setRespostas((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [campo]: valor,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const respostasParaSalvar = Object.keys(respostas).map((itemId) => ({
      item_id: parseInt(itemId),
      status: respostas[itemId].status,
      observacao: respostas[itemId].observacao,
    }));
    try {
      await saveRespostas({
        os_id: id,
        respostas: respostasParaSalvar,
      });
      alert("Checklist salvo com sucesso!");
    } catch (err) {
      alert("Erro ao salvar o checklist.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (event) => {
    setSelectedFiles(event.target.files);
  };

  const handlePhotoUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert("Por favor, selecione ao menos um arquivo.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("os_id", id);
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("fotos", selectedFiles[i]);
    }
    try {
      const response = await uploadFotos(formData);
      setOsData((prevData) => ({
        ...prevData,
        fotos: [...prevData.fotos, ...response.data.data],
      }));
      setSelectedFiles(null);
      document.getElementById("file-input").value = null;
      alert("Fotos enviadas com sucesso!");
    } catch (err) {
      alert("Erro ao enviar fotos.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoDelete = async (fotoId) => {
    if (!window.confirm("Tem certeza que deseja deletar esta foto?")) {
      return;
    }
    try {
      await deleteFoto(fotoId);
      setOsData((prevData) => ({
        ...prevData,
        fotos: prevData.fotos.filter((foto) => foto.id !== fotoId),
      }));
    } catch (err) {
      alert("Erro ao deletar foto.");
      console.error(err);
    }
  };

  const handleSaveSignature = async (signatureImage) => {
    try {
      await saveAssinatura(id, signatureImage);
      setOsData((prev) => ({ ...prev, assinatura_cliente: signatureImage }));
      setIsSignatureModalOpen(false);
      alert("Assinatura salva com sucesso!");
    } catch (err) {
      alert("Erro ao salvar assinatura.");
      console.error(err);
    }
  };

  const handleGeneratePdf = () => {
  // 1. Gera um número único baseado na data e hora atuais.
  const cacheBuster = `?t=${Date.now()}`;

  // 2. Adiciona esse número no final da URL.
  const pdfUrl = `${API_BASE_URL}/api/checklist/ordem-servico/${id}/pdf${cacheBuster}`;

  console.log("Abrindo URL do PDF com cache buster:", pdfUrl);

  // 3. Abre a nova URL, que o navegador sempre verá como única.
  window.open(pdfUrl, "_blank");
};

  if (loading) return <p>Carregando checklist...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!osData) return <p>Ordem de serviço não encontrada.</p>;
  return (
    <div className="checklist-page">
      <Link to="/" className="back-link">
        ← Voltar para a lista
      </Link>
      <div className="os-details">
        <h2>Checklist para: {osData.cliente_nome}</h2>
        <p>Veículo: {osData.veiculo_modelo}</p>
        <p>Placa: {osData.veiculo_placa}</p>
        <p>Seguradora: {osData.seguradora_nome}</p>
      </div>
      {/* ======================================================= */}
      {/* 1. FORMULÁRIO DO CHECKLIST                            */}
      {/* ======================================================= */}

      <div className="checklist-form">
        {checklistItens.map((item) => (
          <div key={item.id} className="checklist-item">
            {/* NOVA ESTRUTURA:
        Agora todos os itens têm um 'item-header' que alinha
        o nome à esquerda e o campo de input à direita.
      */}
            <div className="item-header">
              <label className="item-name">
                {item.ordem}. {item.nome}
              </label>

              <div className="item-input-area">
                {/* TIPO: 'options' (Botões de Rádio) */}
                {item.tipo === "options" && (
                  <div className="status-options">
                    {item.opcoes?.map((statusOption) => (
                      <label key={statusOption}>
                        <input
                          type="radio"
                          name={`status-${item.id}`}
                          value={statusOption}
                          checked={respostas[item.id]?.status === statusOption}
                          onChange={(e) =>
                            handleRespostaChange(
                              item.id,
                              "status",
                              e.target.value
                            )
                          }
                        />
                        <span>
                          {statusOption.charAt(0).toUpperCase() +
                            statusOption.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* TIPO: 'range' (Slider de Combustível) */}
                {item.tipo === "range" &&
                  (() => {
                    const valorDoBanco = parseInt(
                      respostas[item.id]?.observacao,
                      10
                    );
                    const valorValido =
                      !isNaN(valorDoBanco) &&
                      valorDoBanco >= 0 &&
                      valorDoBanco <= 100;
                    const valorDoSlider = valorValido ? valorDoBanco : 50;
                    return (
                      <div className="range-slider-container">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="2.5"
                          className="range-slider"
                          value={valorDoSlider}
                          onChange={(e) =>
                            handleRespostaChange(
                              item.id,
                              "observacao",
                              e.target.value
                            )
                          }
                        />
                        <span className="range-slider-value">
                          {valorDoSlider}%
                        </span>
                      </div>
                    );
                  })()}

                {/* TIPO: 'number' (Quilometragem) */}
                {item.tipo === "number" && (
                  <input
                    type="number"
                    className="text-input"
                    placeholder="Digite o valor..."
                    value={respostas[item.id]?.observacao || ""}
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

            {/* A área de observação agora fica fora do header,
        aparecendo abaixo apenas para os itens do tipo 'options'.
      */}
            {item.tipo === "options" && (
              <textarea
                placeholder="Observações..."
                value={respostas[item.id]?.observacao}
                onChange={(e) =>
                  handleRespostaChange(item.id, "observacao", e.target.value)
                }
              />
            )}
          </div>
        ))}
      </div>

      {/* ======================================================= */}
      {/* 2. SEÇÃO DE FOTOS                                     */}
      {/* ======================================================= */}
      <div className="photos-section">
        <h3>Fotos Anexadas</h3>
        {osData?.fotos?.length > 0 ? (
          <div className="photo-gallery">
            {osData.fotos.map((foto) => (
              <div key={foto.id} className="photo-container">
                <img src={foto.caminho_arquivo} alt={`Foto ${foto.id}`} />
                <button
                  onClick={() => handlePhotoDelete(foto.id)}
                  className="delete-photo-btn"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>Nenhuma foto anexada a este checklist.</p>
        )}

        <div className="upload-form">
          <h4>Anexar Novas Fotos</h4>
          <input
            id="file-input"
            type="file"
            multiple
            onChange={handleFileSelect}
            accept="image/png, image/jpeg, image/webp"
          />
          <button
            onClick={handlePhotoUpload}
            disabled={!selectedFiles || uploading}
            className="btn-primary"
          >
            {uploading ? "Enviando..." : "Enviar Fotos"}
          </button>
        </div>
      </div>
      {/* ======================================================= */}
      {/* 3. BOTÕES DE AÇÃO PRINCIPAIS                        */}
      {/* ======================================================= */}
      <div className="checklist-actions">
        <button onClick={handleSave} disabled={saving} className="btn-save">
          {saving ? "Salvando..." : "Salvar Checklist"}
        </button>
        <button onClick={handleGeneratePdf} className="btn-pdf">
          Gerar PDF
        </button>
        <button
          onClick={() => setIsSignatureModalOpen(true)}
          className="btn-signature"
        >
          Coletar Assinatura
        </button>
      </div>
      {/* O modal da assinatura renderiza aqui, fora do fluxo principal */}
      {isSignatureModalOpen && (
        <SignaturePad
          onClose={() => setIsSignatureModalOpen(false)}
          onSave={handleSaveSignature}
        />
      )}
    </div>
  );
};

export default ChecklistPage;
