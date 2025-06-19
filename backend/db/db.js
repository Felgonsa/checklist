// --- ARQUIVO backend/db/db.js CORRIGIDO ---

// Garante que as variáveis de ambiente sejam carregadas ANTES de qualquer outra coisa neste arquivo.
require('dotenv').config(); 

const { Pool } = require('pg');

// Verifica se estamos em ambiente de produção
const isProduction = process.env.NODE_ENV === 'production';

// Pega a URL de conexão do ambiente. Essencial para o Render.
const connectionString = process.env.DATABASE_URL;

// Monta a string de conexão para o ambiente local a partir do arquivo .env
const localConnectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

// Validação para garantir que as variáveis de ambiente necessárias existem
if (isProduction && !connectionString) {
  throw new Error('DATABASE_URL não foi definida no ambiente de produção.');
}

// Configuração do Pool
const pool = new Pool({
  // Usa a connectionString do Render em produção, ou a local em desenvolvimento
  connectionString: isProduction ? connectionString : localConnectionString,
  
  // O Render exige conexão SSL. Localmente, não precisamos.
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('Conexão com o banco de dados PostgreSQL estabelecida com sucesso!');
});

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente do pool de conexões', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};