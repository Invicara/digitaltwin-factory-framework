const esModules = [
  '@invicara/platform-api',
  'lodash-es',
  '@invicara/core-utils',
  '@invicara/react-ifef',
  '@invicara/expressions',
  '@invicara/ui-utils'].join('|');

const config = {
  verbose: true,
  "moduleNameMapper": {
    "\\.(css|less|scss)$": "identity-obj-proxy"
  },
  "transform": {
    "^.+\\.(js|jsx)?$": "babel-jest",
  },
  //transformIgnorePatterns: [`<rootDir>/node_modules/(?!(${esModules})/)`],
  "transformIgnorePatterns": [
    // Change MODULE_NAME_HERE to your module that isn't being compiled
    `/node_modules/(?!${esModules}).+\\.js$`
  ],
  testEnvironment: 'jsdom',
  "globals": {
    endPointConfig: {
      itemServiceOrigin: 'https://dt-dev.invicara.com',
      passportServiceOrigin: 'https://dt-dev.invicara.com',
      fileServiceOrigin: 'https://dt-dev.invicara.com',
      datasourceServiceOrigin: 'https://dt-dev.invicara.com',
      graphicsServiceOrigin: 'https://dt-dev.invicara.com',
      pluginBaseUrl: 'http://dt-dev.invicara.com/downloads/IPAPlugins/',
      baseRoot: 'http://localhost:8083/digitaltwin'
    }
  }
  //"extensionsToTreatAsEsm": [
  //  ".jsx"
  //]

};

module.exports = config;
