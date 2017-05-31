'use strict';

var EXPORTED_SYMBOLS = ['Promise'];
    
var Promise = require('./bluebird/promise')();

Promise.config({
    warnings: true,
    longStackTraces: true,
    cancellation: true
});

// TEMP: Only turn on if debug logging enabled?
Promise.onPossiblyUnhandledRejection((e, promise) => {
    if (e.name == 'ZoteroPromiseInterrupt' || e.handledRejection) {
        return;
    }

    typeof Zotero !== 'undefined' && Zotero.debug('Possibly unhandled rejection:\n\n' + (e.message || e));
    throw e;
});

module.exports = Promise;