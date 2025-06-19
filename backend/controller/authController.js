const db = require('../db/db.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Garante que a JWT_SECRET seja carregada

// --- FUNÇÃO DE LOGIN ---
const login = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = result.rows[0];

    // Verifica se o usuário existe
    if (!usuario) {
      return res.status(401).json({ message: 'Usuário ou Senha incorretos' }); // Mensagem genérica por segurança
    }

    // Compara a senha enviada com a senha criptografada no banco
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: 'Usuário ou Senha incorretos' });
    }

    // Gera o Token JWT
    // O 'payload' contém as informações que queremos guardar no token
    const payload = { 
      id: usuario.id, 
      role: usuario.role, 
      oficina_id: usuario.oficina_id 
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10' });

    // Envia a resposta com sucesso
    res.status(200).json({ 
      message: `Login bem-sucedido! Bem-vindo, ${usuario.nome}.`, 
      token: token 
    });

  } catch (error) {
    console.error('Erro no processo de login:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// --- FUNÇÃO PARA CRIAR NOVOS USUÁRIOS (Acessível pelo Superadmin) ---
const cadastrarUsuario = async (req, res) => {
  // O 'superadmin' envia os dados do novo usuário no corpo da requisição
  const { nome, email, senha, role, oficina_id } = req.body;

  if (!nome || !email || !senha || !role || !oficina_id) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios para criar um novo usuário.' });
  }

  try {
    // Criptografa a senha antes de salvar
    const senhaHash = await bcrypt.hash(senha, 10);

    const query = `
      INSERT INTO usuarios (nome, email, senha, role, oficina_id) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nome, email, role, oficina_id;
    `;
    const values = [nome, email, senhaHash, role, oficina_id];
    
    const result = await db.query(query, values);
    const novoUsuario = result.rows[0];

    res.status(201).json({ message: 'Usuário criado com sucesso!', usuario: novoUsuario });

  } catch (error) {
    console.error('Erro ao cadastrar novo usuário:', error);
    // Verifica se o erro é de e-mail duplicado
    if (error.code === '23505') { // Código de erro do PostgreSQL para violação de chave única
        return res.status(409).json({ message: 'Este e-mail já está em uso.' });
    }
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};


module.exports = {
  login,
  cadastrarUsuario,
};