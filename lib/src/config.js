import yaml from 'js-yaml'
import async from 'async'
import path from 'path'
import fs from 'fs'
import _ from 'lodash'

'use strict'

class Config {
  constructor (appDir, callback) {
    this._configs = {}
    this._appDir = appDir
    this._files = fs.readdirSync(path.resolve(appDir, 'config'))

    let loads = []
    for (let i = 0; i < this._files.length; i++) {
      if (path.extname(files[i]) === '.yml') {
        loads.push(this.loadConfig.bind(this, this._files[i]))
      }
    }

    async.parallel(loads, (err) => {
      if (!err) {
        this.override(() => {
          return callback(this)
        })
      } else {
        return callback(err)
      }
    })
  }

  loadConfig (file, callback) {
    fs.readFile(path.resolve(this._appDir, 'config', file), (e, content) => {
      if (!e) {
        const key = file.substr(0, file.length - 4)
        this._configs[key] = yaml.safeLoad(content)

        return callback(null)
      } else {
        return callback(e)
      }
    })
  }

  override (callback) {
    if (this._configs.hasOwnProperty('local')) {
      const local = this._configs.local
      for (let conf in local) {
        if (local.hasOwnProperty(conf)) {
          if (!this._configs.hasOwnProperty(conf)) {
            this._configs[conf] = {}
          }

          this._configs[conf] = _.merge(this._configs[conf], local[conf])
        }
      }

      return callback()
    } else {
      return callback()
    }
  }

  get configs () {
    return this._configs
  }

  set configs (conf) {
    this._configs = conf
  }

  get appDir () {
    return this._appDir
  }

  set appDir (dir) {
    this._appDir = dir
  }

  get files () {
    return this._files
  }

  set files (f) {
    this._files = f
  }
}

export default Config
