const db = require("../db/db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// --- FUNÇÃO DE LOGIN ---
const login = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res
      .status(400)
      .json({ message: "E-mail e senha são obrigatórios." });
  }
  try {
    const result = await db.query("SELECT * FROM usuarios WHERE email = $1", [
      email,
    ]);

    const usuario = result.rows[0];

    // Verifica se o usuário existe

    if (!usuario) {
      return res.status(401).json({ message: "Usuário ou Senha incorretos" }); // Mensagem genérica por segurança
    }

    // Compara a senha enviada com a senha criptografada no banco

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ message: "Usuário ou Senha incorretos" });
    }

    // Gera o Token JWT

    // O 'payload' contém as informações que queremos guardar no token

    const payload = {
      id: usuario.id,
      role: usuario.role,
      oficina_id: usuario.oficina_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Envia a resposta com sucesso

    res.status(200).json({
      message: `Login bem-sucedido! Bem-vindo, ${usuario.nome}.`,
      token: token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (error) {
    console.error("Erro no processo de login:", error);

    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// --- FUNÇÃO PARA CRIAR NOVOS USUÁRIOS (Acessível pelo Superadmin) ---

const cadastrarUsuario = async (req, res) => {
  // O 'superadmin' envia os dados do novo usuário no corpo da requisição

  const { nome, email, senha, role, oficina_id } = req.body;

  if (!nome || !email || !senha || !role || !oficina_id) {
    return res.status(400).json({
      message: "Todos os campos são obrigatórios para criar um novo usuário.",
    });
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

    res
      .status(201)
      .json({ message: "Usuário criado com sucesso!", usuario: novoUsuario });
  } catch (error) {
    console.error("Erro ao cadastrar novo usuário:", error);

    // Verifica se o erro é de e-mail duplicado

    if (error.code === "23505") {
      // Código de erro do PostgreSQL para violação de chave única

      return res.status(409).json({ message: "Este e-mail já está em uso." });
    }

    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

const getUsuarios = async (req, res) => {
  try {
    // Usamos um JOIN para buscar também o nome da oficina de cada usuário

    const query = `

 SELECT u.id, u.nome, u.email, u.role, o.nome_fantasia as oficina_nome

 FROM usuarios u

   LEFT JOIN oficinas o ON u.oficina_id = o.id

   ORDER BY u.nome;

  `;

    const { rows } = await db.query(query);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);

    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

const updateUsuario = async (req, res) => {
  const { id } = req.params;

  // Pega os dados, incluindo uma senha opcional

  const { nome, email, role, oficina_id, senha } = req.body;

  if (!nome || !email || !role || !oficina_id) {
    return res
      .status(400)
      .json({ message: "Nome, e-mail, role e oficina são obrigatórios." });
  }

  try {
    let query;

    let values;

    // Se uma nova senha foi fornecida, nós a criptografamos e incluímos no UPDATE

    if (senha) {
      const senhaHash = await bcrypt.hash(senha, 10);

      query = `

    UPDATE usuarios SET nome = $1, email = $2, role = $3, oficina_id = $4, senha = $5

    WHERE id = $6 RETURNING id, nome, email, role, oficina_id;

   `;

      values = [nome, email, role, oficina_id, senhaHash, id];
    } else {
      // Se nenhuma senha foi fornecida, atualizamos todo o resto, menos a senha

      query = `

    UPDATE usuarios SET nome = $1, email = $2, role = $3, oficina_id = $4

    WHERE id = $5 RETURNING id, nome, email, role, oficina_id;

   `;

      values = [nome, email, role, oficina_id, id];
    }

    const { rows } = await db.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`Erro ao atualizar usuário ${id}:`, error);

    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "Este e-mail já está em uso por outro usuário." });
    }

    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query("DELETE FROM usuarios WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.status(200).json({ message: "Usuário deletado com sucesso." });
  } catch (error) {
    console.error(`Erro ao deletar usuário ${id}:`, error);

    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

const changePassword = async (req, res) => {
  // Pega o ID do usuário diretamente do token JWT (mais seguro)
  const { id } = req.user;
  const { senhaAntiga, novaSenha } = req.body;

  console.log(senhaAntiga, novaSenha);

  // 1. Validação dos dados de entrada
  if (!senhaAntiga || !novaSenha) {
    return res
      .status(400)
      .json({ message: "A senha antiga e a nova senha são obrigatórias." });
  }

  if (novaSenha.length < 6) {
    return res
      .status(400)
      .json({ message: "A nova senha deve ter no mínimo 6 caracteres." });
  }

  try {
    // 2. Busca o usuário no banco para pegar a senha atual
    const result = await db.query("SELECT senha FROM usuarios WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    const senhaAtualHash = result.rows[0].senha;

    // 3. Compara a senha antiga fornecida com a que está no banco
    const senhaAntigaValida = await bcrypt.compare(senhaAntiga, senhaAtualHash);
    if (!senhaAntigaValida) {
      return res
        .status(401)
        .json({ message: "A senha antiga está incorreta." });
    }

    // 4. Criptografa a nova senha e atualiza no banco
    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
    await db.query("UPDATE usuarios SET senha = $1 WHERE id = $2", [
      novaSenhaHash,
      id,
    ]);

    res.status(200).json({ message: "Senha alterada com sucesso!" });
  } catch (error) {
    console.error(`Erro ao alterar senha do usuário ${id}:`, error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

module.exports = {
  login,
  cadastrarUsuario,
  getUsuarios,
  updateUsuario,
  deleteUsuario,
  changePassword,
};
