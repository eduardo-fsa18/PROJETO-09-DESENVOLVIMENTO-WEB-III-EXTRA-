/**
 * @file server.js
 * @description Servidor HTTP nativo Node.js responsável por rotas REST API,
 * persistência em JSON e navegação de arquivos estáticos.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuração da porta do servidor e caminhos dos bancos JSON
const PORT = 3000;
const ROOMS_FILE = path.join(__dirname, 'data', 'rooms.json');
const RESERVATIONS_FILE = path.join(__dirname, 'data', 'reservations.json');

/**
 * Lê e converte os dados do arquivo JSON local para um array JavaScript.
 * @param {string} filePath - Caminho do arquivo JSON.
 * @returns {Array} Coleção de dados lida.
 */
function readData(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
  }
}

/**
 * Persiste os dados formatados de volta no arquivo JSON local.
 * @param {string} filePath - Caminho do arquivo JSON.
 * @param {Array} data - Dados a serem gravados.
 */
function writeData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Processa e extrai o corpo da requisição HTTP (body) recebido via streams.
 * @param {http.IncomingMessage} req - Objeto de requisição HTTP.
 * @returns {Promise<Object>} Dados parseados do corpo em formato JSON.
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Criação do Servidor HTTP Nativo
const server = http.createServer(async (req, res) => {
  const urlParts = req.url.split('/').filter(Boolean);
  const method = req.method;

  /**
   * Helper para envio padronizado de respostas em JSON com status HTTP.
   * @param {number} statusCode - Código de Status HTTP.
   * @param {Object} payload - Objeto com os dados de resposta.
   */
  const sendJSON = (statusCode, payload) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  };

  // -------------------------------------------------------------
  // 1. GERENCIADOR DE ARQUIVOS ESTÁTICOS (HTML, CSS, JS)
  // -------------------------------------------------------------
  if (!req.url.startsWith('/api')) {
    let reqUrl = req.url === '/' ? '/index.html' : req.url;
    let filePath = path.join(__dirname, 'public', reqUrl);
    const extname = path.extname(filePath);
    let contentType = 'text/html; charset=utf-8';

    if (extname === '.css') contentType = 'text/css; charset=utf-8';
    if (extname === '.js') contentType = 'text/javascript; charset=utf-8';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Página não encontrada');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
    return;
  }

  // -------------------------------------------------------------
  // 2. ROTAS DE API DA SALA (/api/salas)
  // -------------------------------------------------------------
  if (req.url.startsWith('/api/salas')) {
    let rooms = readData(ROOMS_FILE);
    const id = urlParts[2] ? parseInt(urlParts[2]) : null;

    // GET /api/salas - Listar todas as salas
    if (method === 'GET' && !id) return sendJSON(200, rooms);

    // GET /api/salas/:id - Consultar sala por ID
    if (method === 'GET' && id) {
      const room = rooms.find(r => r.id === id);
      return room ? sendJSON(200, room) : sendJSON(404, { error: 'Sala não encontrada.' });
    }

    // POST /api/salas - Cadastrar nova sala
    if (method === 'POST') {
      try {
        const data = await parseBody(req);
        if (!data.nome || !data.localizacao || !data.capacidade || !data.situacao) {
          return sendJSON(400, { error: 'Preencha todos os campos obrigatórios da sala.' });
        }

        const newRoom = {
          id: rooms.length ? Math.max(...rooms.map(r => r.id)) + 1 : 1,
          nome: data.nome,
          localizacao: data.localizacao,
          capacidade: parseInt(data.capacidade),
          recursos: data.recursos || '',
          situacao: data.situacao
        };

        rooms.push(newRoom);
        writeData(ROOMS_FILE, rooms);
        return sendJSON(201, newRoom);
      } catch (err) {
        return sendJSON(400, { error: 'Dados inválidos fornecidos.' });
      }
    }

    // PUT /api/salas/:id - Atualizar sala
    if (method === 'PUT' && id) {
      try {
        const data = await parseBody(req);
        const index = rooms.findIndex(r => r.id === id);
        if (index === -1) return sendJSON(404, { error: 'Sala não encontrada.' });

        rooms[index] = {
          ...rooms[index],
          nome: data.nome || rooms[index].nome,
          localizacao: data.localizacao || rooms[index].localizacao,
          capacidade: data.capacidade ? parseInt(data.capacidade) : rooms[index].capacidade,
          recursos: data.recursos !== undefined ? data.recursos : rooms[index].recursos,
          situacao: data.situacao || rooms[index].situacao
        };

        writeData(ROOMS_FILE, rooms);
        return sendJSON(200, rooms[index]);
      } catch (err) {
        return sendJSON(400, { error: 'Falha ao atualizar a sala.' });
      }
    }

    // DELETE /api/salas/:id - Excluir sala (Regra: Bloqueia se possuir reserva vinculada)
    if (method === 'DELETE' && id) {
      const reservations = readData(RESERVATIONS_FILE);
      const hasReservation = reservations.some(r => r.salaId === id);
      if (hasReservation) {
        return sendJSON(400, { error: 'Não é permitida a exclusão de salas que possuem reservas vinculadas.' });
      }

      const filteredRooms = rooms.filter(r => r.id !== id);
      if (filteredRooms.length === rooms.length) return sendJSON(404, { error: 'Sala não encontrada.' });

      writeData(ROOMS_FILE, filteredRooms);
      return sendJSON(200, { message: 'Sala excluída com sucesso.' });
    }
  }

  // -------------------------------------------------------------
  // 3. ROTAS DE API DE RESERVAS (/api/reservas)
  // -------------------------------------------------------------
  if (req.url.startsWith('/api/reservas')) {
    let reservations = readData(RESERVATIONS_FILE);
    let rooms = readData(ROOMS_FILE);
    const id = urlParts[2] ? parseInt(urlParts[2]) : null;

    // GET /api/reservas - Listar todas as reservas
    if (method === 'GET' && !id) return sendJSON(200, reservations);

    // GET /api/reservas/:id - Consultar reserva por ID
    if (method === 'GET' && id) {
      const resv = reservations.find(r => r.id === id);
      return resv ? sendJSON(200, resv) : sendJSON(404, { error: 'Reserva não encontrada.' });
    }

    // POST /api/reservas - Cadastrar nova reserva
    if (method === 'POST') {
      try {
        const data = await parseBody(req);
        const { aluno, email, salaId, data: resData, horarioInicio, horarioFim, participantes, finalidade, status } = data;

        // Validação de campos obrigatórios
        if (!aluno || !email || !salaId || !resData || !horarioInicio || !horarioFim || !participantes || !finalidade || !status) {
          return sendJSON(400, { error: 'Todos os campos são de preenchimento obrigatório.' });
        }

        const numericSalaId = parseInt(salaId);
        const selectedRoom = rooms.find(r => r.id === numericSalaId);
        
        if (!selectedRoom) return sendJSON(404, { error: 'A sala selecionada não existe.' });

        if (selectedRoom.situacao === 'Inativa') {
          return sendJSON(400, { error: 'Salas inativas não podem receber novas reservas.' });
        }

        if (horarioFim <= horarioInicio) {
          return sendJSON(400, { error: 'O horário final deve ser posterior ao horário inicial.' });
        }

        if (parseInt(participantes) > selectedRoom.capacidade) {
          return sendJSON(400, { error: `A quantidade de participantes não pode ultrapassar a capacidade da sala (${selectedRoom.capacidade} pessoas).` });
        }

        // Checagem de conflitos
        if (status === 'Ativa') {
          const conflict = reservations.some(r => {
            if (r.salaId === numericSalaId && r.data === resData && r.status === 'Ativa') {
              return (horarioInicio < r.horarioFim && horarioFim > r.horarioInicio);
            }
            return false;
          });

          if (conflict) {
            return sendJSON(400, { error: 'Conflito de horário: A sala já possui uma reserva ativa neste horário.' });
          }
        }

        const newReservation = {
          id: reservations.length ? Math.max(...reservations.map(r => r.id)) + 1 : 1,
          aluno,
          email,
          salaId: numericSalaId,
          data: resData,
          horarioInicio,
          horarioFim,
          participantes: parseInt(participantes),
          finalidade,
          status
        };

        reservations.push(newReservation);
        writeData(RESERVATIONS_FILE, reservations);
        return sendJSON(201, newReservation);
      } catch (err) {
        return sendJSON(400, { error: 'Erro ao processar dados da reserva.' });
      }
    }
    
    // PUT /api/reservas/:id - Atualizar reserva
    if (method === 'PUT' && id) {
      try {
        const data = await parseBody(req);
        const index = reservations.findIndex(r => r.id === id);
        if (index === -1) return sendJSON(404, { error: 'Reserva não encontrada.' });

        const updatedRoomId = data.salaId ? parseInt(data.salaId) : reservations[index].salaId;
        const selectedRoom = rooms.find(r => r.id === updatedRoomId);
        
        const newStart = data.horarioInicio || reservations[index].horarioInicio;
        const newEnd = data.horarioFim || reservations[index].horarioFim;
        const newDate = data.data || reservations[index].data;
        const newStatus = data.status || reservations[index].status;
        const newPart = data.participantes ? parseInt(data.participantes) : reservations[index].participantes;

        if (newEnd <= newStart) {
          return sendJSON(400, { error: 'O horário final deve ser posterior ao horário inicial.' });
        }

        if (selectedRoom && newPart > selectedRoom.capacidade) {
          return sendJSON(400, { error: `Capacidade máxima excedida (${selectedRoom.capacidade}).` });
        }

        if (newStatus === 'Ativa') {
          const conflict = reservations.some(r => {
            if (r.id !== id && r.salaId === updatedRoomId && r.data === newDate && r.status === 'Ativa') {
              return (newStart < r.horarioFim && newEnd > r.horarioInicio);
            }
            return false;
          });

          if (conflict) {
            return sendJSON(400, { error: 'Conflito de horário detectado com outra reserva ativa.' });
          }
        }

        reservations[index] = {
          ...reservations[index],
          ...data,
          id,
          salaId: updatedRoomId,
          participantes: newPart
        };

        writeData(RESERVATIONS_FILE, reservations);
        return sendJSON(200, reservations[index]);
      } catch (err) {
        return sendJSON(400, { error: 'Falha ao atualizar a reserva.' });
      }
    }

    // DELETE /api/reservas/:id - Excluir reserva
    if (method === 'DELETE' && id) {
      const filtered = reservations.filter(r => r.id !== id);
      if (filtered.length === reservations.length) return sendJSON(404, { error: 'Reserva não encontrada.' });

      writeData(RESERVATIONS_FILE, filtered);
      return sendJSON(200, { message: 'Reserva excluída com sucesso.' });
    }
  }

  // Tratamento de rota não existente
  return sendJSON(404, { error: 'Rota não encontrada.' });
});

// Inicialização do Servidor na Porta 3000
server.listen(PORT, () => {
  console.log(`Servidor rodando com sucesso em http://localhost:${PORT}`);
});