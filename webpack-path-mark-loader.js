
var cwd = process.cwd();
var getRelativePath = function (path) {
    return path.replace(cwd, '.').replace(/.*\/node_modules\//, '');
};

module.exports = function(content) {
	  this.cacheable && this.cacheable();
    var path = getRelativePath(this.resourcePath);
    return '/* ' + path + ' */\n' + content;
};
