const buildMakeWindow = ({ BrowserWindow }) => {
  return function makeWindow ({
    x,
    y, 
    pathToBridge,
    isEdited = false
  } = {}) {
    if (!x && !y) {
      x = y = 250;
    }
    if (!x || !y) {
      throw new Error('If you have coordinates, you must have both');
    }
    if (!pathToBridge) {
      throw new Error('The Bridge path must exist');
    }

    const pane = new BrowserWindow({
      x, // set the position of the window
      y,
      show: false, // hide the window when its first created
      webPreferences: { 
        nodeIntegration: false, // default, but good to ensure
        contextIsolation: true, // protect against prototype poisoning
        enableRemoteModule: false, // don't allow remote
        preload: pathToBridge // use a preloaded script
      }
    });

    return Object.freeze({
      getPane: () => pane,
      hasEdited: () => isEdited,
      edit: () => { isEdited = true },
      unEdit: () => { isEdited = false; },
    })
  }
};

module.exports = buildMakeWindow();