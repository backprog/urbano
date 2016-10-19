import commandLineArgs from 'command-line-args'
import os from 'os'
import path from 'path'
import fs from 'fs.extra'
import bcrypt from 'bcrypt'
import prompt from 'prompt'
import AdmZip from 'adm-zip'
import archiver from 'archiver'
import async from 'async'
import request from 'request'
import uuid from 'node-uuid'
import _ from 'lodash'
import jsonfile from 'jsonfile'

'use strict'

class CLI {
  constructor () {
    this.repository_url = 'http://urbanojs.org'
    this.current_path = process.env.PWD
    this.root_path = path.resolve(__dirname, ...['..', '..'])
    this.credential_path = path.resolve(os.tmpdir(), 'urbanoCredentials')
    this.def = [
      { name: 'new', alias: 'n', type: String },
      { name: 'generate', alias: 'g', type: String, multiple: true },
      { name: 'loadPlugins', alias: 'p' },
      { name: 'install', alias: 'i', type: String },
      { name: 'search', alias: 'f', type: String },
      { name: 'signIn', alias: 'u' },
      { name: 'logIn', alias: 'l' },
      { name: 'submit', alias: 's' }
    ]
    this.app_directories = [
      ['assets', 'css'],
      ['assets', 'js'],
      ['assets', 'documents'],
      ['assets', 'uploads'],
      ['config'],
      ['src', 'controllers'],
      ['src', 'models'],
      ['src', 'services'],
      ['src', 'responses'],
      ['src', 'plugins'],
      ['tests'],
      ['views'],
      ['logs']
    ]
    this.app_files = [
      ['package.json'],
      ['server.js'],
      ['app.js'],
      ['config', 'http.yml'],
      ['config', 'local.yml'],
      ['config', 'routes.yml'],
      ['config', 'server.yml'],
      ['config', 'mimetypes.yml'],
      ['src', 'responses', 'notFound.js'],
      ['src', 'responses', 'badRequest.js'],
      ['src', 'responses', 'conflict.js'],
      ['src', 'responses', 'ok.js'],
      ['src', 'responses', 'json.js'],
      ['src', 'responses', 'serverError.js']
    ]
    this.options = commandLineArgs(this.def)
  }

  command () {
    let commands = []

    if (this.options.hasOwnProperty('new')) {
      commands.push(this.createProject.bind(this))
    }
    if (this.options.hasOwnProperty('generate')) {
      commands.push(this.generateItem.bind(this))
    }
    if (this.options.hasOwnProperty('loadPlugins')) {
      commands.push(this.loadPlugins.bind(this))
    }
    if (this.options.hasOwnProperty('install')) {
      commands.push(this.installPlugins.bind(this))
    }
    if (this.options.hasOwnProperty('search')) {
      commands.push(this.searchPlugin.bind(this))
    }
    if (this.options.hasOwnProperty('submit')) {
      commands.push(this.submitPlugin.bind(this))
    }
    if (this.options.hasOwnProperty('signIn')) {
      commands.push(this.signIn.bind(this))
    }
    if (this.options.hasOwnProperty('logIn')) {
      commands.push(this.logIn.bind(this))
    }

    if (commands.length) {
      async.series(commands, (err) => {
        if (err) {
          console.log(err)
          process.exit()
        }
      })
    } else {
      console.log('No command found')
      process.exit()
    }
  }

  createProject (callback = null) {
    if (this.options.new) {
      var source = path.resolve(this.root_path, ...['lib', 'app'])
      var destination = path.resolve(this.current_path, this.options.new)

      fs.mkdir(destination, (e) => {
        if (e) {
          if (e.code === 'EEXIST') {
            if (callback) {
              return callback(['Directory', this.options.new, 'already exists'].join(' '))
            }
          } else {
            if (callback) {
              return callback(e)
            }
          }
        } else {
          let copies = []
          let copyFile = (file, cb) => {
            fs.copy(path.resolve(source, ...file), path.resolve(destination, ...file), (e) => {
              cb(e)
            })
          }

          for (let i = 0; i < this.app_directories.length; i++) {
            try {
              const destinationPath = path.resolve(destination, ...this.app_directories[i])

              fs.mkdirpSync(destinationPath)
              fs.closeSync(fs.openSync(path.resolve(destinationPath, '.keep'), 'w'))
            } catch (e) {
              if (callback) {
                return callback(e)
              }

              return false
            }
          }

          for (let i = 0; i < this.app_files.length; i++) {
            copies.push(copyFile.bind(this, this.app_files[i]))
          }

          async.parallel(copies, (e) => {
            if (!e) {
              console.log('Project ' + this.options.new + ' created')

              if (callback) {
                return callback(null)
              }
            } else {
              if (callback) {
                return callback(e)
              }
            }
          })
        }
      })
    } else {
      if (callback) {
        return callback('No name provided for the new project')
      }
    }
  }

  generateItem (callback = null) {
    if (this.options.generate) {
      this._findAppRoot((appRoot) => {
        if (appRoot) {
          if (Array.isArray(this.options.generate)) {
            let items = ['controller', 'model', 'service']

            if (items.includes(this.options.generate[0])) {
              if (this.options.generate.length === 2) {
                let item = this.options.generate[0]
                let name = this.options.generate[1]

                if (!/\W/.test(name)) {
                  const newName = name.charAt(0).toUpperCase() + name.slice(1)
                  const newFilePath = path.resolve(appRoot, ...['src', item + 's', newName + '.js'])
                  let content = fs.readFileSync(path.resolve(this.root_path, ...['lib', 'app', 'src', item + 's', 'default.js']), 'utf-8')

                  fs.stat(newFilePath, (err) => {
                    if (err && err.code === 'ENOENT') {
                      content = content.replace(/dflt/g, newName)

                      fs.writeFile(newFilePath, content, (e) => {
                        if (e) {
                          if (callback) {
                            return callback(e)
                          }
                        } else {
                          console.log(`${item} ${name} successfully created`)

                          if (callback) {
                            return callback(null)
                          }
                        }
                      })
                    } else {
                      if (callback) {
                        return callback(`A file/directory named ${this.options.generate[1]} already exists`)
                      }
                    }
                  })
                }
              } else {
                if (callback) {
                  return callback(`A name for your ${this.options.generate[0]} is required. It must be an alphanumeric name without space`)
                }
              }
            } else {
              if (callback) {
                return callback('A type of item to generate from [controller, model, service] is required')
              }
            }
          } else {
            if (callback) {
              return callback('A type of item to generate and a name are required')
            }
          }
        } else {
          if (callback) {
            return callback("You're not under an Urbano project")
          }
        }
      })
    }
  }

  loadPlugins (callback = null) {
    this._findAppRoot((appRoot) => {
      if (appRoot) {
        const plgDir = path.resolve(appRoot, 'src', 'plugins')
        const loadDirectories = new Promise((resolve, reject) => {
          fs.readdir(plgDir, (err, dirs) => {
            if (!err) {
              let directories = []

              for (let i = 0; i < dirs.length; i++) {
                const pluginPath = path.resolve(plgDir, dirs[i])
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
          const packPath = path.resolve(appRoot, 'package.json')
          const pack = require(packPath)

          if (pack) {
            let l = dirs.length

            while (--l >= 0) {
              try {
                const json = require(path.resolve(dirs[l], 'plugin.json'))

                if (json) {
                  if (json.hasOwnProperty('dependencies')) {
                    pack.dependencies = _.merge(pack.dependencies || {}, json.dependencies)
                  }
                } else {
                  if (callback) {
                    return callback(`Plugin ${dirs[l]} does not have a plugin.json file`)
                  }

                  return new Error(`Plugin ${dirs[l]} does not have a plugin.json file`)
                }
              } catch (e) {
                if (callback) {
                  return callback(e)
                }

                return e
              }
            }

            jsonfile.writeFile(packPath, pack, { spaces: 2 }, (err) => {
              if (!err) {
                if (callback) {
                  return callback('Plugins updated')
                }
              } else {
                if (callback) {
                  return callback(err)
                }
              }
            })
          } else {
            if (callback) {
              return callback('Your project does not have a package.json file')
            }
          }
        })
      } else {
        if (callback) {
          return callback("You're not under an Urbano project")
        }
      }
    })
  }

  searchPlugin (callback = null) {
    if (this.options.search) {
      const plugin = encodeURIComponent(this.options.search)

      request.get(`${this.repository_url}/search/${plugin}`, (err, httpResponse, body) => {
        if (!err && httpResponse.statusCode === 200) {
          if (body) {
            const results = JSON.parse(body)

            if (Array.isArray(results.data)) {
              if (results.data.length > 0) {
                console.log('Here are matching plugins:')
                for (let i = 0; i < results.data.length; i++) {
                  console.log(`- ${results.data[i].name}`)
                  console.log(`  ${results.data[i].description}`)
                  console.log('--------------------')
                }

                if (callback) {
                  return callback()
                }
              }
            }
          }

          if (callback) {
            return callback('No plugin found')
          }
        } else if (!err && httpResponse.statusCode === 404) {
          if (callback) {
            return callback('No plugin found')
          }
        } else {
          if (callback) {
            return callback('Repository unreachable')
          }
        }
      })
    } else {
      if (callback) {
        return callback('Nothing to search for')
      }
    }
  }

  installPlugins (callback = null) {
    if (this.options.install) {
      this._findAppRoot((appRoot) => {
        if (appRoot) {
          const plugin = this._getPluginInfo(this.options.install)

          if (plugin.name) {
            const destination = path.resolve(appRoot, 'assets', 'uploads', plugin.name)
            const unzipDestination = path.resolve(appRoot, 'src', 'plugins', plugin.name)

            request.get(`${this.repository_url}/install/${this.options.install}`, (err, httpResponse, body) => {
              if (!err) {
                if (httpResponse.statusCode === 200) {
                  try {
                    const responseJson = JSON.parse(body)
                    const filename = responseJson.data

                    request.get(`${this.repository_url}/assets/repository/${filename}`)
                        .on('error', () => {
                          if (callback) {
                            return callback('Repository unreachable')
                          }
                        })
                        .on('response', (response) => {
                          if (response.statusCode !== 200) {
                            try {
                              fs.unlinkSync(destination)
                            } catch (e) {}

                            return callback(`${this.options.install} not found`)
                          }
                        })
                        .on('complete', () => {
                          try {
                            fs.removeSync(unzipDestination)
                          } catch (e) {}

                          try {
                            const zip = new AdmZip(destination)

                            zip.extractAllTo(unzipDestination, true)
                            try {
                              fs.unlinkSync(destination)

                              console.log(`${this.options.install} installed`)
                              return callback(null)
                            } catch (e) {
                              return callback(`${this.options.install} was installed but an error occurred while deleting the source in ${destination}`)
                            }
                          } catch (e) {
                            return callback(e)
                          }
                        })
                        .pipe(fs.createWriteStream(destination))
                  } catch (e) {
                    return callback(e)
                  }
                } else if (httpResponse.statusCode === 404) {
                  return callback(`Cannot find plugin ${plugin.name}`)
                } else {
                  return callback('Repository unreachable')
                }
              } else {
                return callback('Repository unreachable')
              }
            })
          } else {
            if (callback) {
              return callback('Cannot identify plugin')
            }
          }
        } else {
          if (callback) {
            return callback("You're not under an Urbano project")
          }
        }
      })
    } else {
      if (callback) {
        return callback('No plugin name provided')
      }
    }
  }

  submitPlugin (callback = null) {
    let credentials = null

    try {
      credentials = fs.readFileSync(this.credential_path)
    } catch (e) {}

    if (credentials) {
      const user = JSON.parse(credentials)

      if (user) {
        const jsonPath = path.resolve(this.current_path, 'plugin.json')

        fs.stat(jsonPath, (err, stat) => {
          if (!err && stat) {
            if (stat.isFile()) {
              const reg = /[^a-zA-Z0-1_-]+/
              const json = require(jsonPath)

              if (json.version && json.name && json.description && json.author) {
                if (!reg.test(json.name)) {
                  const zipName = uuid.v4()
                  const zipPath = path.resolve(os.tmpdir(), `${zipName}.zip`)
                  const output = fs.createWriteStream(zipPath)
                  let archive = archiver('zip')

                  output.on('close', () => {
                    fs.exists(zipPath, (exists) => {
                      if (exists) {
                        const formData = {
                          user: user.id,
                          zipFile: fs.createReadStream(zipPath)
                        }

                        request.post({
                          url: `${this.repository_url}/upload`,
                          formData: formData
                        }, (err, httpResponse, body) => {
                          if (!err) {
                            if (httpResponse.statusCode === 200) {
                              console.log('Your plugin was successfully submitted')
                            } else if (httpResponse.statusCode === 400) {
                              const response = JSON.parse(body)
                              console.log(response.data)
                            } else if (httpResponse.statusCode === 409) {
                              const response = JSON.parse(body)
                              console.log(response.data)
                            } else {
                              console.log('Repository unreachable')
                            }

                            return callback(null)
                          } else {
                            console.log(err)
                            return callback('An error occurred while submitting your plugin')
                          }
                        })
                      } else {
                        return callback(`Cannot find ${zipPath} file`)
                      }
                    })
                  })

                  archive.on('error', (err) => {
                    if (callback) {
                      callback(err)
                    }
                  })

                  archive.pipe(output)
                  archive.directory(this.current_path, '/')
                  archive.finalize()
                } else {
                  if (callback) {
                    return callback(`Invalid plugin name ${json.name}. Plugin name must be alphanumeric`)
                  }
                }
              } else {
                if (callback) {
                  return callback('Invalid plugin.json file')
                }
              }
            } else {
              if (callback) {
                return callback('Cannot locate plugin.json file')
              }
            }
          } else {
            if (callback) {
              return callback(err)
            }
          }
        })
      } else {
        if (callback) {
          callback('You need to be logged in to submit a plugin')
        }
      }
    } else {
      if (callback) {
        callback('You need to be logged in to submit a plugin')
      }
    }
  }

  signIn (callback = null) {
    let input = {}
    const schema = {
      properties: {
        email: {
          pattern: /^(([^<>()\[\].,;:\s@"]+(\.[^<>()\[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i,
          message: 'A valid email must be provided',
          required: true
        },
        password: {
          hidden: false,
          required: true
        }
      }
    }
    const onResponse = (err, httpResponse, body) => {
      if (!err) {
        if (httpResponse.statusCode === 200) {
          const json = JSON.parse(body)

          if (json.hasOwnProperty('id')) {
            const data = JSON.stringify({ id: json.id, email: input.email })

            fs.writeFileSync(this.credential_path, data)

            console.log('User created successfully. You\'re now logged in')
            process.exit()
          } else {
            if (callback) {
              callback('An error occurred while creating the user. Please try again')
            }
          }
        } else if (httpResponse.statusCode === 409) {
          if (callback) {
            callback('That email is already used')
          }
        } else {

        }
      } else {
        if (callback) {
          callback('Repository unreachable')
        }
      }
    }

    prompt.start()
    prompt.get(schema, (err, result) => {
      if (!err) {
        input = result

        request.post({
          url: `${this.repository_url}/signin`,
          form: {
            email: result.email,
            password: bcrypt.hashSync(result.password, 10)
          }
        }, onResponse)
      } else {
        if (callback) {
          callback(err)
        }
      }
    })
  }

  logIn (callback = null) {
    let input = {}
    const schema = {
      properties: {
        email: {
          pattern: /^(([^<>()\[\].,;:\s@"]+(\.[^<>()\[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i,
          message: 'A valid email must be provided',
          required: true
        },
        password: {
          hidden: true
        }
      }
    }
    const onResponse = (err, httpResponse, body) => {
      if (!err && httpResponse.statusCode === 200) {
        const json = JSON.parse(body)

        if (json.hasOwnProperty('id')) {
          const data = JSON.stringify({ id: json.id, email: input.email })

          fs.writeFileSync(this.credential_path, data)

          console.log('You\'re now logged in')
          process.exit()
        } else {
          if (callback) {
            callback('An error occurred while logging in. Please try again')
          }
        }
      } else if (!err && httpResponse.statusCode === 404) {
        if (callback) {
          callback(`Invalid credentials`)
        }
      } else {
        if (callback) {
          callback('Repository unreachable')
        }
      }
    }

    prompt.start()
    prompt.get(schema, (err, result) => {
      if (!err) {
        input = result

        request.post({
          url: `${this.repository_url}/login`,
          form: {
            email: result.email,
            password: bcrypt.hashSync(result.password, 10)
          }
        }, onResponse)
      } else {
        if (callback) {
          callback(err)
        }
      }
    })
  }

  _findAppRoot (cb, current = null) {
    let stats = []
    let isDir = (current, dir, callback) => {
      fs.stat(path.resolve(current, ...dir), (e, stat) => {
        if (!e && stat && stat.isDirectory()) {
          callback(null)
        } else {
          callback(true)
        }
      })
    }
    let onResult = (current, cb, e) => {
      if (e) {
        if (current === '/' || /\w+:\\/.test(current)) {
          cb(null)
        } else {
          this._findAppRoot(cb, current)
        }
      } else {
        cb(current)
      }
    }

    if (!current) {
      current = this.current_path
    } else {
      current = path.resolve(current, '..')
    }

    for (let i = 0; i < this.app_directories.length; i++) {
      stats.push(isDir.bind(this, current, this.app_directories[i]))
    }

    async.parallel(stats, onResult.bind(this, current, cb))
  }

  _getPluginInfo (s) {
    let parts = null
    let scope = null
    let plugin = {
      name: null,
      version: null,
      scope: null
    }

    if (/]=/.test(s)) {
      parts = s.split(']=')
      scope = ']='
    } else if (/\[=/.test(s)) {
      parts = s.split('[=')
      scope = '[='
    } else if (/\[/.test(s)) {
      parts = s.split('[')
      scope = '['
    } else if (/]/.test(s)) {
      parts = s.split(']')
      scope = ']'
    } else if (/=/.test(s)) {
      parts = s.split('=')
      scope = '='
    } else {
      parts = [s, null, null]
    }

    plugin.name = parts[0]
    plugin.version = parts[1]
    plugin.scope = scope

    return plugin
  }
}

export default CLI
