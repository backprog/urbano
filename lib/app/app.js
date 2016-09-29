import winston from 'winston'
import path from 'path'
import { Urbano, Config } from 'urbano'

'use strict'

new Config(__dirname, (conf) => { // eslint-disable-line
  winston.add(winston.transports.File, {
    filename: path.resolve(__dirname, 'logs/app.log'),
    handleExceptions: true,
    humanReadableUnhandledException: true,
    exitOnError: false
  })

  if (conf instanceof Config) {
    new Urbano(conf, winston) // eslint-disable-line
  } else {
    winston.error(conf)
    process.exit()
  }
})
