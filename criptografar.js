const bcrypt = require('bcrypt');

const senha = '097106'; // Senha que você quer criptografar
const saltRounds = 10; // Quantidade de "rounds" de salt para gerar a senha criptografada

bcrypt.hash(senha, saltRounds, (err, hashedPassword) => {
    if (err) {
        console.error('Erro ao criptografar senha:', err);
        return;
    }

    // Aqui está a senha criptografada
    console.log('Senha criptografada:', hashedPassword);
});

