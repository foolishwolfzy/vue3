var VueReactivity = (function (exports) {
	'use strict';

	const isObject = (value) => typeof value == 'object' && value !== null;
	const extend = Object.assign;

	function createGetter(isReadonly = false, shallow = false) {
	    return function get(target, key, receiver) {
	        // proxy + reflect
	        // 后续Object上的方法 会迁移到Reflect ,之前的target[key] = value 方式设置值可能会失败，并不会报异常，也没有返回值标识
	        const res = Reflect.get(target, key, receiver);
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
	        const res = Reflect.set(target, key, value, receiver);
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

	exports.reactive = reactive;
	exports.readonly = readonly;
	exports.shallowReactive = shallowReactive;
	exports.shallowReadonly = shallowReadonly;

	return exports;

})({});
//# sourceMappingURL=reactivity.global.js.map
