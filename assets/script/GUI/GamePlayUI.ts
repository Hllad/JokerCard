import { GUIBase } from "./GUIBase";
import { registerComponent } from "../helper/GUIManager";
import { Node } from "cc";
import { Exposed } from "../helper/Invoker";
import { GlobalData } from "../GlobalData";
const G = GlobalData.getInstance() as GlobalData;


export class GamePlayUI extends GUIBase{
    public static prefabPath: string = 'GUI/GamePlayUI';

    protected start(): void {
    }

    _on_click_btn_new_game(){
        console.log('_on_click_btn_new_game');
    }
    
    _on_click_btn_continue(){
        console.log('_on_click_btn_continue');
    }

    _on_click_btn_challenge(){
        console.log('_on_click_btn_challenge');
    }

    _enter_game(){
        console.log('_enter_game');
    }


}

// 自动注册组件
registerComponent('GamePlayUI', GamePlayUI); 