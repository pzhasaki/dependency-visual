import fs from 'fs';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import moduleResolver from './utils/moduleResolver';
import type { NodePath } from '@babel/traverse';
import { ExportSpecifier, Identifier } from '@babel/types';
import { LeaveNode } from "./nodeClass";


const IMPORT_TYPE = {
    deconstruct: 'deconstruct',
    default: 'default',
    namespace: 'namespace'
};

const EXPORT_TYPE = {
    all: 'all',
    default: 'default',
    named: 'named'
};

export default function analyseDependence(filePath: string, leaveNodeMap: Map<string, LeaveNode>, referSet: Set<string>, waiter: ((leaveNodeMap: Map<string, LeaveNode>, referSet: Set<string>) => void)[]): LeaveNode {

    const moduleContent = fs.readFileSync(filePath, {
        encoding: 'utf-8'
    });

    const ast = parser.parse(moduleContent, {
        sourceType: 'unambiguous',
        plugins: resolveBabelSyntaxtPlugins(filePath)
    });

    const leaveNode = new LeaveNode(filePath);

    traverse(ast, {
        ImportDeclaration(path) {
            // 子依赖路径
            const relativePath = path.node.source.value;
            const modulePath = moduleResolver(filePath, relativePath);
            if (!modulePath) return;

            const referStr = filePath + '--' + modulePath;
            referSet.add(referStr);

            waiter.push((leaveNodeMap: Map<string, LeaveNode>, referSet: Set<string>) => {
                const reference = modulePath + '--' + filePath;
                if (referSet.has(reference)) {
                    leaveNode.imported[modulePath].isReferEach = true;
                }
                leaveNode.imported[modulePath].node = leaveNodeMap.get(modulePath)!;
            });

            const specifierPaths = path.get('specifiers');

            leaveNode.imported[modulePath] = {
                node: null,
                isReferEach: false,
                relativePath,
                variable: specifierPaths.map(specifierPath => {
                    if (specifierPath.isImportSpecifier()) {
                        return {
                            type: IMPORT_TYPE.deconstruct,
                            importedName: (specifierPath.get('imported') as NodePath<Identifier>).node.name,
                            localName: specifierPath.get('local').node.name,
                        }
                    } else if (specifierPath.isImportDefaultSpecifier()) {
                        return {
                            type: IMPORT_TYPE.default,
                            localName: specifierPath.get('local').node.name,
                        }
                    } else {
                        return {
                            type: IMPORT_TYPE.namespace,
                            localName: specifierPath.get('local').node.name,
                        }
                    }
                })
            }
        },
        ExportDeclaration(path) {
            if (path.isExportNamedDeclaration()) {
                const specifierPaths = path.get('specifiers') as NodePath<ExportSpecifier>[];

                leaveNode.exported = specifierPaths.map(specifierPath => {
                    return {
                        type: EXPORT_TYPE.named,
                        exportedName: (specifierPath.get('exported') as NodePath<Identifier>).node.name,
                        localName: specifierPath.get('local').node.name
                    };
                });
            } else if (path.isExportDefaultDeclaration()) {
                const declarationPath = path.get('declaration');

                const exportedName = declarationPath.isAssignmentExpression()
                    ? declarationPath.get('left').toString()
                    : declarationPath.toString();

                leaveNode.exported.push({
                    type: EXPORT_TYPE.default,
                    exportedName,
                });
            } else if (path.isExportAllDeclaration()) {
                leaveNode.exported.push({
                    type: EXPORT_TYPE.all,
                    exportedName: '*',
                    source: path.get('source').node.value
                })
            }
        }
    });

    leaveNodeMap.set(filePath, leaveNode);

    return leaveNode;
}


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
