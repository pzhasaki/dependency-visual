/* 
    目录类
*/

class TreeNode {
    path: string;
    children: (TreeNode | LeaveNode | null)[];
    constructor(path = '', children = []) {
        this.path = path;
        this.children = children;
    }
}

/* 
    单文件类
*/
class LeaveNode {
    path: string;
    imported: Imported;
    exported: Exported;
    constructor(path = '', imported:Imported = {}, exported = []) {
        this.path = path;
        this.imported = imported;
        this.exported = exported;
    }
}

type Imported = {
    [path: string]: {
        node: LeaveNode | null,
        isReferEach: boolean
        relativePath: string,
        variable: {
            type: string,
            importedName?: string,
            localName: string,
            
        }[]
    },
}

type Exported = {
    type: string,
    exportedName: string,
    localName?: string,
    source?: string,
}[]

export { TreeNode, LeaveNode };