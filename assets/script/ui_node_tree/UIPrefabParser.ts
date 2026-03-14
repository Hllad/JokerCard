/**
 * UI Prefab 解析器
 * 用于解析 Cocos Creator 的 .prefab 文件，提取 UI 节点树结构
 */

export interface UINodeInfo {
    /** 节点名称 */
    name: string;
    /** 节点路径（从根节点开始的完整路径） */
    path: string;
    /** 是否激活 */
    active: boolean;
    /** 本地位置 */
    position: { x: number; y: number; z: number };
    /** 本地缩放 */
    scale: { x: number; y: number; z: number };
    /** 本地旋转（欧拉角） */
    euler: { x: number; y: number; z: number };
    /** 组件列表 */
    components: string[];
    /** 子节点 */
    children: UINodeInfo[];
}

export interface PrefabNodeTree {
    /** Prefab 文件名 */
    prefabName: string;
    /** 根节点 */
    root: UINodeInfo;
    /** 节点总数 */
    totalNodeCount: number;
}

/**
 * Prefab JSON 中的元素类型
 */
interface PrefabElement {
    __type__: string;
    __id__?: number;
    _name?: string;
    _active?: boolean;
    _parent?: { __id__: number } | null;
    _children?: { __id__: number }[];
    _components?: { __id__: number }[];
    _lpos?: { x: number; y: number; z: number };
    _lscale?: { x: number; y: number; z: number };
    _euler?: { x: number; y: number; z: number };
    node?: { __id__: number };
    data?: { __id__: number };
}

export class UIPrefabParser {
    /**
     * 解析 Prefab JSON 数据
     * @param prefabData Prefab 文件解析后的 JSON 数组
     * @param prefabName Prefab 名称（用于输出）
     * @returns 节点树结构
     */
    static parse(prefabData: PrefabElement[], prefabName: string): PrefabNodeTree {
        const nodeMap = new Map<number, PrefabElement>();
        const componentMap = new Map<number, PrefabElement>();
        let rootNodeId: number = -1;

        // 第一步：建立 ID 映射表
        for (const element of prefabData) {
            if (typeof element.__id__ === 'number') {
                if (element.__type__ === 'cc.Node') {
                    nodeMap.set(element.__id__, element);
                } else if (element.__type__?.startsWith('cc.')) {
                    componentMap.set(element.__id__, element);
                } else if (element.__type__ === 'cc.Prefab' && element.data) {
                    rootNodeId = element.data.__id__;
                }
            }
        }

        // 如果没有找到根节点，查找没有 parent 的节点作为根节点
        if (rootNodeId === -1) {
            for (const [id, node] of nodeMap) {
                if (!node._parent) {
                    rootNodeId = id;
                    break;
                }
            }
        }

        // 第二步：递归构建节点树
        const buildNodeTree = (nodeId: number, parentPath: string = ''): UINodeInfo | null => {
            const node = nodeMap.get(nodeId);
            if (!node) return null;

            const nodeName = node._name || 'Unknown';
            const currentPath = parentPath ? `${parentPath}/${nodeName}` : nodeName;

            // 收集组件信息
            const components: string[] = [];
            if (node._components) {
                for (const compRef of node._components) {
                    const comp = componentMap.get(compRef.__id__);
                    if (comp && comp.__type__) {
                        // 提取组件类型名（去掉 cc. 前缀）
                        const compType = comp.__type__.replace('cc.', '');
                        components.push(compType);
                    }
                }
            }

            // 递归构建子节点
            const children: UINodeInfo[] = [];
            if (node._children) {
                for (const childRef of node._children) {
                    const childNode = buildNodeTree(childRef.__id__, currentPath);
                    if (childNode) {
                        children.push(childNode);
                    }
                }
            }

            return {
                name: nodeName,
                path: currentPath,
                active: node._active ?? true,
                position: node._lpos ?? { x: 0, y: 0, z: 0 },
                scale: node._lscale ?? { x: 1, y: 1, z: 1 },
                euler: node._euler ?? { x: 0, y: 0, z: 0 },
                components,
                children
            };
        };

        const root = buildNodeTree(rootNodeId);
        if (!root) {
            throw new Error(`无法找到根节点: ${prefabName}`);
        }

        // 计算节点总数
        const countNodes = (node: UINodeInfo): number => {
            let count = 1;
            for (const child of node.children) {
                count += countNodes(child);
            }
            return count;
        };

        return {
            prefabName,
            root,
            totalNodeCount: countNodes(root)
        };
    }

    /**
     * 将节点树转换为扁平化的节点列表（便于查找）
     * @param tree 节点树
     * @returns 扁平化的节点列表
     */
    static flatten(tree: PrefabNodeTree): UINodeInfo[] {
        const result: UINodeInfo[] = [];

        const traverse = (node: UINodeInfo) => {
            result.push(node);
            for (const child of node.children) {
                traverse(child);
            }
        };

        traverse(tree.root);
        return result;
    }

    /**
     * 在节点树中查找特定名称的节点
     * @param tree 节点树
     * @param nodeName 要查找的节点名称
     * @returns 找到的节点列表
     */
    static findNodesByName(tree: PrefabNodeTree, nodeName: string): UINodeInfo[] {
        const result: UINodeInfo[] = [];

        const traverse = (node: UINodeInfo) => {
            if (node.name === nodeName) {
                result.push(node);
            }
            for (const child of node.children) {
                traverse(child);
            }
        };

        traverse(tree.root);
        return result;
    }

    /**
     * 在节点树中查找包含特定组件的节点
     * @param tree 节点树
     * @param componentType 组件类型（如 'Sprite', 'Button' 等）
     * @returns 找到的节点列表
     */
    static findNodesByComponent(tree: PrefabNodeTree, componentType: string): UINodeInfo[] {
        const result: UINodeInfo[] = [];

        const traverse = (node: UINodeInfo) => {
            if (node.components.includes(componentType)) {
                result.push(node);
            }
            for (const child of node.children) {
                traverse(child);
            }
        };

        traverse(tree.root);
        return result;
    }
}
