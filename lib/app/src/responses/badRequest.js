export function badRequest () {
  this.res.statusCode = 400
  this.res.end()
}
