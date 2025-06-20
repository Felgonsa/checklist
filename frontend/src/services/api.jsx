import axios from 'axios'; // Importa a biblioteca Axios para fazer requisições HTTP.

// --- Configuração da API ---

// Define a URL base do seu backend.
// Ele tenta pegar a URL da variável de ambiente VITE_API_URL (usada em projetos Vite).
// Se a variável de ambiente não estiver definida, usa 'http://localhost:3001' como padrão.
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Exporta a URL base do backend. Pode ser útil para outras partes do frontend
// que precisam da URL completa (por exemplo, para gerar links de PDF).
export const API_BASE_URL = BACKEND_URL;

// Cria uma instância do Axios com uma URL base predefinida.
// Todas as requisições feitas usando esta instância 'api' terão automaticamente
// '${BACKEND_URL}/api/checklist' adicionado aos seus caminhos.
const api = axios.create({
  baseURL: `${BACKEND_URL}/api/checklist`,
});

// --- Funções para Interagir com a API ---

// Busca todos os itens padrão do checklist.
export const getItens = () => api.get('/itens');

// Busca uma lista paginada de ordens de serviço, com opção de busca.
// Parâmetros: 'page' (página atual), 'limit' (itens por página), 'search' (termo de busca).
export const getOrdensServico = (page = 1, limit = 20, search = '') =>
  api.get(`/ordens-servico?page=${page}&limit=${limit}&search=${search}`);

// Busca uma ordem de serviço específica pelo seu ID.
export const getOrdemServicoById = (id) => api.get(`/ordem-servico/${id}`);

// Cria uma nova ordem de serviço.
// Recebe um objeto 'dadosOS' com as informações da nova ordem.
export const createOrdemServico = (dadosOS) => api.post('/ordem-servico', dadosOS);

// Atualiza uma ordem de serviço existente pelo seu ID.
// Recebe o 'id' da ordem e um objeto 'dadosOS' com as informações a serem atualizadas.
export const updateOrdemServico = (id, dadosOS) => api.put(`/ordem-servico/${id}`, dadosOS);

// Salva as respostas do checklist para uma ordem de serviço.
// Recebe um objeto 'dadosRespostas' contendo o ID da OS e as respostas.
export const saveRespostas = (dadosRespostas) => api.post('/respostas', dadosRespostas);

// Faz o upload de fotos.
// Recebe um objeto 'formData' que deve conter os arquivos das fotos.
// Define o cabeçalho 'Content-Type' como 'multipart/form-data', necessário para uploads de arquivo.
export const uploadFotos = (formData) => api.post('/fotos', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Deleta uma ordem de serviço pelo seu ID.
export const deleteOrdemServico = (id) => api.delete(`/ordem-servico/${id}`);

// Deleta uma foto específica pelo seu ID.
export const deleteFoto = (fotoId) => api.delete(`/fotos/${fotoId}`);

// Salva a assinatura do cliente para uma ordem de serviço.
// Recebe o 'id' da ordem e a 'assinatura' (provavelmente em Base64).
export const saveAssinatura = (id, assinatura) => api.post(`/ordem-servico/${id}/assinatura`, { assinatura });

// Exporta a instância configurada do Axios como exportação padrão do módulo.
export default api;