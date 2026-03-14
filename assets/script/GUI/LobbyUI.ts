import { GUIBase } from "./GUIBase";
import { registerComponent } from "../helper/GUIManager";
import { Node, find} from "cc";
import { Exposed } from "../helper/Invoker";
import { GlobalData } from "../GlobalData";
import { UILayer } from "../const";
const G = GlobalData.getInstance() as GlobalData;


export class LobbyUI extends GUIBase{
    public static prefabPath: string = 'GUI/LobbyUI';
    private btn_start: Node;
    private btn_setting: Node;
    private btn_collection: Node;

    protected start(): void {
        this.btn_start = this.getNode('Panel_down/btn_start');
        this.btn_setting = this.getNode('Panel_down/btn_setting');
        this.btn_collection = this.getNode('Panel_down/btn_collection');
        this.btn_start.on('click', this._on_click_btn_start, this)
        this.btn_setting.on('click', this._on_click_btn_setting, this)
        this.btn_collection.on('click', this._on_click_btn_collection, this)
    }

    _on_click_btn_start(){
        console.log('_on_click_btn_start');
        G.gui_manager.openUI('ModeSelectUI', UILayer.NORMAL);
    }
    
    _on_click_btn_setting(){
        console.log('_on_click_btn_setting');
    }

    _on_click_btn_collection(){
        console.log('_on_click_btn_collection');
    }

    @Exposed
    GameUI_test_exposed(value: string){
        console.log('GameUI_test_exposed', value);
    }

}

// 自动注册组件
registerComponent('LobbyUI', LobbyUI); 