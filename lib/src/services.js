import path from 'path'

'use strict'

let Bundles = require(path.resolve(__dirname, 'bundles'))

class Services extends Bundles {
  singleton (srvName) {
    this.singletons.services[srvName] = this
  }
}

export default Services
