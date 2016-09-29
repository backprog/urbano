import http from 'http'
import https from 'https'
import path from 'path'
import os from 'os'
import cluster from 'cluster'
import fs from 'fs.extra'
import async from 'async'

'use strict'

let Routes = require('./routes')

class Urbano {
  constructor (Conf, winston) {
    this._config = Conf
    this._winston = winston
    this._controllers = new Map()
    this._models = new Map()
    this._services = new Map()
    this._responses = new Map()
    this._plugins = { request: new Map(), response: new Map(), controller: new Map(), model: new Map(), service: new Map() }
    this._routing = null
    this._server = null
    this._ctrlDir = path.resolve(Conf.appDir, 'src', 'controllers')
    this._mdlDir = path.resolve(Conf.appDir, 'src', 'models')
    this._srvDir = path.resolve(Conf.appDir, 'src', 'services')
    this._rspDir = path.resolve(Conf.appDir, 'src', 'responses')
    this._plgDir = path.resolve(Conf.appDir, 'src', 'plugins')

    async.parallel([
      this.loadControllers.bind(this),
      this.loadModels.bind(this),
      this.loadServices.bind(this),
      this.loadResponses.bind(this),
      this.loadPlugins.bind(this)
    ], (err) => {
      if (!err) {
        async.series([
          this.loadRoutes.bind(this),
          this.loadServer.bind(this)
        ], (err, results) => {
          if (!err) {
            this._winston.info(results[1])
          } else {
            this._winston.error(err)
            process.exit()
          }
        })
      } else {
        this._winston.error(err)
        process.exit()
      }
    })
  }

  loadControllers (callback) {
    fs.readdir(this._ctrlDir, (err, files) => {
      if (!err) {
        for (let i = 0; i < files.length; i++) {
          const ctrl = require(path.resolve(this._ctrlDir, files[i]))
          let filename = path.basename(files[i], '.js')

          if (ctrl.name === filename) {
            if (!this._controllers.has(filename)) {
              try {
                this._controllers.set(filename, ctrl)
              } catch (e) {
                return callback(e)
              }
            }
          } else {
            return callback(`Controller class name ${ctrl.name} does not match with file name ${filename}`)
          }
        }

        return callback(null)
      } else {
        return callback(err)
      }
    })
  }

  loadModels (callback) {
    fs.readdir(this._mdlDir, (err, files) => {
      if (!err) {
        for (let i = 0; i < files.length; i++) {
          const mdl = require(path.resolve(this._mdlDir, files[i]))
          let filename = path.basename(files[i], '.js')

          if (mdl.name === filename) {
            if (!this._models.has(filename)) {
              try {
                this._models.set(filename, mdl)
              } catch (e) {
                return callback(e)
              }
            }
          } else {
            return callback(`Model class name ${mdl.name} does not match with file name ${filename}`)
          }
        }

        return callback(null)
      } else {
        return callback(err)
      }
    })
  }

  loadServices (callback) {
    fs.readdir(this._srvDir, (err, files) => {
      if (!err) {
        for (let i = 0; i < files.length; i++) {
          const srv = require(path.resolve(this._srvDir, files[i]))
          let filename = path.basename(files[i], '.js')

          if (srv.name === filename) {
            if (!this._services.has(filename)) {
              try {
                this._services.set(filename, srv)
              } catch (e) {
                return callback(e)
              }
            }
          } else {
            return callback(`Service class name ${srv.name} does not match with file name ${filename}`)
          }
        }

        return callback(null)
      } else {
        return callback(err)
      }
    })
  }

  loadResponses (callback) {
    fs.readdir(this._rspDir, (err, files) => {
      if (!err) {
        for (let i = 0; i < files.length; i++) {
          const rsp = require(path.resolve(this._rspDir, files[i]))
          let filename = path.basename(files[i], '.js')

          if (rsp.hasOwnProperty(filename)) {
            if (!this._responses.has(filename)) {
              try {
                this._responses.set(filename, rsp)
              } catch (e) {
                return callback(e)
              }
            }
          } else {
            return callback(`Response name ${rsp.name} does not match with file name ${filename}`)
          }
        }

        return callback(null)
      } else {
        return callback(err)
      }
    })
  }

  loadPlugins (callback) {
    const loadPlugin = (pluginPath, cb) => {
      fs.readdir(pluginPath, (err, files) => {
        if (!err) {
          if (files.length > 1 && files.includes('plugin.json')) {
            return cb(null, files)
          } else {
            return cb(`${pluginPath} does not contain a plugin.json file`)
          }
        } else {
          return cb(err)
        }
      })
    }
    const loadDirectories = new Promise((resolve, reject) => {
      fs.readdir(this._plgDir, (err, dirs) => {
        if (!err) {
          let directories = []

          for (let i = 0; i < dirs.length; i++) {
            const pluginPath = path.resolve(this._plgDir, dirs[i])
            const stat = fs.statSync(pluginPath)

            if (stat.isDirectory()) {
              directories.push(pluginPath)
            }
          }

          resolve(directories)
        } else {
          reject(err)
        }
      })
    })

    loadDirectories.then((dirs) => {
      let fns = {}
      let l = dirs.length

      while (--l >= 0) {
        fns[dirs[l]] = loadPlugin.bind(this, dirs[l])
      }

      async.parallel(fns, (err, results) => {
        if (!err) {
          for (let pluginPath in results) {
            if (results.hasOwnProperty(pluginPath)) {
              try {
                const allowedBinding = Object.keys(this._plugins)
                const json = require(path.resolve(pluginPath, 'plugin.json'))
                let l = results[pluginPath].length

                while (--l >= 0) {
                  if (results[pluginPath][l] !== 'plugin.json') {
                    try {
                      const tmp = require(path.resolve(pluginPath, results[pluginPath][l]))

                      for (let pluginName in tmp) {
                        if (tmp.hasOwnProperty(pluginName)) {
                          if (json.hasOwnProperty(pluginName)) {
                            for (let i = 0; i < json[pluginName].length; i++) {
                              if (allowedBinding.includes(json[pluginName][i])) {
                                this._plugins[json[pluginName][i]].set(pluginName, tmp[pluginName])
                              }
                            }
                          }
                        }
                      }
                    } catch (e) {
                      return callback(e)
                    }
                  }
                }
              } catch (e) {
                return callback(e)
              }
            }
          }

          return callback(null)
        } else {
          return callback(err)
        }
      })
    }).catch((e) => {
      return callback(e)
    })
  }

  loadRoutes (callback) {
    this._routing = new Routes(this, (err) => {
      return callback(err)
    })
  }

  loadServer (callback) {
    let serverType = 'http'
    let port = 1337
    let options = {}

    const start = (serverType, options, port) => {
      if (serverType === 'https') {
        this._server = https.createServer(options, (req, res) => {
          this._routing.handle(req, res)
        })
      } else {
        this._server = http.createServer((req, res) => {
          this._routing.handle(req, res)
        })
      }

      this._server.listen(port, (err) => {
        if (!err) {
          return callback(null, `Server ${serverType} listening on port ${port}`)
        } else {
          return callback(err)
        }
      })
    }

    if (this._config.configs.hasOwnProperty('server')) {
      const conf = this._config.configs.server

      if (conf) {
        if (conf.hasOwnProperty('http')) {
          if (conf.http.secure) {
            if (conf.http.hasOwnProperty('key') && conf.http.hasOwnProperty('cert')) {
              try {
                options = {
                  key: fs.readFileSync(conf.http.key),
                  cert: fs.readFileSync(conf.http.cert)
                }
                serverType = 'https'
              } catch (e) {
                serverType = 'http'

                this._winston.error(e)
                this._winston.warn('No certificate found for a https server. Falling back to http')
              }
            } else {
              this._winston.warn('No certificate found for a https server. Falling back to http')
            }
          }
          if (conf.http.port) {
            port = conf.http.port
          }
        }

        if (conf.hasOwnProperty('workers') && conf.workers > 1) {
          if (cluster.isMaster) {
            let workers = os.cpus().length

            if (workers > conf.workers) {
              workers = conf.workers
            }

            for (let i = 0; i < workers; i++) {
              cluster.fork()
            }

            cluster.on('exit', (worker, code, signal) => {
              this._winston.warn(`worker ${worker.process.pid} stopped`)
            })
          } else {
            start(serverType, options, port)
          }
        } else {
          start(serverType, options, port)
        }
      } else {
        start(serverType, options, port)
      }
    } else {
      start(serverType, options, port)
    }
  }

  get config () {
    return this._config
  }

  set config (conf) {
    this._config = conf
  }

  get winston () {
    return this._winston
  }

  set winston (wst) {
    if (wst && wst.hasOwnProperty('Logger') && wst.hasOwnProperty('Transport')) {
      this._winston = wst
    }
  }

  get controllers () {
    return this._controllers
  }

  set controllers (ctrl) {
    this._controllers = ctrl
  }

  get models () {
    return this._models
  }

  set models (mdl) {
    this._models = mdl
  }

  get services () {
    return this._services
  }

  set services (srv) {
    this._services = srv
  }

  get responses () {
    return this._responses
  }

  set responses (rsp) {
    this._responses = rsp
  }

  get plugins () {
    return this._plugins
  }

  set plugins (plg) {
    this._plugins = plg
  }

  get controllersDir () {
    return this._ctrlDir
  }

  set controllersDir (dir) {
    this._ctrlDir = dir
  }

  get modelsDir () {
    return this._mdlDir
  }

  set modelsDir (dir) {
    this._mdlDir = dir
  }

  get servicesDir () {
    return this._srvDir
  }

  set servicesDir (dir) {
    this._srvDir = dir
  }

  get responsesDir () {
    return this._rspDir
  }

  set responsesDir (dir) {
    this._rspDir = dir
  }

  get pluginsDir () {
    return this._plgDir
  }

  set pluginsDir (dir) {
    this._plgDir = dir
  }
}

export default Urbano
