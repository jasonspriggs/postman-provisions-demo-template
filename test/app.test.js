'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, describe, it } = require('node:test');
const { createHandler } = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = http.createServer(createHandler());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('Project provisioning API', () => {
  it('reports health', async () => {
    const response = await fetch(`${baseUrl}/v1/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'adaptavist-project-provisioning-api');
  });

  it('lists project templates', async () => {
    const response = await fetch(`${baseUrl}/v1/project-templates`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.count, 3);
    assert.equal(body.items[0].id, 'template-scrum');
  });

  it('returns a provisioned project', async () => {
    const response = await fetch(`${baseUrl}/v1/projects/proj-1001`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.id, 'proj-1001');
    assert.equal(body.key, 'PAYMOD');
    assert.equal(body.status, 'ready');
  });

  it('creates a project provisioning request', async () => {
    const response = await fetch(`${baseUrl}/v1/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Partner Portal',
        key: 'PORTAL',
        templateId: 'template-kanban',
        ownerEmail: 'alex.morgan@example.com'
      })
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.match(response.headers.get('location'), /^\/v1\/projects\/proj-/);
    assert.equal(body.status, 'provisioning');
    assert.equal(body.key, 'PORTAL');
  });

  it('rejects unknown templates', async () => {
    const response = await fetch(`${baseUrl}/v1/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad Project',
        key: 'BAD',
        templateId: 'template-missing',
        ownerEmail: 'alex.morgan@example.com'
      })
    });
    const body = await response.json();

    assert.equal(response.status, 422);
    assert.equal(body.code, 'unknown_template');
  });
});
