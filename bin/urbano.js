#!/usr/bin/env node

require('import-export')
let CLI = require('../lib/src/cli')

let cli = new CLI()

cli.command()
