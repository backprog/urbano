import path from 'path'

'use strict'

let Bundles = require(path.resolve(__dirname, 'bundles'))

class Controllers extends Bundles {
  singleton (ctrlName) {
    this.singletons.controllers[ctrlName] = this
  }
}

export default Controllers
