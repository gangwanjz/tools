
var libraries = [{
    name: 'vendor',
    libraries: [],
    entries: [
        'react',
        'lodash-compat',
        'immutable',
        'css-loader/lib/css-base.js',
        'mtf.common/css/normalize.scss',
        'mtf.common/css/bootstrap.scss',
    ],
}, {
    name: 'common',
    libraries: ['vendor'],
    entries: [
        'mtf.common/js',
        'mtf.common/js/lodash',
        'mtf.common/css',
        'mtf.common/icon',
        'mtf.element/mt-button',
        'mtf.element/mt-checkbox',
        'mtf.element/mt-checkbox-group',
        'mtf.element/mt-dialog',
        'mtf.element/mt-grid',
        'mtf.element/mt-icon',
        'mtf.element/mt-input',
        'mtf.element/mt-input/date',
        'mtf.element/mt-input/ref',
        'mtf.element/mt-input/list',
        'mtf.element/mt-input/multiList',
        'mtf.element/mt-label',
        'mtf.element/mt-loading',
        'mtf.element/mt-pagination',
        'mtf.element/mt-radio',
        'mtf.element/mt-radio-group',
        'mtf.element/mt-tabs',
        'mtf.element/mt-tip',
        'mtf.element/mt-toaster',
        'mtf.element/mt-uploader',
        'mtf.element/mt-workspace',
        'mtf.complex/node-bill',
        'mtf.complex/node-bill/slave',
        'mtf.complex/node-gp',
        'mtf.complex/node-util/holdFields',
        'mtf.complex/node-util/node',
        'mtf.complex/node-util/url',
    ],
}, {
    name: 'codable',
    libraries: ['vendor', 'common'],
    entries: [
        'brace',
        'mtf.element/mt-code',
        'mtf.element/mt-doc',
        'mtf.element/mt-docdemo',
    ],
}];

//module.exports = libraries;
libraries.forEach(function (library) {
    exports[library.name] = library;
});
