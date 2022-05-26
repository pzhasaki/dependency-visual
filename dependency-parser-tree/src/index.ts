import path from "path";
import { readdirSync } from "fs";
import { TreeNode, LeaveNode } from "./nodeClass";
import analyseDependence from "./analyse-single-file";


export default function getDependencyTree(rootDir: string): TreeNode {

    const leaveNodeMap: Map<string, LeaveNode> = new Map();
    const referSet: Set<string> = new Set();
    const waiter: ((leaveNodeMap: Map<string, LeaveNode>, referSet: Set<string>) => void)[] = [];

    const treeNode = traverseDir(rootDir);
    // 给 leaveNode 补充对应的 impoted 节点， 并判断循环引用
    for(const fn of waiter) fn(leaveNodeMap, referSet);

    return treeNode;

    function traverseDir(filePath: string): TreeNode {

        if (path.extname(filePath)) throw new TypeError('not Directory')

        const treeNode = new TreeNode(filePath);

        const fileArr: string[] = [];

        // 为了保证原目录结构，我们把 目录文件 放在 children 数组的前列
        for (const subPath of readdirSync(filePath)) {
            const fullSubPath = path.resolve(filePath, subPath);

            if (path.extname(fullSubPath)) fileArr.push(fullSubPath);
            else treeNode.children.push(traverseDir(fullSubPath));
        };

        for (const file of fileArr) treeNode.children.push(analyseDependence(file, leaveNodeMap, referSet, waiter));

        return treeNode;
    }
}



