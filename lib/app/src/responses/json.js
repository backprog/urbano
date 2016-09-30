export function json (o) {
  this.res.statusCode = 200
  this.res.setHeader('Content-Type', 'application/json')
  this.res.end(JSON.stringify(o))
}
