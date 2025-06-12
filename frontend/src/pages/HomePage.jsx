import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getOrdensServico, deleteOrdemServico } from "../services/api";
import AddChecklistModal from "../components/AddChecklistModal";

// Hook customizado que "atrasa" a execução da busca para não sobrecarregar a API
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const HomePage = () => {
  // --- ESTADOS DO COMPONENTE ---
  const [ordens, setOrdens] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ordemEmEdicao, setOrdemEmEdicao] = useState(null);
  
  // Usa o hook de debounce para o termo de busca
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const navigate = useNavigate();

  // --- EFEITOS (useEffect) ---

  // Este é o ÚNICO useEffect necessário para buscar os dados.
  // Ele roda quando o componente carrega e sempre que o usuário para de digitar na busca.
  useEffect(() => {
    // Quando uma nova busca é feita, reseta a lista e a paginação
    setOrdens([]);
    setPage(1);
    setHasMore(true);
    fetchOrdens(1, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // --- FUNÇÕES AUXILIARES ---

  const fetchOrdens = async (pagina, termoDeBusca) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOrdensServico(pagina, 20, termoDeBusca);
      const novasOrdens = response.data.data;
      
      // Se for a primeira página (nova busca), substitui a lista. 
      // Senão (carregar mais), adiciona no final.
      setOrdens(prev => pagina === 1 ? novasOrdens : [...prev, ...novasOrdens]);
      setHasMore(pagina < response.data.totalPages);
    } catch (err) {
      setError("Falha ao carregar as ordens de serviço.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOrdens(nextPage, debouncedSearchTerm);
  };

  const handleOpenCreateModal = () => {
    setOrdemEmEdicao(null);
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (ordem) => {
    setOrdemEmEdicao(ordem);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setOrdemEmEdicao(null);
  };
  
  const handleSaveSuccess = (osSalva) => {
    const existe = ordens.some(o => o.id === osSalva.id);
    if (existe) {
      setOrdens(ordens.map(o => o.id === osSalva.id ? osSalva : o));
    } else {
      setOrdens([osSalva, ...ordens]);
    }
    if (!ordemEmEdicao) {
      navigate(`/checklist/${osSalva.id}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este checklist?')) return;
    try {
      await deleteOrdemServico(id);
      setOrdens(prevOrdens => prevOrdens.filter(ordem => ordem.id !== id));
    } catch (err) {
      alert('Falha ao deletar a ordem de serviço.');
      console.error(err);
    }
  };

  // --- RENDERIZAÇÃO ---

  return (
    <div className="homepage">
      <h2>Ordens de Serviço Abertas</h2>
      <button className="btn-new-checklist" onClick={handleOpenCreateModal}>
        Criar Nova Checklist
      </button>

      <div className="search-bar-container">
        <input
          type="text"
          placeholder="Buscar por cliente, placa ou veículo..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="content-area">
        {/* Renderiza a lista de ordens */}
        <div className="os-list">
          {ordens.map((ordem) => (
            <div key={ordem.id} className="os-card">
              <Link to={`/checklist/${ordem.id}`} className="os-card-link">
                <h3>{ordem.cliente_nome}</h3>
                <p>Veículo: {ordem.veiculo_modelo}</p>
                <p>Placa: {ordem.veiculo_placa}</p>
                <p className="os-date">
                  Data: {new Date(ordem.data).toLocaleDateString("pt-BR")}
                </p>
              </Link>
              <div className="os-card-actions">
                <button onClick={() => handleOpenEditModal(ordem)} className="edit-os-btn">Editar</button>
                <button onClick={() => handleDelete(ordem.id)} className="delete-os-btn">Deletar</button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Mostra mensagens de Carregando, Erro ou Fim da Lista */}
        {loading && <p>Carregando...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && ordens.length === 0 && !error && (
           <p>Nenhuma ordem de serviço encontrada.</p>
        )}
        {!loading && hasMore && (
          <button onClick={handleLoadMore} className="btn-load-more">
            Carregar Mais
          </button>
        )}
      </div>

      <AddChecklistModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveSuccess={handleSaveSuccess}
        ordemParaEditar={ordemEmEdicao}
      />
    </div>
  );
};

export default HomePage;