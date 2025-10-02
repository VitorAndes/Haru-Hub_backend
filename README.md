# Haru Hub - Backend  

Backend do projeto **Haru Hub**, responsável por consumir a **Steam API**, tratar e expor dados da conta Steam através de endpoints otimizados.  
O servidor é feito em **Node.js** com **Fastify**, inclui **cache local** para reduzir chamadas à Steam Store API e conta com tratamento de erros e monitoramento.  

## ✨ Funcionalidades  

- Exposição de dados da conta Steam (status, jogos, recentes).  
- Integração com **Steam API** e **Steam Store API**.  
- **Cache local** para otimizar requisições e reduzir limite de chamadas.  
- Rotas com tratamento de **loading, erros e dados ausentes**.  
- Rotas de **health check** e **controle do cache**.  

## 📌 Endpoints  

### Usuário  
- `GET /user` → Dados do usuário (online/offline, perfil, etc.).  

### Jogos  
- `GET /games` → Todos os jogos da conta com detalhes.  
- `GET /recentlyPlayedGames` → Jogos jogados recentemente.  

### Cache  
- `DELETE /cache` → Limpa o cache local.  
- `GET /cache/stats` → Estatísticas do cache (quantidade de jogos, duração, etc.).  

### Saúde  
- `GET /health` → Status do servidor, uptime e cache atual.  

## 🛠 Tecnologias  

- [Node.js](https://nodejs.org/)  
- [Fastify](https://fastify.dev/)  
- [CORS](https://www.npmjs.com/package/@fastify/cors)  
- [dotenv](https://www.npmjs.com/package/dotenv)  

## 🚀 Como rodar o projeto  

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/haru-hub-backend.git

# Acessar a pasta
cd haru-hub-backend

# Instalar as dependências
pnpm install

# Criar arquivo .env com suas credenciais Steam
STEAM_API_KEY=your_api_key
STEAM_API_ID=your_steam_id
PORT=3333

# Rodar o servidor
npm run dev
