const fs = require('fs');
const buildMakeSettings = require('./settings')

const makeSettings = buildMakeSettings({ fs });

module.exports = makeSettings;