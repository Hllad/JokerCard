import { GUIBase } from "./GUIBase";
import { registerComponent } from "../helper/GUIManager";
import { Node } from "cc";
import { Exposed } from "../helper/Invoker";
import { GlobalData } from "../GlobalData";
const G = GlobalData.getInstance() as GlobalData;


export class GameStartUI extends GUIBase{
    public static prefabPath: string = 'GUI/GameStartUI';
    private btn_new_game: Node;
    private btn_continue: Node;
    private btn_challege: Node;

    protected start(): void {
        this.btn_new_game = this.getNode('Panel_top/btn_new_game');
        this.btn_continue = this.getNode('Panel_top/btn_continue');
        this.btn_challege = this.getNode('Panel_top/btn_challenge');
        this.btn_new_game.on('click', this._on_click_btn_new_game, this)
        this.btn_continue.on('click', this._on_click_btn_continue, this)
        this.btn_challege.on('click', this._on_click_btn_challenge, this)
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


}

// 自动注册组件
registerComponent('GameStartUI', GameStartUI); 