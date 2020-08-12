const buildMakeSettings = ({ fs }) => {
  return function makeSettings({
    fileTypes,
    defaultPath,
    pathToIndex,
    pathToBridge
  } = {}) {
    if (!fileTypes) {
      throw new Error('File Types must exist');
    }
    if (!defaultPath) {
      throw new Error('The default path must exist');
    }
    if (!pathToIndex) {
      throw new Error('The default path must exist');
    }
    if (!pathToBridge) {
      throw new Error('The default path must exist');
    }
    if (fileTypes.length < 1) {
      throw new Error('You must have at least one file type');
    }
    if (!fs.existsSync(defaultPath)) {
      throw new Error('The default path must be a real directory');
    }
    if (!fs.existsSync(pathToIndex)) {
      throw new Error('The index path must be a real file path');
    }
    if (!fs.existsSync(pathToBridge)) {
      throw new Error('The bridge path must be a real file path');
    }

    return Object.freeze({
      getFileTypes: () => fileTypes,
      isValidFileType: (ext) => fileTypes.includes(ext),
      getDefaultPath: () => defaultPath,
      getIndexPath: () => pathToIndex,
      getBridgePath: () => pathToBridge,
    });
  }
};

module.exports = buildMakeSettings();