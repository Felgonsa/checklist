// Importa o módulo 'db.js' do diretório '../db'.
// Este módulo é essencial para todas as operações que interagem com o banco de dados.
const db = require('../db/db.js');


// Função para buscar os detalhes de uma única Ordem de Serviço (OS) pelo ID.
// Ela também busca respostas de checklist e fotos relacionadas a essa OS.
const getOrdemServicoById = async (req, res) => {
  // Pega o 'id' da Ordem de Serviço dos parâmetros da requisição (ex: /ordem-servico/:id).
  const { id } = req.params;
  const { role, oficina_id } = req.user;

  try {                  
    // 1. Busca os dados principais da OS na tabela 'ordem_servico'. 
    // Usamos $1 para evitar injeção de SQL.
    let osResult = await db.query('SELECT * FROM ordem_servico WHERE id = $1', [id]);

    // Se nenhuma OS for encontrada com o ID, retorna um erro 404.
    if (osResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    // Armazena a primeira linha do resultado como o objeto da Ordem de Serviço.
    const ordemServico = osResult.rows[0];

    if (role !== 'superadmin' && ordemServico.oficina_id !== oficina_id) {
      return res.status(403).json({ error: 'Acesso proibido.' });
    }
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
// Em backend/src/controller/ordemServicoController.js

const getOrdensServico = async (req, res) => {
  // 1. Pega os dados do usuário do token
  const { role, oficina_id } = req.user;

  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '20');
  const searchTerm = req.query.search || '';
  const offset = (page - 1) * limit;

  let baseQuery = 'FROM ordem_servico';
  let whereClauses = [];
  let queryParams = [];

  // 2. CONDIÇÃO DE SEGURANÇA: Se o usuário NÃO for superadmin,
  //    adiciona um filtro OBRIGATÓRIO por oficina_id.
  if (role !== 'superadmin') {
    whereClauses.push(`oficina_id = $${queryParams.length + 1}`);
    queryParams.push(oficina_id);
  }

  // lógica de busca 
  // apenas sobre os dados permitidos para aquele usuário.
  if (searchTerm) {
    const searchParamIndex = queryParams.length + 1;
    whereClauses.push(`(cliente_nome ILIKE $${searchParamIndex} OR veiculo_placa ILIKE $${searchParamIndex} OR veiculo_modelo ILIKE $${searchParamIndex})`);
    queryParams.push(`%${searchTerm}%`);
  }

  if (whereClauses.length > 0) {
    baseQuery += ' WHERE ' + whereClauses.join(' AND ');
  }

  try {
    const ordensQuery = `SELECT * ${baseQuery} ORDER BY data DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    const ordensResult = await db.query(ordensQuery, [...queryParams, limit, offset]);

    const totalQuery = `SELECT COUNT(*) ${baseQuery}`;
    const totalResult = await db.query(totalQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count);

    res.status(200).json({
      data: ordensResult.rows,
      totalItems: totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Erro ao buscar ordens de serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};



// Função para atualizar os dados de uma Ordem de Serviço existente.
const updateOrdemServico = async (req, res) => {
  // Pega o 'id' da OS dos parâmetros da URL.
  const { id } = req.params;
  const { role, oficina_id } = req.user;
  // Pega os dados a serem atualizados do corpo da requisição.
  const { cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome } = req.body;
  // Verifica se os campos obrigatórios estão presentes.
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

    if (role !== 'superadmin') {
      query += ` AND oficina_id = $6`;
      values.push(oficina_id);
    }

    query += ' RETURNING *;';

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
  // 1. Pega o oficina_id do usuário que vem do token JWT
  const { oficina_id } = req.user;

  // Pega os dados do corpo da requisição
  const { cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome } = req.body;

  if (!cliente_nome || !veiculo_placa || !veiculo_modelo) {
    return res.status(400).json({ error: 'Nome do cliente, modelo e placa do veículo são obrigatórios.' });
  }

  try {
    const query = `
      -- 2. Adiciona o campo 'oficina_id' no INSERT
      INSERT INTO ordem_servico (cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome, oficina_id) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *;
    `;
    // 3. Passa o oficina_id como o quinto parâmetro
    const values = [cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome || null, oficina_id];

    const { rows } = await db.query(query, values);
    res.status(201).json(rows[0]);

  } catch (error) {
    console.error('Erro ao criar ordem de serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


// Função para deletar uma Ordem de Serviço pelo ID.
const deleteOrdemServico = async (req, res) => {
  // Pega o 'id' da OS a ser deletada dos parâmetros da URL.
  const { id } = req.params;
  const { role, oficina_id } = req.user;
  try {


    // Query SQL para deletar uma linha da tabela 'ordem_servico'.
    let deleteQuery = 'DELETE FROM ordem_servico WHERE id = $1';
    // Executa a query de exclusão.
    const values = [id];

    if (role !== 'superadmin') {
      deleteQuery += ` AND oficina_id = $2`;
      values.push(oficina_id);
    }

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