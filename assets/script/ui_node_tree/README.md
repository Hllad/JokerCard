# UI 节点树工具

这个工具用于解析 Cocos Creator 的 `.prefab` 文件，提取 UI 节点树结构并保存为 JSON 格式。

## 生成的文件

运行工具后，会在 `assets/script/ui_node_tree/` 目录下生成以下 JSON 文件：

- `GamePlayUI_tree.json`
- `LobbyUI_tree.json`
- `ModeSelectUI_tree.json`
- `Root_tree.json`

## JSON 格式说明

```json
{
  "prefabName": "LobbyUI",
  "root": {
    "name": "LobbyUI",
    "path": "LobbyUI",
    "active": true,
    "position": { "x": 0, "y": 0, "z": 0 },
    "scale": { "x": 1, "y": 1, "z": 1 },
    "euler": { "x": 0, "y": 0, "z": 0 },
    "components": ["UITransform", "Layout"],
    "children": [
      {
        "name": "btn_start",
        "path": "LobbyUI/btn_start",
        "active": true,
        "position": { "x": -217.143, "y": 0, "z": 0 },
        "scale": { "x": 1, "y": 1, "z": 1 },
        "euler": { "x": 0, "y": 0, "z": 0 },
        "components": ["UITransform", "Sprite", "Button"],
        "children": []
      }
    ]
  },
  "totalNodeCount": 9
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `prefabName` | string | Prefab 文件名 |
| `totalNodeCount` | number | 节点总数 |
| `root` | object | 根节点信息 |
| `name` | string | 节点名称 |
| `path` | string | 节点完整路径（从根节点开始） |
| `active` | boolean | 节点是否激活 |
| `position` | object | 本地位置（x, y, z） |
| `scale` | object | 本地缩放（x, y, z） |
| `euler` | object | 本地旋转欧拉角（x, y, z） |
| `components` | string[] | 组件类型列表（去掉 cc. 前缀） |
| `children` | object[] | 子节点列表 |

## 使用方式

### 方式一：Python 脚本（推荐）

在项目根目录运行：

```bash
python tools/generate_ui_node_tree.py
```

**命令行参数：**

```bash
# 使用默认路径
python tools/generate_ui_node_tree.py

# 指定自定义路径
python tools/generate_ui_node_tree.py --gui ./assets/resources/GUI --output ./assets/script/ui_node_tree

# 监听模式（文件变化时自动重新生成）
python tools/generate_ui_node_tree.py --watch

# 显示帮助
python tools/generate_ui_node_tree.py --help
```

### 方式二：Node.js 脚本

如果你有 Node.js 环境，也可以使用：

```bash
node tools/generate_ui_node_tree.js
```

参数与 Python 版本相同。

### 方式三：在 Cocos Creator 中使用

将 `UIPrefabParser.ts` 导入到你的项目中，然后在代码中使用：

```typescript
import { UIPrefabParser } from './ui_node_tree/UIPrefabParser';

// 加载 prefab 文件内容
const prefabJson = ... // 从资源加载的 JSON 数组

// 解析节点树
const tree = UIPrefabParser.parse(prefabJson, 'MyUI');

// 访问节点信息
console.log(tree.prefabName);
console.log(tree.totalNodeCount);
console.log(tree.root.name);
console.log(tree.root.children);

// 查找特定节点
const buttons = UIPrefabParser.findNodesByComponent(tree, 'Button');
const startBtn = UIPrefabParser.findNodesByName(tree, 'btn_start');
```

## 运行时工具类

`UIPrefabParser.ts` 提供了以下工具方法：

| 方法 | 说明 |
|------|------|
| `parse(prefabData, prefabName)` | 解析 prefab JSON 数据 |
| `flatten(tree)` | 将节点树转换为扁平化列表 |
| `findNodesByName(tree, nodeName)` | 按名称查找节点 |
| `findNodesByComponent(tree, componentType)` | 按组件类型查找节点 |

## 注意事项

1. 每次修改 `.prefab` 文件后，需要重新运行工具来更新 JSON 文件
2. 生成的 JSON 文件可以提交到版本控制，方便团队成员查看 UI 结构
3. 可以使用监听模式 (`--watch`) 在开发时自动更新
