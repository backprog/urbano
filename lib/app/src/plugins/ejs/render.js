import ejs from 'ejs'
import path from 'path'
import fs from 'fs'

export function render (tpl, opts) {
  let templatePath = ''

  if (typeof tpl === 'string') {
    templatePath = path.resolve(this.urbano.config.appDir, 'views', tpl)
  } else {
    templatePath = path.resolve(this.urbano.config.appDir, 'views', ...tpl)
  }

  const template = fs.readFileSync(templatePath, 'utf-8')

  this.res.end(ejs.render(template, opts))
}
