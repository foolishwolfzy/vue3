var VueRuntimeDOM = (function (exports) {
	'use strict';

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
	    setText: (node, text) => node.nodeValue = text,
	    nextSibling: (node) => node.nextSibling
	};

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
	        // console.log('todo...')
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
	            // console.log('scheduler-----')
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
	const Text = Symbol("Text");
	function normalizeVNode(child) {
	    if (isObject(child))
	        return child;
	    return createVNode(Text, null, String(child));
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

	let queue = [];
	function queueJob(job) {
	    if (!queue.includes(job)) {
	        queue.push(job);
	        queueFlush();
	    }
	}
	let isFlushPending = false;
	function queueFlush() {
	    if (!isFlushPending) {
	        isFlushPending = true;
	        Promise.resolve().then(flushJobs);
	    }
	}
	function flushJobs() {
	    isFlushPending = false;
	    // 清空时 需要根据调用的顺序依次刷新 先父再子
	    queue.sort((a, b) => a.id - b.id);
	    for (let i = 0; i < queue.length; i++) {
	        const job = queue[i];
	        job();
	    }
	    queue.length = 0;
	}

	// 创建一个渲染器
	function createRenderer(rendererOptions) {
	    const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, createElement: hostCreateElement, createText: hostCreateText, createComment: hostCreateComment, setText: hostSetText, setElementText: hostSetElementText, nextSibling: hostNextSibling, } = rendererOptions;
	    //-------------------- 组件 ---------------------
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
	            else {
	                // update diff 序列优化 watchApi 生命周期
	                const prevTree = instance.subTree;
	                let proxyToUse = instance.proxy;
	                const nextTree = instance.render.call(proxyToUse, proxyToUse);
	                console.log('更新了diff---===', prevTree, nextTree);
	                patch(prevTree, nextTree, container);
	            }
	        }, {
	            scheduler: queueJob
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
	    //-------------------- 组件 ---------------------
	    //-------------------- 元素 ---------------------
	    const mountChildren = (children, container) => {
	        for (let i = 0; i < children.length; i++) {
	            let child = normalizeVNode(children[i]);
	            patch(null, child, container);
	        }
	    };
	    const mountElement = (vnode, container, anchor = null) => {
	        // 递归渲染
	        const { props, shapeFlag, type, children } = vnode;
	        let el = (vnode.el = hostCreateElement(type));
	        if (props) {
	            for (const key in props) {
	                //porps渲染
	                // console.log(props[key],key)
	                hostPatchProp(el, key, null, props[key]);
	            }
	        }
	        if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
	            hostSetElementText(el, children);
	        }
	        else if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
	            mountChildren(children, el);
	        }
	        //插入
	        hostInsert(el, container, anchor);
	    };
	    const patchProps = (oldProps, newProps, el) => {
	        if (oldProps !== newProps) {
	            for (const key in newProps) {
	                const prev = oldProps[key];
	                const next = newProps[key];
	                if (prev !== next) {
	                    hostPatchProp(el, key, prev, next);
	                }
	            }
	            for (const key in oldProps) {
	                if (!(key in newProps)) {
	                    hostPatchProp(el, key, oldProps[key], null);
	                }
	            }
	        }
	    };
	    const unmountChildren = (children) => {
	        for (let i = 0; i < children.length; i++) {
	            unmount(children[i]);
	        }
	    };
	    const patchKeydChildren = (c1, c2, el) => {
	        // 内部有优化策略 
	        // abc    i = 0
	        // abde  从头比
	        let i = 0;
	        let e1 = c1.length - 1; // 老儿子中最后一项的索引
	        let e2 = c2.length - 1; // 新儿子中最后一项的索引
	        while (i <= e1 && i <= e2) {
	            const n1 = c1[i];
	            const n2 = c2[i];
	            if (isSameVNodeType(n1, n2)) {
	                patch(n1, n2, el); // 会递归比对子元素
	            }
	            else {
	                break;
	            }
	            i++;
	        }
	        // abc // e1 = 2
	        //eabc // e2 = 3 // 从后比
	        while (i <= e1 && i <= e2) {
	            const n1 = c1[e1];
	            const n2 = c2[e2];
	            if (isSameVNodeType(n1, n2)) {
	                patch(n1, n2, el);
	            }
	            else {
	                break;
	            }
	            e1--;
	            e2--;
	        }
	        //  只考虑 元素新增和删除的情况 
	        // abc => abcd  (i=3  e1=2  e2=3 )    abc  => dabc (i=0  e1=-1  e2=0 )
	        // 只要i 大于了 e1 表示新增属性 老的少 新的多  有一方已经完全对比完成了
	        if (i > e1) { // 说明有新增 
	            if (i <= e2) { // 表示有新增的部分
	                // 先根据e2 取他的下一个元素  和 数组长度进行比较
	                const nextPos = e2 + 1;
	                // 向前还是向后插入
	                const anchor = nextPos < c2.length ? c2[nextPos].el : null;
	                while (i <= e2) {
	                    patch(null, c2[i], el, anchor); // 向后追加
	                    i++;
	                }
	            }
	            // abcd  abc (i=3  e1=3  e2=2)
	        }
	        else if (i > e2) { // 删除 老的多 新的少 有一方已经完全对比完成了
	            while (i <= e1) {
	                hostRemove(c1[i].el);
	                i++;
	            }
	        }
	        else {
	            // 无规律的情况 diff 算法
	            // ab [cde] fg   // s1=2  e1=4  
	            // ab [dech] fg  //  s2=2  e2=5;  => [5,4,3,0]; 无视他
	            const s1 = i;
	            const s2 = i;
	            // 新的索引 和 key 做成一个映射表
	            // vue3 用的是新的做映射表 vue用的是老的做映射表
	            const keyToNewIndexMap = new Map();
	            for (let i = s2; i <= e2; i++) {
	                const nextChild = c2[i];
	                keyToNewIndexMap.set(nextChild.key, i);
	            }
	            const toBePatched = e2 - s2 + 1;
	            const newIndexToOldMapIndex = new Array(toBePatched).fill(0);
	            // 只是做相同属性的diff 但是位置可能还不对
	            for (let i = s1; i <= e1; i++) {
	                const prevChild = c1[i];
	                let newIndex = keyToNewIndexMap.get(prevChild.key); // 获取新的索引
	                if (newIndex == undefined) {
	                    hostRemove(prevChild.el); // 老的有 新的没有直接删除
	                }
	                else { // 新老对比，比较完毕位置后有差异
	                    // 新的和旧的索引关系
	                    newIndexToOldMapIndex[newIndex - s2] = i + 1;
	                    patch(prevChild, c2[newIndex], el); // patch操作 会复用元素 更新属性 比较儿子
	                }
	            }
	            //  最长增长序列 [0,1]  [0,1,2,3]
	            let increasingIndexSequence = getSequence(newIndexToOldMapIndex);
	            let j = increasingIndexSequence.length - 1;
	            // 从后面开始插入往前插入，找他的下一个
	            for (let i = toBePatched - 1; i >= 0; i--) {
	                const nextIndex = s2 + i; // [edch]   找到h的索引 
	                const nextChild = c2[nextIndex]; // 找到 h
	                let anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null; // 找到当前元素的下一个元素，
	                if (newIndexToOldMapIndex[i] == 0) { // 这是一个新元素 直接创建插入到 当前元素的下一个即可
	                    patch(null, nextChild, el, anchor);
	                }
	                else {
	                    // 根据参照物 将节点直接移动过去  所有节点都要移动 （但是有些节点可以不动）
	                    if (j < 0 || i != increasingIndexSequence[j]) {
	                        // 此时没有考虑不动的情况 
	                        hostInsert(nextChild.el, el, anchor);
	                    }
	                    else {
	                        j--;
	                    }
	                }
	            }
	        }
	    };
	    // 贪心 二分查找
	    function getSequence(arr) {
	        const p = arr.slice(); // 里面内容无所谓，与原来数组相同 用来存放索引
	        const result = [0]; // 索引
	        let i, j, u, // start
	        v, // end
	        c; //middle
	        const len = arr.length;
	        for (i = 0; i < len; i++) {
	            const arrI = arr[i];
	            if (arrI !== 0) {
	                j = result[result.length - 1];
	                if (arr[j] < arrI) {
	                    p[i] = j; // 标记当前前一个对应的索引
	                    result.push(i); // 当前啊的值 比上一个大 直接push 并且让这个人得记录他的前一个
	                    continue;
	                }
	                // 二分查找 找到比当前值大的那一个
	                u = 0;
	                v = result.length - 1;
	                while (u < v) { // 重合就说明找到了 对应的值
	                    c = ((u + v) / 2) | 0; // 找到中间位置的前一个
	                    if (arr[result[c]] < arrI) {
	                        u = c + 1;
	                    }
	                    else {
	                        v = c;
	                    } // 找到结果集中，比当前这一项大的数
	                }
	                // start / end 就是找到的位置
	                if (arrI < arr[result[u]]) {
	                    if (u > 0) { //需要替换
	                        p[i] = result[u - 1]; //将他替换的前一个记住
	                    }
	                    result[u] = i;
	                }
	            }
	        }
	        u = result.length;
	        v = result[u - 1];
	        while (u-- > 0) {
	            result[u] = v;
	            v = p[v];
	        }
	        return result;
	    } // O(nlogn) 性能比 O(n^2)好
	    const patchChildren = (n1, n2, el) => {
	        const c1 = n1.children;
	        const c2 = n2.children;
	        const prevShapeFlag = n1.shapeFlag;
	        const shapeFlag = n2.shapeFlag; //分别标识过儿子的状况
	        // 老的是n个孩子，新的是文件
	        if (shapeFlag === 8 /* ShapeFlags.TEXT_CHILDREN */) { // case 1 现在是文本 之前是数组
	            if (prevShapeFlag === 16 /* ShapeFlags.ARRAY_CHILDREN */) {
	                unmountChildren(c1);
	            }
	            // 两个都是文本
	            if (c2 !== c1) { // case 2 之前都是文本
	                hostSetElementText(el, c2);
	            }
	        }
	        else {
	            // 现在是数组 上次可能是文本或数组
	            if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) { // case 3 之前和现在都是数组
	                if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
	                    //当前是数组 之前是数组 2个数组对比 -》 diff算法
	                    console.log('patch----====diff');
	                    patchKeydChildren(c1, c2, el);
	                }
	                else {
	                    // 没有孩子 特殊情况 当前是null 老的删掉
	                    unmountChildren(c1);
	                }
	            }
	            else {
	                // case 4 现在是数组之前是文本 
	                if (prevShapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
	                    hostSetElementText(el, '');
	                }
	                if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
	                    mountChildren(c2, el);
	                }
	            }
	        }
	    };
	    const patchElement = (n1, n2, container) => {
	        //元素是相同节点
	        (n2.el = n1.el);
	        //跟新属性、跟新儿子
	        const oldProps = n1.props || {};
	        const newProps = n2.props || {};
	        patchProps(oldProps, newProps, container);
	        patchChildren(n1, n2, container);
	    };
	    const processElement = (n1, n2, container, anchor = null) => {
	        if (n1 == null) {
	            mountElement(n2, container);
	        }
	        else {
	            // 更新
	            console.log('跟新---');
	            patchElement(n1, n2, container);
	        }
	    };
	    //-------------------- 元素 ---------------------
	    const processText = (n1, n2, container) => {
	        console.log('processText--===');
	        if (n1 == null) {
	            hostInsert((n2.el = hostCreateText(n2.children)), container);
	        }
	    };
	    const unmount = (n1) => {
	        //组件的话则调用组件生命周期等
	        hostRemove(n1.el);
	    };
	    const isSameVNodeType = (n1, n2) => {
	        return n1.type === n2.type && n1.key === n2.key;
	    };
	    const patch = (n1, n2, container, anchor = null) => {
	        const { shapeFlag, type } = n2;
	        if (n1 && isSameVNodeType(n1, n2)) {
	            anchor = hostNextSibling(n1.el);
	            unmount(n1);
	            n1 = null;
	        }
	        switch (type) {
	            case Text:
	                processText(n1, n2, container);
	                break;
	            default:
	                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
	                    console.log('yuanshu', n1, n2, container);
	                    processElement(n1, n2, container);
	                }
	                else if (shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
	                    processComponent(n1, n2, container);
	                }
	                break;
	        }
	    };
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
	const rendererOptions = extend({ patchProp }, nodeOps);
	// runtime-core 提供渲染的核心方法，用runtime-dom中的api进行渲染
	function createApp(rootComponent, rootProps = null) {
	    const app = createRenderer(rendererOptions).createApp(rootComponent, rootProps);
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

	exports.computed = computed;
	exports.createApp = createApp;
	exports.createRenderer = createRenderer;
	exports.effect = effect;
	exports.h = h;
	exports.reactive = reactive;
	exports.readonly = readonly;
	exports.shallowReactive = shallowReactive;
	exports.shallowReadonly = shallowReadonly;

	return exports;

})({});
//# sourceMappingURL=runtime-dom.global.js.map
