const makeCreateWindow = require('./create-window');

const createWindow = makeCreateWindow()

const windowService = Object.freeze({
  createWindow,
})

module.exports = windowService;