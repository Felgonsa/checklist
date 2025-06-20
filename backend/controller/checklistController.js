// Importa o módulo 'db.js', que contém a configuração e métodos para interagir com o banco de dados.
const db = require('../db/db.js');

// Importa classes específicas do SDK da AWS para S3.
// O 'S3Client' é usado para criar uma instância de cliente S3.
// 'PutObjectCommand' e 'DeleteObjectCommand' são comandos para operações de upload e exclusão,
// embora não sejam usados diretamente neste arquivo, a importação sugere que faz parte de um conjunto de arquivos S3.
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");


// --- Controller para Itens Padrão do Checklist ---

// Função para buscar todos os itens padrão do checklist.
// Estes itens são a estrutura fixa do checklist que será preenchida.
const getChecklistItens = async (req, res) => {
  try {
    // Executa uma query para selecionar todos os itens da tabela 'checklist_item'.
    // Os itens são ordenados pela coluna 'ordem' para garantir uma sequência lógica.
    const { rows } = await db.query('SELECT * FROM checklist_item ORDER BY ordem');
    // Retorna os itens encontrados como um array JSON com status 200 (OK).
    res.status(200).json(rows);
  } catch (error) {
    // Se ocorrer um erro durante a busca, loga o erro no console do servidor.
    console.error('Erro ao buscar itens do checklist:', error);
    // Retorna um erro 500 (Erro Interno do Servidor) ao cliente.
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Inicializa o cliente S3 com as configurações de região e credenciais.
// Esta parte do código está aqui, mas o cliente 's3' não é usado nas funções abaixo.
// Pode ser que este arquivo foi consolidado ou parte de um grupo onde 's3' é usado em outras funções.
const s3 = new S3Client({
  region: process.env.AWS_REGION, // Região da AWS (ex: 'sa-east-1').
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,     // Chave de acesso da AWS.
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Chave secreta da AWS.
  }
});


// Função para salvar um conjunto de respostas de um checklist para uma Ordem de Serviço específica.
// Esta função utiliza transações de banco de dados para garantir a integridade dos dados.
const saveChecklistRespostas = async (req, res) => {
  // Extrai o ID da Ordem de Serviço e o array de respostas do corpo da requisição.
  const { os_id, respostas } = req.body;
  const { role, oficina_id } = req.user;

  // Validação inicial para garantir que os dados necessários foram fornecidos e estão no formato correto.
  if (!os_id || !respostas || !Array.isArray(respostas)) {
    // Se a validação falhar, retorna um erro 400 (Bad Request).
    return res.status(400).json({ error: 'Formato de dados inválido. É necessário "os_id" e um array de "respostas".' });
  }


  // Obtém um cliente de conexão do pool de conexões do banco de dados.
  // Isso é necessário para gerenciar uma transação.
  const client = await db.pool.connect();

  try {
    // Inicia uma transação no banco de dados.
    // Isso garante que todas as operações dentro do bloco 'try' sejam tratadas como uma única unidade.
    if (role !== 'superadmin') {
      const osCheck = await db.query('SELECT oficina_id FROM ordem_servico WHERE id = $1', [os_id]);
      if (osCheck.rows.length === 0 || osCheck.rows[0].oficina_id !== oficina_id) {
        return res.status(403).json({ error: 'Acesso proibido.' });
      }
    }

    await client.query('BEGIN');

    // Deleta todas as respostas antigas para esta Ordem de Serviço.
    // Esta é uma estratégia de "UPSERT" (Update or Insert) simplificada:
    // primeiro remove todas as respostas existentes para a OS, depois insere as novas.
    // Isso evita problemas de duplicidade e garante que o estado do checklist seja o que foi enviado.
    await client.query('DELETE FROM checklist_resposta WHERE os_id = $1', [os_id]);

    // Itera sobre cada objeto de resposta no array 'respostas'.
    for (const resposta of respostas) {
      // Extrai os dados de cada resposta individual.
      const { item_id, status, observacao } = resposta;

      // Define a query SQL para inserir uma nova resposta no banco de dados.
      const query = `
        INSERT INTO checklist_resposta (os_id, item_id, status, observacao)
        VALUES ($1, $2, $3, $4);
      `;
      // Define os valores para a inserção.
      // 'observacao || null' garante que a observação seja armazenada como NULL no banco
      // se ela for uma string vazia ou undefined.
      const values = [os_id, item_id, status, observacao || null];

      // Executa a query de inserção usando o cliente da transação.
      await client.query(query, values);
    }

    // Confirma (commit) a transação.
    // Se todas as queries acima foram bem-sucedidas, as mudanças são salvas permanentemente no banco.
    await client.query('COMMIT');
    // Retorna uma mensagem de sucesso com status 201 (Created).
    res.status(201).json({ message: 'Respostas do checklist salvas com sucesso!' });
  } catch (error) {
    // Em caso de qualquer erro dentro do bloco 'try':
    // Desfaz (rollback) a transação. Isso reverte todas as operações feitas desde o 'BEGIN',
    // garantindo que o banco de dados permaneça em um estado consistente (ou tudo salva, ou nada salva).
    await client.query('ROLLBACK');
    // Loga o erro no console do servidor.
    console.error('Erro ao salvar respostas do checklist:', error);
    // Retorna um erro 500 (Erro Interno do Servidor) ao cliente.
    res.status(500).json({ error: 'Erro interno do servidor ao salvar respostas.' });
  } finally {
    // Libera o cliente de volta para o pool de conexões.
    // É crucial fazer isso no bloco 'finally' para garantir que o cliente seja sempre liberado,
    // mesmo que ocorra um erro, evitando vazamentos de conexão.
    client.release();
  }
};



// Exporta as funções do controlador para que possam ser utilizadas por outras partes da aplicação,
// como as definições de rotas.
module.exports = {
  getChecklistItens,
  saveChecklistRespostas,
}