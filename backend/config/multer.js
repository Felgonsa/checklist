const multer = require('multer');
const path = require('path');

// Configuração de armazenamento para o Multer
const storage = multer.diskStorage({
  // Define a pasta de destino para os arquivos enviados
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Salva os arquivos na pasta 'uploads'
  },
  // Define o nome do arquivo para evitar conflitos de nomes iguais
  filename: function (req, file, cb) {
    // Cria um nome de arquivo único adicionando um timestamp e a extensão original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro de arquivo para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Aceita o arquivo
  } else {
    cb(new Error('Tipo de arquivo inválido. Apenas imagens são permitidas.'), false); // Rejeita o arquivo
  }
};

// Cria a instância do Multer com as configurações de armazenamento e filtro
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 10 // Limite de 10MB por arquivo
  }
});

module.exports = upload;