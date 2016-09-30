import commandLineArgs from 'command-line-args'
import path from 'path'
import fs from 'fs.extra'
import admZip from 'adm-zip'
import async from 'async'
import request from 'request'
import _ from 'lodash'
import jsonfile from 'jsonfile'

'use strict'

class CLI {
  constructor () {
    this.repository_url = 'http://localhost:1338'
    this.current_path = process.env.PWD
    this.root_path = path.resolve(__dirname, ...['..', '..'])
    this.def = [
      { name: 'new', alias: 'n', type: String },
      { name: 'generate', alias: 'g', type: String, multiple: true },
      { name: 'loadPlugins', alias: 'p' },
      { name: 'install', alias: 'i', type: String },
      { name: 'search', alias: 'f', type: String },
      { name: 'submit', alias: 's', type: String }
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
              fs.mkdirpSync(path.resolve(destination, ...this.app_directories[i]))
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
      let plugin = (this.options.search.substr(-4) === '.zip') ? this.options.search.substr(0, this.options.search.length - 4) : this.options.search
      plugin = encodeURIComponent(plugin)

      request.get(`${this.repository_url}/search/${plugin}`, (err, httpResponse, body) => {
        if (!err && httpResponse.statusCode === 200) {
          if (body) {
            const results = JSON.parse(body)
            if (Array.isArray(results)) {
              if (results.length > 0) {
                console.log('Here are matching plugins')
                for (let i = 0; i < results.length; i++) {
                  console.log(`- ${results[i].name}`)
                  console.log(`  ${results[i].description}`)
                  console.log('------')
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
          const plugin = (this.options.install.substr(-4) === '.zip') ? this.options.install : `${this.options.install}.zip`
          const destination = path.resolve(appRoot, 'assets', 'uploads', plugin)
          const unzipDestination = path.resolve(appRoot, 'src', 'plugins')

          request.get(`${this.repository_url}/assets/repository/${plugin}`)
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
                  const zip = new admZip(destination)

                  zip.extractAllTo(unzipDestination, true)
                  try {
                    fs.unlinkSync(destination)

                    console.log(`${this.options.install} installed`)
                    return callback(null)
                  }
                  catch (e) {
                    return callback(`${this.options.install} was installed but an error occurred while deleting the source in ${destination}`)
                  }
                } catch (e) {
                  return callback(e)
                }
              })
              .pipe(fs.createWriteStream(destination))
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
    if (this.options.submit) {
      const zip = this.options.submit

      fs.exists(zip, (exists) => {
        if (exists) {
          const formData = {
            zipFile: fs.createReadStream(zip)
          }

          request.post({
            url: `${this.repository_url}/upload`,
            formData: formData
          }, (err, httpResponse, body) => {
            if (!err) {
              switch (httpResponse.statusCode) {
                case 200: console.log('Your plugin was successfully submitted'); break
                case 400: console.log('Invalid submission. You did not provided a valid zip file'); break
                case 409: console.log('Another plugin named ${pluginName} already exists. Try to rename your zip file and submit your plugin again'); break
                default: console.log('Repository unreachable')
              }

              return callback(null)
            } else {
              console.log(err)
              return callback('An error occurred while submitting your plugin')
            }
          })
        } else {
          return callback(`Cannot find ${zip} file`)
        }
      })
    } else {
      if (callback) {
        return callback('A zip file must be provided')
      }
    }
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
}

export default CLI
