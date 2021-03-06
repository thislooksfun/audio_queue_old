"use strict";

// Global imports
const nodeCleanup = require("node-cleanup");
const bonjour     = require("bonjour")();
// Local imports
const settings = pquire("settings");

// Unpublish bonjour before exiting.
nodeCleanup(function (exitCode) {
  // If there are any bonjour services open, unpublish them and then exit
  log.trace("Cleaning up...");
  log._prefix(" > ");
  if (bonjour._registry._services.length > 0) {
    log.trace("Unpublishing Bonjour service");
    bonjour.unpublishAll(() => {process.exit(exitCode);});
    return false;
  } else {
    log.trace("Bonjour service unpublished, exiting...");
  }
  log._deprefix();
});

module.exports = {
  publish() {
    log.trace("Publishing Bonjour service");
    bonjour.publish({
      name: settings.bonjour.name,
      type: settings.bonjour.type,
      port: settings.port,
      subtypes: [],
      txt: {version: settings.version}
    });
  }
};