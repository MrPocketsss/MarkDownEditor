const { app, ipcMain, Menu, shell } = require("electron");
const path = require('path');
const fs = require("fs");

// Require the windows factory function to track all of the windows
const windows = require('./Window').windows;

// Require the dialog factory function to deal with the various dialogs
const dialog = require('./Dialog').dialog;

app.setName('Markdown Editor');
const isMac = process.platform === 'darwin'; // check if we're running mac for the Menu
const isDev = true;
const pathToIndex = `file://${__dirname}/index.html`;
const pathToBridge = path.join(__dirname, "renderBridge.js");
const template = [
  // { role: appMenu }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []), 
  // { role: File }
  {
    label: 'File',
    submenu: [
      {
        label: 'New File',
        accelerator: 'CommandOrControl+N',
        click: () => windows.create(pathToIndex, pathToBridge)
      },
      {
        label: 'Open File',
        accelerator: 'CommandOrControl+O',
        click: (item, focusedWindow) => {
          // for macs, we need to check if we're opening from a window, or just from the menu
          // with no windows open
          if (!focusedWindow) {
            // if there isn't one, then create a window and call open file from there
            let currentWindow = wondows.create(pathToIndex, pathToBridge);
            currentWindow.on('show', () => {
              currentWindow.webContents.send('call-open-file');
            });
          }
          // if we have a window up and focuesed, send the call file open through that
          focusedWindow.webContents.send('call-open-file');
        }
      },
      {
        label: 'Save File',
        accelerator: 'CommandOrControl+S',
        click: (item, focusedWindow) => {
          if (!focusedWindow) {
            return dialog.error({ title: 'Cannot save or export', message: 'There is currently no active document to save or export.' });
          }
          focusedWindow.webContents.send('call-save-file');
        }
      },
      {
        label: 'Export HTML',
        accelerator: 'Shift+CommandOrControl+S',
        click: (item, focusedWindow) => {
          if (!focusedWindow) {
            return dialog.error({ title: 'Cannot save or export', message: 'There is currently no active document to save or export.' });
          }
          focusedWindow.webContents.send('call-export-file');
        }
      },
      { type: 'separator' },
      {
        label: 'Show File',
        accelerator: 'CommandOrControl+F',
        click: (item, focusedWindow) => {
          if (!focusedWindow) {
            return dialog.error({ title: 'Cannot show file\'s location', message: 'There is currently no document to show.' });
          }
          focusedWindow.webContents.send('call-show-file');
        }
      },
      {
        label: 'Open in Default Editor',
        accelerator: 'CommandOrControl+D',
        click: (item, focusedWindow) => {
          if (!focusedWindow) {
            return dialog.error({ title: 'Cannot Open File in Default Editor', message: 'There is currently no active document to open.' });
          }
          focusedWindow.webContents.send('call-open-default');
        }
      },
    ]
  },
  // { role: Edit}
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startspeaking' },
            { role: 'stopspeaking' }
          ]
        }
      ] : [
        { role: 'selectAll' }
      ])
    ]
  },
  // { role: Window }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  // { role: help }
  {
    label: 'help',
    submenu: [
      { 
        label: 'Learn More',
        click: async () => {
          await shell.openExternal('https://electronjs.org');
        }
      },
      ...(isDev ? [
        { role: 'toggledevtools' },
      ] : []),
    ]
  }
];


// Add a map of all the files we're watching
const openFiles = new Map();

// Supported File Types
const fileTypes = ['md', 'markdown', 'txt'];
const defaultPath = app.getPath('documents');


app.on("ready", () => {
  appMenu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(appMenu);
  windows.create(pathToIndex, pathToBridge);
});

// Listen for open-file events, which provide the path of the externally
// opened file and then passes that file path to our openFile function
app.on('will-finish-launching', () => {
  app.on('open-file', (event, file) => {
    const win = windows.create(pathToIndex, pathToBridge);
    win.once('ready-to-show', () => {
      win.webContents.send('file-opened', packageFile(file));
    })
  })
})

// Create a window when application is open and there are no windows
// Also for macOS
app.on("activate", (event, hasVisibleWindows) => {
  if (!hasVisibleWindows) windows.create(pathToIndex, pathToBridge);
});

// Prevent electron from killing app on macOS
app.on("window-all-closed", () => {
  if (process.platform === "darwin") return false;
  // quits the app if it isn't mac
  app.quit();
});

// A function to generate the opened file content
const packageFile = (filePath) => {
  app.addRecentDocument(filePath);
  let content = {
    path: filePath,
    text: fs.readFileSync(filePath).toString()
  };
  return content;
};

// A function to watch for changes in open files
const startWatchingFiles = (event, filePath) => {
  // Closes the existing watcher if there is one
  const currentWindow = windows.getWindow(event);

  // if there are no currently watched files, don't delete them
  if (openFiles.size > 0) stopWatchingFile(currentWindow)

  // create a watcher object, and if it fires a "change" event, send the changes back
  const watcher = fs.watchFile(filePath, (event) => {
    // make sure that the trigger for the watch call isn't us
    const isSaved = windows.getSaved(currentWindow);
    if(!isSaved) {
      dialog.externalUnsaved(currentWindow)
        .then(user => {
          if (user.response === 0) {
            currentWindow.webContents.send('file-opened', packageFile(filePath))
          }
        })
        .catch(error => console.log(error));
    } else {
      // if it was us who called it, then we just saved the file, so we can remove the 
      // "just saved" property.
      windows.setProp(currentWindow, 'isSaved', false);
    }
  });

  // Track the watcher so we can stop it later.
  openFiles.set(currentWindow, watcher);
};

const stopWatchingFile = (windowToClose) => {
  if (openFiles.has(windowToClose)) {
    openFiles.get(windowToClose).stop();
    openFiles.delete(windowToClose);
  } else {
    console.log(`The map didn't have the specified window.`);
  }
};

const checkFileAllowed = (filePath) => {
  // get the extension of the file
  let ext = filePath.split('\\').pop().split('.')[1];

  // return whether the filetype is valid or not
  return (fileTypes.includes(ext)) ? true : false;
};

const chooseFile = (currentWindow, event, path = null) => {
  //check to see if I have a file already in mind
  if (path) {
    if (checkFileAllowed(path)) openFile(event, path);
  } else {
    // if no pre-determined file, ask the user
    dialog.open(currentWindow)
      .then(results => {
        // and see if the user chose a valid file
        if (checkFileAllowed(results.filePaths[0])) openFile(event, results.filePaths[0]);
      })
      .catch(error => console.log(error));
  }
};

const openFile = (event, pathToOpen) => {
  // now that we have a filePath in mind, send to DOM 
  // or let the user know they chose the wrong thing
  if (pathToOpen) {
    startWatchingFiles(event, pathToOpen);
    event.reply('file-opened', packageFile(pathToOpen));
  } else {
    let options = {
      title: 'Invalid File',
      content: 'This application only supports .md, .markdown, and .txt files'
    };
    dialog.error(options);
  }
};

// ipcMain functionality
// Receiving
// Open a file 
ipcMain.on('open-file', (event, path) => {
  // Before we open a file, check to see if there is editing done on a file already there
  let currentWindow = windows.getWindow(event);
  let edited = windows.getEdited(currentWindow);

  // if there is an open, edited file - warn the users
  if (edited) {
    dialog.overwrite(currentWindow)
      .then(user => {
        // if the user chooses to continue, try to open a file
        if (user.response === 0) {
          chooseFile(currentWindow, event, path)
        }
      })
      .catch(err => console.log(err));
  } else {
    chooseFile(currentWindow, event, path);
  }
});

// Export the file as HTML
ipcMain.on('export-html', (event, content) => {
  let currentWindow = windows.getWindow(event);

  dialog.export(currentWindow, defaultPath)
    .then(results => {
      if (results.filePath) {
        fs.writeFileSync(results.filePath, content);
      }
    })
    .catch(err => console.log(err));
});

// Save the markdown to the file path
ipcMain.on('save-file', (event, content) => {
  // get window
  let currentWindow = windows.getWindow(event);
  // if the path property of content is empty, this is a new file
  if (!content.path) {
    dialog.saveNew(currentWindow, defaultPath)
      .then(results => {
        if (results.filePath) {
          fs.writeFileSync(results.filePath, content.text);
          app.addRecentDocument(results.filePath);
        }
        // set the window to not being edited anymore
        windows.setProp(event, 'isEdited', false);
        windows.setProp(event, 'isSaved', true);

        // send back to renderer that the file saved successfully
        event.reply('file-saved', { text: 'File Saved Successfully', status: 'success' });
      })
      .catch(err => event.reply('file-saved', { text: `File not saved successfully. ${err.message}`, status: 'error' }))
  } else {
    //otherwise, save the file
    fs.writeFileSync(content.path, content.text);
    windows.setProp(event, 'isEdited', false);
    windows.setProp(event, 'isSaved', true);
    event.reply('file-saved', { text: 'File Saved Successfully', status: 'success' });
  }
});

// Open a new application window
ipcMain.on('create-window', (event, args) => {
  windows.create(pathToIndex, pathToBridge);
});

// Sets the BrowserWindow's edited property
ipcMain.on('set-edited', (event, isEdited) => {
  windows.setProp(event, 'isEdited', isEdited);
});

// Closes a browser window
ipcMain.on('close-window', (event, args) => {
  // collect the window that's closing
  let windowToClose = windows.getWindow(event);

  // figure out if the window has unsaved changes
  let edited = windows.getEdited(windowToClose);

  // if there are unsaved changes, we need to let the user know
  if (edited) {
    dialog.quitUnsaved(windowToClose)
      .then(user => {
        // if the user chooses to quit still, close the window
        if (user.response === 0) {
          windowToClose.destroy()
        }
      })
      .catch(error => console.log(error));
  } else {
    // if the file wasn't edited, close the window
    windowToClose.destroy();
  }
});

// Launch the file explorer
ipcMain.on('show-file', (event, path) => {
  shell.showItemInFolder(path);
});

// Launch the default application
ipcMain.on('open-default', (event, path) => {
  shell.openPath(path);
});