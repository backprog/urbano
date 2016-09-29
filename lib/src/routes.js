import url from 'url'
import path from 'path'
import fs from 'fs'
import router from 'routes'
import async from 'async'

'use strict'

class Routes {
  constructor (urb, callback) {
    this.urbano = urb
    this.router = router()
    this.routes = {}
    this.mimeTypes = this.urbano.config.configs.mimetypes
    this.loadRoutes().then(() => {
      callback(null)
    }).catch((e) => {
      callback(e)
    })
  }

  loadRoutes () {
    return new Promise((resolve, reject) => {
      const routes = this.urbano.config.configs.routes

      if (routes) {
        const keys = Object.keys(routes)
        let l = keys.length

        while (l-- >= 0) {
          if (routes.hasOwnProperty(keys[l])) {
            let route = routes[keys[l]]

            if (route.hasOwnProperty('path')) {
              let method = 'all'
              const routePath = route.path.trim()

              if (route.hasOwnProperty('method')) {
                method = route.method.trim().toUpperCase()
              }
              if (!this.routes.hasOwnProperty(routePath)) {
                this.routes[routePath] = {}
              }

              if (route.hasOwnProperty('static') && route.static) {
                this.routes[routePath][method] = true
                this.router.addRoute(routePath, this.handle.bind(this))
              } else {
                if (route.hasOwnProperty('handler')) {
                  this.routes[routePath][method] = route.handler.trim()
                  this.router.addRoute(routePath, this.handle.bind(this))
                } else {
                  this.urbano.winston.warn(`${keys[l]} route does not have any handler defined`)
                }
              }
            } else {
              this.urbano.winston.warn(`${keys[l]} route does not have any path defined`)
            }
          }
        }
      }

      resolve(true)
    })
  }

  handle (req, res) {
    async.waterfall([
      this.bindResponses.bind(this, req, res),
      this.bindPlugins.bind(this),
      this.execMiddlewares.bind(this)
    ], (err, result) => {
      if (!err) {
        let req = result.req
        let res = result.res

        const currentPath = url.parse(req.url).pathname
        const match = this.router.match(currentPath)
        const onMatch = new Promise((resolve, reject) => {
          if (match) {
            if (this.routes.hasOwnProperty(match.route)) {
              req.params = match.params
              req.splats = match.splats

              if (this.routes[match.route].hasOwnProperty(req.method)) {
                resolve(this.routes[match.route][req.method])
              } else if (this.routes[match.route].hasOwnProperty('all')) {
                resolve(this.routes[match.route].all)
              } else {
                reject()
              }
            } else {
              reject()
            }
          } else {
            reject()
          }
        })

        onMatch.then((handler) => {
          if (typeof handler === 'boolean') {
            const uri = url.parse(req.url).pathname
            const parts = uri.split('/')
            const filename = path.resolve(this.urbano.config.appDir, ...parts)

            try {
              const stats = fs.lstatSync(filename)

              if (stats.isFile()) {
                const mimeType = this.mimeTypes[path.extname(filename).split('.').reverse()[0]]
                let fileStream = fs.createReadStream(filename)

                res.writeHead(200, mimeType)
                fileStream.pipe(res)
              } else {
                res.notFound()
              }
            } catch (e) {
              return res.notFound()
            }
          } else {
            const Bundles = require(path.resolve(__dirname, 'bundles'))
            const parts = handler.split('.')
            const ctrlName = parts[0]

            if (this.urbano.controllers.has(ctrlName)) {
              try {
                const bundle = new Bundles(this.urbano, req, res)

                bundle.getController(ctrlName, (ctrl) => {
                  ctrl[parts[1]]()
                })
              } catch (e) {
                this.urbano.winston.error(e)
                return res.serverError()
              }
            } else {
              return res.serverError()
            }
          }
        }).catch(() => {
          return res.notFound()
        })
      } else {
        this.urbano.winston.error(err)
        res.statusCode = 500
        return res.end()
      }
    })
  }

  bindResponses (req, res, callback) {
    this.urbano.responses.forEach((fn, f) => {
      res[f] = fn[f].bind({ req, res })
    })

    callback(null, req, res)
  }

  bindPlugins (req, res, callback) {
    const urbano = this.urbano

    this.urbano.plugins.request.forEach((fn, f) => {
      req[f] = fn.bind({ req, res, urbano })
    })

    this.urbano.plugins.response.forEach((fn, f) => {
      res[f] = fn.bind({ req, res, urbano })
    })

    callback(null, req, res)
  }

  execMiddlewares (req, res, callback) {
    const conf = this.urbano.config.configs
    const middle = (fn, req, res, callback) => {
      const Bundles = require(path.resolve(__dirname, 'bundles'))
      const parts = fn.split('.')

      if (parts.length === 2) {
        const bundle = new Bundles(this.urbano, req, res, callback)

        bundle.getService(parts[0], (service) => {
          if (service) {
            try {
              service[parts[1]]()
            } catch (e) {
              callback(e)
            }
          } else {
            callback(`Unknown middleware ${parts[0]}`)
          }
        })
      } else {
        callback(`Invalid middleware ${fn}`)
      }
    }

    if (conf.hasOwnProperty('http') && conf.http) {
      if (conf.http.hasOwnProperty('middlewares')) {
        let fns = []
        const middlewares = conf.http.middlewares

        for (let i = 0; i < middlewares.length; i++) {
          fns.push(middle.bind(this, middlewares[i].trim(), req, res))
        }

        async.series(fns, (err) => {
          callback(err, { req, res })
        })
      } else {
        callback(null, { req, res })
      }
    } else {
      callback(null, { req, res })
    }
  }
}

export default Routes
