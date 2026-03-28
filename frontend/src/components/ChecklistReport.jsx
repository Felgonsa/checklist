// ARQUIVO: frontend/src/components/ChecklistReport.jsx (PROFISSIONALIZADO)

import header from '../images/header.png'; // Importa o logo se necessário
import './ChecklistReport.css';

const ChecklistReport = ({ osData, checklistItens, respostasMap }) => {
  if (!osData) return null;

  // Função para formatar data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Campo_Grande'
    });
  };

  // Função para determinar a classe CSS do status
  const getStatusClass = (status) => {
    if (!status) return '';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('ok') || statusLower === 'ok') return 'ok';
    if (statusLower.includes('irregular') || statusLower === 'irregular') return 'irregular';
    if (statusLower.includes('não aplicável') || statusLower === 'na' || statusLower === 'n/a') return 'na';
    return '';
  };

  return (
    <div id="pdf-content" className="report-container">
      <header className="report-header">
        <img src={header} alt="Cabeçalho do Relatório" className="report-logo" />
        
        {/* Informações da oficina (dinâmicas - podem vir do backend) */}
        <div className="workshop-info">
          <p><strong>Oficina:</strong> {osData.oficina_nome || "Auto Center Premium"}</p>
          <p><strong>CNPJ:</strong> {osData.oficina_cnpj || "12.345.678/0001-90"}</p>
          <p><strong>Telefone:</strong> {osData.oficina_telefone || "(67) 99999-9999"}</p>
          <p><strong>Endereço:</strong> {osData.oficina_endereco || "Av. Principal, 123 - Centro"}</p>
        </div>
        
        <h1>Checklist de Vistoria</h1>
        <p className="report-subtitle">Relatório Técnico de Inspeção Veicular</p>
      </header>

      {/* Seção de detalhes da OS com layout profissional */}
      <section className="os-details-section">
        <h2>Dados da Ordem de Serviço</h2>
        <p><strong>Cliente:</strong> {osData.cliente_nome}</p>
        <p><strong>Veículo:</strong> {osData.veiculo_modelo}</p>
        <p><strong>Placa:</strong> {osData.veiculo_placa}</p>
        <p><strong>Chassi:</strong> {osData.veiculo_chassi || "N/A"}</p>
        <p><strong>Seguradora:</strong> {osData.seguradora_nome || "N/A"}</p>
        <p><strong>Data da Vistoria:</strong> {formatDate(osData.data)}</p>
        <p><strong>Nº OS:</strong> {osData.id}</p>
      </section>

      {/* Seção de itens vistoriados com hierarquia visual clara */}
      <section className="items-section">
        <h2>Itens Vistoriados</h2>
        <div className="items-grid">
          {checklistItens.map(item => {
            const resposta = respostasMap.get(String(item.id)) || {};
            const status = (item.tipo === 'options' ? resposta.status : resposta.observacao) || 'Não informado';
            const obs = item.tipo === 'options' ? (resposta.observacao || '') : '';
            const statusClass = getStatusClass(status);
            
            return (
              <div key={item.id} className="item-card">
                <span className="item-card-title">{item.ordem}. {item.nome}</span>
                <span 
                  className="item-card-status" 
                  data-status={statusClass}
                >
                  {status}
                </span>
                {obs && (
                  <div className="item-card-obs">
                    <strong>Observações:</strong> {obs}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Seção de fotos com quebra de página otimizada */}
      {osData.fotos && osData.fotos.length > 0 && (
        <section className="photos-section-pdf">
          <h2>Registro Fotográfico</h2>
          <p className="section-description">
            {osData.fotos.length} foto(s) anexada(s) como evidência da vistoria.
          </p>
          <div className="photos-grid-pdf">
            {osData.fotos.map((foto, index) => (
              <div key={foto.id} className="photo-item-pdf">
                <img 
                  src={foto.caminho_arquivo} 
                  alt={`Foto ${index + 1} - ${foto.descricao || 'Registro de vistoria'}`}
                  title={`Foto ${index + 1}`}
                />
                <div className="photo-caption">
                  Foto {index + 1} - {foto.descricao || 'Registro de vistoria'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Seção de assinatura com layout profissional */}
      {osData.assinatura_cliente && (
        <section className="signature-section-pdf">
          <h2>Conferência e Aprovação</h2>
          <div className="signature-box">
            <p className="signature-title">Assinatura do Cliente</p>
            <img 
              src={osData.assinatura_cliente} 
              alt="Assinatura do cliente" 
              className="signature-image"
            />
            <div className="signature-line"></div>
            <p className="signature-name">{osData.cliente_nome}</p>
            <p className="signature-date">Data: {formatDate(osData.data)}</p>
            <p className="signature-note">
              Declaro ter conferido e aprovado os itens vistoriados conforme descrito neste relatório.
            </p>
          </div>
        </section>
      )}

      {/* Rodapé do relatório */}
      <footer className="report-footer">
        <div className="footer-line"></div>
        <p className="footer-text">
          <strong>Documento gerado automaticamente pelo Sistema de Checklist Automotivo</strong><br />
          Este relatório possui validade técnica e pode ser utilizado para fins de garantia e documentação.
        </p>
        <p className="footer-page-info">
          Página 1 de 1 • Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </footer>
    </div>
  );
};

export default ChecklistReport;
