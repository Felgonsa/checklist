// Importa o módulo 'db.js', que é responsável pela conexão e operações com o banco de dados.
const db = require('../db/db.js');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Inicializa o cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const uploadFotos = async (req, res) => {
  const { os_id } = req.body;
  const files = req.files;
  const { role, oficina_id } = req.user;
  
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Nenhuma foto enviada.' });
  }
  
  try {
    // Verifica se o usuário tem permissão para acessar esta OS
    if (role !== 'superadmin') {
      const osCheck = await db.query('SELECT oficina_id FROM ordem_servico WHERE id = $1', [os_id]);
      if (osCheck.rows.length === 0 || osCheck.rows[0].oficina_id !== oficina_id) {
        return res.status(403).json({ error: 'Acesso proibido.' });
      }
    }
    
    const fotosSalvas = [];
    for (const file of files) {
      try {
        // Comprimir a imagem antes do upload
        const compressedBuffer = await sharp(file.buffer)
          .resize({ 
            width: 1024, 
            withoutEnlargement: true // Não aumenta imagens menores que 1024px
          })
          .jpeg({ 
            quality: 80, // Qualidade de 80% (ótimo equilíbrio tamanho/qualidade)
            mozjpeg: true // Otimização adicional
          })
          .toBuffer();

        // Atualizar o mimetype para JPEG (já que sharp converte tudo para JPEG)
        const compressedMimetype = 'image/jpeg';
        
        // Gera um nome único para o arquivo (agora sempre com extensão .jpg)
        const fileName = `${uuidv4()}.jpg`;
        const filePath = `fotos-checklist/${fileName}`;
        
        // Faz upload para o Supabase Storage com a imagem comprimida
        const { data, error } = await supabase.storage
          .from('fotos-checklist')
          .upload(filePath, compressedBuffer, {
            contentType: compressedMimetype,
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          console.error('Erro ao fazer upload para Supabase:', error);
          throw error;
        }
        
        // Obtém a URL pública do arquivo
        const { data: publicUrlData } = supabase.storage
          .from('fotos-checklist')
          .getPublicUrl(filePath);
        
        const publicUrl = publicUrlData.publicUrl;
        
        // Salva a URL pública no banco de dados
        const query = 'INSERT INTO checklist_foto (os_id, caminho_arquivo) VALUES ($1, $2) RETURNING *;';
        const { rows } = await db.query(query, [os_id, publicUrl]);
        fotosSalvas.push(rows[0]);
      } catch (compressError) {
        console.error('Erro ao comprimir imagem:', compressError);
        // Em caso de erro na compressão, tenta fazer upload da imagem original
        console.log('Tentando upload da imagem original devido a erro na compressão...');
        
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;
        const filePath = `fotos-checklist/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('fotos-checklist')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          console.error('Erro ao fazer upload da imagem original:', error);
          throw error;
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('fotos-checklist')
          .getPublicUrl(filePath);
        
        const publicUrl = publicUrlData.publicUrl;
        
        const query = 'INSERT INTO checklist_foto (os_id, caminho_arquivo) VALUES ($1, $2) RETURNING *;';
        const { rows } = await db.query(query, [os_id, publicUrl]);
        fotosSalvas.push(rows[0]);
      }
    }
    res.status(201).json({ message: 'Fotos enviadas com sucesso!', data: fotosSalvas });
  } catch (error) {
    console.error('Erro ao fazer upload de fotos:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};



// Função assíncrona para deletar uma foto do Supabase Storage e remover seu registro do banco de dados.
const deleteFoto = async (req, res) => {
  const { foto_id } = req.params;
  const { role, oficina_id } = req.user;
  
  try {
    // Primeiro, busca a foto e verifica se o usuário tem permissão
    const pathResult = await db.query(`
      SELECT cf.caminho_arquivo, os.oficina_id 
      FROM checklist_foto cf
      JOIN ordem_servico os ON cf.os_id = os.id
      WHERE cf.id = $1
    `, [foto_id]);
    
    if (pathResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto não encontrada.' });
    }
    
    // Verifica permissão
    if (role !== 'superadmin' && pathResult.rows[0].oficina_id !== oficina_id) {
      return res.status(403).json({ error: 'Acesso proibido.' });
    }
    
    const publicUrl = pathResult.rows[0].caminho_arquivo;
    
    // Extrai o caminho do arquivo da URL pública do Supabase
    // A URL é algo como: https://zhdclfhctivfuhfcqhyq.supabase.co/storage/v1/object/public/fotos-checklist/uuid.jpg
    // Precisamos extrair: fotos-checklist/uuid.jpg
    const urlParts = publicUrl.split('/');
    const bucketName = urlParts[urlParts.length - 2]; // fotos-checklist
    const fileName = urlParts[urlParts.length - 1]; // uuid.jpg
    const filePath = `${bucketName}/${fileName}`;
    
    // Deleta o arquivo do Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);
    
    if (storageError) {
      console.error('Erro ao deletar arquivo do Supabase Storage:', storageError);
      // Continua mesmo com erro para deletar do banco de dados
    }
    
    // Deleta o registro do banco de dados
    await db.query('DELETE FROM checklist_foto WHERE id = $1', [foto_id]);

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
  const { role, oficina_id } = req.user;

  // Verifica se a assinatura foi fornecida.
  if (!assinatura) {
    // Se não houver assinatura, retorna um erro 400 (Bad Request).
    return res.status(400).json({ error: 'Nenhuma assinatura fornecida.' });
  }

  try {
    // Verifica se o usuário tem permissão para acessar esta OS
    if (role !== 'superadmin') {
      const osCheck = await db.query('SELECT oficina_id FROM ordem_servico WHERE id = $1', [id]);
      if (osCheck.rows.length === 0 || osCheck.rows[0].oficina_id !== oficina_id) {
        return res.status(403).json({ error: 'Acesso proibido.' });
      }
    }
    
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