import fs from 'fs';

import parser  from '@babel/parser' ;
import travese  from '@babel/traverse';

import moduleResolver from './utils/moduleResolver';

/* 
    DependencyNode 依赖节点
*/
class DependencyNode {
    /* 
        path: 节点的路径
        imports: 导入模块的集合
        exports: 导出模块的集合
        subModules: 子模块的集合
    */
    path: string;
    imports: Record<string, any>;
    exports: Record<string, any>;
    subModules: Record<string, any>;
    constructor(path:string = '', imports = {}, exports = {}) {
        this.path = path;
        this.imports = imports;
        this.exports = exports;
        this.subModules = {};
    }
}

/* 
    ImportDeclaration 的类型
        - 解构引入
        - 命名空间引入
        - 默认引入
*/
const IMPORT_TYPE = {
    deconstruct: 'deconstruct',
    default: 'default',
    namespace: 'namespace'
}

/* 
    parsingRoot 处理根路径，返回依赖分析的结果
        params :
            - rootPath 根路径
        return :
            - dependencyGraph 依赖分析的结果
*/
export default function traverseRoot(rootPath:string) {
    /* 
        dependencyGraph: 依赖分析的结果
            - root 根路径
            - resultModules 依赖结果
    */
    const dependencyGraph = {
        root: new DependencyNode(),
        resultModules: {}
    };
    // 存储访问过的依赖
    const visitedModules: Set<string> = new Set();

    traverseModule(rootPath, dependencyGraph.root, visitedModules, dependencyGraph.resultModules);
    return dependencyGraph;
}

/* 
    traverseModule 遍历文件模块
        params : 
            - curModulePath 当前模块的路径
            - dependencyNode 当前的依赖节点
            - resultModules 依赖结果
        return : 
            void
*/
function traverseModule(curModulePath: string, dependencyNode: DependencyNode, visitedModules: Set<string>, resultModules: Record<string, any>) {
    const moduleContent = fs.readFileSync(curModulePath, {
        encoding: 'utf-8'
    });

    dependencyNode.path = curModulePath;

    const ast = parser.parse(moduleContent, {
        sourceType: 'unambiguous',
        plugins: resolveBabelSyntaxtPlugins(curModulePath)
    });

    travese(ast, {
        ImportDeclaration(path) {
            console.log(path);
            // const subModulePath = moduleResolver(curModulePath, path.get('source.value'), visitedModules);
        },
        ExportDeclaration(path) {

        }
    });

    resultModules[curModulePath] = dependencyNode;
}

/* 
    resolveBabelSyntaxtPlugins 分析 babel/parser 所需要的插件
        params : 
            - modulePath 模块的路径
        return :
            - babel/parser 所需的插件
*/
function resolveBabelSyntaxtPlugins(modulePath: string) {
    const plugins:parser.ParserPlugin[] = [];
    if (['.tsx', '.jsx'].some(ext => modulePath.endsWith(ext))) {
        plugins.push('jsx');
    }
    if (['.ts', '.tsx'].some(ext => modulePath.endsWith(ext))) {
        plugins.push('typescript');
    }
    return plugins;
}


