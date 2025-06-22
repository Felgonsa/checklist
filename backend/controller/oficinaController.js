const db = require('../db/db.js');

// Função para listar todas as oficinas (só para o superadmin)
const getOficinas = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM oficinas ORDER BY nome_fantasia');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar oficinas:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// Função para criar uma nova oficina (só para o superadmin)
const createOficina = async (req, res) => {
  const { nome_fantasia, cnpj } = req.body;
  if (!nome_fantasia) {
    return res.status(400).json({ error: 'Nome fantasia é obrigatório.' });
  }
  try {
    const query = 'INSERT INTO oficinas (nome_fantasia, cnpj) VALUES ($1, $2) RETURNING *';
    const values = [nome_fantasia, cnpj || null];
    const { rows } = await db.query(query, values);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erro ao criar oficina:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const updateOficina = async (req, res) => {
  const { id } = req.params;
  const { nome_fantasia, cnpj } = req.body;

  if (!nome_fantasia) {
    return res.status(400).json({ error: 'Nome fantasia é obrigatório.' });
  }

  try {
    const query = 'UPDATE oficinas SET nome_fantasia = $1, cnpj = $2 WHERE id = $3 RETURNING *';
    const values = [nome_fantasia, cnpj || null, id];
    const { rows } = await db.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Oficina não encontrada.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar oficina:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// Função para deletar uma oficina
const deleteOficina = async (req, res) => {
  const { id } = req.params;
  try {
    const query = 'DELETE FROM oficinas WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Oficina não encontrada.' });
    }
    res.status(200).json({ message: 'Oficina deletada com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar oficina:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

module.exports = {
  getOficinas,
  createOficina,
  updateOficina,
  deleteOficina
};