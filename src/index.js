const through           = require("through2");
const mjmlDefaultEngine = require("mjml");
const replaceExt        = require("replace-ext");
const PluginError       = require("plugin-error");

const NAME = "MJML";

function error(file) {
  return function (message) {
    return new PluginError(NAME, "Error in file " + file + ": " + message);
  };
}

function html2cshtml(s) {
  return newLineAfterModel(replaceCssDirectives(s))
}

function replaceCssDirectives(s) {
  var regex = /<style[^>]*>([^<]*)<\/style>/g

  return s.replace(regex, function (match) {
    return match.replace(/@/g, '@@')
  })
}

function newLineAfterModel(s) {
  var regex = /@model [a-zA-Z\.]*/g

  return s.replace(regex, function (match) {
    return match + "\n"
  })
}

module.exports = function mjml(mjmlEngine, options) {
  if (!mjmlEngine) {
    mjmlEngine = mjmlDefaultEngine;
  }
  if (options === undefined) {
    options = {};
  }

  return through.obj(function (file, enc, callback) {
    // Not a big fan of this deep copy methods
    // But it will work regardless of Node version
    const localOptions = JSON.parse(JSON.stringify(options));
    if (localOptions.filePath === undefined) {
      localOptions.filePath = file.path.toString();
    }

    const raise = error(localOptions.filePath);

    if (file.isStream()) {
      this.emit("error", raise("Streams are not supported!"));
      return callback();
    }

    if (file.isBuffer()) {
      const output = file.clone();
      let render;

      try {
        render        = mjmlEngine(file.contents.toString(), localOptions);
        render.cshtml = html2cshtml(render.html);
      }
      catch (e) {
        this.emit("error", raise(e.message));
        return callback();
      }

      // [DEP0005] DeprecationWarning: Buffer() is deprecated due to security and usability issues
      output.contents = Buffer.from(render.cshtml);
      output.path     = replaceExt(file.path.toString(), localOptions.fileExt || ".cshtml");
      this.push(output);
    }
    return callback();
  });
};
