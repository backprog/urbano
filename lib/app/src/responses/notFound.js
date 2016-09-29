export function notFound () {
  this.res.statusCode = 404
  this.res.end()
}
