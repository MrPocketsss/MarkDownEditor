const markdownView = document.querySelector("#markdown");
const htmlView = document.querySelector("#html");
const settingsPanel = document.querySelector('.settings-container');
const revertButton = document.querySelector("#revert");
const openSettings = document.querySelector('#launch-settings');
const closeSettings = document.querySelector('#settings-close');
const toast = document.querySelector('#toast');

// collect the settings elements
const widthSetting = document.querySelector('#width');
const heightSetting = document.querySelector('#height');
const saveSettings = document.querySelector('#save-settings');

// global variables for tracking current file
let currentFilePath = null;
let loadedTitle = null;
let originalContent = '';
let scrolled = false;

// When a file is newly opened
window.api.receive('file-opened', (content) => {
  // if the filepath is given
  if (content.path.length > 0) {
    currentFilePath = content.path;
    loadedTitle = currentFilePath.split('\\').pop();
    document.title = `${loadedTitle}`;
    showFileButton.disabled = false;
    openInDefaultButton.disabled = false;
  }
  if (content.text.length > 0) {
    originalContent = content.text;
    renderMarkdownToHtml(content.text);

    // When we open for the first time, the file has 
    // not been edited yet
    updateUserInterface(false);
    updateScroll();
  }
});

// After a file has been saved
window.api.receive('file-saved', (message) => {
  // sets the message for the toast
  toast.innerHTML = `<span>${message.text}</span>`;
  // assigns the color scheme, and makes the toast visible
  toast.classList.toggle(message.status);
  toast.classList.toggle('hide');

  // reset the (edited) portion of the title, as we have now saved the file
  document.title = loadedTitle;

  // after 2 seconds, hide the toast and remove any styling
  setTimeout(() => {
    toast.classList.toggle('hide');
    toast.remove('success', 'error');
  }, 2000);
});

// When the user hits Cmd/Ctl+S or save from menu, the main process will tell the renderer
// to save the file, and this will send the necessary stuff back
window.api.receive('call-save-file', () => {
  window.api.send('save-file', { path: currentFilePath, text: markdownView.value });
});

// When the user hits Shift+Cmd/Ctl+S or export from menu, the main process will 
// tell the renderer to save the file, and this will send the necessary stuff back
window.api.receive('call-export-file', () => {
  let page = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
      <title>${currentFilePath}</title>
    </head>
    <body>
      ${htmlView.innerHTML}
    </body>
  </html>  
  `;
  window.api.send('export-html', page);
});

// When the user hist Cmd/Ctl+O or open from menu, the main process will
// tell the renderer to call the open-file channel to start opening a file.
window.api.receive('call-open-file', () => {
  window.api.send('open-file');
});
// When the user hist Cmd/Ctl+D or open from menu, the main process will
// tell the renderer to call the open-file channel to start opening a file.
window.api.receive('call-show-file', () => {
  showFile();
});
// When the user hist Shift+Cmd/Ctl+F or open from menu, the main process will
// tell the renderer to call the open-file channel to start opening a file.
window.api.receive('call-open-default', () => {
  openInDefaultApplication();
});

// If we are closing the browser window (this is kind of hacky)
window.api.receive('window-closed', () => {
  window.api.send('close-window');
});

// Load the current settings into the settings panel 
window.api.receive('update-settings', (settings) => {
  widthSetting.value = settings.width;
  heightSetting.value = settings.height;
});

// try to get the settings
window.api.send('get-settings');

// helper function wrapping the marked module
const renderMarkdownToHtml = (markdown) => {
  markdownView.value = markdown;
  htmlView.innerHTML = window.api.marked(markdown);
};

// helper function to update the title bar
const updateUserInterface = (isEdited) => {
  let newTitle = (isEdited) ? `${loadedTitle} (Edited)` : loadedTitle;

  // Set the window properties
  document.title = newTitle;
  window.api.send('set-edited', isEdited);

  // Enable buttons based on whether we are in an edited file
  revertButton.disabled = !isEdited;
};

// helper function to cause a scroll event
const updateScroll = () => {
  if (!scrolled) {
    markdownView.scrollTop = markdownView.scrollHeight;
    htmlView.scrollTop = htmlView.scrollHeight;
  }

};

// function to make an api call if we have a file path
const showFile = () => {
  if (!currentFilePath) {
    return alert('This file has not been saved to the file system');
  }
  window.api.send('show-file', currentFilePath);
}

// function to make an api call if we have a file path
const openInDefaultApplication = () => {
  if (!currentFilePath) {
    return alert('This file has not been saved to the file system');
  }
  window.api.send('open-default', currentFilePath);
}

// Pass the plain-text to the rendered markdown div
markdownView.addEventListener("input", (event) => {
  const currentContent = event.target.value;

  // reset the scrolled value when we start typing to focus it there
  scrolled = false;
  //keep the view focused on what you're typing
  updateScroll();

  renderMarkdownToHtml(currentContent);
  updateUserInterface(currentContent !== originalContent);
});

// when the markdown view has been scrolled, prevent it from scolling back
markdownView.addEventListener('scroll', () => {
  scrolled = true;
});

// Revert to previous state action
revertButton.addEventListener('click', () => {
  markdownView.value = originalContent;
  renderMarkdownToHtml(originalContent);
  updateUserInterface(false);
  document.title = loadedTitle;
});

// Display the settings panel
openSettings.addEventListener('click', () => {
  settingsPanel.classList.remove('hide');
})

// hide the settings panel
closeSettings.addEventListener('click', () => {
  settingsPanel.classList.add('hide');
})

// Launch the file explorer
showFileButton.addEventListener('click', showFile);

// Launch the default application
openInDefaultButton.addEventListener('click', openInDefaultApplication);



// disable drag-and-drop page-wide
document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

// enable drag-and-drop on the markdown editor div
markdownView.addEventListener('dragover', (event) => {
  markdownView.classList.add('drag-over');
});

markdownView.addEventListener('dragleave', () => {
  markdownView.classList.remove('drag-over');
});

markdownView.addEventListener('drop', (event) => {
  event.preventDefault();
  window.api.send('open-file', event.dataTransfer.files[0].path);
  markdownView.classList.remove('drag-over');
});

saveSettings.addEventListener('click', (event) => {
  event.preventDefault();
  window.api.send('update-settings', { 
    windowBounds: { 
      width: widthSetting.value, 
      height: heightSetting.value 
    }
  });
})