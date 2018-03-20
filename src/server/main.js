"use strict";

// Global imports
const path        = require('path');
const express     = require('express');
const bodyParser  = require('body-parser');
// Local imports
const log           = require('../helper/log');
const queue         = require('../helper/queue');
const {projectRoot} = require('../helper/misc');
const {port}        = require('../settings');
// Server phases
const frontend = require('./frontend');
const bonjour  = require('./bonjour');
const apiv1    = require('./api/v1');

const webRoot = path.join(projectRoot, 'web');

module.exports = {
  async start() {
    try {
      log.info('Starting server...');
      
      // Configure app
      let app = express();
      // app.set('views', path.join(webRoot, 'html'));
      app.use('/static', express.static(path.join(webRoot, 'public')));
      app.use(bodyParser.json());
      
      // Register endpoints
      frontend.register(app, webRoot);
      apiv1.register(app, webRoot);
      
      // Start server
      log.trace(' > Starting server');
      app.listen(port);
      log.info(`Server started on port ${port}`);
      
      // Advertise on Bonjour
      bonjour.publish();
    } catch (e) {
      log.fatal(e);
    }
  }
}