import fs from 'fs';

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

import moduleResolver from './utils/moduleResolver';

import type { NodePath } from '@babel/traverse';
import { ExportSpecifier, Identifier } from '@babel/types';

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
    exports: Record<string, any>[];
    subModules: Record<string, any>;
    constructor(path: string = '', imports = {}, exports = []) {
        this.path = path;
        this.imports = imports;
        this.exports = exports;
        this.subModules = {};
    }
}

/* 
    ImportDeclaration 的类型
        - 按需引入
        - 命名空间引入
        - 默认引入
*/
const IMPORT_TYPE = {
    deconstruct: 'deconstruct',
    default: 'default',
    namespace: 'namespace'
}

/* 
    ExportDeclaration 的类型
        - 全部导出
        - 默认导出
        - 命名导出
*/
const EXPORT_TYPE = {
    all: 'all',
    default: 'default',
    named: 'named'
}

/* 
    traverseRoot 处理根路径，返回依赖分析的结果
        params :
            - rootPath 根路径
        return :
            - dependencyGraph 依赖分析的结果
*/
export default function traverseRoot(rootPath: string) {
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

    traverse(ast, {
        ImportDeclaration(path) {
            // 子依赖路径
            const subModulePath = moduleResolver(curModulePath, path.node.source.value, visitedModules);
            if (!subModulePath) return;

            const specifierPaths = path.get('specifiers');

            dependencyNode.imports[subModulePath] = specifierPaths.map(specifierPath => {
                if (specifierPath.isImportSpecifier()) {
                    return {
                        type: IMPORT_TYPE.deconstruct,
                        imported: (specifierPath.get('imported') as NodePath<Identifier>).node.name,
                        local: specifierPath.get('local').node.name
                    }
                } else if (specifierPath.isImportDefaultSpecifier()) {
                    return {
                        type: IMPORT_TYPE.default,
                        local: specifierPath.get('local').node.name
                    }
                } else {
                    return {
                        type: IMPORT_TYPE.namespace,
                        local: specifierPath.get('local').node.name
                    }
                }
            });

            const subModule = new DependencyNode();
            traverseModule(subModulePath, subModule, visitedModules, resultModules);
            dependencyNode.subModules[subModulePath] = subModule;
        },
        ExportDeclaration(path) {
            if (path.isExportNamedDeclaration()) {
                const specifierPaths = path.get('specifiers') as NodePath<ExportSpecifier>[];

                dependencyNode.exports = specifierPaths.map(specifierPath => {
                    return {
                        type: EXPORT_TYPE.named,
                        exported: (specifierPath.get('exported') as NodePath<Identifier>).node.name,
                        local: specifierPath.get('local').node.name
                    };
                });
            } else if (path.isExportDefaultDeclaration()) {
                let exportName;
                const declarationPath = path.get('declaration');
                if (declarationPath.isAssignmentExpression()) {
                    exportName = declarationPath.get('left').toString();
                } else {
                    exportName = declarationPath.toString()
                }
                dependencyNode.exports.push({
                    type: EXPORT_TYPE.default,
                    exported: exportName
                });
            } else if (path.isExportAllDeclaration()) {

                dependencyNode.exports.push({
                    type: EXPORT_TYPE.all,
                    exported: '*',
                    source: path.get('source').node.value
                })
            }
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
    const plugins: parser.ParserPlugin[] = [];
    if (['.tsx', '.jsx'].some(ext => modulePath.endsWith(ext))) {
        plugins.push('jsx');
    }
    if (['.ts', '.tsx'].some(ext => modulePath.endsWith(ext))) {
        plugins.push('typescript');
    }
    return plugins;
}


