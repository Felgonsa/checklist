import axios from 'axios';

// Defina o endereço do seu backend aqui
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_BASE_URL = BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api/checklist`,
});

// --- Funções para interagir com a API ---

export const getItens = () => api.get('/itens');

export const getOrdensServico = (page = 1, limit = 20, search = '') => 
  api.get(`/ordens-servico?page=${page}&limit=${limit}&search=${search}`);

export const getOrdemServicoById = (id) => api.get(`/ordem-servico/${id}`);

export const createOrdemServico = (dadosOS) => api.post('/ordem-servico', dadosOS);

// Esta é a nova função que estava faltando
export const updateOrdemServico = (id, dadosOS) => api.put(`/ordem-servico/${id}`, dadosOS);

export const saveRespostas = (dadosRespostas) => api.post('/respostas', dadosRespostas);

export const uploadFotos = (formData) => api.post('/fotos', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const deleteOrdemServico = (id) => api.delete(`/ordem-servico/${id}`);

export const deleteFoto = (fotoId) => api.delete(`/fotos/${fotoId}`);

export const saveAssinatura = (id, assinatura) => api.post(`/ordem-servico/${id}/assinatura`, { assinatura });

export default api;