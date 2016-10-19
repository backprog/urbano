export function conflict (data = null) {
  this.res.statusCode = 409
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
