import { _decorator, Component, instantiate, Node, Prefab, resources, js } from 'cc';
import {GlobalData} from '../GlobalData'
const { ccclass, property } = _decorator;
import {SingletonBase} from '../utils'
import { GUIBase } from '../GUI/GUIBase';

// 组件注册表 - 用于存储组件类
const componentRegistry: Map<string, typeof Component> = new Map();

/**
 * 注册组件类到注册表
 * @param componentName 组件类名
 * @param componentClass 组件类
 */
export function registerComponent(componentName: string, componentClass: typeof Component): void {
    componentRegistry.set(componentName, componentClass);
}

/**
 * 通过类名获取组件类
 * 优先从注册表获取，如果注册表中没有，则尝试使用 Cocos Creator 的 js.getClassByName
 */
function getComponentClass(componentName: string): typeof Component | null {
    // 先从注册表查找
    const registeredClass = componentRegistry.get(componentName);
    if (registeredClass) {
        return registeredClass;
    }
    
    // 如果注册表中没有，尝试使用 Cocos Creator 的 API
    try {
        const classByName = js.getClassByName(componentName);
        if (classByName) {
            return classByName as typeof Component;
        }
    } catch (error) {
        // 忽略错误，继续尝试其他方法
    }
    
    return null;
}

export class GUIManager extends SingletonBase<GUIManager> {
    public gui_map: Map<string, Node> = new Map();

    async openUI(ui_string: string, parent: Node, extra_info?: Map<string, any>): Promise<Component> {
        // 从组件注册表获取组件类
        const UIComponent = getComponentClass(ui_string);
        
        if (!UIComponent) {
            throw new Error(`Component class "${ui_string}" not found. Please make sure it is registered using registerComponent().`);
        }
        
        // 获取组件类的prefabPath静态属性
        const prefabPath = (UIComponent as any).prefabPath;
        if (!prefabPath) {
            throw new Error(`Component ${ui_string} does not have prefabPath property`);
        }

        // 加载prefab资源
        return new Promise<Component>((resolve, reject) => {
            resources.load(prefabPath, Prefab, (err, item) => {
                if (err) {
                    console.error('Failed to load UI prefab: ', err);
                    reject(err);
                    return;
                }

                // 实例化UI节点
                const uiNode = instantiate(item);
                
                // 将节点添加到父节点
                parent.addChild(uiNode);
                
                // 将脚本component挂载到ui节点上
                let scriptComponent = uiNode.getComponent(UIComponent);
                if (!scriptComponent) {
                    scriptComponent = uiNode.addComponent(UIComponent);
                }
                
                // 设置extra_info（如果提供了）
                if (extra_info && scriptComponent instanceof GUIBase) {
                    scriptComponent.extra_info = extra_info;
                }
                
                // 保存到gui_map
                this.gui_map.set(ui_string, uiNode);
                
                // 返回脚本component
                resolve(scriptComponent);
            });
        });
    }

    getGUIInstance(ui_string: string){
        return this.gui_map.get(ui_string);
    }

    closeUI(ui_string){
        
    }
}


