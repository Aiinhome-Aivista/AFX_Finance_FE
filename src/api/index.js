import http from './client'

const d = (r) => r.data

export const auth = {
  register: (b) => http.post('/auth/register', b).then(d),
  login: (b) => http.post('/auth/login', b).then(d),
  logout: () => http.post('/auth/logout').then(d),
  me: () => http.get('/auth/me').then(d),
}
export const apps = {
  list: () => http.get('/apps').then(d),
  subscribe: (app) => http.post('/apps/subscribe', { app }).then(d),
  unsubscribe: (app) => http.post('/apps/unsubscribe', { app }).then(d),
  select: (app) => http.post('/apps/select', { app }).then(d),
}
export const domains = {
  list: (q) => http.get('/domains', { params: q ? { q } : {} }).then(d),
  workspaceModels: () => http.get('/workspace/models').then(d),
  customModels: () => http.get('/workspace/custom-models').then(d),
  saveCustomModel: (body) => http.post('/workspace/custom-models/save', body).then(d),
  publishCustomModel: (body) => http.post('/workspace/custom-models/publish', body).then(d),
  deleteCustomModel: (name) => http.delete(`/workspace/custom-models/${encodeURIComponent(name)}`).then(d),
  syncCustomModels: (body) => http.post('/workspace/custom-models/sync', body).then(d),
  get: (slug) => http.get(`/domains/${slug}`).then(d),
  graph: (slug, neighbours = true) => http.get(`/domains/${slug}/graph`, { params: { neighbours: neighbours ? 1 : 0 } }).then(d),
  blocks: (slug) => http.get(`/domains/${slug}/blocks`).then(d),
  flows: (slug) => http.get(`/domains/${slug}/flows`).then(d),
  select: (slug) => http.post(`/domains/${slug}/select`).then(d),
  confirmBlocks: (slug, blocks) => http.post(`/domains/${slug}/blocks`, { blocks }).then(d),
  workflow: (slug, wf) => http.get(`/domains/${slug}/workflow`, { params: wf ? { wf } : {} }).then(d),
  reset: (slug) => {
    const clean = (slug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
    return http.post(`/domains/${clean}/reset`).then(d).catch(() => null)
  },
  resetWorkspace: () => http.post('/workspace/reset').then(d).catch(() => null),
}
export const ontology = {
  overviewGraph: () => http.get('/ontology/overview-graph').then(d),
  flow: (key, domain) => http.get(`/flows/${key}`, { params: domain ? { domain } : {} }).then(d),
  node: (key) => http.get(`/nodes/${key}`).then(d),
  search: (q, domain, scope) => http.get('/search', { params: { q, domain, scope } }).then(d),
}
export const chat = {
  get: (slug) => http.get(`/domains/${slug}/conversation`).then(d),
  start: (slug) => http.post(`/domains/${slug}/conversation`).then(d),
  answer: (slug, message) => http.post(`/domains/${slug}/conversation/answer`, { message }).then(d),
  message: (slug, message, node_key) => http.post(`/domains/${slug}/conversation/message`, { message, node_key }).then(d),
  askNode: (slug, node_key, question) => http.post(`/domains/${slug}/conversation/ask-node`, { node_key, question }).then(d),
  focus: (slug, node_key) => http.post(`/domains/${slug}/conversation/focus`, { node_key }).then(d),
  propose: (slug) => http.post(`/domains/${slug}/conversation/propose`).then(d),
  decision: (slug, action) => http.post(`/domains/${slug}/conversation/decision`, { action }).then(d),
}
export const graphs = {
  versions: (slug, wf) => http.get(`/domains/${slug}/versions`, { params: wf ? { wf } : {} }).then(d),
  versionGraph: (slug, n, wf) => http.get(`/domains/${slug}/versions/${n}/graph`, { params: wf ? { wf } : {} }).then(d),
  working: (slug) => http.get(`/domains/${slug}/working-graph`).then(d),
  graphHtml: (slug) => http.get(`/domains/${slug}/graph-html`).then(d),
  generateGraph: (slug, body) => http.post(`/domains/${slug}/generate-graph`, body).then(d),
  compare: (slug, from, to, wf) => http.get(`/domains/${slug}/compare`, { params: { from, to, ...(wf ? { wf } : {}) } }).then(d),
  proposals: (slug) => http.get(`/domains/${slug}/proposals`).then(d),
  decide: (slug, id, body) => http.post(`/domains/${slug}/proposals/${id}/decision`, body).then(d),
  finalization: (slug, wf) => http.get(`/domains/${slug}/finalization`, { params: wf ? { wf } : {} }).then(d),
  finalize: (slug, body) => http.post(`/domains/${slug}/finalize`, body).then(d),
  reopen: (slug) => http.post(`/domains/${slug}/reopen`).then(d),
  experience: (slug) => http.get(`/domains/${slug}/experience`).then(d),
}
export const files = {
  list: (slug) => {
    const clean = (slug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
    return http.get(`/domains/${clean}/files`).then(d)
  },
  get: (id) => http.get(`/files/${id}`).then(d),
  remove: (id) => http.delete(`/files/${id}`).then(d),
  upload: (slug, file, onProgress) => {
    const clean = (slug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
    const fd = new FormData()
    fd.append('file', file)
    return http.post(`/domains/${clean}/files`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 5 * 60 * 1000,
      onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
    }).then(d)
  },
  generate: (slug) => {
    const clean = (slug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
    return http.post(`/domains/${clean}/telemetry/generate`).then(d)
  },
  gapAnalysis: (slug, opts = {}) => {
    const clean = (slug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
    const params = {}
    if (opts.silent) params.silent = 1
    if (opts.wf) params.wf = opts.wf
    return http.get(`/domains/${clean}/telemetry/gap-analysis`, { params }).then(d)
  },
}
export const evaluation = {
  summary: (slug) => {
    const clean = (slug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
    return http.get(`/domains/${clean}/evaluation`).then(d)
  },
  validate: (slug, prompt) => {
    const clean = (slug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
    return http.post(`/domains/${clean}/evaluation/validate`, { prompt }).then(d)
  },
  runBenchmark: (slug) => {
    const clean = (slug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
    return http.post(`/domains/${clean}/evaluation/run-benchmark`).then(d)
  },
}
