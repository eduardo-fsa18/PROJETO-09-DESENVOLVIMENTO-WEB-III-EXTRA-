# Sistema de Reserva de Salas e Laboratórios

## 1. Descrição do Projeto

Aplicação web desenvolvida para o gerenciamento e reserva de salas de estudo e laboratórios em uma instituição de ensino. O sistema permite consultar ambientes disponíveis, gerenciar salas e efetuar reservas para atividades acadêmicas, garantindo regras de negócio rígidas como controle de capacidade, bloqueio de sobreposição de horários e integração com serviços externos.

O projeto foi construído utilizando **Node.js nativo (sem frameworks como Express)**, consumindo dados persistidos em arquivos JSON locais e comunicando o front-end via API REST nativa com a função `fetch()`. Além disso, consulta a **BrasilAPI** para emitir avisos informativos sobre feriados nacionais nas datas selecionadas.

---

## 2. Tecnologias Utilizadas

- **Back-end:** Node.js (Módulos nativos `http`, `fs`, `path`)
- **Front-end:** HTML5, CSS3 e JavaScript (Vanilla JS / ES6+)
- **Comunicação:** API REST (`JSON`) via `fetch()`
- **Persistência de Dados:** Arquivos JSON locais (`rooms.json` e `reservations.json`)
- **API Externa:** [BrasilAPI](https://brasilapi.com.br/) (Consulta de Feriados Nacionais)

---

## 3. Pré-requisitos

Para rodar a aplicação localmente, certifique-se de ter instalado em sua máquina:

- [Node.js](https://nodejs.org/) (Versão 18.x ou superior)
- [NPM](https://www.npmjs.com/) (Gerenciador de pacotes do Node.js)

---

## 4. Estrutura do Projeto

```text
sistema-reserva-salas/
├── data/
│   ├── reservations.json     # Persistência de dados das reservas
│   └── rooms.json            # Persistência de dados das salas
├── public/
│   ├── css/
│   │   └── style.css         # Estilização visual da aplicação
│   ├── js/
│   │   └── main.js           # Lógica do front-end e consumo da API
│   └── index.html            # Interface web da aplicação
├── package.json              # Configurações do projeto e scripts
├── README.md                 # Documentação técnica do repositório
└── server.js                 # Servidor HTTP nativo e API REST
```

---

## 5. Instruções de Instalação e Execução

### 1. Clonar o Repositório
```bash
git clone https://github.com/SeuUsuario/sistema-reserva-salas.git
cd sistema-reserva-salas
```

### 2. Instalar Dependências (se aplicável)
```bash
npm install
```

### 3. Iniciar o Servidor
```bash
npm start
```
*Comando alternativo:*
```bash
node server.js
```

### 4. Acessar a Aplicação
Abra o seu navegador web de preferência e acesse o endereço:
```text
http://localhost:3000
```

---

## 6. Regras de Negócio Implementadas

1. **Conflito de Horários:** O sistema bloqueia automaticamente novas reservas ativas que apresentem sobreposição de horário para a mesma sala e data.
2. **Validação de Horários:** O horário final da reserva deve obrigatoriamente ser posterior ao horário inicial.
3. **Capacidade Máxima:** A quantidade de participantes informada na reserva não pode exceder a capacidade limite da sala selecionada.
4. **Disponibilidade da Sala:** Salas marcadas com a situação **Inativa** não podem receber novas reservas.
5. **Integridade Referencial na Exclusão:** O sistema impede a exclusão de salas que possuam reservas (ativas ou canceladas) vinculadas ao seu ID.
6. **Integração com API Externa:** Ao selecionar a data no formulário de reserva, o sistema consulta dinamicamente a **BrasilAPI** (`https://brasilapi.com.br/api/feriados/v1/{ano}`). Caso haja um feriado nacional na data, um aviso informativo é exibido na tela sem interromper o fluxo da reserva.

---

## 7. Documentação das Rotas da API REST

### Endpoints de Salas (`/api/salas`)

| Método | Endpoint | Descrição | Status HTTP |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/salas` | Retorna a lista de todas as salas | `200 OK` |
| `GET` | `/api/salas/:id` | Retorna os detalhes de uma sala específica por ID | `200 OK` / `404 Not Found` |
| `POST` | `/api/salas` | Cadastra uma nova sala | `201 Created` / `400 Bad Request` |
| `PUT` | `/api/salas/:id` | Atualiza os dados de uma sala existente | `200 OK` / `400 Bad Request` / `404 Not Found` |
| `DELETE` | `/api/salas/:id` | Remove uma sala pelo ID | `200 OK` / `400 Bad Request` / `404 Not Found` |

#### Exemplo de Corpo da Requisição — `POST /api/salas`
```json
{
  "nome": "Laboratório de Informática 1",
  "localizacao": "Bloco A - Sala 102",
  "capacidade": 30,
  "recursos": "Computadores, Projetor, Ar-condicionado",
  "situacao": "Disponivel"
}
```

---

### Endpoints de Reservas (`/api/reservas`)

| Método | Endpoint | Descrição | Status HTTP |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reservas` | Retorna a lista de todas as reservas | `200 OK` |
| `GET` | `/api/reservas/:id` | Retorna os detalhes de uma reserva específica por ID | `200 OK` / `404 Not Found` |
| `POST` | `/api/reservas` | Cadastra uma nova reserva validando todas as regras | `201 Created` / `400 Bad Request` |
| `PUT` | `/api/reservas/:id` | Atualiza uma reserva existente | `200 OK` / `400 Bad Request` / `404 Not Found` |
| `DELETE` | `/api/reservas/:id` | Exclui uma reserva pelo ID | `200 OK` / `404 Not Found` |

#### Exemplo de Corpo da Requisição — `POST /api/reservas`
```json
{
  "aluno": "Helder Virissio",
  "email": "helder@exemplo.com",
  "salaId": 1,
  "data": "2026-11-10",
  "horarioInicio": "14:00",
  "horarioFim": "16:00",
  "participantes": 5,
  "finalidade": "Reuniao",
  "status": "Ativa"
}
```

---

## 8. Tratamento de Erros e Mensagens

A aplicação trata e exibe feedbacks visuais adequados no front-end para as seguintes situações:
- Campos obrigatórios não preenchidos nos formulários.
- Incompatibilidade de horários (horário final anterior ou igual ao inicial).
- Tentativas de cadastro com capacidade de participantes excedida.
- Conflitos de agenda entre duas reservas ativas.
- Tentativa de inclusão de reserva em salas inativas ou inexistentes.
- Bloqueio de exclusão de salas vinculadas a reservas.
- Indisponibilidade da API externa de feriados.
- Acesso a rotas ou recursos não encontrados (`404 Not Found`).
