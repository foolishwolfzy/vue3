
export function effect(fn,options:any = {}) {
	const effect = createReactiveEffect(fn,options)

	if(!options.lazy){
		effect()// effect默认会先执行一次
	}

	return effect
}
let uid = 0
let activeEffect //用于存储当前effect
const effectStack = []
function createReactiveEffect(fn,options){
	const effect = function reactiveEffect() {
		console.log('todo...')
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
	}
	// 这个dep的key就是object的属性如state.name中的name，value就是effect(fn) 中的fn，即是副作用activeEffect
	console.log(targetMap, key, target)
	// console.log(target,key,activeEffect)
}