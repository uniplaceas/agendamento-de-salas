const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require ('express-session');
const app = express();
const port = 3001;

// Configuração do banco de dados
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Fernandes55',
    database: 'SALAS_UNIPLACE'
});


// Conectar ao banco de dados
db.connect((err) => {
    if (err) {
        console.error('Erro de conexão com o banco de dados: ' + err.stack);
        return;
    }
    console.log('Conectado ao banco de dados MySQL');
});

// Configuração do express para processar o corpo das requisições (body)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Erro ao tentar deslogar.');
        }
        res.redirect('/login?logout=true'); // Redireciona para login com o parâmetro 'logout=true'
    });
});


// Listar todas as salas cadastradas
app.get('/salas', (req, res) => {
    db.query('SELECT * FROM Salas', (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Listar agendamentos de uma sala
app.get('/agendamentos', (req, res) => {
    db.query('SELECT * FROM Agendamentos', (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Adicionar novo agendamento
app.post('/agendamentos', (req, res) => {
    const { sala_id, data, hora_inicio, hora_termino } = req.body;

    const query = `
        INSERT INTO Agendamentos (sala_id, data, hora_inicio, hora_termino) 
        VALUES (?, ?, ?, ?)`;

    db.query(query, [sala_id, data, hora_inicio, hora_termino], (err) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(201).send('Agendamento realizado com sucesso!');
    });
});

// Rota para a página de agendar sala
app.get('/professor/agendar_sala', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'agendar_sala.html'));
});

// Rota para a página de histórico de agendamentos
app.get('/professor/historico_agendamento', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'historico_agendamento.html'));
});

// Supomos que você tenha algum tipo de armazenamento para salas e professores.
// Exemplo usando arrays, mas você pode substituir isso por banco de dados.

let salas = [
    { numero: '101', reserva: '2024-11-20' },
    { numero: '202', reserva: '2024-11-21' },
    { numero: '103', reserva: '2024-11-22' }
];
let professores = [
    { nome: 'Professor A', departamento: 'Matemática' },
    { nome: 'Professor B', departamento: 'Física' }
];
let pendencias = [
    { descricao: 'Pendência 1', status: 'Aguardando aprovação' },
    { descricao: 'Pendência 2', status: 'Aguardando confirmação' },
    { descricao: 'Pendência 3', status: 'Aguardando documentação' }
];

// Rota para agendar sala
app.post('/professor/agendarSala', (req, res) => {
    const { nomeSala, data, horaInicio, horaFim } = req.body;
    const professor = req.session.usuario;

    if (!professor) {
        return res.status(401).json({ message: 'Usuário não autenticado!' });
    }

    if (!nomeSala || !data || !horaInicio || !horaFim) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios!' });
    }

    // Verificar se já existe agendamento para o mesmo horário
    const queryVerificar = `
        SELECT * FROM agendamentos 
        WHERE nome_sala = ? AND data = ? AND 
              (hora_inicio < ? AND hora_fim > ?)
    `;
    db.execute(queryVerificar, [nomeSala, data, horaFim, horaInicio], (err, results) => {
        if (err) {
            console.error('Erro ao verificar agendamentos:', err);
            return res.status(500).json({ message: 'Erro ao verificar agendamentos.' });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: 'Sala já agendada para esse horário!' });
        }

        // Inserir o agendamento no banco de dados
        const queryInserir = `
            INSERT INTO agendamentos (nome_sala, data, hora_inicio, hora_fim, professor_nome) 
            VALUES (?, ?, ?, ?, ?)
        `;
        db.execute(
            queryInserir,
            [nomeSala, data, horaInicio, horaFim, professor.nome],
            (err, results) => {
                if (err) {
                    console.error('Erro ao agendar sala:', err);
                    return res.status(500).json({ message: 'Erro ao agendar sala.' });
                }

                res.status(201).json({ message: 'Sala agendada com sucesso!' });
            }
        );
    });
});

// Rota para obter os agendamentos de uma sala (para o calendário)
app.get('/professor/obterAgendamentos', (req, res) => {
    const { data } = req.query;

    if (!data) {
        return res.status(400).json({ message: 'Data não fornecida!' });
    }

    const query = `
        SELECT nome_sala, hora_inicio, hora_fim, professor_nome 
        FROM agendamentos 
        WHERE data = ?
    `;
    db.execute(query, [data], (err, results) => {
        if (err) {
            console.error('Erro ao obter agendamentos:', err);
            return res.status(500).json({ message: 'Erro ao obter agendamentos.' });
        }

        res.json(results);
    });
});

// Rota para histórico de agendamentos
app.get('/professor/historicoAgendamentos', (req, res) => {
    const professor = req.session.usuario;

    if (!professor) {
        return res.status(401).json({ message: 'Usuário não autenticado!' });
    }

    const query = `
        SELECT nome_sala, data, hora_inicio, hora_fim 
        FROM agendamentos 
        WHERE professor_nome = ?
        ORDER BY data DESC
    `;
    db.execute(query, [professor.nome], (err, results) => {
        if (err) {
            console.error('Erro ao obter histórico:', err);
            return res.status(500).json({ message: 'Erro ao obter histórico.' });
        }

        res.json(results);
    });
});

// Rota para obter o número de salas cadastradas, professores, etc.
app.get('/admin/dados', (req, res) => {
    const salasCadastradas = salas.length;
    const professoresCadastrados = professores.length;
    
    // Suponhamos que o próximo evento seja o primeiro da lista de reservas
    const proximoEvento = salas[0] ? `Sala ${salas[0].numero} reservada em ${salas[0].reserva}` : 'Nenhum evento agendado';

    const proximosEventos = salas.map(sala => ({
        sala: sala.numero,
        data: sala.reserva
    }));

    res.json({
        salasCadastradas,
        professoresCadastrados,
        proximoEvento,
        pendencias: pendencias.length
    });
});

// Rota para adicionar sala
app.post('/admin/cadastrarSala', (req, res) => {
    const { numero, reserva } = req.body;
    salas.push({ numero, reserva });
    res.status(200).send({ message: 'Sala cadastrada com sucesso!' });
});


// Configuração de sessão
app.use(
    session({
        secret: 'chave-secreta', // Substitua por uma chave segura
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }, // Altere para "true" com HTTPS
    })
);

// Configuração do Express para servir arquivos estáticos e processar requisições
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rota para a página de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota para a página de administração
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Rota para a página de cadastrar professor
app.get('/cadastrarProfessor', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cadastrar_professor.html'));
});

// Rota para a página de cadastrar sala
app.get('/cadastrarSala', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cadastrar_sala.html'));
});

// Rota para autenticação (POST)
app.post('/login', (req, res) => {
    const { matricula, senha, tipoUsuario } = req.body;

    if (!matricula || !senha || !tipoUsuario) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios!' });
    }

    let tabela = '';
    if (tipoUsuario === 'administrador') {
        tabela = 'administradores';
    } else if (tipoUsuario === 'professor') {
        tabela = 'professores';
    } else {
        return res.status(400).json({ message: 'Tipo de usuário inválido!' });
    }

    const query = `SELECT * FROM ${tabela} WHERE matricula = ?`;
    db.execute(query, [matricula], (err, results) => {
        if (err) {
            console.error('Erro ao acessar o banco de dados:', err);
            return res.status(500).json({ message: 'Erro ao acessar o banco de dados' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Matrícula ou senha inválidos!' });
        }

        const usuario = results[0];

        bcrypt.compare(senha, usuario.senha, (err, result) => {
            if (err || !result) {
                return res.status(401).json({ message: 'Matrícula ou senha inválidos!' });
            }

            // Armazenar os dados do usuário na sessão
            req.session.usuario = {
                matricula: usuario.matricula,
                nome: usuario.nome,
                departamento: usuario.departamento,
            };

            const redirectUrl = tipoUsuario === 'administrador' ? '/admin' : '/professor';
            res.json({ redirect: redirectUrl });
        });
    });
});
// Rota para retornar os dados do professor
app.get('/professor/dados', (req, res) => {
    if (req.session.usuario) {
        res.json(req.session.usuario); // Envia os dados do usuário logado
    } else {
        res.status(401).json({ message: 'Usuário não autenticado.' });
    }
});

// Rota para a página do professor
app.get('/professor', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'professor.html'));
});

app.post('/cadastrarProfessor', (req, res) => {
    const { nome, email, matricula, departamento, senha } = req.body;

    // Verifica se todos os campos foram preenchidos
    if (!nome || !email || !matricula || !departamento || !senha) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios!' });
    }

    // Criptografa a senha
    bcrypt.hash(senha, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Erro ao criptografar a senha:', err);
            return res.status(500).json({ message: 'Erro ao criptografar a senha.' });
        }

        // Insere o professor no banco de dados
        const query = `INSERT INTO professores (nome, email, matricula, departamento, senha) 
                       VALUES (?, ?, ?, ?, ?)`;
                       db.query(query, [nome, email, matricula, departamento, hashedPassword], (err, results) => {
                        if (err) {
                            console.error('Erro ao cadastrar o professor:', err);
                            return res.status(500).json({ message: 'Erro ao cadastrar o professor.' });
                        }

            // Retorna uma resposta de sucesso
            res.status(500).json({ message: 'Professor cadastrado com sucesso!' });
        });
    });
});


// Rota para cadastrar uma sala
app.post('/submit_sala', (req, res) => {
    const { nome, capacidade, tipo, data, hora_inicio, hora_fim } = req.body;

    // Verifica se todos os campos foram preenchidos
    if (!nome || !capacidade || !tipo || !data || !hora_inicio || !hora_fim) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios!' });
    }

    // Insere a nova sala no banco de dados
    const query = `INSERT INTO salas (nome, capacidade, tipo, data_disponivel, hora_inicio, hora_fim) VALUES (?, ?, ?, ?, ?, ?)`;
    db.execute(query, [nome, capacidade, tipo, data, hora_inicio, hora_fim], (err, results) => {
        if (err) {
            console.error('Erro ao cadastrar sala:', err);
            return res.status(500).json({ message: 'Erro ao cadastrar sala.' });
        }

        // Retorna uma resposta de sucesso
        res.status(201).json({ message: 'Sala cadastrada com sucesso!' });
    });
});

// Inicializa o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
