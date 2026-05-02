const handler = require('serve-handler');
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: 'dist',
    rewrites: [{ source: '**', destination: '/index.html' }],
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend running on port ${PORT}`);
});
