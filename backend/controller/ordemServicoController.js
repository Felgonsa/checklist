// Importa o módulo 'db.js' do diretório '../db'.
// Este módulo é essencial para todas as operações que interagem com o banco de dados.
const db = require('../db/db.js');


// Função para buscar os detalhes de uma única Ordem de Serviço (OS) pelo ID.
// Ela também busca respostas de checklist e fotos relacionadas a essa OS.
const getOrdemServicoById = async (req, res) => {
  // Pega o 'id' da Ordem de Serviço dos parâmetros da requisição (ex: /ordem-servico/:id).
  const { id } = req.params;

  try {
    // 1. Busca os dados principais da OS na tabela 'ordem_servico'.
    // Usamos $1 para evitar injeção de SQL.
    const osResult = await db.query('SELECT * FROM ordem_servico WHERE id = $1', [id]);

    // Se nenhuma OS for encontrada com o ID, retorna um erro 404.
    if (osResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    // Armazena a primeira linha do resultado como o objeto da Ordem de Serviço.
    const ordemServico = osResult.rows[0];

    // 2. Busca as respostas do checklist associadas a esta OS.
    const respostasResult = await db.query('SELECT * FROM checklist_resposta WHERE os_id = $1', [id]);

    // 3. Busca as fotos do checklist associadas a esta OS.
    const fotosResult = await db.query('SELECT * FROM checklist_foto WHERE os_id = $1', [id]);

    // 4. Adiciona as respostas e as fotos (que são arrays) como propriedades
    // dentro do objeto principal da Ordem de Serviço.
    ordemServico.respostas = respostasResult.rows;
    ordemServico.fotos = fotosResult.rows;

    // 5. Envia o objeto completo da Ordem de Serviço como resposta JSON com status 200 (OK).
    res.status(200).json(ordemServico);

  } catch (error) {
    // Se ocorrer um erro durante a busca, loga o erro no console.
    console.error(`Erro ao buscar ordem de serviço ${id}:`, error);
    // E envia uma resposta de erro 500 (Erro Interno do Servidor) ao cliente.
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};



// Função para buscar uma lista paginada de Ordens de Serviço.
// Permite filtrar as OSs por um termo de busca.
const getOrdensServico = async (req, res) => {
  // Pega o número da página dos parâmetros de query, padrão '1'.
  const page = parseInt(req.query.page || '1');
  // Pega o limite de itens por página dos parâmetros de query, padrão '20'.
  const limit = parseInt(req.query.limit || '20');
  // Pega o termo de busca dos parâmetros de query, padrão vazio.
  const searchTerm = req.query.search || '';
  // Calcula o offset para a paginação.
  const offset = (page - 1) * limit;

  // Prepara a parte inicial da query SQL.
  let baseQuery = 'FROM ordem_servico';
  // Array para armazenar as condições da cláusula WHERE.
  let whereClauses = [];
  // Array para armazenar os parâmetros que serão passados para a query.
  let queryParams = [];

  // Se um termo de busca foi fornecido, adiciona as condições de filtro.
  if (searchTerm) {
    // Adiciona uma condição para buscar o termo no nome do cliente, placa ou modelo do veículo.
    // 'ILIKE' é usado para busca case-insensitive no PostgreSQL.
    // '$${queryParams.length + 1}' cria placeholders dinâmicos para os parâmetros.
    whereClauses.push(`(cliente_nome ILIKE $${queryParams.length + 1} OR veiculo_placa ILIKE $${queryParams.length + 1} OR veiculo_modelo ILIKE $${queryParams.length + 1})`);
    // Adiciona o termo de busca com '%' para fazer uma busca parcial (contém).
    queryParams.push(`%${searchTerm}%`);
  }

  // Se houver alguma cláusula WHERE, as une com ' AND ' e adiciona à base da query.
  if (whereClauses.length > 0) {
    baseQuery += ' WHERE ' + whereClauses.join(' AND ');
  }

  try {
    // 1. Query para buscar os dados das Ordens de Serviço com o filtro, ordenação e paginação.
    // Ordena as OSs pela data em ordem decrescente (mais recente primeiro).
    // Os placeholders para LIMIT e OFFSET são adicionados dinamicamente após os parâmetros de busca.
    const ordensQuery = `SELECT * ${baseQuery} ORDER BY data DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    // Executa a query, passando todos os parâmetros (busca, limite e offset).
    const ordensResult = await db.query(ordensQuery, [...queryParams, limit, offset]);

    // 2. Query para contar o total de itens que correspondem ao filtro (sem paginação).
    // Isso é necessário para calcular o número total de páginas.
    const totalQuery = `SELECT COUNT(*) ${baseQuery}`;
    // Executa a query de contagem, passando apenas os parâmetros de busca.
    const totalResult = await db.query(totalQuery, queryParams);
    // Converte a contagem para um número inteiro.
    const totalItems = parseInt(totalResult.rows[0].count);

    // 3. Envia a resposta JSON com os dados das OSs e metadados de paginação.
    res.status(200).json({
      data: ordensResult.rows, // A lista de Ordens de Serviço.
      totalItems: totalItems, // O número total de itens que correspondem ao filtro.
      totalPages: Math.ceil(totalItems / limit), // O número total de páginas.
      currentPage: page, // A página atual.
    });
  } catch (error) {
    // Se ocorrer um erro, loga e envia uma resposta de erro 500.
    console.error('Erro ao buscar ordens de serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};



// Função para atualizar os dados de uma Ordem de Serviço existente.
const updateOrdemServico = async (req, res) => {
  // Pega o 'id' da OS dos parâmetros da URL.
  const { id } = req.params;
  // Pega os dados a serem atualizados do corpo da requisição.
  const { cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome } = req.body;

  // Validação básica: verifica se campos essenciais não estão vazios.
  if (!cliente_nome || !veiculo_placa || !veiculo_modelo) {
    // Se faltar algum campo obrigatório, retorna um erro 400 (Requisição Inválida).
    return res.status(400).json({ error: 'Nome do cliente, modelo e placa do veículo são obrigatórios.' });
  }

  try {
    // Query SQL para atualizar uma linha na tabela 'ordem_servico'.
    // 'RETURNING *' faz com que a query retorne a linha atualizada.
    const query = `
      UPDATE ordem_servico
      SET
        cliente_nome = $1,
        veiculo_placa = $2,
        veiculo_modelo = $3,
        seguradora_nome = $4
      WHERE id = $5
      RETURNING *;
    `;
    // Valores para a query. Se 'seguradora_nome' for vazio, será tratado como NULL no banco.
    const values = [cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome || null, id];
    // Executa a query de atualização.
    const { rows } = await db.query(query, values);

    // Se nenhuma linha foi afetada, significa que a OS com o ID não foi encontrada.
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    // Retorna a OS atualizada com status 200 (OK).
    res.status(200).json(rows[0]);
  } catch (error) {
    // Se ocorrer um erro, loga e envia uma resposta de erro 500.
    console.error(`Erro ao atualizar ordem de serviço ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};


// Função para criar uma nova Ordem de Serviço.
const createOrdemServico = async (req, res) => {
  // Pega os dados da nova OS do corpo da requisição.
  const { cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome } = req.body;

  // Validação básica: verifica se campos essenciais estão preenchidos.
  if (!cliente_nome || !veiculo_placa || !veiculo_modelo) {
    // Se faltar algum campo obrigatório, retorna um erro 400.
    return res.status(400).json({ error: 'Nome do cliente, modelo e placa do veículo são obrigatórios.' });
  }

  try {
    // Query SQL para inserir uma nova linha na tabela 'ordem_servico'.
    // 'RETURNING *' retorna a linha recém-inserida (incluindo o ID gerado).
    const query = `
      INSERT INTO ordem_servico (cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    // Valores para a inserção. 'seguradora_nome || null' garante NULL se vazio.
    const values = [cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome || null];
    // Executa a query de inserção.
    const { rows } = await db.query(query, values);
    // Retorna a nova OS criada com status 201 (Criado).
    res.status(201).json(rows[0]);
  } catch (error) {
    // Se ocorrer um erro, loga e envia uma resposta de erro 500.
    console.error('Erro ao criar ordem de serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};



// Função para deletar uma Ordem de Serviço pelo ID.
const deleteOrdemServico = async (req, res) => {
  // Pega o 'id' da OS a ser deletada dos parâmetros da URL.
  const { id } = req.params;
  try {
    // Query SQL para deletar uma linha da tabela 'ordem_servico'.
    const deleteQuery = 'DELETE FROM ordem_servico WHERE id = $1';
    // Executa a query de exclusão.
    const result = await db.query(deleteQuery, [id]);

    // Se result.rowCount for 0, significa que nenhuma linha foi deletada,
    // ou seja, a OS com o ID não foi encontrada.
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    // Observação: Graças à configuração 'ON DELETE CASCADE' no banco de dados,
    // todas as respostas de checklist e fotos associadas a esta OS
    // serão automaticamente deletadas quando a OS principal for removida.
    // Não precisamos de queries adicionais aqui para isso.

    // Retorna uma mensagem de sucesso com status 200 (OK).
    res.status(200).json({ message: 'Ordem de serviço deletada com sucesso.' });
  } catch (error) {
    // Se ocorrer um erro, loga e envia uma resposta de erro 500.
    console.error(`Erro ao deletar ordem de serviço ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};



// Exporta todas as funções para que possam ser utilizadas por outros módulos
// (por exemplo, no arquivo de rotas da sua aplicação Express).
module.exports = {
  getOrdemServicoById,
  getOrdensServico,
  createOrdemServico,
  updateOrdemServico,
  deleteOrdemServico
};