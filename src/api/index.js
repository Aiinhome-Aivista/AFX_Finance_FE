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
  select: (app) => http.post('/apps/select', { app }).then(d),
}
export const domains = {
  list: (q) => http.get('/domains', { params: q ? { q } : {} }).then(d),
  get: (slug) => http.get(`/domains/${slug}`).then(d),
  graph: (slug, neighbours = true) => http.get(`/domains/${slug}/graph`, { params: { neighbours: neighbours ? 1 : 0 } }).then(d),
  blocks: (slug) => http.get(`/domains/${slug}/blocks`).then(d),
  flows: (slug) => http.get(`/domains/${slug}/flows`).then(d),
  select: (slug) => http.post(`/domains/${slug}/select`).then(d),
  confirmBlocks: (slug, blocks) => http.post(`/domains/${slug}/blocks`, { blocks }).then(d),
  workflow: (slug) => http.get(`/domains/${slug}/workflow`).then(d),
}
export const ontology = {
  flow: (key) => http.get(`/flows/${key}`).then(d),
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
}
export const graphs = {
  versions: (slug) => http.get(`/domains/${slug}/versions`).then(d),
  versionGraph: (slug, n) => http.get(`/domains/${slug}/versions/${n}/graph`).then(d),
  working: (slug) => http.get(`/domains/${slug}/working-graph`).then(d),
  generateGraph: (slug, body) => http.post(`/domains/${slug}/generate-graph`, body).then(d),
  compare: (slug, from, to) => http.get(`/domains/${slug}/compare`, { params: { from, to } }).then(d),
  proposals: (slug) => http.get(`/domains/${slug}/proposals`).then(d),
  decide: (slug, id, body) => http.post(`/domains/${slug}/proposals/${id}/decision`, body).then(d),
  finalization: (slug) => http.get(`/domains/${slug}/finalization`).then(d),
  finalize: (slug, body) => http.post(`/domains/${slug}/finalize`, body).then(d),
  reopen: (slug) => http.post(`/domains/${slug}/reopen`).then(d),
  experience: (slug) => http.get(`/domains/${slug}/experience`).then(d),
}
export const files = {
  list: (slug) => http.get(`/domains/${slug}/files`).then(d),
  get: (id) => http.get(`/files/${id}`).then(d),
  remove: (id) => http.delete(`/files/${id}`).then(d),
  upload: (slug, file, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    return http.post(`/domains/${slug}/files`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 5 * 60 * 1000,
      onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
    }).then(d)
  },
  generate: (slug) => http.post(`/domains/${slug}/telemetry/generate`).then(d),
}
