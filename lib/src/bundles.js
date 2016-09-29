
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

  getNewCtrl (ctrlName) {
    const ctrl = this._getSyncNewCtrl(ctrlName).next()
    return ctrl.value
  }

  getSrv (srvName) {
    const srv = this._getSyncSrv(srvName).next()
    return srv.value
  }

  getNewSrv (srvName) {
    const srv = this._getSyncNewSrv(srvName).next()
    return srv.value
  }

  getMdl (mdlName) {
    const mdl = this._getSyncMdl(mdlName).next()
    return mdl.value
  }

  getNewMdl (mdlName) {
    const mdl = this._getSyncNewMdl(mdlName).next()
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

  _bindPlugins (cls, type, callback) {
    this.urbano.plugins[type].forEach((fn, f) => {
      cls[f] = fn.bind(cls)
    })

    callback(cls)

    return cls
  }

  _getNewController (ctrlName, callback) {
    const Ctrl = this.urbano.controllers.get(ctrlName)

    if (Ctrl) {
      let instance = new Ctrl(this.urbano, this.req, this.res, this.next, this._singletons)

      return this._bindPlugins(instance, 'controller', (instance) => {
        this._singletons.controllers[ctrlName] = instance

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

  *_getSyncNewCtrl (ctrlName) {
    try {
      yield this._getNewController(ctrlName)
    } catch (e) {
      this.urbano.winston.error(e)
      return null
    }
  }

  _getNewService (srvName, callback) {
    const Srv = this.urbano.services.get(srvName)

    if (Srv) {
      let instance = new Srv(this.urbano, this.req, this.res, this.next, this._singletons)

      return this._bindPlugins(instance, 'service', (instance) => {
        this._singletons.services[srvName] = instance

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

  *_getSyncNewSrv (srvName) {
    try {
      yield this._getNewService(srvName)
    } catch (e) {
      this.urbano.winston.error(e)
      return null
    }
  }

  _getNewModel (mdlName, callback) {
    const Mdl = this.urbano.models.get(mdlName)

    if (Mdl) {
      let instance = new Mdl(this.urbano, this.req, this.res, this.next, this._singletons)

      return this._bindPlugins(instance, 'model', (instance) => {
        this._singletons.models[mdlName] = instance

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

  *_getSyncNewMdl (mdlName) {
    try {
      yield this._getNewModel(mdlName)
    } catch (e) {
      this.urbano.winston.error(e)
      return null
    }
  }

  get config () {
    return this.urbano.config
  }

  set config (o) {
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
}

export default Bundles
