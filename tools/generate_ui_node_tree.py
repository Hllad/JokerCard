#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI 节点树生成工具
解析 Cocos Creator 的 .prefab 文件，生成对应的 JSON 节点树

使用方法:
    python tools/generate_ui_node_tree.py [options]

选项:
    --gui <path>      GUI 目录路径 (默认: ./assets/resources/GUI)
    --output <path>   输出目录路径 (默认: ./assets/script/ui_node_tree)
    --watch           监听模式，文件变化时自动重新生成
    --help            显示帮助信息

示例:
    python tools/generate_ui_node_tree.py
    python tools/generate_ui_node_tree.py --gui ./assets/resources/GUI --output ./assets/script/ui_node_tree
    python tools/generate_ui_node_tree.py --watch
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Any, Optional

# ==================== 配置 ====================
CONFIG = {
    "gui_dir": "./assets/resources/GUI",
    "output_dir": "./assets/script/ui_node_tree",
    "watch_mode": False
}

# ==================== UIPrefabParser ====================

class UIPrefabParser:
    """Prefab 解析器"""

    @staticmethod
    def parse(prefab_data: List[Dict], prefab_name: str) -> Dict:
        """解析 Prefab JSON 数据"""
        node_map = {}
        component_map = {}
        root_node_id = -1

        # 第一步：建立 ID 映射表（使用数组索引作为 ID）
        for index, element in enumerate(prefab_data):
            elem_type = element.get("__type__", "")
            if elem_type == "cc.Node":
                node_map[index] = element
            elif elem_type.startswith("cc."):
                component_map[index] = element
            elif elem_type == "cc.Prefab" and element.get("data"):
                root_node_id = element["data"]["__id__"]

        # 如果没有找到根节点，查找没有 parent 的节点作为根节点
        if root_node_id == -1:
            for node_id, node in node_map.items():
                if not node.get("_parent"):
                    root_node_id = node_id
                    break

        # 第二步：递归构建节点树
        def build_node_tree(node_id: int, parent_path: str = "") -> Optional[Dict]:
            node = node_map.get(node_id)
            if not node:
                return None

            node_name = node.get("_name", "Unknown")
            current_path = f"{parent_path}/{node_name}" if parent_path else node_name

            # 收集组件信息
            components = []
            comp_refs = node.get("_components", [])
            for comp_ref in comp_refs:
                comp = component_map.get(comp_ref["__id__"])
                if comp and comp.get("__type__"):
                    # 提取组件类型名（去掉 cc. 前缀）
                    comp_type = comp["__type__"].replace("cc.", "")
                    components.append(comp_type)

            # 递归构建子节点
            children = []
            child_refs = node.get("_children", [])
            for child_ref in child_refs:
                child_node = build_node_tree(child_ref["__id__"], current_path)
                if child_node:
                    children.append(child_node)

            return {
                "name": node_name,
                "path": current_path,
                "active": node.get("_active", True),
                "position": node.get("_lpos", {"x": 0, "y": 0, "z": 0}),
                "scale": node.get("_lscale", {"x": 1, "y": 1, "z": 1}),
                "euler": node.get("_euler", {"x": 0, "y": 0, "z": 0}),
                "components": components,
                "children": children
            }

        root = build_node_tree(root_node_id)
        if not root:
            raise ValueError(f"无法找到根节点: {prefab_name}")

        # 计算节点总数
        def count_nodes(node: Dict) -> int:
            total = 1
            for child in node.get("children", []):
                total += count_nodes(child)
            return total

        return {
            "prefabName": prefab_name,
            "root": root,
            "totalNodeCount": count_nodes(root)
        }


# ==================== 生成器 ====================

class UINodeTreeGenerator:
    """UI 节点树生成器"""

    def __init__(self):
        self.gui_dir = ""
        self.output_dir = ""

    def parse_prefab(self, prefab_path: str) -> Optional[Dict]:
        """解析单个 Prefab 文件"""
        try:
            if not os.path.exists(prefab_path):
                print(f"[X] Prefab 文件不存在: {prefab_path}")
                return None

            with open(prefab_path, "r", encoding="utf-8") as f:
                prefab_data = json.load(f)

            prefab_name = Path(prefab_path).stem
            tree = UIPrefabParser.parse(prefab_data, prefab_name)

            print(f"  [OK] {prefab_name} ({tree['totalNodeCount']} 个节点)")
            return tree
        except Exception as e:
            print(f"  [X] 解析失败: {prefab_path} - {e}")
            return None

    def save_to_json(self, tree: Dict, output_path: str):
        """将节点树保存为 JSON 文件"""
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(tree, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[X] 保存失败: {output_path} - {e}")

    def batch_process(self) -> Dict:
        """批量处理目录下的所有 Prefab 文件"""
        result = {
            "success": 0,
            "failed": 0,
            "files": []
        }

        print(f"\n[DIR] GUI 目录: {self.gui_dir}")
        print(f"[DIR] 输出目录: {self.output_dir}\n")

        # 确保输出目录存在
        os.makedirs(self.output_dir, exist_ok=True)

        # 检查 GUI 目录是否存在
        if not os.path.exists(self.gui_dir):
            print(f"[X] GUI 目录不存在: {self.gui_dir}")
            return result

        # 读取目录下的所有文件
        files = os.listdir(self.gui_dir)
        prefab_files = [f for f in files if f.endswith(".prefab")]

        if not prefab_files:
            print("[!] 未找到 .prefab 文件")
            return result

        print(f"[INFO] 发现 {len(prefab_files)} 个 Prefab 文件:\n")

        for file in prefab_files:
            prefab_path = os.path.join(self.gui_dir, file)
            tree = self.parse_prefab(prefab_path)

            if tree:
                output_name = file.replace(".prefab", "_tree.json")
                output_path = os.path.join(self.output_dir, output_name)
                self.save_to_json(tree, output_path)
                result["success"] += 1
                result["files"].append(output_name)
            else:
                result["failed"] += 1

        print(f"\n[DONE] 处理完成: 成功 {result['success']} 个, 失败 {result['failed']} 个")
        return result

    def watch(self):
        """监听模式"""
        print(f"\n[WATCH] 监听模式中... (按 Ctrl+C 退出)")
        print(f"        监听目录: {self.gui_dir}\n")

        # 首次执行
        self.batch_process()

        # 记录文件修改时间
        file_mtimes = {}
        for file in os.listdir(self.gui_dir):
            if file.endswith(".prefab"):
                file_path = os.path.join(self.gui_dir, file)
                file_mtimes[file] = os.path.getmtime(file_path)

        try:
            while True:
                time.sleep(1)
                for file in os.listdir(self.gui_dir):
                    if file.endswith(".prefab"):
                        file_path = os.path.join(self.gui_dir, file)
                        current_mtime = os.path.getmtime(file_path)
                        
                        if file not in file_mtimes or file_mtimes[file] != current_mtime:
                            file_mtimes[file] = current_mtime
                            print(f"\n[CHANGE] 检测到变化: {file}")
                            
                            tree = self.parse_prefab(file_path)
                            if tree:
                                output_name = file.replace(".prefab", "_tree.json")
                                output_path = os.path.join(self.output_dir, output_name)
                                self.save_to_json(tree, output_path)
                                print(f"   已更新: {output_name}")
        except KeyboardInterrupt:
            print("\n\n👋 退出监听模式")

    def set_paths(self, gui_dir: str, output_dir: str):
        """设置路径"""
        self.gui_dir = os.path.abspath(gui_dir)
        self.output_dir = os.path.abspath(output_dir)


# ==================== 主程序 ====================

def show_help():
    print(__doc__)


def main():
    args = sys.argv[1:]

    # 显示帮助
    if "--help" in args or "-h" in args:
        show_help()
        return

    # 解析参数
    gui_dir = CONFIG["gui_dir"]
    output_dir = CONFIG["output_dir"]
    watch_mode = False

    i = 0
    while i < len(args):
        if args[i] == "--gui" and i + 1 < len(args):
            gui_dir = args[i + 1]
            i += 2
        elif args[i] == "--output" and i + 1 < len(args):
            output_dir = args[i + 1]
            i += 2
        elif args[i] in ("--watch", "-w"):
            watch_mode = True
            i += 1
        else:
            i += 1

    # 创建生成器
    generator = UINodeTreeGenerator()
    generator.set_paths(gui_dir, output_dir)

    print("\n========================================")
    print("   UI 节点树生成工具")
    print("========================================")

    if watch_mode:
        generator.watch()
    else:
        result = generator.batch_process()

        if result["files"]:
            print("\n[FILES] 生成的文件:")
            for file in result["files"]:
                print(f"   - {file}")
        print("\n[DONE] 完成!\n")


if __name__ == "__main__":
    main()
