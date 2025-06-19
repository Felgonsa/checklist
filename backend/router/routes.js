const express = require('express');
const router = express.Router();
const upload = require('../config/multer');

// Importa de todos os nossos novos controllers
const ordemServicoController = require('../controller/ordemServicoController.js');
const checklistController = require('../controller/checklistController.js');
const mediaController = require('../controller/mediaController.js');
const pdfController = require('../controller/pdfController.js');
const authController = require('../controller/authController.js');
const autenticarToken = require('../middleware/auth.js');


// === ROTAS DE ORDEM DE SERVIÇO ===
router.get('/ordens-servico', autenticarToken, ordemServicoController.getOrdensServico);
router.get('/ordem-servico/:id', autenticarToken, ordemServicoController.getOrdemServicoById);
router.post('/ordem-servico', autenticarToken, ordemServicoController.createOrdemServico);
router.put('/ordem-servico/:id', autenticarToken, ordemServicoController.updateOrdemServico);
router.delete('/ordem-servico/:id', autenticarToken, ordemServicoController.deleteOrdemServico);

// === ROTAS DE CHECKLIST ===
router.get('/itens', autenticarToken,checklistController.getChecklistItens);
router.post('/respostas', autenticarToken,checklistController.saveChecklistRespostas);

// === ROTAS DE MÍDIA (FOTOS E ASSINATURA) ===
router.post('/fotos',autenticarToken, upload.array('fotos', 10), mediaController.uploadFotos);
router.delete('/fotos/:foto_id',autenticarToken, mediaController.deleteFoto);
router.post('/ordem-servico/:id/assinatura',autenticarToken, mediaController.saveAssinatura);

// === ROTA DE RELATÓRIO (PDF) ===
router.get('/ordem-servico/:id/pdf',autenticarToken, pdfController.generatePdf);


// === ROTAS DE AUTENTICAÇÃO ===
router.post('/login', authController.login);
// Rota para o superadmin criar usuários (protegida)
router.post('/usuarios', autenticarToken, authController.cadastrarUsuario);


module.exports = router;
