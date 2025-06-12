const multer = require('multer');

// Salva o arquivo na memória como um Buffer
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
    limits: { fileSize: 1024 * 1024 * 5 } // Limite de 5MB por arquivo
});

module.exports = upload;