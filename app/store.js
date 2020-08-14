const path = require('path');
const fs = require('fs');

const Store = () => {
  var userDataPath = null;
  var data = {};

  const init = (options) => {
    userDataPath = path.join(options.userDataPath, options.configName + '.json');
    data = parseDataFile(userDataPath, options.defaults);
  };

  const get = (key) => {
    return (data.hasOwnProperty(key)) ? data[key] : '*';
  }

  const set = (key, value) => {
    data[key] = value;

    try {
      fs.writeFileSync(userDataPath, JSON.stringify(data));0
    } catch (error) {
      console.log('There was an error!')
      console.log(error)
    }
  };

  const parseDataFile = (filePath, defaults) => {
    try {
      return JSON.parse(fs.readFileSync(filePath));
    } catch (error) {
      return defaults;
    }
  };

  return {
    getSetting: get,
    setSetting: set,
    init: init
  }
};

module.exports = Store