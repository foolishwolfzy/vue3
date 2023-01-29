// 用于将非对象转换为响应式，对象类型的则用reactive
// reactive内部用的是proxy， ref内部用的是defineProperty

import { hasChanged, isArray, isObject } from "@vue/shared"
import { track, trigger } from "./effect"
import { TrackOpTyps, TriggerOrTyps } from "./operators"
import { reactive } from "./reactive"

// 高阶函数柯里化
export function ref(value) {
	return createRef(value)
}

export function shallowRef(value){
	return createRef(value,true)
}

const convert = (val) => isObject(val) ? reactive(val) : val
// 之前是对象，由于对象不方便扩展就改成了class
class RefImpl {
	public _value // 声明一个_value属性 但是没有赋值
	public __v_isRef = true
	constructor(public rawValue, public shallow){ // 加了public修饰符标识此属性放到了实例上，this.xx可拿到
		this._value = shallow ? rawValue : convert(rawValue) //如果是深度要递归把里面的变成响应式
	}

	get value() {
		track(this, TrackOpTyps.GET, 'value')
		return this._value
	}

	set value(newValue){
		if(hasChanged(newValue, this.rawValue)){
			this.rawValue = this.shallow ? newValue : convert(newValue)
			this._value = newValue
			trigger(this, TriggerOrTyps.SET, 'value', newValue)
		}
	}
}

function createRef(rawValue,shallow = false) {
	return new RefImpl(rawValue,shallow)
	
}

class objectRefImpl {
	public __v_isRef = true
	constructor(public target, public key){ 
	}

	get value() {
		return this.target[this.key]
	}

	set value(newValue){
		this.target[this.key] = newValue

	}
}
// 用于proxy后结构赋值，state = reactive({name:'zy',age:18})
// const {name, age} = state 这样的name age 只是 'zy' 和 18 
// const {name, age} = toRefs(state) name和age就是响应式的了
export function toRef(target, key) {
	return new objectRefImpl(target, key)
}

export function toRefs(object) {
	const ret = isArray(object) ? new Array(object.length) : {} //object可能是数组或对象

	for (const key in object) {
		ret[key] = toRef(object, key)
	}
	return ret
}