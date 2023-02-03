const isObject = (value) => typeof value == 'object' && value !== null;
const extend = Object.assign;
const isArray = Array.isArray;
const isFunction = (value) => typeof value == 'function';
const isIntegerKey = (key) => parseInt(key) + '' === key;
let hasOwnpRroperty = Object.prototype.hasOwnProperty;
const hasOwn = (target, key) => hasOwnpRroperty.call(target, key);
const hasChanged = (oldValue, value) => oldValue != value;
// export const
// export const

// 通过track去收集所有依赖
// trigger 去触发effect
function effect(fn, options = {}) {
    const effect = createReactiveEffect(fn, options);
    if (!options.lazy) {
        console.log('默认执行');
        effect(); // effect默认会先执行一次
    }
    return effect;
}
let uid = 0;
let activeEffect; //用于存储当前effect
const effectStack = [];
function createReactiveEffect(fn, options) {
    const effect = function reactiveEffect() {
        console.log('todo...');
        if (!effectStack.includes(effect)) {
            try {
                effectStack.push(effect);
                activeEffect = effect;
                return fn(); // 函数执行 会执行get方法
            }
            finally {
                effectStack.pop();
                activeEffect = effectStack[effectStack.length - 1];
            }
        }
    };
    effect.id = uid++; //加id用于区分effect
    effect._isEffect = true; // 标识这是一个响应式的effect
    effect.raw = fn; // 保存effect对应的原函数
    effect.options = options; // 在effect上保存用户的属性
    return effect;
}
// 对象属性收集他对应的effect函数 相当于2中的watcher
const targetMap = new WeakMap();
function track(target, type, key) {
    // activeEffect
    if (activeEffect === undefined) {
        return;
    }
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map));
    }
    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = new Set));
    }
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
        // activeEffect.deps.push(dep)// 双向记录方便取值
    }
    // 这个dep的key就是object的属性如state.name中的name，value就是effect(fn) 中的fn，即是副作用activeEffect
    console.log(targetMap, key, target);
    // console.log(target,key,activeEffect)
}
// 属性对应的effect（数组，对象）
function trigger(target, type, key, newValue, oldValue) {
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    const effects = new Set(); //对effect去重
    // 将所有要执行的effect存到一个新的set中最后一起执行
    const add = (effectsToAdd) => {
        if (effectsToAdd) {
            effectsToAdd.forEach(effect => effects.add(effect));
            // effectsToAdd.forEach(effect => effects());
        }
    };
    // 1.修改的是数组长度
    if (key === 'length' && isArray(target)) {
        // 如果对应的长度，有新加入需要收集依赖
        depsMap.forEach((dep, key) => {
            if (key === 'length' || key > newValue) { // 如果更改的长度小于收集的索引那这个索引也要触发effect跟新执行
                add(dep);
            }
        });
    }
    else {
        //对象
        if (key !== undefined) { //这里肯定是修改
            add(depsMap.get(key));
        }
        // 修改了数组中的某个索引
        switch (type) {
            case 0 /* TriggerOrTyps.ADD */: //添加一个索引就触发长度更新
                if (isArray(target) && isIntegerKey(key)) {
                    add(depsMap.get('length'));
                }
                break;
        }
    }
    effects.forEach((effect) => {
        if (effect.options.scheduler) {
            effect.options.scheduler(effect);
        }
        else {
            effect();
        }
    });
}

function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        // proxy + reflect
        // 后续Object上的方法 会迁移到Reflect ,之前的target[key] = value 方式设置值可能会失败，并不会报异常，也没有返回值标识
        const res = Reflect.get(target, key, receiver);
        if (!isReadonly) {
            // 依赖收集，数据变化时更新视图
            console.log('执行effect时会取值', '收集effect');
            track(target, 0 /* TrackOpTyps.GET */, key);
        }
        if (shallow) {
            return res;
        }
        if (isObject(res)) { //vue2 是一上来就递归，vue3是取值时才进行
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter(shallow = false) {
    return function get(target, key, value, receiver) {
        const oldValue = target[key];
        let hadkey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
        const res = Reflect.set(target, key, value, receiver);
        // 数据更新时 通知对应属性的effect执行
        if (!hadkey) {
            //增加
            trigger(target, 0 /* TriggerOrTyps.ADD */, key, value);
        }
        else if (hasChanged(oldValue, value)) {
            //修改
            trigger(target, 1 /* TriggerOrTyps.SET */, key, value);
        }
        return res;
    };
}
const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const set = createSetter();
const shallowSet = createSetter(true);
const mutableHandlers = {
    get,
    set
};
const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet
};
let readonlyObj = {
    set: (target, key) => {
        console.warn(`set on '${target}' key '${key}' falied`);
    }
};
const shallowReadonlyHandlers = extend({
    get: shallowReadonlyGet,
}, readonlyObj);
const readonlyHandlers = extend({
    get: readonlyGet
}, readonlyObj);

function reactive(target) {
    return createReactiveObject(target, false, mutableHandlers);
}
function shallowReactive(target) {
    return createReactiveObject(target, false, shallowReactiveHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers);
}
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers);
}
const reactiveMap = new WeakMap(); //存储的key只能是对象，会自动垃圾回收，不会造成内存泄漏
const readonlyMap = new WeakMap();
function createReactiveObject(target, isReadonly, baseHandlers) {
    // 如果target不是对象，不拦截，reactive这个api只能拦截对象类型
    if (!isObject(target)) {
        return target;
    }
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    const existProxy = proxyMap.get(target);
    if (existProxy) {
        return existProxy;
    }
    const proxy = new Proxy(target, baseHandlers);
    proxyMap.set(target, proxy);
    return proxy;
}

class ComputedRefImpl {
    getter;
    setter;
    _dirty = true;
    _value;
    effect;
    constructor(getter, setter) {
        this.getter = getter;
        this.setter = setter;
        // 计算属性会默认产生一个effect
        this.effect = effect(getter, {
            lazy: true,
            scheduler: () => {
                if (!this._dirty) {
                    this._dirty = true;
                    trigger(this, 1 /* TriggerOrTyps.SET */, 'value');
                }
            }
        });
    }
    get value() {
        if (this._dirty) {
            this._value = this.effect(); // 返回用户返回值
            this._dirty = false;
        }
        // 计算属性页要依赖收集
        track(this, 0 /* TrackOpTyps.GET */, 'value');
        return this._value;
    }
    set value(newValue) {
        this.setter(newValue);
    }
}
function computed(getterOrOptions) {
    let getter;
    let setter;
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions;
        setter = () => {
            console.warn('computed value must be readonly');
        };
    }
    else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    return new ComputedRefImpl(getter, setter);
}

export { computed, effect, reactive, readonly, shallowReactive, shallowReadonly };
//# sourceMappingURL=reactivity.esm-bundler.js.map
