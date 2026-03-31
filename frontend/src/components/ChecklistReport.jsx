// ARQUIVO: frontend/src/components/ChecklistReport.jsx (LAUDO TÉCNICO PROFISSIONAL)

import header from '../images/header.png'; // Importa o logo se necessário
import './ChecklistReport.css';

const ChecklistReport = ({ osData, checklistItens, respostasMap }) => {
  if (!osData) return null;

  // Função para formatar data (apenas data, sem hora para o laudo)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Campo_Grande'
    });
  };

  // Função para formatar status com destaque visual
  const formatStatus = (status) => {
    if (!status) return 'Não informado';
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('ok') || statusLower === 'ok') {
      return <span className="status-badge status-ok">OK</span>;
    }
    if (statusLower.includes('irregular') || statusLower === 'irregular') {
      return <span className="status-badge status-irregular">IRREGULAR</span>;
    }
    if (statusLower.includes('não aplicável') || statusLower === 'na' || statusLower === 'n/a') {
      return <span className="status-badge status-na">NÃO APLICÁVEL</span>;
    }
    
    return <span className="status-text">{status}</span>;
  };

  return (
    <div id="pdf-content" className="laudo-container">
      {/* ======================================================= */}
      {/* 1. CABEÇALHO PROFISSIONAL EM FORMATO DE CARD/GRID */}
      {/* ======================================================= */}
      <header className="laudo-header">
        <div className="header-card">
          {/* Lado Esquerdo: Logo e dados da oficina */}
          <div className="header-left">
            <div className="logo-placeholder">
              <img src={header} alt="Logo da Oficina" className="logo-image" />
            </div>
            <div className="workshop-data">
              <h3>{osData.oficina_nome || "Auto Center Premium"}</h3>
              <p><strong>CNPJ:</strong> {osData.oficina_cnpj || "12.345.678/0001-90"}</p>
              <p><strong>Telefone:</strong> {osData.oficina_telefone || "(67) 99999-9999"}</p>
              <p><strong>Endereço:</strong> {osData.oficina_endereco || "Av. Principal, 123 - Centro"}</p>
            </div>
          </div>
          
          {/* Lado Direito: Dados da OS */}
          <div className="header-right">
            <h1>LAUDO TÉCNICO DE VISTORIA</h1>
            <div className="os-data-grid">
              <div className="data-row">
                <span className="data-label">Nº OS:</span>
                <span className="data-value">{osData.id}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Data:</span>
                <span className="data-value">{formatDate(osData.data)}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Cliente:</span>
                <span className="data-value">{osData.cliente_nome}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Veículo:</span>
                <span className="data-value">{osData.veiculo_modelo}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Placa:</span>
                <span className="data-value">{osData.veiculo_placa}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Seguradora:</span>
                <span className="data-value">{osData.seguradora_nome || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ======================================================= */}
      {/* 2. CHECKLIST EM TABELA/GRID DE DUAS COLUNAS */}
      {/* ======================================================= */}
      <section className="checklist-section">
        <h2 className="section-title">ITENS VISTORIADOS</h2>
        
        <div className="checklist-table">
          {/* Cabeçalho da tabela */}
          <div className="table-header">
            <div className="col-item">ITEM</div>
            <div className="col-status">STATUS</div>
          </div>
          
          {/* Corpo da tabela - ITERANDO APENAS UMA VEZ SOBRE OS ITENS */}
          {checklistItens.map(item => {
            const resposta = respostasMap.get(String(item.id)) || {};
            const status = (item.tipo === 'options' ? resposta.status : resposta.observacao) || 'Não informado';
            const obs = item.tipo === 'options' ? (resposta.observacao || '') : '';
            
            return (
              <div key={item.id} className="table-row">
                <div className="col-item">
                  <span className="item-number">{item.ordem}.</span>
                  <span className="item-name">{item.nome}</span>
                  {obs && (
                    <div className="item-obs">
                      <em>Obs: {obs}</em>
                    </div>
                  )}
                </div>
                <div className="col-status">
                  {formatStatus(status)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================= */}
      {/* 3. GALERIA DE FOTOS COM CSS GRID */}
      {/* ======================================================= */}
      {osData.fotos && osData.fotos.length > 0 && (
        <section className="photos-section">
          <h2 className="section-title">REGISTRO FOTOGRÁFICO</h2>
          <p className="photos-count">{osData.fotos.length} foto(s) anexada(s)</p>
          
          <div className="photos-grid">
            {osData.fotos.map((foto, index) => (
              <div key={foto.id} className="photo-container">
                <img 
                  src={foto.caminho_arquivo} 
                  alt={`Foto ${index + 1}`}
                  className="photo-image"
                />
                <div className="photo-info">
                  <span className="photo-number">Foto {index + 1}</span>
                  {foto.descricao && (
                    <span className="photo-desc"> - {foto.descricao}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ======================================================= */}
      {/* 4. ÁREA DE ASSINATURA CENTRALIZADA */}
      {/* ======================================================= */}
      <section className="signature-section">
        <h2 className="section-title">CONFERÊNCIA E APROVAÇÃO</h2>
        
        <div className="signature-area">
          <div className="signature-line"></div>
          <p className="signature-name">{osData.cliente_nome}</p>
          <p className="signature-label">Assinatura do Cliente</p>
          <p className="signature-date">Data: {formatDate(osData.data)}</p>
          <p className="signature-note">
            Declaro ter conferido e aprovado os itens vistoriados conforme descrito neste laudo técnico.
          </p>
        </div>
      </section>

      {/* ======================================================= */}
      {/* RODAPÉ DO LAUDO */}
      {/* ======================================================= */}
      <footer className="laudo-footer">
        <div className="footer-line"></div>
        <p className="footer-text">
          <strong>Documento gerado automaticamente pelo Sistema de Checklist Automotivo</strong><br />
          Laudo técnico válido para fins de garantia e documentação.
        </p>
        <p className="footer-info">
          Página 1 de 1 • Gerado em: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </footer>
    </div>
  );
};

export default ChecklistReport;
