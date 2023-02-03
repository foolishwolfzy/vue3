import { extend, hasChanged, hasOwn, isArray, isIntegerKey, isObject } from '@vue/shared/src'
import { readonly, reactive } from './reactive'
import { track, trigger } from './effect'
import { TrackOpTyps, TriggerOrTyps } from './operators'

function createGetter(isReadonly = false, shallow = false) {// 拦截获取功能
	return function get(target, key, receiver){
		// proxy + reflect
		// 后续Object上的方法 会迁移到Reflect ,之前的target[key] = value 方式设置值可能会失败，并不会报异常，也没有返回值标识
		const res = Reflect.get(target, key, receiver)

		if(!isReadonly){
			// 依赖收集，数据变化时更新视图
			console.log('执行effect时会取值','收集effect')
			track(target, TrackOpTyps.GET, key)
		}

		if(shallow){
			return res
		}

		if(isObject(res)){ //vue2 是一上来就递归，vue3是取值时才进行
			return isReadonly ? readonly(res) : reactive(res)
		}

		return res
	}
}

function createSetter(shallow = false) { // 拦截设置功能
	return function get(target, key, value, receiver){
		const oldValue = target[key];
		let hadkey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key)
		const res = Reflect.set(target, key, value, receiver)
		// 数据更新时 通知对应属性的effect执行
		if(!hadkey){
			//增加
			trigger(target, TriggerOrTyps.ADD, key, value)
		}else if(hasChanged(oldValue, value)){
			//修改
			trigger(target, TriggerOrTyps.SET, key, value, oldValue)
		}

		return res
	}
}

const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

const set = createSetter()
const shallowSet = createSetter(true)

export const mutableHandlers = {
	get,
	set
}

export const shallowReactiveHandlers = {
	get:shallowGet,
	set:shallowSet
}

let readonlyObj = {
	set:(target,key)=>{
		console.warn(`set on '${target}' key '${key}' falied`)
	}
}

export const shallowReadonlyHandlers = extend({
	get:shallowReadonlyGet,
},readonlyObj)

export const readonlyHandlers = extend({
	get:readonlyGet
},readonlyObj)

