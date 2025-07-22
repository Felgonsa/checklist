// ARQUIVO: frontend/src/components/ChecklistReport.jsx (CORRIGIDO)

import React from 'react';
import './ChecklistReport.css';
// CORREÇÃO: Importa a URL base do seu arquivo de API
import { API_BASE_URL } from '../services/api'; 
import header from '../images/header.png'; // Importa o logo se necessário

const ChecklistReport = ({ osData, checklistItens, respostasMap }) => {
  if (!osData) return null;

  return (

    
    <div id="pdf-content" className="report-container">
      <header className="report-header">
        
        <img src={header} alt="Cabeçalho do Relatório" className="report-logo" />
        <h1>Checklist de Vistoria</h1>
      </header>

      <section className="os-details-section">
        <p><strong>Cliente:</strong> {osData.cliente_nome}</p>
        <p><strong>Veículo:</strong> {osData.veiculo_modelo}</p>
        <p><strong>Placa:</strong> {osData.veiculo_placa}</p>
        <p><strong>Data:</strong> {new Date(osData.data).toLocaleString('pt-BR', { timeZone: 'America/Campo_Grande' })}</p>
      </section>

      <section className="items-section">
        <h2>Itens Vistoriados</h2>
        <div className="items-grid">
          {checklistItens.map(item => {
            const resposta = respostasMap.get(String(item.id)) || {}; // Converte para string para garantir a busca correta
            const status = (item.tipo === 'options' ? resposta.status : resposta.observacao) || 'N/A';
            const obs = item.tipo === 'options' ? (resposta.observacao || '') : '';
            return (
              <div key={item.id} className="item-card">
                <span className="item-card-title">{item.ordem}. {item.nome}</span><br />
                <span className="item-card-status">{status}</span>
                {obs && <p className="item-card-obs"><strong>Obs:</strong> {obs}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {osData.fotos && osData.fotos.length > 0 && (
        <section className="photos-section-pdf">
          <h2>Fotos Anexadas</h2>
          <div className="photos-grid-pdf">
            {osData.fotos.map(foto => (
              <div key={foto.id} className="photo-item-pdf">
                {/* CORREÇÃO: Usa a variável API_BASE_URL para montar a URL da imagem */}
                <img src={`${API_BASE_URL}/${foto.caminho_arquivo}`} alt={`Foto ${foto.id}`} crossOrigin="anonymous" />
              </div>
            ))}
          </div>
        </section>
      )}

      {osData.assinatura_cliente && (
        <section className="signature-section-pdf">
          <h2>Assinatura do Cliente</h2>
          <div className="signature-box">
            <img src={osData.assinatura_cliente} alt="Assinatura" crossOrigin="anonymous" />
            <div className="signature-line"></div>
            <p>{osData.cliente_nome}</p>
          </div>
        </section>
      )}
    </div>
  );
};

export default ChecklistReport;