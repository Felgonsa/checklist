const express = require('express');
const router = express.Router();
const upload = require('../config/multer'); 

// Importa de todos os nossos novos controllers
const ordemServicoController = require('../controller/ordemServicoController.js');
const checklistController = require('../controller/checklistController.js');
const mediaController = require('../controller/mediaController.js');
const pdfController = require('../controller/pdfController.js');


// === ROTAS DE ORDEM DE SERVIÇO ===
router.get('/ordens-servico', ordemServicoController.getOrdensServico);
router.get('/ordem-servico/:id', ordemServicoController.getOrdemServicoById);
router.post('/ordem-servico', ordemServicoController.createOrdemServico);
router.put('/ordem-servico/:id', ordemServicoController.updateOrdemServico);
router.delete('/ordem-servico/:id', ordemServicoController.deleteOrdemServico);

// === ROTAS DE CHECKLIST ===
router.get('/itens', checklistController.getChecklistItens);
router.post('/respostas', checklistController.saveChecklistRespostas);

// === ROTAS DE MÍDIA (FOTOS E ASSINATURA) ===
router.post('/fotos', upload.array('fotos', 10), mediaController.uploadFotos);
router.delete('/fotos/:foto_id', mediaController.deleteFoto);
router.post('/ordem-servico/:id/assinatura', mediaController.saveAssinatura);

// === ROTA DE RELATÓRIO (PDF) ===
router.get('/ordem-servico/:id/pdf', pdfController.generatePdf);


module.exports = router;