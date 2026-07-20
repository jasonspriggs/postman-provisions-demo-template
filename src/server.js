'use strict';

const http = require('node:http');
const { createHandler } = require('./app');

const port = Number(process.env.PORT || 4010);
const host = process.env.HOST || '127.0.0.1';

const server = http.createServer(createHandler());

server.listen(port, host, () => {
  console.log(`Project provisioning demo API listening on http://${host}:${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
