const { BrowserWindow } = require('electron');

const Windows = () => {
  const windowSet = new Set();

  const createWindow = (options) => {
    console.log(options.width, options.height);
    let x, y = 250;

    // Gets the browser window that is currently active
    const currentWindow = BrowserWindow.getFocusedWindow();

    // if there is a current window, get its positions and move down and to the right
    if (currentWindow) {
      const [currentWindowX, currentWindowY] = currentWindow.getPosition();
      x = currentWindowX + 25;
      y = currentWindowY + 25;
    }

    let newWindow = new BrowserWindow({
      x, // set the position of the window
      y,
      width: options.width,
      height: options.height,
      // hide the window when it's first created
      show: false,
      // allow us to use require in HTML
      // set up for security
      webPreferences: {
        nodeIntegration: false, // default, but good to ensure
        contextIsolation: true, // protect against prototype pollution attacks
        enableRemoteModule: false, // don't allow remote 
        preload: options.bridge // use a preloaded script
      },
    });

    //Loads the app/index.html in the main window
    newWindow.webContents.loadURL(options.path);

    // Shows the window when the DOM is loaded
    newWindow.once("ready-to-show", () => {
      newWindow.show();
    });

    // This is triggered once the X is clicked on the window, but before it
    // has actually closed
    newWindow.on('close', (event) => {
      event.preventDefault();
      newWindow.webContents.send('window-closed');
    });

    // Handles the cleanup after a user closed the browser window
    newWindow.on("closed", (event) => {
      windowSet.delete(newWindow); // remove the window from the set
      newWindow = null; // and clears the browser window from memory
    });

    let windowObject = {
      pane: newWindow, 
      isEdited: false,
      isSaved: false,
    }

    // Add the newly created window to the windows set and then return it
    windowSet.add(windowObject);
    return newWindow;
  };

  const getWindowFromEvent = (event) => {
    let currentWindow = null;
    try {
      currentWindow = BrowserWindow.fromWebContents(event.sender);
    }
    catch (error) {
      windowSet.forEach(window => {
        if (window.pane === event) {
          currentWindow = window.pane;
        }
      });
    }
    return currentWindow;
  };

  const getWindowEdited = (windowToFind) => {
    let edited = '';

    windowSet.forEach(window => {
      if (window.pane === windowToFind) {
        edited = window.isEdited;
      }
    })
    
    return edited;
  };
  
  const getWindowSaved = (windowToFind) => {
    let saved = '';
    
    windowSet.forEach(window => {
      if (window.pane === windowToFind) {
        saved = window.isSaved;
      }
    });

    return saved;
  }

  const setWindowProperty = (event, key, value) => {
    let windowToFind = getWindowFromEvent(event);
    windowSet.forEach(window => {
      if (window.pane === windowToFind && window.hasOwnProperty(key)) {
        window[key] = value;
      }
    });
  };

  return {
    create: createWindow,
    getWindow: getWindowFromEvent,
    getEdited: getWindowEdited,
    getSaved: getWindowSaved,
    setProp: setWindowProperty,
  }
}

exports.windows = Windows();