const patchEvent = (el, key, value) => {
    const invokers = el._vei || (el._vei = {});
    const exists = invokers[key];
    if (value && exists) { //需要绑定事件 且存在的情况
        exists.value = value;
    }
    else {
        const eventName = key.slice(2).toLowerCase();
        if (value) {
            // 要绑定事件，以前没有绑定过
            let invoker = invokers[key] = createInvoker(value);
            el.addEventListener(eventName, invoker);
        }
        else {
            el.removeEventListener(eventName, exists);
            invokers[eventName] = undefined;
        }
    }
    function createInvoker(value) {
        const invoker = (e) => { invoker.value(e); };
        invoker.value = value;
        return invoker;
    }
};

const patchClass = (el, value) => {
    if (value == null) {
        value = '';
    }
    el.className = value;
};

const patchStyle = (el, prev, next) => {
    const style = el.style; //得到样式
    if (next == null) {
        el.removeAttribute('style');
    }
    else {
        //老的里，先做删除，
        // 新的里，再赋值
        if (prev) {
            for (let key in prev) {
                if (next[key] == null) { //老的里有，新的里没有，要删除
                    style[key] = '';
                }
            }
        }
        //新的需要给style赋值上去
        for (let key in next) {
            style[key] = next[key];
        }
    }
};

const patchAttr = (el, key, value) => {
    if (value == null) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, value);
    }
};

const patchProp = (el, key, prevValue, nextValue) => {
    switch (key) {
        case 'class':
            patchClass(el, nextValue);
            break;
        case 'style':
            patchStyle(el, prevValue, nextValue);
            break;
        default:
            if (/^on[^a-z]/.test(key)) {
                patchEvent(el, key, nextValue);
            }
            else {
                patchAttr(el, key, nextValue);
            }
            break;
    }
};

const isObject = (value) => typeof value == 'object' && value !== null;
const extend = Object.assign;
const isArray = Array.isArray;
const isFunction = (value) => typeof value == 'function';
const isString = (value) => typeof value == 'string';
const isIntegerKey = (key) => parseInt(key) + '' === key;
let hasOwnpRroperty = Object.prototype.hasOwnProperty;
const hasOwn = (target, key) => hasOwnpRroperty.call(target, key);
const hasChanged = (oldValue, value) => oldValue != value;
// export const
// export const

const nodeOps = {
    // 一些dom操作
    createElement: tagName => document.createElement(tagName),
    remove: child => {
        const parent = child.parentNode;
        if (parent) {
            parent.removeChild(child);
        }
    },
    insert: (child, parent, anchor = null) => {
        parent.insertBefore(child, anchor); //anchor 为空时相当于appendChild
    },
    querySelector: selector => document.querySelector(selector),
    setElementText: (el, text) => el.textContent = text,
    createText: text => document.createTextNode(text),
    setText: (node, text) => node.nodeValue = text
};

// 通过track去收集所有依赖
// trigger 去触发effect
function effect(fn, options = {}) {
    const effect = createReactiveEffect(fn, options);
    if (!options.lazy) {
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
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const set = createSetter();
const mutableHandlers = {
    get,
    set
};
let readonlyObj = {
    set: (target, key) => {
        console.warn(`set on '${target}' key '${key}' falied`);
    }
};
extend({
    get: shallowReadonlyGet,
}, readonlyObj);
const readonlyHandlers = extend({
    get: readonlyGet
}, readonlyObj);

function reactive(target) {
    return createReactiveObject(target, false, mutableHandlers);
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

function isVnode(vnode) {
    return vnode.__v_isVnode;
}
const createVNode = (type, props, children = null) => {
    // type区分组件还是普通元素
    const shapeFlag = isString(type) ?
        1 /* ShapeFlags.ELEMENT */ : isObject(type) ?
        4 /* ShapeFlags.STATEFUL_COMPONENT */ : 0;
    const vnode = {
        __v_isVnode: true,
        type,
        props,
        children,
        component: null,
        el: null,
        key: props && props.key,
        shapeFlag // 判断出自己的类型和儿子的类型
    };
    normalizeChildren(vnode, children);
    return vnode;
};
function normalizeChildren(vnode, children) {
    let type = 0;
    if (children == null) ;
    else if (isArray(children)) {
        type = 16 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    else {
        type = 8 /* ShapeFlags.TEXT_CHILDREN */;
    }
    vnode.shapeFlag |= type;
}

function createAppAPI(render) {
    return function createApp(rootComponent, rootProps) {
        const app = {
            _component: rootComponent,
            _props: rootProps,
            _container: null,
            mount(container) {
                // console.log(container,rootComponent,rootProps,rendererOptions)
                const vnode = createVNode(rootComponent, rootProps);
                render(vnode, container);
                app._container = container;
            }
        };
        return app;
    };
}

const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props, data } = instance;
        if (key[0] == '$') {
            return; //不能访问$开头的变量
        }
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        else if (hasOwn(data, key)) {
            return data[key];
        }
    },
    set({ _: instance }, key, value) {
        const { setupState, props, data } = instance;
        if (hasOwn(setupState, key)) {
            setupState[key] = value;
        }
        else if (hasOwn(props, key)) {
            props[key] = value;
        }
        else if (hasOwn(data, key)) {
            data[key] = value;
        }
        return true;
    }
};

// 创建实例
function createComponentInstance(vnode) {
    // webComponent 需要有‘属性’ ‘插槽’
    const instance = {
        vnode,
        type: vnode.type,
        props: {},
        attrs: {},
        slots: {},
        ctx: {},
        data: {},
        setupState: {},
        render: null,
        isMounted: false, //是否挂载过
    };
    instance.ctx = { _: instance }; // 代理
    return instance;
}
function setupComponent(instance) {
    const { props, children } = instance.vnode;
    instance.props = props; //initProps() 根据props 解析出props 和 attrs 
    instance.children = children; // initSlot()
    let isStateful = instance.vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */;
    //是否是有状态的组件，函数组件无state
    if (isStateful) {
        // 调用当前实例的setup得到返回值，填充setupState和对应的render方法
        setupStatefulComponent(instance);
    }
}
function setupStatefulComponent(instance) {
    // 代理，给render函数传递参数
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
    // 获取组件类型，拿到组件的setup方法
    let Component = instance.type;
    let { setup } = Component;
    if (setup) {
        let setupContext = createSetupContext(instance);
        const setupResult = setup(instance.props, setupContext); // 拿到instance中的props attrs slots emit expose
        // 可能是一个函数也可能是一个对象setupResult
        handleSetupResult(instance, setupResult);
    }
    else {
        finishComponentSetup(instance);
    }
}
function handleSetupResult(instance, setupResult) {
    if (isFunction(setupResult)) {
        instance.render = setupResult;
    }
    else if (isObject(setupResult)) {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    let Component = instance.type;
    if (!instance.render) {
        //template -> render函数
        // render函数放到实例上
        if (!Component.render && Component.template) ;
        instance.render = Component.render;
        // applyOptions 对vueSAPI做了兼容
    }
    console.log('render---===', instance.render.toString());
}
function createSetupContext(instance) {
    return {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: () => { },
        expose: () => { }
    };
}
// instance 组件各种状态和信息
// context 4个参数方便开发时使用
// proxy 代理方面取值vue2中也有

const setupRenderEffect = (instance, container) => {
    // 创建一个effect 在effect中调用render 这样render方法中拿到的数据会收集这个effect，属性更新触发effect
    // instance.render()
    effect(function componentEffect() {
        if (!instance.isMounted) {
            // 首次渲染
            let proxyToUse = instance.proxy;
            // vue2 $vnode _vnode
            // vue3 vnode subTree
            let subTree = instance.render.call(proxyToUse, proxyToUse);
            patch(null, subTree, container);
            instance.isMounted = true;
        }
    });
};
const mountComponent = (initialVNode, container) => {
    // 调用setup得到返回值，获取render函数返回的结果来进行渲染
    // 1. 创建实例
    const instance = (initialVNode.component = createComponentInstance(initialVNode));
    // 2. 需要的数据解析到实例上
    setupComponent(instance);
    // 3. 创建effect 让render函数执行
    setupRenderEffect(instance, container);
};
const processComponent = (n1, n2, container) => {
    if (n1 == null) { //没有上一次（老）的vnode
        mountComponent(n2, container);
    }
};
const patch = (n1, n2, container) => {
    const { shapeFlag } = n2;
    if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
        console.log('yuanshu', n1, n2, container);
    }
    else if (shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
        processComponent(n1, n2, container);
    }
};
// 创建一个渲染器
function createRenderer(rendererOptions) {
    const render = (vnode, container) => {
        patch(null, vnode, container);
    };
    return {
        createApp: createAppAPI(render)
    };
}

function h(type, propsOrChildren, children) {
    const l = arguments.length; // 儿子节点要么是字符串，要么是数组，针对的是createVnode
    if (l == 2) { //  类型 + 属性 、 类型 + 孩子
        if (isObject(propsOrChildren) && isArray(propsOrChildren)) {
            if (isVnode(propsOrChildren)) {
                return createVNode(type, null, [propsOrChildren]);
            }
        }
        else {
            // 第二个参数不是对象，那就是孩子
            return createVNode(type, null, propsOrChildren);
        }
    }
    else {
        if (l > 3) {
            children = Array.prototype.slice.call(arguments, 2);
        }
        else if (l === 3 && isVnode(children)) {
            children = [children];
        }
        return createVNode(type, propsOrChildren, children);
    }
}

// 属性操作增删改（样式，类，事件，其他属性）
// 渲染时用到的所有方法
extend({ patchProp }, nodeOps);
// runtime-core 提供渲染的核心方法，用runtime-dom中的api进行渲染
function createApp(rootComponent, rootProps = null) {
    const app = createRenderer().createApp(rootComponent, rootProps);
    let { mount } = app;
    app.mount = function (container) {
        container = nodeOps.querySelector(container);
        container.innerHTML = '';
        // 将组件渲染成dom元素 进行挂载
        mount(container); //函数劫持
    };
    return app;
}
// runtime-dom -> runtime-core
// runtime-dom 解决浏览器平台差异

export { createApp, createRenderer, h };
//# sourceMappingURL=runtime-dom.esm-bundler.js.map
