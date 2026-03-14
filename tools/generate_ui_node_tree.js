/**
 * UI 节点树生成工具
 * 解析 Cocos Creator 的 .prefab 文件，生成对应的 JSON 节点树
 * 
 * 使用方法:
 *   node tools/generate_ui_node_tree.js [options]
 * 
 * 选项:
 *   --gui <path>      GUI 目录路径 (默认: ./assets/resources/GUI)
 *   --output <path>   输出目录路径 (默认: ./assets/script/ui_node_tree)
 *   --watch           监听模式，文件变化时自动重新生成
 * 
 * 示例:
 *   node tools/generate_ui_node_tree.js
 *   node tools/generate_ui_node_tree.js --gui ./assets/resources/GUI --output ./assets/script/ui_node_tree
 *   node tools/generate_ui_node_tree.js --watch
 */

const fs = require('fs');
const path = require('path');

// ==================== 配置 ====================
const CONFIG = {
    guiDir: './assets/resources/GUI',
    outputDir: './assets/script/ui_node_tree',
    watchMode: false
};

// ==================== UIPrefabParser ====================

class UIPrefabParser {
    /**
     * 解析 Prefab JSON 数据
     */
    static parse(prefabData, prefabName) {
        const nodeMap = new Map();
        const componentMap = new Map();
        let rootNodeId = -1;

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
        const buildNodeTree = (nodeId, parentPath = '') => {
            const node = nodeMap.get(nodeId);
            if (!node) return null;

            const nodeName = node._name || 'Unknown';
            const currentPath = parentPath ? `${parentPath}/${nodeName}` : nodeName;

            // 收集组件信息
            const components = [];
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
            const children = [];
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
        const countNodes = (node) => {
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
}

// ==================== 生成器 ====================

class UINodeTreeGenerator {
    constructor() {
        this.guiDir = '';
        this.outputDir = '';
    }

    /**
     * 解析单个 Prefab 文件
     */
    parsePrefab(prefabPath) {
        try {
            if (!fs.existsSync(prefabPath)) {
                console.error(`❌ Prefab 文件不存在: ${prefabPath}`);
                return null;
            }

            const content = fs.readFileSync(prefabPath, 'utf-8');
            const prefabData = JSON.parse(content);
            
            const prefabName = path.basename(prefabPath, '.prefab');
            const tree = UIPrefabParser.parse(prefabData, prefabName);
            
            console.log(`  ✅ ${prefabName} (${tree.totalNodeCount} 个节点)`);
            return tree;
        } catch (error) {
            console.error(`  ❌ 解析失败: ${prefabPath}`, error.message);
            return null;
        }
    }

    /**
     * 将节点树保存为 JSON 文件
     */
    saveToJson(tree, outputPath) {
        try {
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const jsonContent = JSON.stringify(tree, null, 2);
            fs.writeFileSync(outputPath, jsonContent);
        } catch (error) {
            console.error(`❌ 保存失败: ${outputPath}`, error.message);
        }
    }

    /**
     * 批量处理目录下的所有 Prefab 文件
     */
    batchProcess() {
        const result = {
            success: 0,
            failed: 0,
            files: []
        };

        console.log(`\n📁 GUI 目录: ${this.guiDir}`);
        console.log(`📁 输出目录: ${this.outputDir}\n`);

        // 确保输出目录存在
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        // 检查 GUI 目录是否存在
        if (!fs.existsSync(this.guiDir)) {
            console.error(`❌ GUI 目录不存在: ${this.guiDir}`);
            return result;
        }

        // 读取目录下的所有文件
        const files = fs.readdirSync(this.guiDir);
        const prefabFiles = files.filter(f => f.endsWith('.prefab'));
        
        if (prefabFiles.length === 0) {
            console.log('⚠️ 未找到 .prefab 文件');
            return result;
        }

        console.log(`🔍 发现 ${prefabFiles.length} 个 Prefab 文件:\n`);

        for (const file of prefabFiles) {
            const prefabPath = path.join(this.guiDir, file);
            const tree = this.parsePrefab(prefabPath);
            
            if (tree) {
                const outputName = file.replace('.prefab', '_tree.json');
                const outputPath = path.join(this.outputDir, outputName);
                this.saveToJson(tree, outputPath);
                result.success++;
                result.files.push(outputName);
            } else {
                result.failed++;
            }
        }

        console.log(`\n✨ 处理完成: 成功 ${result.success} 个, 失败 ${result.failed} 个`);
        return result;
    }

    /**
     * 监听模式
     */
    watch() {
        console.log(`\n👀 监听模式中... (按 Ctrl+C 退出)`);
        console.log(`   监听目录: ${this.guiDir}\n`);

        // 首次执行
        this.batchProcess();

        // 监听文件变化
        fs.watch(this.guiDir, (eventType, filename) => {
            if (filename && filename.endsWith('.prefab')) {
                console.log(`\n📝 检测到变化: ${filename}`);
                
                const prefabPath = path.join(this.guiDir, filename);
                const tree = this.parsePrefab(prefabPath);
                
                if (tree) {
                    const outputName = filename.replace('.prefab', '_tree.json');
                    const outputPath = path.join(this.outputDir, outputName);
                    this.saveToJson(tree, outputPath);
                    console.log(`   已更新: ${outputName}`);
                }
            }
        });
    }

    /**
     * 设置路径
     */
    setPaths(guiDir, outputDir) {
        // 转换为绝对路径
        this.guiDir = path.isAbsolute(guiDir) 
            ? guiDir 
            : path.resolve(process.cwd(), guiDir);
        this.outputDir = path.isAbsolute(outputDir) 
            ? outputDir 
            : path.resolve(process.cwd(), outputDir);
    }
}

// ==================== 主程序 ====================

function showHelp() {
    console.log(`
UI 节点树生成工具

用法: node tools/generate_ui_node_tree.js [选项]

选项:
  --gui <path>      GUI 目录路径 (默认: ./assets/resources/GUI)
  --output <path>   输出目录路径 (默认: ./assets/script/ui_node_tree)
  --watch           监听模式，文件变化时自动重新生成
  --help            显示帮助信息

示例:
  node tools/generate_ui_node_tree.js
  node tools/generate_ui_node_tree.js --gui ./assets/resources/GUI --output ./assets/script/ui_node_tree
  node tools/generate_ui_node_tree.js --watch
`);
}

function main() {
    const args = process.argv.slice(2);

    // 显示帮助
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    // 解析参数
    let guiDir = CONFIG.guiDir;
    let outputDir = CONFIG.outputDir;
    let watchMode = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--gui' && i + 1 < args.length) {
            guiDir = args[i + 1];
        } else if (args[i] === '--output' && i + 1 < args.length) {
            outputDir = args[i + 1];
        } else if (args[i] === '--watch' || args[i] === '-w') {
            watchMode = true;
        }
    }

    // 创建生成器
    const generator = new UINodeTreeGenerator();
    generator.setPaths(guiDir, outputDir);

    console.log('\n========================================');
    console.log('   UI 节点树生成工具');
    console.log('========================================');

    if (watchMode) {
        generator.watch();
    } else {
        const result = generator.batchProcess();
        
        if (result.success > 0) {
            console.log('\n📄 生成的文件:');
            for (const file of result.files) {
                console.log(`   - ${file}`);
            }
        }
        console.log('\n✅ 完成!\n');
    }
}

main();
