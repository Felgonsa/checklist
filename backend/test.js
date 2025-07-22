// ARQUIVO: backend/test-db.js

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Importa a classe Pool da biblioteca do PostgreSQL
const { Pool } = require('pg');

console.log('Tentando se conectar ao banco de dados local...');

// Configuração do Pool de conexões
// Ele usa as mesmas variáveis do seu arquivo .env
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Função assíncrona para testar a conexão
async function testConnection() {
  let client;
  try {
    // Tenta pegar um cliente de conexão do pool
    client = await pool.connect();
    console.log('✅ Conexão bem-sucedida!');

    // Executa uma query simples para verificar se tudo está funcionando
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Horário atual do servidor do banco de dados:', result.rows[0].now);

  } catch (err) {
    // Se ocorrer um erro, exibe a mensagem de erro
    console.error('❌ Erro ao conectar ou executar a query:', err.stack);
  } finally {
    // Garante que a conexão seja sempre liberada, mesmo que ocorra um erro
    if (client) {
      client.release();
    }
    // Fecha o pool de conexões, encerrando o script
    pool.end();
  }
}

// Executa a função de teste
testConnection();