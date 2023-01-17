import { isObject } from '@vue/shared/src'

import {
	mutableHandlers,
	shallowReactiveHandlers,
	shallowReadonlyHandlers,
	readonlyHandlers,
} from './baseHandlers'
export function reactive(target){
	return createReactiveObject(target, false, mutableHandlers)

} 

export function shallowReactive(target){
	return createReactiveObject(target, false, shallowReactiveHandlers)

}
export function shallowReadonly(target){
	return createReactiveObject(target, true, shallowReadonlyHandlers)

}
export function readonly(target){
	return createReactiveObject(target, true, readonlyHandlers)

}
const reactiveMap = new WeakMap() //存储的key只能是对象，会自动垃圾回收，不会造成内存泄漏
const readonlyMap = new WeakMap()
export function createReactiveObject(target, isReadonly, baseHandlers){
	// 如果target不是对象，不拦截，reactive这个api只能拦截对象类型
	if(!isObject(target)){
		return target
	}
	const proxyMap = isReadonly ? readonlyMap : reactiveMap
	const existProxy = proxyMap.get(target)
	if(existProxy){
		return existProxy
	}
	const proxy = new Proxy(target, baseHandlers)
	proxyMap.set(target,proxy)
	return proxy;
}