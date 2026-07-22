const request = require('supertest');

function postJson(app, path, body) {
  return request(app)
    .post(path)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(body));
}

function patchJson(app, path, body) {
  return request(app)
    .patch(path)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(body));
}

module.exports = {
  postJson,
  patchJson,
};
