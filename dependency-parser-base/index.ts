import path from 'path';

import traverseRoot from './src/traverseRoot';

const dependencyGraph = traverseRoot(path.resolve(__dirname, './test-project/index.js'));

console.log(dependencyGraph);

