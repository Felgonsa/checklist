const express = require('express');
const app = express();
const cors = require('cors');
const checklistRoutes = require('./router/routes.js');
const path = require('path'); // Adicione no topo do arquivo, com os outros 'requires'

// ... outras configurações do app ...

// Middleware para servir arquivos estáticos da pasta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors());
app.use(express.json());
app.use('/api/checklist', checklistRoutes);

app.listen(3001, () => {
  console.log('Servidor rodando na porta 3001');
});
