
var template = `(
new Promise(function (resolve) {
  require.ensure([], function () {
    var module = require($1);
    resolve(module.__esModule ? module.default : module);
  }, $2);
})
)`.replace(/\s+/g, ' ');

module.exports = function (content) {
  this.cacheable && this.cacheable();
  return content.replace(/async\(require\(([^)]*)\), ([^)]*)\)/g, template);
};
