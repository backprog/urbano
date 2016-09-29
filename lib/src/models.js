import path from 'path'

'use strict'

let Bundles = require(path.resolve(__dirname, 'bundles'))

class Models extends Bundles {
  singleton (mdlName) {
    this.singletons.models[mdlName] = this
  }
}

export default Models
