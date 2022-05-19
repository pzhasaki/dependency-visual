const path = require('path');
// const fs = require('fs');

const traverseRoot = require('./src/traverseRoot');

const dependencyGraph = traverseRoot(path.resolve(__dirname, '../test-project/index.js'));