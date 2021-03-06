export function badRequest (data = null) {
  this.res.statusCode = 400
  let content = ''

  if (data) {
    if (typeof data === 'string') {
      content = data
    } else {
      content = JSON.stringify(data)
    }
  }

  this.res.end(content)
}
