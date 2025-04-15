
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  const file = req.url === '/style.css' ? 'style.css' : 'index.html';
  const contentType = file.endsWith('.css') ? 'text/css' : 'text/html';

  const stream = fs.createReadStream(path.join(__dirname, file));
  res.writeHead(200, { 'Content-Type': contentType });
  stream.pipe(res);
});

const wss = new WebSocket.Server({ server });

const usuarios = new Map();

function atualizarListaUsuarios() {
  const nomes = Array.from(usuarios.values());
  const payload = JSON.stringify({ tipo: 'usuarios', nomes });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);

      if (!usuarios.has(ws)) {
        usuarios.set(ws, data.nome);
        
        atualizarListaUsuarios();

        // Envia mensagem de boas-vindas
        ws.send(JSON.stringify({
            tipo: 'sistema',
            texto: `Bem-vindo(a), ${data.nome}! 🎉`
        }));

        // Notifica os outros que ele entrou
        broadcast(JSON.stringify({
            tipo: 'sistema',
            texto: `${data.nome} entrou no chat`
        }));

        
        return;
      }

      const hora = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit',minute: '2-digit'});
      const textoFinal = `${data.nome}: ${data.mensagem}`;
      const payload = JSON.stringify({ tipo: 'mensagem', texto: hora + ": " +  textoFinal });

      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    } catch (err) {
      console.error("Erro ao processar mensagem:", err);
    }
  });

  ws.on('close', () => {
    usuarios.delete(ws);

    atualizarListaUsuarios();
   
  });

  ws.send(JSON.stringify({ tipo: 'mensagem', texto: 'Bem-vindo ao chat!!' }));
});

server.listen(process.env.PORT || port, () => {
  console.log('chat app listening on port ${port}');
});

