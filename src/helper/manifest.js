"use strict";

// Global imports
const fs   = require("fs-extra");
const path = require("path");

// Local imports
const misc = pquire("misc");

const requiredKeys = {
  name: "string",
  title: "string",
  author: "string",
  home: "string",
  share: "string",
  icon: "string",
  scripts: {
    prep: "string",
    play: "string",
    search: "string",
    info: "string"
  }
};




const ext_requiredKeys = {
  matches: "[string]",
  js: "[string]",
};
function processExtensionInfo(ext, servPath, servName, ffExtPath) {
  if (typeof ext !== "object") {
    return {s: false, msgs: ["Key 'extension' must be a dict"]};
  }
  if (!misc.verifyKeys(servName, ext, ext_requiredKeys, "extension.")) {
    return {s: false};
  }
  
  var servExtPath = path.join(ffExtPath, "scripts", servName);
  fs.mkdirpSync(servExtPath);
  var ffJS = [];
  for (var f of ext.js) {
    if (path.extname(f) !== ".js") continue;
    
    var fPath = path.join(servPath, f);
    var ffPath = path.join(servExtPath, path.basename(f));
    fs.copySync(fPath, ffPath);
    ffJS.push(path.relative(ffExtPath, ffPath));
  }
  
  return {s: true, ff: {matches: ext.matches, js: ffJS, run_at: ext.run_at}};
}


// Log and explicitly return null for easy one-lining later as return type of `log.error` is not guarenteed to be null/undefined
function lerr(...msgs) {
  log.error(...msgs);
  return null;
}

function lazyLoadScript(name, mnfst, servPath) {
  if (path.isAbsolute(mnfst.scripts[name])) {
    return lerr(`Error parsing manifest for '${mnfst.name}': ${name} script path must be relative`);
  }
  
  let pth = require.resolve(path.relative(__dirname, path.join(servPath, mnfst.scripts[name])));
  mnfst._reqPaths.push(pth);
  
  var _cached = null;
  return function() {
    if (_cached == null) {
      try {
        let mod = require(pth);
        _cached = mod;
      } catch (e) {
        return lerr(`Error loading ${name} script for module '${mnfst.name}':`, e);
      }
    }
    return _cached.apply(this, ...arguments);
  };
}

module.exports = {
  parse: async function(servicesPath, serviceFolder, ffExtPath) {
    var servPath = path.join(servicesPath, serviceFolder);
    var manPath = path.join(servPath, "manifest.json");
    log.debug(` > Parsing manifest ${manPath}`);
    if (!fs.existsSync(manPath)) {
      return lerr(`Service '${serviceFolder}' is missing a manifest.json file.`);
    }
    
    var mnfst;
    try {
      mnfst = require(manPath);
    } catch (e) {
      return lerr(`Error loading manifest for service '${serviceFolder}':`, e);
    }
    
    if (mnfst == null) {
      return lerr(`Error loading manifest for service '${serviceFolder}': mnfst is null or undefined (This should never happen. If it does, please report it at https://github.com/thislooksfun/audio_queue and include the manifest.json used)`);
    }
    
    // Store for later use when uninstalling
    mnfst._reqPaths = [require.resolve(manPath)];
    
    if (!misc.verifyKeys(serviceFolder, mnfst, requiredKeys)) {
      return null;  // Error message was aleady printed
    }
    
    var deps = null;
    if (mnfst.dependencies != null) {
      deps = [];
      for (let name in mnfst.dependencies) {
        let version = mnfst.dependencies[name];
        deps.push({name: name, version: version});
      }
    }
    
    let prep    = lazyLoadScript("prep",   mnfst, servPath);
    let play    = lazyLoadScript("play",   mnfst, servPath);
    let search  = lazyLoadScript("search", mnfst, servPath);
    let getInfo = lazyLoadScript("info",   mnfst, servPath);
    
    var ffExtInfo;
    if (mnfst.extension != null) {
      var res = processExtensionInfo(mnfst.extension, servPath, mnfst.name, ffExtPath);
      if (!res.s) {
        if (res.msgs != null) log.error(`Error loading extension info for module '${mnfst.name}':`, ...res.msgs);
        return null;
      }
      ffExtInfo = res.ff;
    }
    
    return {
      raw: mnfst,
      name: mnfst.name,
      deps: deps,
      prep: prep,
      play: play,
      search: search,
      getInfo: getInfo,
      extension: ffExtInfo
    };
  }
};