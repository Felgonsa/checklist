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

export const login = (credentials) => api.post('/login', credentials);

//Incrementa o token de autenticação em todas as requisições
api.interceptors.request.use(
  (config) => {
    // Pega o token do localStorage
    const token = localStorage.getItem('authToken');
    // Se o token existir, adiciona ao cabeçalho de autorização
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

//intercepta as respostas da API para redirecionar o usuário para a página de login quando o token for inválido ou expirado
api.interceptors.response.use(
  // Se a resposta for SUCESSO (status 2xx), apenas a retorne
  (response) => {
    return response;
  },
  (error) => {
    // ...e o erro for 403 (token inválido/expirado)...
    if (error.response && error.response.status === 403) {
      console.log("Token inválido ou expirado. Redirecionando para o login...");
      // Limpa o token inválido do armazenamento
      localStorage.removeItem('authToken');
      // Força o redirecionamento para a página de login
      window.location.href = '/'; 
    }
    // Para qualquer outro erro, apenas o rejeite para que o '.catch()' do componente possa lidar com ele
    return Promise.reject(error);
  }
);

export const logout = () => {
  // Limpa o token do armazenamento local
  localStorage.removeItem('authToken');
  // Força o redirecionamento para a página de login com recarregamento
  window.location.href = '/'; 
};

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

// --- Funções de Administração ---

// Oficinas
export const getOficinas = () => api.get('/oficinas');
export const createOficina = (dadosOficina) => api.post('/oficinas', dadosOficina);
export const updateOficina = (id, dadosOficina) => api.put(`/oficinas/${id}`, dadosOficina);
export const deleteOficina = (id) => api.delete(`/oficinas/${id}`);
// Usuários
export const getUsuarios = () => api.get('/usuarios'); // Vamos criar esta rota no backend depois
export const createUsuario = (dadosUsuario) => api.post('/usuarios', dadosUsuario);

export default api;