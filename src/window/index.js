const { BrowserWindow } = require('electron');
const buildMakeWindow = require('./window');

const makeWindow = buildMakeWindow({ BrowserWindow });

module.exports = makeWindow;