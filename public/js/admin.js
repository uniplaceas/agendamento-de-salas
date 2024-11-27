document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o calendário
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        plugins: [ 'dayGrid' ],
        defaultView: 'dayGridMonth',
        events: '/agendamentos', // Vamos obter as reservas através do backend
        eventColor: '#28a745', // Verde para sala disponível
        eventRender: function(info) {
            if (info.event.extendedProps.status === 'ocupado') {
                info.el.style.backgroundColor = 'red'; // Vermelho para ocupado
            }
        }
    });
    calendar.render();

    // Função para cadastrar professor
    document.getElementById('form-professor').addEventListener('submit', function(e) {
        e.preventDefault();

        const nome = document.getElementById('nome').value;
        const matricula = document.getElementById('matricula-professor').value;
        const senha = document.getElementById('senha-professor').value;

        fetch('/cadastrar-professor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nome, matricula, senha })
        }).then(response => response.json())
          .then(data => alert(data.message))
          .catch(error => console.error('Erro:', error));
    });

    // Função para cadastrar sala
    document.getElementById('form-sala').addEventListener('submit', function(e) {
        e.preventDefault();

        const nome = document.getElementById('nome-sala').value;
        const capacidade = document.getElementById('capacidade-sala').value;
        const diasHorarios = document.getElementById('dias-horarios').value;

        fetch('/cadastrar-sala', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nome, capacidade, diasHorarios })
        }).then(response => response.json())
          .then(data => alert(data.message))
          .catch(error => console.error('Erro:', error));
    });
});