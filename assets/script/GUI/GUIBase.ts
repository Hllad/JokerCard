import {_decorator, Component, Node} from 'cc';
import {GlobalData} from '../GlobalData'
import {Invoker} from '../helper/Invoker'
const {ccclass, property} = _decorator

const G = GlobalData.getInstance() as GlobalData


@ccclass('GUIBase')
export class GUIBase extends Component{
    public extra_info: Map<string, any>;
    public static prefabPath: string;
    protected view: Map<string, Node> = new Map();

    /**
     * 递归遍历节点树，建立路径映射
     * @param node 当前节点
     * @param path 当前路径
     */
    private buildNodeMap(node: Node, path: string = '', is_root:boolean): void {
        let currentPath = ''
        if (!is_root){
            currentPath = path ? `${path}/${node.name}` : node.name;
        }
        
        // 将当前节点添加到映射中
        this.view.set(currentPath, node);
        
        // 递归遍历所有子节点
        const children = node.children;
        for (let i = 0; i < children.length; i++) {
            this.buildNodeMap(children[i], currentPath, false);
        }
    }

    /**
     * 通过路径获取节点
     * @param path 节点路径，格式如 'nodeName' 或 'parent/child' 或 'parent/child/grandchild'
     * @returns 找到的节点，如果不存在则返回 null
     */
    protected getNode(path: string): Node | null {
        const node = this.view.get(path);
        if (!node) {
            console.warn(`Node with path "${path}" not found in view map`);
            return null;
        }
        return node;
    }

    onLoad(): void {
        const constructor = this.constructor as any;
        const exposedMethods = constructor.__exposedMethods__;
        if (exposedMethods){
            exposedMethods.forEach((methodName: string) => {
                const method = (this as any)[methodName];
                if (method){
                    G.invoker.registerFunction(methodName, method.bind(this));
                }
            });
        }
        
        // 构建节点路径映射
        this.buildNodeMap(this.node, '', true);
    }

    onDestroy(): void {
        const constructor = this.constructor as any;
        const exposedMethods = constructor.__exposedMethods__;
        if (exposedMethods){
            exposedMethods.forEach((methodName: string) => {
                G.invoker.unregisterFunction(methodName);
            })
        }    
    }

    protected onEnable(): void {
        const constructor = this.constructor as any;
        const exposedMethods = constructor.__exposedMethods__;
        if (exposedMethods){
            exposedMethods.forEach((methodName: string)=>{
                const method = (this as any)[methodName];
                if (method){
                    G.invoker.registerFunction(methodName, method.bind(this));
                }
            })
        }
    }

    
    protected onDisable(): void {
        const constructor = this.constructor as any;
        const exposedMethods = constructor.__exposedMethods__;
        if (exposedMethods){
            exposedMethods.forEach((methodName: string) => {
                G.invoker.unregisterFunction(methodName);
            })
        }    
    }

    close(){
        const cmp_name = this.constructor.name;
        if (G.gui_manager.getGUIInstance(cmp_name)){
            G.gui_manager.closeUI(cmp_name);
        }
        else{
            this.node.removeFromParent();
            this.node.destroy()
        }
    }
}