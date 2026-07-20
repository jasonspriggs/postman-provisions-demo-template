'use strict';

const { randomUUID } = require('node:crypto');

const SERVICE_NAME = 'adaptavist-access-provisioning-api';
const VERSION = '1.0.0';

const accessPackages = [
  {
    id: 'pkg-jira-software-standard',
    name: 'Jira Software Standard',
    product: 'Jira Software',
    category: 'atlassian',
    ownerTeam: 'platform-operations',
    approvalRequired: true,
    defaultDurationDays: 90,
    estimatedFulfillmentMinutes: 45
  },
  {
    id: 'pkg-confluence-knowledge-base',
    name: 'Confluence Knowledge Base',
    product: 'Confluence',
    category: 'atlassian',
    ownerTeam: 'knowledge-systems',
    approvalRequired: false,
    defaultDurationDays: 180,
    estimatedFulfillmentMinutes: 20
  },
  {
    id: 'pkg-github-engineering',
    name: 'GitHub Engineering Contributor',
    product: 'GitHub Enterprise',
    category: 'engineering',
    ownerTeam: 'developer-experience',
    approvalRequired: true,
    defaultDurationDays: 365,
    estimatedFulfillmentMinutes: 60
  }
];

const requests = new Map([
  [
    'apr-1001',
    {
      id: 'apr-1001',
      packageId: 'pkg-jira-software-standard',
      requester: {
        email: 'maya.chen@example.com',
        displayName: 'Maya Chen',
        department: 'Engineering'
      },
      target: {
        type: 'user',
        email: 'maya.chen@example.com'
      },
      environment: 'prod',
      status: 'approved',
      priority: 'normal',
      businessJustification: 'Needs Jira access for the billing migration project.',
      requestedAt: '2026-07-20T14:10:00.000Z',
      updatedAt: '2026-07-20T15:05:00.000Z',
      approver: {
        email: 'sam.rivera@example.com',
        displayName: 'Sam Rivera'
      },
      fulfillment: {
        status: 'queued',
        ticketUrl: 'https://example.atlassian.net/browse/ACCESS-1842',
        completedAt: null
      }
    }
  ],
  [
    'apr-1002',
    {
      id: 'apr-1002',
      packageId: 'pkg-confluence-knowledge-base',
      requester: {
        email: 'jordan.lee@example.com',
        displayName: 'Jordan Lee',
        department: 'Customer Success'
      },
      target: {
        type: 'user',
        email: 'jordan.lee@example.com'
      },
      environment: 'prod',
      status: 'fulfilled',
      priority: 'low',
      businessJustification: 'Needs access to publish onboarding runbooks.',
      requestedAt: '2026-07-19T11:15:00.000Z',
      updatedAt: '2026-07-19T11:35:00.000Z',
      approver: null,
      fulfillment: {
        status: 'completed',
        ticketUrl: 'https://example.atlassian.net/browse/ACCESS-1831',
        completedAt: '2026-07-19T11:35:00.000Z'
      }
    }
  ]
]);

let nextRequestNumber = 2000;

function createHandler() {
  return async function handler(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = routeRequest(req.method, url.pathname);

      if (!route) {
        return sendJson(res, 404, problem('not_found', `${req.method} ${url.pathname} is not implemented.`));
      }

      if (route.name === 'health') return health(res);
      if (route.name === 'listPackages') return listPackages(res);
      if (route.name === 'listRequests') return listRequests(req, res, url);
      if (route.name === 'createRequest') return createRequest(req, res);
      if (route.name === 'getRequest') return getRequest(res, route.params.requestId);
      if (route.name === 'decideRequest') return decideRequest(req, res, route.params.requestId);

      return sendJson(res, 404, problem('not_found', `${req.method} ${url.pathname} is not implemented.`));
    } catch (error) {
      return sendJson(res, 500, problem('internal_error', error.message || 'Unexpected server error.'));
    }
  };
}

function routeRequest(method, pathname) {
  if (method === 'GET' && pathname === '/v1/health') return { name: 'health', params: {} };
  if (method === 'GET' && pathname === '/v1/access-packages') return { name: 'listPackages', params: {} };
  if (method === 'GET' && pathname === '/v1/access-requests') return { name: 'listRequests', params: {} };
  if (method === 'POST' && pathname === '/v1/access-requests') return { name: 'createRequest', params: {} };

  const requestMatch = pathname.match(/^\/v1\/access-requests\/([^/]+)$/);
  if (requestMatch && method === 'GET') {
    return { name: 'getRequest', params: { requestId: decodeURIComponent(requestMatch[1]) } };
  }

  const decisionMatch = pathname.match(/^\/v1\/access-requests\/([^/]+)\/decision$/);
  if (decisionMatch && method === 'POST') {
    return { name: 'decideRequest', params: { requestId: decodeURIComponent(decisionMatch[1]) } };
  }

  return null;
}

function health(res) {
  return sendJson(res, 200, {
    status: 'ok',
    service: SERVICE_NAME,
    version: VERSION,
    timestamp: new Date().toISOString()
  });
}

function listPackages(res) {
  return sendJson(res, 200, {
    items: accessPackages,
    count: accessPackages.length
  });
}

function listRequests(_req, res, url) {
  const status = url.searchParams.get('status');
  const packageId = url.searchParams.get('packageId');
  const requesterEmail = url.searchParams.get('requesterEmail');
  const limit = Math.min(Number(url.searchParams.get('limit') || '50') || 50, 100);

  let items = [...requests.values()];
  if (status) items = items.filter((item) => item.status === status);
  if (packageId) items = items.filter((item) => item.packageId === packageId);
  if (requesterEmail) items = items.filter((item) => item.requester.email === requesterEmail);

  items = items.slice(0, limit);
  return sendJson(res, 200, {
    items,
    count: items.length,
    links: {
      self: `/v1/access-requests${url.search}`
    }
  });
}

async function createRequest(req, res) {
  const body = await readJsonBody(req);
  const validation = validateCreateRequest(body);
  if (validation) return sendJson(res, 400, validation);

  const selectedPackage = accessPackages.find((item) => item.id === body.packageId);
  if (!selectedPackage) {
    return sendJson(res, 422, problem('unknown_package', `Access package ${body.packageId} does not exist.`));
  }

  const now = new Date().toISOString();
  const request = {
    id: `apr-${nextRequestNumber++}`,
    packageId: body.packageId,
    requester: {
      email: body.requesterEmail,
      displayName: body.requesterName,
      department: body.department
    },
    target: {
      type: body.targetType || 'user',
      email: body.targetEmail
    },
    environment: body.environment,
    status: selectedPackage.approvalRequired ? 'pending_approval' : 'approved',
    priority: body.priority || 'normal',
    businessJustification: body.businessJustification,
    requestedAt: now,
    updatedAt: now,
    approver: null,
    fulfillment: {
      status: 'not_started',
      ticketUrl: null,
      completedAt: null
    }
  };

  requests.set(request.id, request);
  return sendJson(res, 201, request, { Location: `/v1/access-requests/${request.id}` });
}

function getRequest(res, requestId) {
  const request = requests.get(requestId);
  if (!request) return sendJson(res, 404, problem('request_not_found', `Access request ${requestId} was not found.`));
  return sendJson(res, 200, request);
}

async function decideRequest(req, res, requestId) {
  const request = requests.get(requestId);
  if (!request) return sendJson(res, 404, problem('request_not_found', `Access request ${requestId} was not found.`));

  const body = await readJsonBody(req);
  if (!body || !['approved', 'rejected'].includes(body.decision) || !isEmail(body.approverEmail)) {
    return sendJson(res, 400, problem('invalid_decision', 'decision and approverEmail are required.'));
  }

  const now = new Date().toISOString();
  request.status = body.decision;
  request.updatedAt = now;
  request.approver = {
    email: body.approverEmail,
    displayName: body.approverName || body.approverEmail
  };
  request.fulfillment.status = body.decision === 'approved' ? 'queued' : 'not_started';
  if (body.decision === 'approved' && !request.fulfillment.ticketUrl) {
    request.fulfillment.ticketUrl = `https://example.atlassian.net/browse/ACCESS-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  return sendJson(res, 200, request);
}

function validateCreateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return problem('invalid_json', 'Request body must be a JSON object.');
  }

  const required = [
    'packageId',
    'requesterEmail',
    'requesterName',
    'department',
    'targetEmail',
    'environment',
    'businessJustification'
  ];
  for (const field of required) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      return problem('missing_field', `${field} is required.`);
    }
  }
  if (!isEmail(body.requesterEmail) || !isEmail(body.targetEmail)) {
    return problem('invalid_email', 'requesterEmail and targetEmail must be valid email addresses.');
  }
  if (!['prod', 'sandbox'].includes(body.environment)) {
    return problem('invalid_environment', 'environment must be prod or sandbox.');
  }
  if (body.priority && !['low', 'normal', 'urgent'].includes(body.priority)) {
    return problem('invalid_priority', 'priority must be low, normal, or urgent.');
  }
  if (body.targetType && !['user', 'group'].includes(body.targetType)) {
    return problem('invalid_target_type', 'targetType must be user or group.');
  }
  return null;
}

function isEmail(value) {
  return typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function problem(code, message) {
  return {
    code,
    message,
    traceId: `trc-${randomUUID().slice(0, 12)}`
  };
}

function sendJson(res, statusCode, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...headers
  });
  res.end(payload);
}

module.exports = {
  SERVICE_NAME,
  VERSION,
  accessPackages,
  createHandler,
  requests
};
