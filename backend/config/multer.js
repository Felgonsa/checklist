const multer = require('multer');

// Usar memoryStorage para obter o arquivo como buffer
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo inválido. Apenas imagens são permitidas.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 10 } // Limite de 10MB
});

module.exports = upload;
