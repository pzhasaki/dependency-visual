import path from 'path';

import getDependencyTree from './src/index'

const res = getDependencyTree(path.resolve(__dirname , './test-project'));

console.log(res);

