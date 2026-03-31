const express = require('express');
require('dotenv').config();
const app = express();
const cors = require('cors');
const checklistRoutes = require('./router/routes.js');
const path = require('path'); 


app.use(cors({
  origin: [
    'https://app.felgon.com.br' 
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

app.use('/api/checklist', checklistRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});