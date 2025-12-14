import { GUIManager } from './helper/GUIManager';
import { Invoker } from './helper/Invoker';
import {SingletonBase} from './utils'


export class GlobalData extends SingletonBase<GlobalData>{

    public gui_manager: GUIManager;
    public invoker: Invoker;

    constructor(){{
        super();
    }}

}