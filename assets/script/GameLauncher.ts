import { _decorator, Component, Node , find} from 'cc';
import { GlobalData } from './GlobalData';
import { GUIManager } from './helper/GUIManager';
import { Invoker } from './helper/Invoker';
import { UILayer } from './const';

// 导入 UI 组件以确保它们被注册
import './GUI/LobbyUI';
const { ccclass, property } = _decorator;

const G = GlobalData.getInstance() as GlobalData

@ccclass('GameLauncher')
export class GameLauncher extends Component {
    onLoad() {
        G.gui_manager = GUIManager.getInstance();
        G.gui_manager.createRoot();
        G.invoker = Invoker.getInstance();
    }

    start() {
        G.gui_manager.openUI('LobbyUI', UILayer.NORMAL);
    }
        
}


