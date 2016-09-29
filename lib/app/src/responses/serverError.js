export function serverError () {
  this.res.statusCode = 500
  this.res.end()
}
