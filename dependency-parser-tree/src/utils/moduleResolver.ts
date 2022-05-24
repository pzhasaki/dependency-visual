import path from 'path';
import fs from 'fs';
import { LeaveNode } from '../nodeClass';

export default function moduleResolver(filePath: string, requirePath: string):string {

    requirePath = path.resolve(path.dirname(filePath), requirePath);

    // 过滤掉第三方模块
    if (requirePath.includes('node_modules')) return '';

    requirePath = moduleExtComplete(requirePath);
    
    return requirePath;
}

/* 
    moduleExtComplete 补全模块路径
        params : 
            - modulePath 需要补全的模块路径
        return :
            返回补全的文件路径    
*/
function moduleExtComplete(modulePath: string): string {

    let tryModulePath = '';
    const EXTS = ['.tsx', '.ts', '.jsx', '.js'];

    if (modulePath.match(/\.[a-zA-Z]+$/)) return modulePath;

    if (isDirectory(modulePath)) {
        // 如果是目录文件则查找目录下的 index.js
        tryModulePath = tryCompletePath(EXTS, ext => path.join(modulePath, 'index' + ext));
    } else if (!EXTS.some(ext => modulePath.endsWith(ext))) {
        tryModulePath = tryCompletePath(EXTS, (ext) => modulePath + ext);
    }

    if (!tryModulePath) {
        reportModuleNotFoundError(modulePath);
        return modulePath
    }

    return tryModulePath;
}

/* 
    tryCompletePath 1. 查找目录下的 index.xx 2. 补全文件后缀 
        params :
            - extMap 可能的文件后缀
            - resolvePath 操作路径的回调函数
        return :
            返回补全的文件路径
*/
function tryCompletePath(extMap: string[], resolvePath: (ext: string) => string): string {
    for (let i = 0; i < extMap.length; i++) {
        const tryPath = resolvePath(extMap[i]);
        // 判断文件是否存在
        if (fs.existsSync(tryPath)) return tryPath;
    }
    return '';
}

/* 
    reportModuleNotFoundError 抛出模块查找失败的异常
        params : 
            - modulePath 模块路径
*/
function reportModuleNotFoundError(modulePath: string): void {
    throw 'module not found: ' + modulePath;
}

/* 
    isDirectory 判断模块是否为目录文件
        params : 
            - filePath 文件路径
        return :
            true/false
*/
function isDirectory(filePath: string): boolean {
    try {
        return fs.statSync(filePath).isDirectory()
    } catch (e) { }

    return false;
}