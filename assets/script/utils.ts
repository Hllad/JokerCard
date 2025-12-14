export abstract class SingletonBase<T> {
  private static instances = new Map<Function, any>();
  
  protected constructor() {
    // 防止直接实例化
  }
  
  public static getInstance<T extends SingletonBase<T>>(this: any): T {
    if (!SingletonBase.instances.has(this)) {
      // 使用类型断言绕过 protected 构造函数的类型检查
      SingletonBase.instances.set(this, new this());
    }
    return SingletonBase.instances.get(this) as T;
  }
}

// 使用示例
class MySingleton extends SingletonBase<MySingleton> {
  private counter = 0;
  
  constructor() {
    super();
  }
  
  public increment(): number {
    return ++this.counter;
  }
}