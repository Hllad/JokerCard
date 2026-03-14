/**
 * UI 节点树生成器
 * 批量解析 GUI 目录下的所有 .prefab 文件，生成对应的 JSON 节点树
 * 
 * 使用方法:
 * 1. 在 Cocos Creator 中作为脚本组件运行
 * 2. 或在 Node.js 环境中运行（需要适配文件系统）
 */

import { UIPrefabParser, PrefabNodeTree } from './UIPrefabParser';

// 用于 Node.js 环境的文件系统适配
const isNodeEnv = typeof window === 'undefined';

interface FileSystem {
    readFileSync(path: string, encoding: string): string;
    writeFileSync(path: string, data: string): void;
    existsSync(path: string): boolean;
    mkdirSync(path: string, options?: { recursive?: boolean }): void;
    readdirSync(path: string): string[];
}

export class UINodeTreeGenerator {
    private fs: FileSystem;
    private path: any;

    /**
     * 构造函数
     * @param fsModule 文件系统模块（Node.js 环境传入 require('fs')）
     * @param pathModule 路径模块（Node.js 环境传入 require('path')）
     */
    constructor(fsModule?: FileSystem, pathModule?: any) {
        this.fs = fsModule || this.createCocosFS();
        this.path = pathModule || this.createCocosPath();
    }

    /**
     * 创建 Cocos Creator 环境的文件系统适配
     */
    private createCocosFS(): FileSystem {
        // 在 Cocos Creator 中，使用 Editor 的 API 或本地存储
        return {
            readFileSync: (path: string, encoding: string): string => {
                // 在 Cocos Creator 中可以使用 assetManager 或 Editor 的 API
                // 这里返回空字符串，实际使用时需要适配
                console.warn('请在 Cocos Creator 环境中提供正确的文件系统实现');
                return '';
            },
            writeFileSync: (path: string, data: string): void => {
                console.warn('请在 Cocos Creator 环境中提供正确的文件系统实现');
            },
            existsSync: (path: string): boolean => {
                return false;
            },
            mkdirSync: (path: string, options?: { recursive?: boolean }): void => {
                // 在 Cocos Creator 中可能需要使用其他方式创建目录
            },
            readdirSync: (path: string): string[] => {
                return [];
            }
        };
    }

    /**
     * 创建 Cocos Creator 环境的路径适配
     */
    private createCocosPath(): any {
        return {
            join: (...paths: string[]): string => {
                return paths.join('/').replace(/\/+/g, '/');
            },
            dirname: (path: string): string => {
                return path.substring(0, path.lastIndexOf('/'));
            },
            basename: (path: string, ext?: string): string => {
                let name = path.substring(path.lastIndexOf('/') + 1);
                if (ext && name.endsWith(ext)) {
                    name = name.substring(0, name.length - ext.length);
                }
                return name;
            },
            extname: (path: string): string => {
                const dotIndex = path.lastIndexOf('.');
                return dotIndex >= 0 ? path.substring(dotIndex) : '';
            }
        };
    }

    /**
     * 解析单个 Prefab 文件
     * @param prefabPath Prefab 文件的完整路径
     * @returns 解析后的节点树
     */
    parsePrefab(prefabPath: string): PrefabNodeTree | null {
        try {
            if (!this.fs.existsSync(prefabPath)) {
                console.error(`Prefab 文件不存在: ${prefabPath}`);
                return null;
            }

            const content = this.fs.readFileSync(prefabPath, 'utf-8');
            const prefabData = JSON.parse(content);
            
            const prefabName = this.path.basename(prefabPath, '.prefab');
            const tree = UIPrefabParser.parse(prefabData, prefabName);
            
            console.log(`[UINodeTreeGenerator] 成功解析: ${prefabName} (${tree.totalNodeCount} 个节点)`);
            return tree;
        } catch (error) {
            console.error(`[UINodeTreeGenerator] 解析失败: ${prefabPath}`, error);
            return null;
        }
    }

    /**
     * 将节点树保存为 JSON 文件
     * @param tree 节点树
     * @param outputPath 输出路径
     */
    saveToJson(tree: PrefabNodeTree, outputPath: string): void {
        try {
            const dir = this.path.dirname(outputPath);
            if (!this.fs.existsSync(dir)) {
                this.fs.mkdirSync(dir, { recursive: true });
            }

            const jsonContent = JSON.stringify(tree, null, 2);
            this.fs.writeFileSync(outputPath, jsonContent);
            console.log(`[UINodeTreeGenerator] 已保存: ${outputPath}`);
        } catch (error) {
            console.error(`[UINodeTreeGenerator] 保存失败: ${outputPath}`, error);
        }
    }

    /**
     * 批量处理目录下的所有 Prefab 文件
     * @param guiDir GUI 目录路径（包含 .prefab 文件的目录）
     * @param outputDir 输出目录路径
     * @returns 处理结果统计
     */
    batchProcess(guiDir: string, outputDir: string): { success: number; failed: number; files: string[] } {
        const result = {
            success: 0,
            failed: 0,
            files: [] as string[]
        };

        console.log(`[UINodeTreeGenerator] 开始批量处理...`);
        console.log(`[UINodeTreeGenerator] GUI 目录: ${guiDir}`);
        console.log(`[UINodeTreeGenerator] 输出目录: ${outputDir}`);

        // 确保输出目录存在
        if (!this.fs.existsSync(outputDir)) {
            this.fs.mkdirSync(outputDir, { recursive: true });
        }

        // 检查 GUI 目录是否存在
        if (!this.fs.existsSync(guiDir)) {
            console.error(`[UINodeTreeGenerator] GUI 目录不存在: ${guiDir}`);
            return result;
        }

        // 读取目录下的所有文件
        const files = this.fs.readdirSync(guiDir);
        
        for (const file of files) {
            if (file.endsWith('.prefab')) {
                const prefabPath = this.path.join(guiDir, file);
                const tree = this.parsePrefab(prefabPath);
                
                if (tree) {
                    const outputName = file.replace('.prefab', '_tree.json');
                    const outputPath = this.path.join(outputDir, outputName);
                    this.saveToJson(tree, outputPath);
                    result.success++;
                    result.files.push(outputName);
                } else {
                    result.failed++;
                }
            }
        }

        console.log(`[UINodeTreeGenerator] 批量处理完成: 成功 ${result.success} 个, 失败 ${result.failed} 个`);
        return result;
    }
}

// ============================================
// Node.js 环境执行入口
// ============================================

if (isNodeEnv) {
    // 在 Node.js 环境中直接执行
    const args = process.argv.slice(2);
    
    // 默认路径
    let guiDir = './assets/resources/GUI';
    let outputDir = './assets/script/ui_node_tree';

    // 解析命令行参数
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--gui' && i + 1 < args.length) {
            guiDir = args[i + 1];
        } else if (args[i] === '--output' && i + 1 < args.length) {
            outputDir = args[i + 1];
        }
    }

    // 使用绝对路径
    const path = require('path');
    const fs = require('fs');
    
    const absoluteGuiDir = path.isAbsolute(guiDir) ? guiDir : path.resolve(process.cwd(), guiDir);
    const absoluteOutputDir = path.isAbsolute(outputDir) ? outputDir : path.resolve(process.cwd(), outputDir);

    const generator = new UINodeTreeGenerator(fs, path);
    generator.batchProcess(absoluteGuiDir, absoluteOutputDir);
}

export default UINodeTreeGenerator;
