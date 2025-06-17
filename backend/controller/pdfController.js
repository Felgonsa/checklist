// Importa o módulo 'db.js' localizado no diretório '../db'.
// Este módulo é responsável por configurar e gerenciar a conexão com o banco de dados.
const db = require('../db/db.js');

// Importa o módulo 'fs' (File System) nativo do Node.js.
// Ele é usado para interagir com o sistema de arquivos, como verificar a existência de um arquivo.
const fs = require('fs');

// Importa a biblioteca 'pdfkit'.
// Esta biblioteca é utilizada para gerar documentos PDF de forma programática.
const PDFDocument = require('pdfkit');

// Importa a biblioteca 'axios'.
// É um cliente HTTP baseado em Promises para fazer requisições a recursos externos,
// como baixar imagens de URLs (por exemplo, de um serviço de armazenamento como o S3).
const axios = require('axios');
const { log } = require('console');

// ---

/**
 * @function generatePdf
 * @description Função assíncrona responsável por gerar um documento PDF de checklist de vistoria.
 * Ela busca dados de uma ordem de serviço, itens de checklist, respostas, fotos e assinatura
 * do banco de dados e os organiza em um PDF formatado.
 * @param {Object} req - Objeto de requisição do Express, contendo parâmetros da requisição (como o ID da OS).
 * @param {Object} res - Objeto de resposta do Express, usado para enviar o PDF gerado ao cliente.
 */
const generatePdf = async (req, res) => {
  // Extrai o 'id' da ordem de serviço dos parâmetros da requisição (ex: /pdf/:id).
  const { id } = req.params;

  try {
    // --- ETAPA 1: BUSCAR TODOS OS DADOS NECESSÁRIOS DO BANCO DE DADOS ---

    // Consulta a tabela 'ordem_servico' para obter os dados da OS específica.
    // Utiliza `$1` como placeholder para o ID, prevenindo injeção SQL.
    const osResult = await db.query('SELECT * FROM ordem_servico WHERE id = $1', [id]);

    // Verifica se a ordem de serviço foi encontrada.
    if (osResult.rows.length === 0) {
      // Se não encontrada, retorna um erro 404 (Not Found) com uma mensagem JSON.
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    // Armazena os dados da ordem de serviço encontrada (a primeira linha do resultado).
    const osData = osResult.rows[0];

    // Consulta a tabela 'checklist_item' para obter todos os itens do checklist.
    // Ordena os itens pela coluna 'ordem' para garantir a sequência correta no PDF.
    const itensResult = await db.query('SELECT * FROM checklist_item ORDER BY ordem');

    // Consulta a tabela 'checklist_resposta' para obter as respostas específicas para esta OS.
    const respostasResult = await db.query('SELECT * FROM checklist_resposta WHERE os_id = $1', [id]);

    // Consulta a tabela 'checklist_foto' para obter os dados das fotos relacionadas a esta OS.
    const fotosResult = await db.query('SELECT * FROM checklist_foto WHERE os_id = $1', [id]);

    // Cria um 'Map' para mapear rapidamente as respostas dos itens do checklist.
    // A chave é o 'item_id' e o valor é o objeto da resposta.
    const respostasMap = new Map(respostasResult.rows.map(r => [r.item_id, r]));

    // --- ETAPA 2: BAIXAR TODAS AS IMAGENS DO S3 (OU OUTRA URL) PRIMEIRO ---
    // É crucial baixar as imagens antes de começar a montar o PDF para que elas estejam disponíveis.

    // Array para armazenar os buffers das imagens baixadas.
    const imageBuffers = [];

    // Verifica se há fotos para baixar.
    if (fotosResult.rows.length > 0) {
      // Cria um array de Promises, onde cada Promise representa o download de uma imagem.
      const downloadPromises = fotosResult.rows.map(foto =>
        // Usa Axios para fazer uma requisição GET para o 'caminho_arquivo' (URL da imagem).
        // `responseType: 'arraybuffer'` garante que a resposta seja um buffer binário.
        axios.get(foto.caminho_arquivo, { responseType: 'arraybuffer' })
          .then(response => {
            // Converte o ArrayBuffer da resposta em um Buffer do Node.js,
            // que é o formato esperado pelo PDFKit para adicionar imagens.
            return Buffer.from(response.data, 'binary');
          })
          .catch(err => {
            // Em caso de falha no download de uma imagem, loga o erro no console.
            // Retorna 'null' para que a Promise seja resolvida, mas o item falho seja ignorado.
            console.error(`[PDF Gen] FALHA ao baixar imagem: ${foto.caminho_arquivo}`, err.message);
            return null;
          })
      );

      // Espera que todas as Promises de download sejam resolvidas.
      // `Promise.all` executa os downloads em paralelo, otimizando o tempo.
      const resolvedBuffers = await Promise.all(downloadPromises);

      // Filtra e adiciona apenas os buffers que foram baixados com sucesso (não são null) ao array.
      resolvedBuffers.forEach(buffer => {
        if (buffer) imageBuffers.push(buffer);
      });
    }

    // --- ETAPA 3: MONTAR O PDF COM TODOS OS DADOS JÁ OBTIDOS EM MÃOS ---

    // Define os cabeçalhos da resposta HTTP para indicar que o conteúdo é um PDF.
    // 'Content-Type': Diz ao navegador que o tipo de arquivo é um PDF.
    res.setHeader('Content-Type', 'application/pdf');
    // 'Content-Disposition': Sugere ao navegador exibir o PDF attachment (download do arquivo)
    // e fornece um nome de arquivo padrão para download.
    // res.setHeader('Content-Disposition', `attachment; filename="checklist-OS-${id}.pdf"`);
    res.setHeader('Content-Disposition', `attachment; filename="checklist-${osData.veiculo_modelo}-${osData.veiculo_placa}.pdf"`);


    // Cria uma nova instância do documento PDF.
    // 'margin': Define as margens padrão do documento (50 unidades de espaço de cada lado).
    // 'size': Define o tamanho da página como A4.
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Conecta o fluxo de saída do PDF (o que o PDFKit gera) ao objeto de resposta HTTP do Express.
    // Isso permite que o PDF seja transmitido ao cliente em tempo real, sem precisar ser totalmente
    // gerado em memória primeiro, o que é eficiente para PDFs grandes.
    doc.pipe(res);

    // --- ETAPA 4: ADICIONAR CONTEÚDO AO PDF ---

    // --- Cabeçalho do Documento ---

    
    if (fs.existsSync('header.png')) {
      doc.image('header.png', 0,0, {
        width: (doc.page.width)
      });
      doc.y = 150;
    }

    // Adiciona o título principal do documento.
    doc.fontSize(20) // Define o tamanho da fonte.
      .font('Helvetica-Bold') // Define a fonte como Helvetica em negrito.
      .text(
        'Checklist', // Texto do título.
        { align: 'center' } // Alinha o texto ao centro da página.
      );

    // Adiciona duas linhas de espaço vertical.
    doc.moveDown(2);

    // --- Detalhes da Ordem de Serviço (OS) ---

    // Define o tamanho da fonte para os detalhes da OS.
    doc.fontSize(12);
    // Adiciona os detalhes da OS usando os dados obtidos do banco de dados.
    doc.text(`Cliente: ${osData.cliente_nome}`);
    doc.text(`Veículo: ${osData.veiculo_modelo}`);
    doc.text(`Placa: ${osData.veiculo_placa}`);
    // Formata a data da vistoria para o padrão brasileiro e o fuso horário de Campo Grande.
    doc.text(`Data da Vistoria: ${new Date(osData.data).toLocaleString('pt-BR', {
      timeZone: 'America/Campo_Grande'
    })}`);
    // Adiciona o nome da seguradora apenas se ele existir nos dados da OS.
    if (osData.seguradora_nome) {
      doc.text(`Seguradora: ${osData.seguradora_nome}`);
    }
    // Adiciona duas linhas de espaço vertical.
    doc.moveDown(2);

    // --- Seção de Itens do Checklist ---

    // Adiciona o título da seção de itens vistoriados, com sublinhado.
    doc.fontSize(14).text('Itens Vistoriados', { underline: true });
    // Adiciona uma linha de espaço vertical.
    doc.moveDown();

    // Define o tamanho da fonte para os itens individuais do checklist.
    doc.fontSize(10);

    // --- Lógica para o Grid de 2 Colunas dos Itens ---

    // Define os parâmetros para o layout em duas colunas.
    const itemMargin = 50; // Margem lateral para a área dos itens.
    const itemPageWidth = doc.page.width - itemMargin * 2; // Largura total disponível para as colunas.
    const itemGap = 25; // Espaço horizontal entre as duas colunas.
    // Calcula a largura de cada coluna.
    const itemColumnWidth = (itemPageWidth - itemGap) / 2;
    const item_x_col1 = itemMargin; // Posição X para a primeira coluna.
    const item_x_col2 = itemMargin + itemColumnWidth + itemGap; // Posição X para a segunda coluna.
    const rowGap = 2; // Espaçamento vertical entre as linhas de itens.

    // Itera sobre os itens do checklist em pares (de 2 em 2).
    for (let i = 0; i < itensResult.rows.length; i += 2) {
      // Pega o primeiro item do par.
      const item1 = itensResult.rows[i];
      // Pega o segundo item do par, se existir.
      const item2 = i + 1 < itensResult.rows.length ? itensResult.rows[i + 1] : null;

      // Salva a posição Y atual do cursor antes de desenhar os itens desta linha.
      const startY = doc.y;

      /**
       * @function drawItem
       * @description Função auxiliar para desenhar um único item do checklist no PDF.
       * @param {Object} item - O objeto do item do checklist.
       * @param {number} x - A posição X onde o item deve ser desenhado (para colunas).
       */
      const drawItem = (item, x) => {
        // Se o item for nulo (caso do último item em um número ímpar de itens), retorna.
        if (!item) return;

        // Busca a resposta correspondente a este item no mapa de respostas.
        const resposta = respostasMap.get(item.id);
        let status = 'Não preenchido'; // Status padrão se não houver resposta.
        let observacao = ''; // Observação padrão.

        // Se uma resposta for encontrada para o item:
        if (resposta) {
          // Se o tipo do item for 'options' (seleção), o status é a resposta real,
          // caso contrário, a observação é a resposta.
          status = (item.tipo === 'options' ? resposta.status : resposta.observacao) || 'Não preenchido';
          // A observação só é aplicada se o tipo for 'options' e houver uma observação.
          observacao = item.tipo === 'options' ? (resposta.observacao || '') : '';
        }

        // Adiciona o nome do item com a ordem (ex: "1. Pneu Dianteiro:") em negrito.
        // As opções de texto controlam a largura da coluna.
        doc.font('Helvetica-Bold').text(`${item.ordem}. ${item.nome}:`, x, doc.y, { width: itemColumnWidth });
        // Adiciona o status do item com um pequeno recuo.
        doc.font('Helvetica').text(`    - Status: ${status}`, { indent: 15, width: itemColumnWidth });
        // Adiciona a observação do item, se houver, em itálico com recuo.
        if (observacao) {
          doc.font('Helvetica-Oblique').text(`    - Observação: ${observacao}`, { indent: 15, width: itemColumnWidth });
        }
      };

      // Desenha o primeiro item (coluna da esquerda).
      drawItem(item1, item_x_col1);
      // Salva a posição Y onde o desenho da primeira coluna terminou.
      const endY1 = doc.y;

      // Restaura a posição Y para o início da linha para desenhar a segunda coluna.
      doc.y = startY;
      // Desenha o segundo item (coluna da direita).
      drawItem(item2, item_x_col2);
      // Salva a posição Y onde o desenho da segunda coluna terminou.
      const endY2 = doc.y;

      // Move o cursor 'doc.y' para a posição mais baixa das duas colunas,
      // garantindo que a próxima linha de itens comece abaixo da coluna mais longa.
      doc.y = Math.max(endY1, endY2) + rowGap;

      // Verifica se a próxima linha de itens (se houver) não caberia na página atual.
      // Adiciona uma nova página se a altura restante for menor que 70 unidades (aproximadamente o espaço para uma linha de item).
      if (i + 2 < itensResult.rows.length && doc.y > doc.page.height - 70) {
        doc.addPage(); // Adiciona uma nova página.
      }
    }

    // --- Seção de Fotos Anexadas ---

    // Verifica se há imagens para adicionar ao PDF.
    if (imageBuffers.length > 0) {
      doc.addPage(); // Adiciona uma nova página para as fotos.
      doc.fontSize(14).text('Fotos Anexadas', { underline: true }); // Título da seção.
      doc.moveDown(); // Adiciona espaço.

      // Parâmetros para o grid de imagens (similar ao de itens).
      const margin = 50;
      const page_width = doc.page.width - margin * 2;
      const gap = 20; // Espaço entre as imagens.
      const image_width = (page_width - gap) / 2; // Largura de cada imagem.
      const image_height = 180; // Altura fixa de cada imagem.
      const x_col1 = margin; // Posição X para a primeira coluna de imagens.
      const x_col2 = margin + image_width + gap; // Posição X para a segunda coluna de imagens.
      let current_y = doc.y; // Posição Y inicial para as imagens.

      // Itera sobre os buffers das imagens que foram baixadas.
      for (let i = 0; i < imageBuffers.length; i++) {
        const imageBuffer = imageBuffers[i]; // Pega o buffer da imagem atual.

        // Verifica se a imagem atual não caberá na página restante.
        if (current_y + image_height > doc.page.height - margin) {
          doc.addPage(); // Adiciona uma nova página.
          current_y = doc.page.margins.top; // Reposiciona o cursor Y no topo da nova página.
        }

        // Determina a posição X da imagem (coluna esquerda ou direita).
        const x_position = (i % 2 === 0) ? x_col1 : x_col2;

        // Adiciona a imagem ao PDF usando o buffer.
        doc.image(imageBuffer, x_position, current_y, {
          fit: [image_width, image_height], // Ajusta a imagem para caber nas dimensões especificadas.
          align: 'center', // Alinha a imagem horizontalmente dentro de seu espaço.
          valign: 'center' // Alinha a imagem verticalmente dentro de seu espaço.
        });

        // Move o cursor Y para a próxima linha após desenhar duas imagens
        // ou se for a última imagem do array (em caso de número ímpar).
        if (i % 2 !== 0 || i === imageBuffers.length - 1) {
          current_y += image_height + gap;
        }
      }
    }

    // --- Seção de Assinatura do Cliente ---

    // Verifica se há dados de assinatura do cliente.
    if (osData.assinatura_cliente) {
      // Se o conteúdo atual estiver muito perto do final da página (abaixo de Y=600),
      // cria uma nova página para a assinatura, garantindo espaço.
      if (doc.y > 600) {
        doc.addPage();
        doc.y = doc.page.margins.top; // Reposiciona o cursor no topo da nova página.
      }

      // Tenta posicionar a seção de assinatura mais para o final da página.
      // Calcula a posição Y desejada para o bloco de assinatura.
      const signatureBlockY = doc.page.height - 200;
      // Se o cursor atual for muito alto, pula para a posição do bloco de assinatura.
      if (doc.y < signatureBlockY - 50) {
        doc.y = signatureBlockY;
      }

      // Define as coordenadas e largura para a área da assinatura.
      const signatureX = 150; // Posição X inicial para a assinatura.
      const signatureWidth = 300; // Largura total da área da assinatura.

      // 1. Desenha a IMAGEM da assinatura (se for uma imagem, 'assinatura_cliente' é a URL/caminho).
      doc.image(osData.assinatura_cliente, signatureX, doc.y, {
        fit: [signatureWidth, 80], // Ajusta a imagem para caber na largura e altura máxima de 80.
        align: 'center' // Alinha a imagem centralizada na área definida.
      });

      // Move o cursor Y para baixo da imagem da assinatura.
      doc.y += 80;

      // 2. Desenha uma LINHA horizontal abaixo da imagem da assinatura.
      const lineY = doc.y + 5; // Posição Y da linha (um pouco abaixo da imagem).
      doc.strokeColor('#aaaaaa') // Define a cor da linha.
        .moveTo(signatureX, lineY) // Inicia a linha em 'signatureX'.
        .lineTo(signatureX + signatureWidth, lineY) // Desenha a linha até 'signatureX + signatureWidth'.
        .stroke(); // Finaliza o desenho da linha.

      // 3. Escreve o NOME do cliente abaixo da linha.
      const nameY = lineY + 5; // Posição Y do nome do cliente (um pouco abaixo da linha).
      doc.fontSize(10) // Define o tamanho da fonte.
        .fillColor('black') // Define a cor do texto.
        .text(osData.cliente_nome, signatureX, nameY, {
          align: 'center', // Alinha o nome ao centro da área de assinatura.
          width: signatureWidth // Define a largura para o texto.
        });
    }

    // Finaliza o documento PDF.
    // Isso sinaliza que não há mais conteúdo para adicionar e que o stream de resposta
    // HTTP pode ser encerrado, enviando o PDF completo para o cliente.
    doc.end();

  } catch (error) {
    // Bloco catch para capturar e tratar quaisquer erros que ocorram durante o processo.
    console.error(`Erro ao gerar PDF para OS ${id}:`, error); // Loga o erro no console do servidor.
    // Envia uma resposta de erro 500 (Internal Server Error) ao cliente.
    res.status(500).send('Erro interno ao gerar o PDF.');
  }
};

// Exporta a função 'generatePdf' para que ela possa ser utilizada por outros módulos,
// como um arquivo de rotas do Express.
module.exports = {
  generatePdf,
};