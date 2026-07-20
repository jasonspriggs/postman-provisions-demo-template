'use strict';

const { randomUUID } = require('node:crypto');

const SERVICE_NAME = 'adaptavist-project-provisioning-api';
const VERSION = '1.0.0';

const projectTemplates = [
  {
    id: 'template-scrum',
    name: 'Scrum Software Project',
    description: 'Backlog, sprints, boards, and release tracking.',
    defaultIssueType: 'Story'
  },
  {
    id: 'template-kanban',
    name: 'Kanban Software Project',
    description: 'Continuous-flow board for operational and platform work.',
    defaultIssueType: 'Task'
  },
  {
    id: 'template-service-desk',
    name: 'Service Desk Project',
    description: 'Request intake, queues, and service-level tracking.',
    defaultIssueType: 'Request'
  }
];

const projects = new Map([
  [
    'proj-1001',
    {
      id: 'proj-1001',
      key: 'PAYMOD',
      name: 'Payments Modernization',
      templateId: 'template-scrum',
      ownerEmail: 'maya.chen@example.com',
      status: 'ready',
      createdAt: '2026-07-20T14:20:00.000Z',
      projectUrl: 'https://example.atlassian.net/jira/software/projects/PAYMOD'
    }
  ]
]);

let nextProjectNumber = 2000;

function createHandler() {
  return async function handler(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = routeRequest(req.method, url.pathname);

      if (!route) {
        return sendJson(res, 404, problem('not_found', `${req.method} ${url.pathname} is not implemented.`));
      }

      if (route.name === 'health') return health(res);
      if (route.name === 'listTemplates') return listTemplates(res);
      if (route.name === 'createProject') return createProject(req, res);
      if (route.name === 'getProject') return getProject(res, route.params.projectId);

      return sendJson(res, 404, problem('not_found', `${req.method} ${url.pathname} is not implemented.`));
    } catch (error) {
      return sendJson(res, 500, problem('internal_error', error.message || 'Unexpected server error.'));
    }
  };
}

function routeRequest(method, pathname) {
  if (method === 'GET' && pathname === '/v1/health') return { name: 'health', params: {} };
  if (method === 'GET' && pathname === '/v1/project-templates') return { name: 'listTemplates', params: {} };
  if (method === 'POST' && pathname === '/v1/projects') return { name: 'createProject', params: {} };

  const projectMatch = pathname.match(/^\/v1\/projects\/([^/]+)$/);
  if (projectMatch && method === 'GET') {
    return { name: 'getProject', params: { projectId: decodeURIComponent(projectMatch[1]) } };
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

function listTemplates(res) {
  return sendJson(res, 200, {
    items: projectTemplates,
    count: projectTemplates.length
  });
}

async function createProject(req, res) {
  const body = await readJsonBody(req);
  const validation = validateCreateProject(body);
  if (validation) return sendJson(res, 400, validation);

  const template = projectTemplates.find((item) => item.id === body.templateId);
  if (!template) {
    return sendJson(res, 422, problem('unknown_template', `Project template ${body.templateId} does not exist.`));
  }

  const id = `proj-${nextProjectNumber++}`;
  const project = {
    id,
    key: body.key,
    name: body.name,
    templateId: body.templateId,
    ownerEmail: body.ownerEmail,
    status: 'provisioning',
    createdAt: new Date().toISOString(),
    projectUrl: `https://example.atlassian.net/jira/software/projects/${body.key}`
  };

  projects.set(id, project);
  return sendJson(res, 201, project, { Location: `/v1/projects/${id}` });
}

function getProject(res, projectId) {
  const project = projects.get(projectId);
  if (!project) return sendJson(res, 404, problem('project_not_found', `Project ${projectId} was not found.`));
  return sendJson(res, 200, project);
}

function validateCreateProject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return problem('invalid_json', 'Request body must be a JSON object.');
  }

  const required = ['name', 'key', 'templateId', 'ownerEmail'];
  for (const field of required) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      return problem('missing_field', `${field} is required.`);
    }
  }

  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(body.key)) {
    return problem('invalid_project_key', 'key must be 2 to 10 uppercase letters or numbers.');
  }

  if (body.name.trim().length < 3) {
    return problem('invalid_project_name', 'name must be at least 3 characters.');
  }

  if (!isEmail(body.ownerEmail)) {
    return problem('invalid_owner_email', 'ownerEmail must be a valid email address.');
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
  createHandler,
  projectTemplates,
  projects
};
