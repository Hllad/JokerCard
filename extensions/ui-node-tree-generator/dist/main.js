// Cocos Creator 扩展 - UI 节点树生成器
// 在编辑器菜单 工具 -> UI节点树 -> 生成节点树 JSON 中调用

const fs = require('fs');
const path = require('path');

/**
 * 解析 Prefab JSON 数据
 */
function parsePrefab(prefabData, prefabName) {
    const nodeMap = {};
    const componentMap = {};
    let rootNodeId = -1;

    // 建立 ID 映射表（使用数组索引作为 ID）
    for (let index = 0; index < prefabData.length; index++) {
        const element = prefabData[index];
        const elemType = element.__type__ || '';
        
        if (elemType === 'cc.Node') {
            nodeMap[index] = element;
        } else if (elemType.startsWith('cc.')) {
            componentMap[index] = element;
        } else if (elemType === 'cc.Prefab' && element.data) {
            rootNodeId = element.data.__id__;
        }
    }

    // 如果没有找到根节点，查找没有 parent 的节点
    if (rootNodeId === -1) {
        for (const nodeId in nodeMap) {
            if (!nodeMap[nodeId]._parent) {
                rootNodeId = parseInt(nodeId);
                break;
            }
        }
    }

    // 递归构建节点树
    function buildNodeTree(nodeId, parentPath = '') {
        const node = nodeMap[nodeId];
        if (!node) return null;

        const nodeName = node._name || 'Unknown';
        const currentPath = parentPath ? `${parentPath}/${nodeName}` : nodeName;

        // 收集组件
        const components = [];
        const compRefs = node._components || [];
        for (const compRef of compRefs) {
            const comp = componentMap[compRef.__id__];
            if (comp && comp.__type__) {
                components.push(comp.__type__.replace('cc.', ''));
            }
        }

        // 递归构建子节点
        const children = [];
        const childRefs = node._children || [];
        for (const childRef of childRefs) {
            const childNode = buildNodeTree(childRef.__id__, currentPath);
            if (childNode) {
                children.push(childNode);
            }
        }

        return {
            name: nodeName,
            path: currentPath,
            active: node._active !== undefined ? node._active : true,
            position: node._lpos || { x: 0, y: 0, z: 0 },
            scale: node._lscale || { x: 1, y: 1, z: 1 },
            euler: node._euler || { x: 0, y: 0, z: 0 },
            components,
            children
        };
    }

    const root = buildNodeTree(rootNodeId);
    if (!root) {
        throw new Error(`无法找到根节点: ${prefabName}`);
    }

    // 计算节点数
    function countNodes(node) {
        let count = 1;
        for (const child of node.children) {
            count += countNodes(child);
        }
        return count;
    }

    return {
        prefabName,
        root,
        totalNodeCount: countNodes(root)
    };
}

/**
 * 批量处理 Prefab 文件
 */
async function batchProcess(guiDir, outputDir) {
    const result = {
        success: 0,
        failed: 0,
        files: []
    };

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 检查 GUI 目录
    if (!fs.existsSync(guiDir)) {
        console.error(`GUI 目录不存在: ${guiDir}`);
        return result;
    }

    // 读取文件
    const files = fs.readdirSync(guiDir);
    const prefabFiles = files.filter(f => f.endsWith('.prefab'));

    for (const file of prefabFiles) {
        try {
            const prefabPath = path.join(guiDir, file);
            const content = fs.readFileSync(prefabPath, 'utf-8');
            const prefabData = JSON.parse(content);

            const prefabName = path.basename(file, '.prefab');
            const tree = parsePrefab(prefabData, prefabName);

            const outputName = file.replace('.prefab', '_tree.json');
            const outputPath = path.join(outputDir, outputName);
            fs.writeFileSync(outputPath, JSON.stringify(tree, null, 2));

            result.success++;
            result.files.push(outputName);
            console.log(`[OK] ${prefabName} (${tree.totalNodeCount} 个节点)`);
        } catch (error) {
            result.failed++;
            console.error(`[X] 解析失败: ${file} - ${error.message}`);
        }
    }

    return result;
}

/**
 * 导出方法
 */
exports.methods = {
    async generateNodeTree() {
        console.log('[UI节点树生成器] 开始生成...');

        // 获取项目路径
        const projectPath = Editor.Project.path;
        const guiDir = path.join(projectPath, 'assets/resources/GUI');
        const outputDir = path.join(projectPath, 'assets/script/ui_node_tree');

        try {
            const result = await batchProcess(guiDir, outputDir);
            
            if (result.success > 0) {
                console.log(`[UI节点树生成器] 成功生成 ${result.success} 个文件:`);
                for (const file of result.files) {
                    console.log(`  - ${file}`);
                }
                
                // 刷新资源管理器
                Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/script/ui_node_tree');
                
                // 显示成功提示
                Editor.Dialog.info('UI节点树生成成功', `已生成 ${result.success} 个 JSON 文件到 assets/script/ui_node_tree/`);
            } else {
                Editor.Dialog.warn('未生成文件', '未找到 .prefab 文件或处理失败');
            }
        } catch (error) {
            console.error('[UI节点树生成器] 错误:', error);
            Editor.Dialog.error('生成失败', error.message);
        }
    }
};

/**
 * 生命周期函数
 */
exports.load = function() {
    console.log('[UI节点树生成器] 扩展已加载');
};

exports.unload = function() {
    console.log('[UI节点树生成器] 扩展已卸载');
};
