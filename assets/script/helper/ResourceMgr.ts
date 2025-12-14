import { SingletonBase } from "../utils";
import { resources, _decorator, instantiate, Asset } from "cc";

export class ResourceMgr extends SingletonBase<ResourceMgr>{


    loadResource(resource_path: string, resource_type: any){
        resources.load(resource_path, resource_type, (err, item)=>{
            if (err){
                console.error('Failed to load resource');
                return;
            }
            const resource_instance = instantiate(item);
            return resource_instance

        })
    }
}