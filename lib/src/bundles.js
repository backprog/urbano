
'use strict'

class Bundles {
  constructor (urb, req, res, next, singletons) {
    this.urbano = urb
    this.req = req
    this.res = res
    this.next = next
    this._singletons = singletons

    if (!this._singletons) {
      this._singletons = {
        controllers: {},
        models: {},
        services: {}
      }
    }
  }

  getCtrl (ctrlName) {
    const ctrl = this._getSyncCtrl(ctrlName).next()
    return ctrl.value
  }

  getNewCtrl (ctrlName, save = true) {
    const ctrl = this._getSyncNewCtrl(ctrlName, save).next()
    return ctrl.value
  }

  getSrv (srvName) {
    const srv = this._getSyncSrv(srvName).next()
    return srv.value
  }

  getNewSrv (srvName, save = true) {
    const srv = this._getSyncNewSrv(srvName, save).next()
    return srv.value
  }

  getMdl (mdlName) {
    const mdl = this._getSyncMdl(mdlName).next()
    return mdl.value
  }

  getNewMdl (mdlName, save = true) {
    const mdl = this._getSyncNewMdl(mdlName, save).next()
    return mdl.value
  }

  getController (ctrlName, callback) {
    if (this._singletons.controllers.hasOwnProperty(ctrlName)) {
      if (callback) {
        return callback(this._singletons.controllers[ctrlName])
      }

      return this._singletons.controllers[ctrlName]
    } else {
      return this._getNewController(ctrlName, callback)
    }
  }

  getModel (mdlName, callback) {
    if (this._singletons.models.hasOwnProperty(mdlName)) {
      if (callback) {
        return callback(this._singletons.models[mdlName])
      }

      return this._singletons.models[mdlName]
    } else {
      return this._getNewModel(mdlName, callback)
    }
  }

  getService (srvName, callback) {
    if (this._singletons.services.hasOwnProperty(srvName)) {
      if (callback) {
        return callback(this._singletons.services[srvName])
      }

      return this._singletons.services[srvName]
    } else {
      return this._getNewService(srvName, callback)
    }
  }

  _getNewController (ctrlName, callback, save = true) {
    const Ctrl = this.urbano.controllers.get(ctrlName)

    if (Ctrl) {
      return this._bindPlugins(Ctrl, 'controller', (instance) => {
        if (save) {
          this._singletons.controllers[ctrlName] = instance
        }

        if (callback) {
          return callback(instance)
        }

        return instance
      })
    } else {
      if (callback) {
        return callback(null)
      }

      return null
    }
  }

  *_getSyncCtrl (ctrlName) {
    try {
      yield this.getController(ctrlName)
    } catch (e) {
      this.urbano.winston.error(e)
      return null
    }
  }

  *_getSyncNewCtrl (ctrlName, save = true) {
    try {
      yield this._getNewController(ctrlName, null, save)
    } catch (e) {
      this.urbano.winston.error(e)
      return null
    }
  }

  _getNewService (srvName, callback, save = true) {
    const Srv = this.urbano.services.get(srvName)

    if (Srv) {
      return this._bindPlugins(Srv, 'service', (instance) => {
        if (save) {
          this._singletons.services[srvName] = instance
        }

        if (callback) {
          return callback(instance)
        }

        return instance
      })
    } else {
      if (callback) {
        return callback(null)
      }

      return null
    }
  }

  *_getSyncSrv (srvName) {
    try {
      yield this.getService(srvName)
    } catch (e) {
      this.urbano.winston.error(e)
      return null
    }
  }

  *_getSyncNewSrv (srvName, save = true) {
    try {
      yield this._getNewService(srvName, null, save)
    } catch (e) {
      this.urbano.winston.error(e)
      return null
    }
  }

  _getNewModel (mdlName, callback, save = true) {
    const Mdl = this.urbano.models.get(mdlName)

    if (Mdl) {
      return this._bindPlugins(Mdl, 'model', (instance) => {
        if (save) {
          this._singletons.models[mdlName] = instance
        }

        if (callback) {
          return callback(instance)
        }

        return instance
      })
    } else {
      if (callback) {
        return callback(null)
      }

      return null
    }
  }

  *_getSyncMdl (mdlName) {
    try {
      yield this.getModel(mdlName)
    } catch (e) {
      this.urbano.winston.error(e)
      return null
    }
  }

  *_getSyncNewMdl (mdlName, save = true) {
    try {
      yield this._getNewModel(mdlName, null, save)
    } catch (e) {
      this.urbano.winston.error(e)
      return null
    }
  }

  _bindPlugins (cls, type, callback) {
    this.urbano.plugins[type].forEach((fn, f) => {
      cls.prototype[f] = fn
    })

    const instance = new cls(this.urbano, this.req, this.res, this.next, this._singletons)

    callback(instance)

    return instance
  }

  get config () {
    return this.urbano.config
  }

  set config (o) {
    return false
  }

  get configs () {
    return this.urbano.config._configs
  }

  set configs (o) {
    return false
  }

  get logger () {
    return this.urbano.winston
  }

  set logger (o) {
    return false
  }

  get services () {
    return this.urbano.services
  }

  set services (o) {
    return false
  }

  get models () {
    return this.urbano.models
  }

  set models (o) {
    return false
  }

  get controllers () {
    return this.urbano.controllers
  }

  set controllers (o) {
    return false
  }

  get singletons () {
    return this._singletons
  }

  set singletons (o) {
    return false
  }

  get shared () {
    return this.urbano.shared
  }

  set shared (shared) {
    this.urbano.shared = shared
  }

  get memshared () {
    return this.urbano.memshared
  }

  set memshared (o) {
    return false
  }
}

export default Bundles
