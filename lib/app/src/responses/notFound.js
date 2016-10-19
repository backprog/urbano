export function notFound (data = null) {
  this.res.statusCode = 404
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
