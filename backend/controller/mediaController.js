// Importa o módulo 'db.js', que é responsável pela conexão e operações com o banco de dados.
const db = require('../db/db.js');

// Importa classes específicas do SDK da AWS para S3.
// 'S3Client' é o cliente principal para interagir com o S3.
// 'PutObjectCommand' é usado para enviar (upload) objetos para um bucket S3.
// 'DeleteObjectCommand' é usado para remover objetos de um bucket S3.

// Importa o módulo 'crypto' nativo do Node.js.
// Ele é usado para gerar nomes de arquivos aleatórios e únicos, garantindo que não haja colisões no S3.
const crypto = require('crypto');


const uploadFotos = async (req, res) => {
  const { os_id } = req.body;
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Nenhuma foto enviada.' });
  }
  try {
    const fotosSalvas = [];
    for (const file of files) {
      // Salva o caminho local do arquivo no banco de dados
      const query = 'INSERT INTO checklist_foto (os_id, caminho_arquivo) VALUES ($1, $2) RETURNING *;';
      const { rows } = await db.query(query, [os_id, file.path]);
      fotosSalvas.push(rows[0]);
    }
    res.status(201).json({ message: 'Fotos enviadas com sucesso!', data: fotosSalvas });
  } catch (error) {
    console.error('Erro ao fazer upload de fotos:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};



// Função assíncrona para deletar uma foto do S3 e remover seu registro do banco de dados.
const deleteFoto = async (req, res) => {
  const { foto_id } = req.params;
  try {
    const pathResult = await db.query('SELECT caminho_arquivo FROM checklist_foto WHERE id = $1', [foto_id]);
    if (pathResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto não encontrada.' });
    }
    const caminho = pathResult.rows[0].caminho_arquivo;

    await db.query('DELETE FROM checklist_foto WHERE id = $1', [foto_id]);

    // Deleta o arquivo físico do servidor
    fs.unlink(caminho, (err) => {
      if (err) console.error(`Erro ao deletar arquivo físico ${caminho}:`, err);
    });

    res.status(200).json({ message: 'Foto deletada com sucesso.' });
  } catch (error) {
    console.error(`Erro ao deletar foto ${foto_id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};


// Função assíncrona para salvar a assinatura do cliente em uma Ordem de Serviço.
const saveAssinatura = async (req, res) => {
  // Extrai o ID da Ordem de Serviço dos parâmetros da requisição.
  const { id } = req.params;
  // Extrai a string da assinatura (provavelmente em formato Base64 ou URL de imagem) do corpo da requisição.
  const { assinatura } = req.body;

  // Verifica se a assinatura foi fornecida.
  if (!assinatura) {
    // Se não houver assinatura, retorna um erro 400 (Bad Request).
    return res.status(400).json({ error: 'Nenhuma assinatura fornecida.' });
  }

  try {
    // Query SQL para atualizar a coluna 'assinatura_cliente' na tabela 'ordem_servico'.
    const query = 'UPDATE ordem_servico SET assinatura_cliente = $1 WHERE id = $2';
    // Executa a query de atualização com a assinatura e o ID da OS.
    await db.query(query, [assinatura, id]);
    // Retorna uma mensagem de sucesso com status 200 (OK).
    res.status(200).json({ message: 'Assinatura salva com sucesso.' });
  } catch (error) {
    // Em caso de erro, loga o erro no console.
    console.error(`Erro ao salvar assinatura da OS ${id}:`, error);
    // E retorna um erro 500 (Internal Server Error) ao cliente.
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};


// Exporta as funções para que possam ser importadas e usadas como controladores de rota
// em outras partes da aplicação (por exemplo, em um arquivo de rotas Express).
module.exports = {
  uploadFotos,
  deleteFoto,
  saveAssinatura,
};