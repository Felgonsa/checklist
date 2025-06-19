// Arquivo: gerarSenha.js
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Escolha a senha que você quer usar para o seu superadmin
const senhaQueVoceQuer = 'admin123'; 

bcrypt.hash(senhaQueVoceQuer, saltRounds, (err, hash) => {
    if (err) {
        console.error("Erro ao gerar hash:", err);
        return;
    }
    console.log("Senha criptografada gerada com sucesso!");
    console.log("Copie e cole este comando SQL no seu pgAdmin:");
    console.log("-------------------------------------------------");
    console.log(`UPDATE usuarios SET senha = '${hash}' WHERE email = 'felipe@email.com';`);
    console.log("-------------------------------------------------");
});