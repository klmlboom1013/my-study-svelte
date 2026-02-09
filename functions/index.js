const functions = require('firebase-functions');
const { default: ssr } = require('./ssr');

exports.ssr = functions.https.onRequest(ssr);
