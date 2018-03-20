"use strict";

// Local imports
const log   = require("../../helper/log");
const queue = require("../helper/queue");

module.exports = {
  register(app) {
    log.trace(" > Setting up api routes (v1)");
    app.post("/api/queue", function(req, res) {
      queue.add({serviceName: "youtube", id: req.body.id, name: "????", length: 4});
      res.json({success: true});
    });
  }
};