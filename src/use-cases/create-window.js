const makeWindow = require('../window');

module.exports = function makeCreateWindow (windowSet, pathToIndex) {
  return function createWindow (windowInfo) {
    const window = makeWindow(windowInfo);

    // load the app index.html into the window
    window.pane.webContents.loadURL(pathToIndex);

    // Shows the window when the DOM is loaded
    window.pane.once('ready-to-show', () => {
      window.show();
    });

    // This is triggered when a user closes the window,
    // but before it is actually closed
    window.pane.on('close', (event) => {
      event.preventDefault();
      window.webContents.send('window-closed');
    });

    // Handles the cleanup after a user closed the browser window
    window.pane.on('closed', (event) => {
      windowSet.forEach(windowObject => {
        if (windowObject.pane === window.pane) windowSet.delete(windowObject);
      });
    });

    // 
  }
};