import {SingletonBase} from '../utils'

export class Invoker extends SingletonBase<Invoker> {
    private functions: Map<string, Function> = new Map();

    public registerFunction(name: string, fn: Function){
        this.functions.set(name, fn);
    }

    public unregisterFunction(name: string): void {
        this.functions.delete(name);
    }

    public invoke(name: string, ...args: any[]): void {
        const fn = this.functions.get(name);
        if (fn) {
            fn(...args);
        }
    }
}

export function Exposed(target: any, propertyKey: string, descripter: PropertyDescriptor){
    const originmalMethod = descripter.value;
    descripter.value = function (...args: any[]){
        return originmalMethod.apply(this, args);
    };
    const constructor = target.constructor;
    if (!constructor.__exposedMethods__){
        constructor.__exposedMethods__ = [];
    };
    constructor.__exposedMethods__.push(propertyKey);

}