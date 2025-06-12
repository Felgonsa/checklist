const express = require('express');
const router = express.Router();
const checklistController = require('../controller/controller.js'); // Importamos o nosso futuro controller
const upload = require('../config/multer'); // Importaremos a configuração do multer

// === ROTAS PARA ITENS DO CHECKLIST (GERAL) ===

// Rota para buscar todos os itens padrão do checklist
// Ex: GET http://localhost:3001/api/checklist/itens
router.get('/itens', checklistController.getChecklistItens);


// === ROTAS PARA ORDEM DE SERVIÇO (OS) ===

// Rota para criar uma nova Ordem de Serviço
// Ex: POST http://localhost:3001/api/checklist/ordem-servico
router.post('/ordem-servico', checklistController.createOrdemServico);

// Rota para buscar uma Ordem de Serviço específica com todas as suas respostas e fotos
// Ex: GET http://localhost:3001/api/checklist/ordem-servico/1
router.get('/ordem-servico/:id', checklistController.getOrdemServicoById);

router.get('/ordens-servico', checklistController.getOrdensServico);


router.put('/ordem-servico/:id', checklistController.updateOrdemServico);
// === ROTAS PARA RESPOSTAS E FOTOS DO CHECKLIST ===

// Rota para salvar as respostas de um checklist para uma OS específica
// Ex: POST http://localhost:3001/api/checklist/respostas
router.post('/respostas', checklistController.saveChecklistRespostas);

// Rota para fazer upload de fotos associadas a uma OS
// O '.array('fotos', 10)' significa que estamos esperando um campo chamado 'fotos' com até 10 arquivos
// Ex: POST http://localhost:3001/api/checklist/fotos
router.post('/fotos', upload.array('fotos', 10), checklistController.uploadFotos);


router.delete('/ordem-servico/:id', checklistController.deleteOrdemServico);
router.delete('/fotos/:foto_id', checklistController.deleteFoto);


router.get('/ordem-servico/:id/pdf', checklistController.generatePdf);
router.post('/ordem-servico/:id/assinatura', checklistController.saveAssinatura);

// Exporta o router para ser usado no app.js
module.exports = router;