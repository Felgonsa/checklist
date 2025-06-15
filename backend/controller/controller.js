// Importa o objeto 'query' que criamos para interagir com o banco
const db = require('../db/db.js');
const fs = require('fs'); // Importe o módulo 'fs' no topo do arquivo
const path = require('path'); // Importe o módulo 'path' também
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require('crypto'); // Módulo nativo do Node.js
const axios = require('axios');


// --- Controller para Itens Padrão do Checklist ---

// Busca todos os itens padrão do checklist
const getChecklistItens = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM checklist_item ORDER BY ordem');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar itens do checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});


// --- Controllers para Ordem de Serviço (OS) ---

// Cria uma nova Ordem de Serviço

const createOrdemServico = async (req, res) => {
  // Pega os novos campos do corpo da requisição
  const { cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome } = req.body;

  // Validação básica
  if (!cliente_nome || !veiculo_placa || !veiculo_modelo) {
    return res.status(400).json({ error: 'Nome do cliente, modelo e placa do veículo são obrigatórios.' });
  }

  try {
    const query = `
      INSERT INTO ordem_servico (cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *;
    `;
    // Inclui os novos valores, tratando seguradora como opcional
    const values = [cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome || null];
    const { rows } = await db.query(query, values);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erro ao criar ordem de serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
// ...

// Busca uma OS pelo ID, junto com suas respostas e fotos
const getOrdemServicoById = async (req, res) => {
  const { id } = req.params;

  try {
    // Busca os dados principais da OS
    const osResult = await db.query('SELECT * FROM ordem_servico WHERE id = $1', [id]);
    if (osResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }
    const ordemServico = osResult.rows[0];

    // Busca as respostas do checklist
    const respostasResult = await db.query('SELECT * FROM checklist_resposta WHERE os_id = $1', [id]);

    // CORREÇÃO: A LINHA ABAIXO PROVAVELMENTE ESTAVA FALTANDO OU COM ERRO
    const fotosResult = await db.query('SELECT * FROM checklist_foto WHERE os_id = $1', [id]);

    // Adiciona as respostas e fotos ao objeto principal
    ordemServico.respostas = respostasResult.rows;
    ordemServico.fotos = fotosResult.rows; // Agora a variável 'fotosResult' existe

    res.status(200).json(ordemServico);

  } catch (error) {
    console.error(`Erro ao buscar ordem de serviço ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


// --- Controllers para Respostas e Fotos ---

// Salva um conjunto de respostas para um checklist
const saveChecklistRespostas = async (req, res) => {
  const { os_id, respostas } = req.body;

  if (!os_id || !respostas || !Array.isArray(respostas)) {
    return res.status(400).json({ error: 'Formato de dados inválido. É necessário "os_id" e um array de "respostas".' });
  }

  const client = await db.pool.connect(); // Pega um cliente do pool para a transação

  try {
    await client.query('BEGIN'); // Inicia a transação

    // Deleta respostas antigas para esta OS para evitar duplicatas (UPSERT)
    // Isso garante que salvar novamente o checklist apenas atualize os dados.
    await client.query('DELETE FROM checklist_resposta WHERE os_id = $1', [os_id]);

    for (const resposta of respostas) {
      const { item_id, status, observacao } = resposta;
      const query = `
        INSERT INTO checklist_resposta (os_id, item_id, status, observacao)
        VALUES ($1, $2, $3, $4);
      `;
      const values = [os_id, item_id, status, observacao || null]; // Garante que observacao seja null se vazia
      await client.query(query, values);
    }

    await client.query('COMMIT'); // Confirma a transação se tudo deu certo
    res.status(201).json({ message: 'Respostas do checklist salvas com sucesso!' });
  } catch (error) {
    await client.query('ROLLBACK'); // Desfaz a transação em caso de erro
    console.error('Erro ao salvar respostas do checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao salvar respostas.' });
  } finally {
    client.release(); // Libera o cliente de volta para o pool, SEMPRE!
  }
};

// Faz o upload de fotos e salva os caminhos no banco
const uploadFotos = async (req, res) => {
  const { os_id } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Nenhuma foto enviada.' });
  }

  try {
    const fotosSalvas = [];
    // O loop 'for' processa um arquivo de cada vez
    for (const file of files) {

      // =======================================================
      // CORREÇÃO: Estas linhas DEVEM estar DENTRO do loop
      // para gerar um nome único para CADA arquivo.
      // =======================================================
      const randomName = crypto.randomBytes(16).toString('hex');
      const fileName = `${randomName}-${file.originalname}`;

      // Prepara o comando de upload para o S3
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName, // Usa o nome único gerado
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3.send(command);

      // Constrói a URL pública usando o nome único gerado
      const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      // Salva a URL única e correta no banco de dados
      const query = 'INSERT INTO checklist_foto (os_id, caminho_arquivo) VALUES ($1, $2) RETURNING *;';
      const { rows } = await db.query(query, [os_id, fileUrl]);
      fotosSalvas.push(rows[0]);
    }
    res.status(201).json({ message: 'Fotos enviadas com sucesso!', data: fotosSalvas });
  } catch (error) {
    console.error('Erro ao fazer upload para o S3:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao salvar fotos.' });
  }
};

// ... outras funções do controller

// Busca todas as Ordens de Serviço (resumo)
// Em controller.js
const getOrdensServico = async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '20');
  const searchTerm = req.query.search || ''; // Pega o termo de busca
  const offset = (page - 1) * limit;

  // Prepara a base da query e os parâmetros
  let baseQuery = 'FROM ordem_servico';
  let whereClauses = [];
  let queryParams = [];

  // Se houver um termo de busca, adiciona as condições WHERE
  if (searchTerm) {
    whereClauses.push(`(cliente_nome ILIKE $${queryParams.length + 1} OR veiculo_placa ILIKE $${queryParams.length + 1} OR veiculo_modelo ILIKE $${queryParams.length + 1})`);
    queryParams.push(`%${searchTerm}%`); // ILIKE usa '%' como coringa
  }

  if (whereClauses.length > 0) {
    baseQuery += ' WHERE ' + whereClauses.join(' AND ');
  }

  try {
    // Query para buscar os dados com filtro e paginação
    const ordensQuery = `SELECT * ${baseQuery} ORDER BY data DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    const ordensResult = await db.query(ordensQuery, [...queryParams, limit, offset]);

    // Query para contar o total de itens COM O FILTRO APLICADO
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


const deleteOrdemServico = async (req, res) => {
  const { id } = req.params;
  try {
    const deleteQuery = 'DELETE FROM ordem_servico WHERE id = $1';
    const result = await db.query(deleteQuery, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    // Graças ao 'ON DELETE CASCADE' na criação das tabelas,
    // o banco de dados já deletou automaticamente as respostas e fotos associadas.
    res.status(200).json({ message: 'Ordem de serviço deletada com sucesso.' });
  } catch (error) {
    console.error(`Erro ao deletar ordem de serviço ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const deleteFoto = async (req, res) => {
  const { foto_id } = req.params;

  try {
    // Primeiro, busca o caminho do arquivo (a URL do S3) no banco
    const pathResult = await db.query('SELECT caminho_arquivo FROM checklist_foto WHERE id = $1', [foto_id]);
    if (pathResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto não encontrada no banco de dados.' });
    }

    const fileUrl = pathResult.rows[0].caminho_arquivo;
    // Extrai o nome do arquivo (a Key do S3) da URL completa
    const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);

    // 1. Prepara e envia o comando de deleção para o S3
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
    });
    await s3.send(command);

    // 2. Se a deleção no S3 funcionou, deleta o registro do nosso banco de dados
    await db.query('DELETE FROM checklist_foto WHERE id = $1', [foto_id]);

    res.status(200).json({ message: 'Foto deletada com sucesso.' });
  } catch (error) {
    console.error(`Erro ao deletar foto ${foto_id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor ao deletar foto.' });
  }
};


const updateOrdemServico = async (req, res) => {
  const { id } = req.params;
  const { cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome } = req.body;

  // Validação
  if (!cliente_nome || !veiculo_placa || !veiculo_modelo) {
    return res.status(400).json({ error: 'Nome do cliente, modelo e placa do veículo são obrigatórios.' });
  }

  try {
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
    const values = [cliente_nome, veiculo_placa, veiculo_modelo, seguradora_nome || null, id];
    const { rows } = await db.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`Erro ao atualizar ordem de serviço ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};
// Cria o pdf
const generatePdf = async (req, res) => {


  const { id } = req.params;
  try {
    // --- ETAPA 1: BUSCAR TODOS OS DADOS DO BANCO ---
    const osResult = await db.query('SELECT * FROM ordem_servico WHERE id = $1', [id]);
    if (osResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }
    const osData = osResult.rows[0];
    const itensResult = await db.query('SELECT * FROM checklist_item ORDER BY ordem');
    const respostasResult = await db.query('SELECT * FROM checklist_resposta WHERE os_id = $1', [id]);
    const fotosResult = await db.query('SELECT * FROM checklist_foto WHERE os_id = $1', [id]);
    const respostasMap = new Map(respostasResult.rows.map(r => [r.item_id, r]));

    // --- ETAPA 2: BAIXAR TODAS AS IMAGENS DO S3 PRIMEIRO ---
    const imageBuffers = [];

    if (fotosResult.rows.length > 0) {
      const downloadPromises = fotosResult.rows.map(foto =>
        axios.get(foto.caminho_arquivo, { responseType: 'arraybuffer' })
          .then(response => Buffer.from(response.data, 'binary'))
          .catch(err => {
            console.error(`[PDF Gen] FALHA ao baixar imagem: ${foto.caminho_arquivo}`, err.message);
            return null; // Retorna nulo para downloads que falharam
          })
      );

      const resolvedBuffers = await Promise.all(downloadPromises);

      resolvedBuffers.forEach(buffer => {
        if (buffer) imageBuffers.push(buffer); // Adiciona apenas os buffers que foram baixados com sucesso
      });
    }

    // --- ETAPA 3: MONTAR O PDF COM TODOS OS DADOS EM MÃOS ---
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="checklist-OS-${id}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // 4. Adicionar conteúdo ao PDF
    // Cabeçalho
    // (Lembre-se de ter o 'logo.png' na pasta raiz do backend)
    if (fs.existsSync('logo.png')) {
      doc.image('logo.png', {
        width: 50, // Ajuste a largura como preferir
        // align: 'center'
      });

    }

    // Adiciona o título, também centralizado
    doc.fontSize(20).font('Helvetica-Bold').text(
      'Checklist',
      // `Checklist de Vistoria - OS ,#${id}`
      { align: 'center' }
    );

    doc.moveDown(2);

    // Detalhes da OS
    doc.fontSize(12);
    doc.text(`Cliente: ${osData.cliente_nome}`);
    doc.text(`Veículo: ${osData.veiculo_modelo}`);
    doc.text(`Placa: ${osData.veiculo_placa}`);
    doc.text(`Data da Vistoria: ${new Date(osData.data).toLocaleString('pt-BR', {
      timeZone: 'America/Campo_Grande'
    })}`);
    if (osData.seguradora_nome) {
      doc.text(`Seguradora: ${osData.seguradora_nome}`);
    }
    doc.moveDown(2);

    // Itens do Checklist
    // Itens do Checklist
    doc.fontSize(14).text('Itens Vistoriados', { underline: true });
    doc.moveDown();

    doc.fontSize(10);

    // --- Lógica para o Grid de 2 Colunas dos Itens ---

    // Parâmetros do Grid
    const itemMargin = 50;
    const itemPageWidth = doc.page.width - itemMargin * 2;
    const itemGap = 25;
    const itemColumnWidth = (itemPageWidth - itemGap) / 2;
    const item_x_col1 = itemMargin;
    const item_x_col2 = itemMargin + itemColumnWidth + itemGap;
    const rowGap = 2; // Espaçamento vertical entre as linhas de itens

    // Itera sobre os itens em pares (de 2 em 2)
    for (let i = 0; i < itensResult.rows.length; i += 2) {
      const item1 = itensResult.rows[i];
      const item2 = i + 1 < itensResult.rows.length ? itensResult.rows[i + 1] : null;

      const startY = doc.y;

      // Função auxiliar para desenhar um item
      const drawItem = (item, x) => {
        if (!item) return;

        const resposta = respostasMap.get(item.id);
        let status = 'Não preenchido';
        let observacao = '';

        if (resposta) {
          status = (item.tipo === 'options' ? resposta.status : resposta.observacao) || 'Não preenchido';
          observacao = item.tipo === 'options' ? (resposta.observacao || '') : '';
        }

        // Usa as opções de texto para controlar a largura da coluna
        doc.font('Helvetica-Bold').text(`${item.ordem}. ${item.nome}:`, x, doc.y, { width: itemColumnWidth });
        doc.font('Helvetica').text(`   - Status: ${status}`, { indent: 15, width: itemColumnWidth });
        if (observacao) {
          doc.font('Helvetica-Oblique').text(`   - Observação: ${observacao}`, { indent: 15, width: itemColumnWidth });
        }
      };

      // Desenha a coluna da esquerda
      drawItem(item1, item_x_col1);
      const endY1 = doc.y; // Salva a posição Y onde a coluna da esquerda terminou

      // Volta para o início da linha e desenha a coluna da direita
      doc.y = startY;
      drawItem(item2, item_x_col2);
      const endY2 = doc.y; // Salva a posição Y onde a coluna da direita terminou

      // Move o cursor para baixo da coluna mais longa para começar a próxima linha
      doc.y = Math.max(endY1, endY2) + rowGap;

      // Adiciona uma nova página se a próxima linha não couber
      if (i + 2 < itensResult.rows.length && doc.y > doc.page.height - 70) {
        doc.addPage();
      }
    }



    // Fotos (se houver)
    if (imageBuffers.length > 0) {
      doc.addPage();
      doc.fontSize(14).text('Fotos Anexadas', { underline: true });
      doc.moveDown();

      // Parâmetros do Grid
      const margin = 50;
      const page_width = doc.page.width - margin * 2;
      const gap = 20;
      const image_width = (page_width - gap) / 2;
      const image_height = 180;
      const x_col1 = margin;
      const x_col2 = margin + image_width + gap;
      let current_y = doc.y;

      // Este loop agora usa os 'buffers' que já baixamos, em vez de caminhos de arquivo
      for (let i = 0; i < imageBuffers.length; i++) {
        const imageBuffer = imageBuffers[i];

        if (current_y + image_height > doc.page.height - margin) {
          doc.addPage();
          current_y = doc.page.margins.top;
        }

        const x_position = (i % 2 === 0) ? x_col1 : x_col2;

        doc.image(imageBuffer, x_position, current_y, {
          fit: [image_width, image_height],
          align: 'center',
          valign: 'center'
        });

        if (i % 2 !== 0 || i === imageBuffers.length - 1) {
          current_y += image_height + gap;
        }
      }
    }

    if (osData.assinatura_cliente) {
      // Se o conteúdo já estiver no final da página, cria uma nova página para a assinatura
      if (doc.y > 600) {
        doc.addPage();
        // Reposiciona o cursor no topo da nova página se necessário
        doc.y = doc.page.margins.top;
      }

      // Posiciona a seção de assinatura mais para o final da página
      const signatureBlockY = doc.page.height - 200;
      if (doc.y < signatureBlockY - 50) { // Só pula se houver bastante espaço
        doc.y = signatureBlockY;
      }

      const signatureX = 150;
      const signatureWidth = 300;

      // 1. Desenha a IMAGEM da assinatura primeiro
      doc.image(osData.assinatura_cliente, signatureX, doc.y, {
        fit: [signatureWidth, 80], // Imagem com altura máxima de 80
        align: 'center'
      });

      // Move o cursor para baixo da imagem que acabamos de desenhar
      doc.y += 80;

      // 2. Desenha a LINHA abaixo da imagem
      const lineY = doc.y + 5;
      doc.strokeColor('#aaaaaa')
        .moveTo(signatureX, lineY)
        .lineTo(signatureX + signatureWidth, lineY)
        .stroke();

      // 3. Escreve o NOME do cliente abaixo da linha
      const nameY = lineY + 5;
      doc.fontSize(10)
        .fillColor('black')
        .text(osData.cliente_nome, signatureX, nameY, {
          align: 'center',
          width: signatureWidth
        });
    }

    // --- RODAPÉ COM NÚMERO DA PÁGINA ---
    // ... (o código do rodapé continua o mesmo) ...

    doc.end();

  } catch (error) {
    console.error(`Erro ao gerar PDF para OS ${id}:`, error);
    res.status(500).send('Erro interno ao gerar o PDF.');
  }
};

const saveAssinatura = async (req, res) => {
  const { id } = req.params;
  const { assinatura } = req.body; // 'assinatura' será o texto Base64 da imagem

  if (!assinatura) {
    return res.status(400).json({ error: 'Nenhuma assinatura fornecida.' });
  }

  try {
    const query = 'UPDATE ordem_servico SET assinatura_cliente = $1 WHERE id = $2';
    await db.query(query, [assinatura, id]);
    res.status(200).json({ message: 'Assinatura salva com sucesso.' });
  } catch (error) {
    console.error(`Erro ao salvar assinatura da OS ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};


// Exporta todas as funções para serem usadas nas rotas
module.exports = {
  getChecklistItens,
  createOrdemServico,
  getOrdemServicoById,
  saveChecklistRespostas,
  uploadFotos,
  getOrdensServico,
  deleteOrdemServico,
  deleteFoto,
  generatePdf,
  saveAssinatura,
  updateOrdemServico
};