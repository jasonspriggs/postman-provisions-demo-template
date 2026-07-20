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

describe('Access provisioning API', () => {
  it('reports health', async () => {
    const response = await fetch(`${baseUrl}/v1/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'adaptavist-access-provisioning-api');
  });

  it('lists access packages', async () => {
    const response = await fetch(`${baseUrl}/v1/access-packages`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.count, 3);
    assert.equal(body.items[0].id, 'pkg-jira-software-standard');
  });

  it('filters access requests by status', async () => {
    const response = await fetch(`${baseUrl}/v1/access-requests?status=approved`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.count, 1);
    assert.equal(body.items[0].id, 'apr-1001');
  });

  it('returns a single access request', async () => {
    const response = await fetch(`${baseUrl}/v1/access-requests/apr-1001`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.id, 'apr-1001');
    assert.equal(body.packageId, 'pkg-jira-software-standard');
  });

  it('creates an access request', async () => {
    const response = await fetch(`${baseUrl}/v1/access-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: 'pkg-github-engineering',
        requesterEmail: 'alex.morgan@example.com',
        requesterName: 'Alex Morgan',
        department: 'Engineering',
        targetType: 'user',
        targetEmail: 'alex.morgan@example.com',
        environment: 'prod',
        priority: 'urgent',
        businessJustification: 'Requires repository access for an incident response rotation.'
      })
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.match(response.headers.get('location'), /^\/v1\/access-requests\/apr-/);
    assert.equal(body.status, 'pending_approval');
  });

  it('records an approval decision', async () => {
    const response = await fetch(`${baseUrl}/v1/access-requests/apr-1001/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'approved',
        approverEmail: 'sam.rivera@example.com',
        approverName: 'Sam Rivera',
        note: 'Approved for the current project.'
      })
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'approved');
    assert.equal(body.approver.email, 'sam.rivera@example.com');
  });
});
