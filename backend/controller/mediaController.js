// Importa o módulo 'db.js', que é responsável pela conexão e operações com o banco de dados.
const db = require('../db/db.js');

// Importa classes específicas do SDK da AWS para S3.
// 'S3Client' é o cliente principal para interagir com o S3.
// 'PutObjectCommand' é usado para enviar (upload) objetos para um bucket S3.
// 'DeleteObjectCommand' é usado para remover objetos de um bucket S3.
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// Importa o módulo 'crypto' nativo do Node.js.
// Ele é usado para gerar nomes de arquivos aleatórios e únicos, garantindo que não haja colisões no S3.
const crypto = require('crypto');

// Inicializa o cliente S3 com as credenciais e a região definidas nas variáveis de ambiente.
// É crucial que `process.env.AWS_REGION`, `process.env.AWS_ACCESS_KEY_ID`
// e `process.env.AWS_SECRET_ACCESS_KEY` estejam configuradas no ambiente onde o código será executado.
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});


// Função assíncrona para fazer o upload de uma ou mais fotos para o S3 e registrar no banco de dados.
const uploadFotos = async (req, res) => {
  // Extrai o ID da Ordem de Serviço (OS) do corpo da requisição.
  const { os_id } = req.body;
  // Pega os arquivos enviados na requisição. 'req.files' geralmente vem de um middleware como 'multer'.
  const files = req.files;

  // Verifica se nenhum arquivo foi enviado.
  if (!files || files.length === 0) {
    // Se não houver arquivos, retorna um erro 400 (Bad Request).
    return res.status(400).json({ error: 'Nenhuma foto enviada.' });
  }

  try {
    // Array para armazenar os dados das fotos que foram salvas com sucesso.
    const fotosSalvas = [];

    // Itera sobre cada arquivo enviado para processá-lo individualmente.
    for (const file of files) {
      // Gera um nome aleatório usando 16 bytes e convertendo para hexadecimal.
      const randomName = crypto.randomBytes(16).toString('hex');
      // Constrói o nome final do arquivo para o S3, combinando o nome aleatório com o nome original do arquivo.
      // Isso ajuda a evitar conflitos de nomes e mantém parte do nome original para referência.
      const fileName = `${randomName}-${file.originalname}`;

      // Prepara o comando 'PutObjectCommand' para enviar o arquivo ao S3.
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME, // O nome do bucket S3 onde a foto será armazenada.
        Key: fileName, // O nome do arquivo dentro do bucket (o nome único que acabamos de gerar).
        Body: file.buffer, // O conteúdo do arquivo em formato de buffer.
        ContentType: file.mimetype, // O tipo MIME do arquivo (ex: 'image/jpeg', 'image/png').
      });

      // Envia o comando para o S3 para realizar o upload. Aguarda a conclusão.
      await s3.send(command);

      // Constrói a URL pública completa onde a foto estará acessível no S3.
      const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      // Insere o registro da foto no banco de dados, associando-a à OS e salvando sua URL no S3.
      // 'RETURNING *' faz com que a query retorne a linha inserida.
      const query = 'INSERT INTO checklist_foto (os_id, caminho_arquivo) VALUES ($1, $2) RETURNING *;';
      const { rows } = await db.query(query, [os_id, fileUrl]);

      // Adiciona o registro da foto salva (retornado pelo banco) ao array 'fotosSalvas'.
      fotosSalvas.push(rows[0]);
    }

    // Se todos os uploads e registros forem bem-sucedidos, retorna um status 201 (Created)
    // com uma mensagem de sucesso e os dados das fotos salvas.
    res.status(201).json({ message: 'Fotos enviadas com sucesso!', data: fotosSalvas });
  } catch (error) {
    // Em caso de erro durante o upload ou o registro, loga o erro no console.
    console.error('Erro ao fazer upload para o S3:', error);
    // E retorna um erro 500 (Internal Server Error) ao cliente.
    res.status(500).json({ error: 'Erro interno do servidor ao salvar fotos.' });
  }
};


// Função assíncrona para deletar uma foto do S3 e remover seu registro do banco de dados.
const deleteFoto = async (req, res) => {
  // Extrai o ID da foto a ser deletada dos parâmetros da requisição.
  const { foto_id } = req.params;

  try {
    // 1. Primeiro, busca o 'caminho_arquivo' (a URL do S3) da foto no banco de dados usando seu ID.
    const pathResult = await db.query('SELECT caminho_arquivo FROM checklist_foto WHERE id = $1', [foto_id]);

    // Se a foto não for encontrada no banco de dados, retorna um erro 404 (Not Found).
    if (pathResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto não encontrada no banco de dados.' });
    }

    // Pega a URL completa do arquivo do resultado da consulta.
    const fileUrl = pathResult.rows[0].caminho_arquivo;
    // Extrai o nome do arquivo (que é a 'Key' no S3) da URL completa.
    // Isso é feito pegando tudo que vem depois da última barra '/'.
    const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);

    // 2. Prepara e envia o comando 'DeleteObjectCommand' para remover o arquivo do S3.
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME, // O bucket de onde a foto será deletada.
      Key: fileName, // O nome do arquivo (Key) a ser deletado no S3.
    });
    // Envia o comando para o S3 e aguarda a conclusão da deleção.
    await s3.send(command);

    // 3. Se a deleção no S3 foi bem-sucedida, deleta o registro da foto do nosso banco de dados.
    await db.query('DELETE FROM checklist_foto WHERE id = $1', [foto_id]);

    // Retorna uma mensagem de sucesso com status 200 (OK).
    res.status(200).json({ message: 'Foto deletada com sucesso.' });
  } catch (error) {
    // Em caso de erro, loga o erro no console.
    console.error(`Erro ao deletar foto ${foto_id}:`, error);
    // E retorna um erro 500 (Internal Server Error) ao cliente.
    res.status(500).json({ error: 'Erro interno do servidor ao deletar foto.' });
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