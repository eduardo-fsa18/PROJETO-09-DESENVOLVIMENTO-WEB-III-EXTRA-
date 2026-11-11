/**
 * @file main.js
 * @description Lógica do cliente web (Front-end), responsável por interações de UI,
 * chamadas assíncronas à API REST nativa via fetch() e consumo da BrasilAPI.
 */

// Armazenamento em memória local da interface
let salas = [];
let reservas = [];

// Inicialização dos eventos quando a página é totalmente carregada
document.addEventListener('DOMContentLoaded', () => {
  carregarSalas();
  carregarReservas();

  // Escutadores de eventos para formulários e botões
  document.getElementById('form-sala').addEventListener('submit', salvarSala);
  document.getElementById('form-reserva').addEventListener('submit', salvarReserva);
  document.getElementById('btn-cancelar-sala').addEventListener('click', limparFormSala);
  document.getElementById('btn-cancelar-reserva').addEventListener('click', limparFormReserva);
  document.getElementById('btn-filtrar').addEventListener('click', renderizarReservas);

  // Monitora alteração no campo de data para consultar feriados via BrasilAPI
  document.getElementById('reserva-data').addEventListener('change', checarFeriadoBrasilAPI);
});

/**
 * Exibe caixa de mensagem/alerta dinâmica na parte superior da página.
 * @param {string} message - Texto da mensagem.
 * @param {string} type - Tipo de alerta ('error', 'info', 'success').
 */
function showAlert(message, type = 'error') {
  const alertBox = document.getElementById('alert-box');
  alertBox.className = `alert alert-${type}`;
  alertBox.innerText = message;
  alertBox.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Oculta a caixa de mensagem. */
function hideAlert() {
  document.getElementById('alert-box').classList.add('hidden');
}

/**
 * Consulta a BrasilAPI para verificar se a data selecionada corresponde a um feriado nacional.
 */
async function checarFeriadoBrasilAPI() {
  hideAlert();
  const dataInput = document.getElementById('reserva-data').value;
  if (!dataInput) return;

  const ano = dataInput.split('-')[0];
  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
    if (!response.ok) throw new Error('Falha ao consultar BrasilAPI');
    const feriados = await response.json();

    const feriadoEncontrado = feriados.find(f => f.date === dataInput);
    if (feriadoEncontrado) {
      showAlert(`Aviso: A data selecionada é um feriado nacional (${feriadoEncontrado.name}).`, 'info');
    }
  } catch (error) {
    // Apresenta aviso amigável sem bloquear o uso da aplicação
    showAlert('Não foi possível verificar os feriados na BrasilAPI. Você pode prosseguir normalmente.', 'info');
  }
}

// -------------------------------------------------------------
// OPERAÇÕES DE SALAS
// -------------------------------------------------------------

/** Busca a lista de salas da API REST e atualiza a UI. */
async function carregarSalas() {
  try {
    const res = await fetch('/api/salas');
    salas = await res.json();
    renderizarSalas();
    atualizarSelectSalas();
  } catch (err) {
    showAlert('Erro ao carregar lista de salas.');
  }
}

/** Renderiza a tabela de salas cadastradas no HTML. */
function renderizarSalas() {
  const tbody = document.getElementById('lista-salas');
  tbody.innerHTML = '';
  salas.forEach(sala => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${sala.id}</td>
      <td>${sala.nome}</td>
      <td>${sala.localizacao}</td>
      <td>${sala.capacidade}</td>
      <td>${sala.recursos || '-'}</td>
      <td><span class="badge badge-${sala.situacao.toLowerCase()}">${sala.situacao}</span></td>
      <td>
        <button class="btn btn-warning" onclick="editarSala(${sala.id})">Editar</button>
        <button class="btn btn-danger" onclick="excluirSala(${sala.id})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/** Atualiza as opções do elemento <select> de salas no formulário de reserva e nos filtros. */
function atualizarSelectSalas() {
  const selectRes = document.getElementById('reserva-sala');
  const selectFiltro = document.getElementById('filtro-sala');

  selectRes.innerHTML = '<option value="">Selecione uma sala...</option>';
  selectFiltro.innerHTML = '<option value="">Todas as Salas</option>';

  salas.forEach(sala => {
    const option = `<option value="${sala.id}">${sala.nome} (${sala.situacao})</option>`;
    selectRes.innerHTML += option;
    selectFiltro.innerHTML += `<option value="${sala.id}">${sala.nome}</option>`;
  });
}

/** Salva (Cadastra ou Atualiza) uma sala enviando os dados via POST/PUT. */
async function salvarSala(e) {
  e.preventDefault();
  hideAlert();

  const id = document.getElementById('sala-id').value;
  const payload = {
    nome: document.getElementById('sala-nome').value,
    localizacao: document.getElementById('sala-localizacao').value,
    capacidade: document.getElementById('sala-capacidade').value,
    recursos: document.getElementById('sala-recursos').value,
    situacao: document.getElementById('sala-situacao').value
  };

  const url = id ? `/api/salas/${id}` : '/api/salas';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (res.ok) {
    showAlert(`Sala ${id ? 'atualizada' : 'cadastrada'} com sucesso!`, 'success');
    limparFormSala();
    carregarSalas();
  } else {
    showAlert(data.error);
  }
}

/** Preenche o formulário com os dados da sala selecionada para edição. */
function editarSala(id) {
  const sala = salas.find(s => s.id === id);
  if (!sala) return;

  document.getElementById('sala-id').value = sala.id;
  document.getElementById('sala-nome').value = sala.nome;
  document.getElementById('sala-localizacao').value = sala.localizacao;
  document.getElementById('sala-capacidade').value = sala.capacidade;
  document.getElementById('sala-recursos').value = sala.recursos;
  document.getElementById('sala-situacao').value = sala.situacao;

  document.getElementById('btn-cancelar-sala').classList.remove('hidden');
}

/** Exclui uma sala enviando uma requisição DELETE. */
async function excluirSala(id) {
  if (!confirm('Deseja excluir esta sala?')) return;
  hideAlert();

  const res = await fetch(`/api/salas/${id}`, { method: 'DELETE' });
  const data = await res.json();

  if (res.ok) {
    showAlert(data.message, 'success');
    carregarSalas();
  } else {
    showAlert(data.error);
  }
}

/** Reseta o formulário de salas. */
function limparFormSala() {
  document.getElementById('form-sala').reset();
  document.getElementById('sala-id').value = '';
  document.getElementById('btn-cancelar-sala').classList.add('hidden');
}

// -------------------------------------------------------------
// OPERAÇÕES DE RESERVAS
// -------------------------------------------------------------

/** Busca a lista de reservas da API REST e renderiza na tabela. */
async function carregarReservas() {
  try {
    const res = await fetch('/api/reservas');
    reservas = await res.json();
    renderizarReservas();
  } catch (err) {
    showAlert('Erro ao carregar reservas.');
  }
}

/** Renderiza a tabela de reservas com filtros ativos de data, sala e status. */
function renderizarReservas() {
  const tbody = document.getElementById('lista-reservas');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  const fData = document.getElementById('filtro-data').value;
  const fSala = document.getElementById('filtro-sala').value;
  const fStatus = document.getElementById('filtro-status').value;

  const filtradas = reservas.filter(r => {
    if (fData && r.data !== fData) return false;
    if (fSala && parseInt(r.salaId) !== parseInt(fSala)) return false;
    if (fStatus && r.status !== fStatus) return false;
    return true;
  });

  if (filtradas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Nenhuma reserva cadastrada ou encontrada para os filtros atuais.</td></tr>';
    return;
  }

  filtradas.forEach(resv => {
    // Comparação garantindo tipo numérico
    const sala = salas.find(s => parseInt(s.id) === parseInt(resv.salaId));
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${resv.id}</td>
      <td>${resv.aluno}<br><small>${resv.email}</small></td>
      <td>${sala ? sala.nome : 'Sala ID ' + resv.salaId}</td>
      <td>${resv.data}</td>
      <td>${resv.horarioInicio} - ${resv.horarioFim}</td>
      <td>${resv.participantes}</td>
      <td>${resv.finalidade}</td>
      <td><span class="badge badge-${resv.status.toLowerCase()}">${resv.status}</span></td>
      <td>
        <button class="btn btn-warning" onclick="editarReserva(${resv.id})">Editar</button>
        <button class="btn btn-danger" onclick="excluirReserva(${resv.id})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Salvar Reserva com recarregamento de salas antes de renderizar
async function salvarReserva(e) {
  e.preventDefault();
  hideAlert();

  const id = document.getElementById('reserva-id').value;
  const payload = {
    aluno: document.getElementById('reserva-aluno').value,
    email: document.getElementById('reserva-email').value,
    salaId: document.getElementById('reserva-sala').value,
    data: document.getElementById('reserva-data').value,
    horarioInicio: document.getElementById('reserva-inicio').value,
    horarioFim: document.getElementById('reserva-fim').value,
    participantes: document.getElementById('reserva-participantes').value,
    finalidade: document.getElementById('reserva-finalidade').value,
    status: document.getElementById('reserva-status').value
  };

  const url = id ? `/api/reservas/${id}` : '/api/reservas';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      showAlert(`Reserva ${id ? 'atualizada' : 'cadastrada'} com sucesso!`, 'success');
      limparFormReserva();
      // Garante que salas e reservas sejam recarregadas da API
      await carregarSalas();
      await carregarReservas();
    } else {
      showAlert(data.error || 'Erro ao salvar reserva.');
    }
  } catch (err) {
    showAlert('Falha na comunicação com o servidor.');
  }
}

/** Preenche o formulário com os dados da reserva selecionada para edição. */
function editarReserva(id) {
  const resv = reservas.find(r => r.id === id);
  if (!resv) return;

  document.getElementById('reserva-id').value = resv.id;
  document.getElementById('reserva-aluno').value = resv.aluno;
  document.getElementById('reserva-email').value = resv.email;
  document.getElementById('reserva-sala').value = resv.salaId;
  document.getElementById('reserva-data').value = resv.data;
  document.getElementById('reserva-inicio').value = resv.horarioInicio;
  document.getElementById('reserva-fim').value = resv.horarioFim;
  document.getElementById('reserva-participantes').value = resv.participantes;
  document.getElementById('reserva-finalidade').value = resv.finalidade;
  document.getElementById('reserva-status').value = resv.status;

  document.getElementById('btn-cancelar-reserva').classList.remove('hidden');
}

/** Exclui uma reserva enviando uma requisição DELETE. */
async function excluirReserva(id) {
  if (!confirm('Deseja excluir esta reserva?')) return;
  hideAlert();

  const res = await fetch(`/api/reservas/${id}`, { method: 'DELETE' });
  const data = await res.json();

  if (res.ok) {
    showAlert(data.message, 'success');
    carregarReservas();
  } else {
    showAlert(data.error);
  }
}

/** Reseta o formulário de reservas. */
function limparFormReserva() {
  document.getElementById('form-reserva').reset();
  document.getElementById('reserva-id').value = '';
  document.getElementById('btn-cancelar-reserva').classList.add('hidden');
}