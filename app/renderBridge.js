const { contextBridge, ipcRenderer } = require('electron');
const marked = require('marked');

// Expose protected methods that allow the renderer process to use 
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
  // this sends FROM render-side
  send: (channel, data) => {
    //whitelist these channels
    let validChannels = ['set-edited', 'open-file', 'create-window', 'export-html', 'save-file', 'close-window', 'open-default', 'show-file'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // this returns TO render-side
  receive: (channel, func) => {
    let validChannels = ['file-opened', 'file-saved', 'window-closed', 'call-save-file', 'call-export-file', 'call-open-file', 'call-show-file', 'call-open-default'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes 'sender'
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // this processes markdown requests
  marked: (text) => {
    return marked(text);
  }
})