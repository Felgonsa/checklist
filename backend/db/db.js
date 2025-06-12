// Importa a classe Pool do módulo 'pg' (PostgreSQL)
const { Pool } = require('pg');
// Carrega as variáveis de ambiente do arquivo .env (se você estiver usando)
require('dotenv').config();

// Configurações para a conexão com o banco de dados
// É ALTAMENTE RECOMENDÁVEL usar variáveis de ambiente para dados sensíveis
const pool = new Pool({
  user: process.env.DB_USER || 'postgres', // Usuário do banco de dados
  host: process.env.DB_HOST || 'localhost',   // Host do banco de dados
  database: process.env.DB_DATABASE || 'checklist', // Nome do banco de dados (sugiro criar um com este nome ou o nome que você preferir)
  password: process.env.DB_PASSWORD || 'sua_senha_aqui', // Senha do usuário do banco
  port: process.env.DB_PORT || 5432,          // Porta do PostgreSQL (padrão é 5432)
});

// Evento para verificar se a conexão foi bem-sucedida ao iniciar
// pool.on('connect', () => {
//   console.log('Conexão com o banco de dados PostgreSQL estabelecida com sucesso!');
// });

// Evento para capturar erros de conexão com o pool
pool.on('error', (err) => {
  console.error('Erro inesperado no cliente do pool de conexões', err);
  process.exit(-1); // Encerra a aplicação em caso de erro crítico com o pool
});

// Função para testar a conexão (opcional, mas útil)
const testConnection = async () => {
  try {
    const client = await pool.connect(); // Tenta pegar um cliente do pool
    console.log('Teste de conexão: Cliente conectado.');
    const res = await client.query('SELECT NOW()'); // Executa uma query simples
    console.log('Teste de conexão: Resposta do banco ->', res.rows[0]);
    client.release(); // Libera o cliente de volta para o pool
  } catch (error) {
    console.error('Falha ao testar a conexão com o banco de dados:', error);
  }
};

// Você pode chamar a função de teste aqui para verificar ao iniciar o app,
// mas geralmente é melhor chamá-la em um ponto específico do seu app.js ou apenas usar os eventos 'connect' e 'error'.
// testConnection(); // Descomente para testar ao iniciar este módulo diretamente (ex: node db/db.js)

// Exporta o pool para que possa ser usado em outras partes da aplicação (nos controllers, por exemplo)
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exporta o pool diretamente se precisar de mais controle em algum lugar
  testConnection, // Exporta a função de teste se quiser usá-la em outro lugar
};