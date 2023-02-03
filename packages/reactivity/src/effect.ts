import { isArray, isIntegerKey } from "@vue/shared"
import { TriggerOrTyps } from "./operators"

// 通过track去收集所有依赖
// trigger 去触发effect
export function effect(fn,options:any = {}) {
	const effect = createReactiveEffect(fn,options)
	if(!options.lazy){
		console.log('默认执行')
		effect()// effect默认会先执行一次
	}

	return effect
}

let uid = 0
let activeEffect //用于存储当前effect
const effectStack = []
function createReactiveEffect(fn,options){
	const effect = function reactiveEffect() {
		// console.log('todo...')
		if(!effectStack.includes(effect)){
			try {
				effectStack.push(effect)
				activeEffect = effect
				return fn()// 函数执行 会执行get方法
			} finally {
				effectStack.pop()
				activeEffect = effectStack[effectStack.length - 1]
			}
		}
		
	}
	effect.id = uid++ //加id用于区分effect
	effect._isEffect = true // 标识这是一个响应式的effect
	effect.raw = fn // 保存effect对应的原函数
	effect.options = options // 在effect上保存用户的属性
	return effect
}
// 对象属性收集他对应的effect函数 相当于2中的watcher
const targetMap = new WeakMap();
export function track(target, type, key){
	// activeEffect
	if(activeEffect === undefined) {
		return;
	}
	let depsMap = targetMap.get(target)
	if(!depsMap){
		targetMap.set(target,(depsMap = new Map))
	}
	let dep = depsMap.get(key)
	if(!dep){
		depsMap.set(key,(dep = new Set))
	}
	if(!dep.has(activeEffect)){
		dep.add(activeEffect)
		// activeEffect.deps.push(dep)// 双向记录方便取值
	}
	// 这个dep的key就是object的属性如state.name中的name，value就是effect(fn) 中的fn，即是副作用activeEffect
	console.log(targetMap, key, target)
	// console.log(target,key,activeEffect)
}

// 属性对应的effect（数组，对象）
export function trigger(target, type, key?, newValue?, oldValue?) {
	const depsMap = targetMap.get(target)
	if(!depsMap) return;

	const effects = new Set() //对effect去重
	// 将所有要执行的effect存到一个新的set中最后一起执行
	const add = (effectsToAdd) => {
		if(effectsToAdd){
			effectsToAdd.forEach(effect => effects.add(effect));
			// effectsToAdd.forEach(effect => effects());
		}
	}

	// 1.修改的是数组长度
	if(key === 'length' && isArray(target)){
		// 如果对应的长度，有新加入需要收集依赖
		depsMap.forEach((dep, key) => {
			if(key === 'length' || key > newValue) { // 如果更改的长度小于收集的索引那这个索引也要触发effect跟新执行
				add(dep)
			}
		})
	}else{
		//对象
		if(key !== undefined){ //这里肯定是修改
			add(depsMap.get(key))
		}
		// 修改了数组中的某个索引
		switch (type) {
			case TriggerOrTyps.ADD: //添加一个索引就触发长度更新
				if(isArray(target) && isIntegerKey(key)){
					add(depsMap.get('length'))
				}
				break;
		}
	}
	effects.forEach((effect:any) => {
		if(effect.options.scheduler){
			// console.log('scheduler-----')
			effect.options.scheduler(effect)
		}else{
			effect()
		}
	})
}