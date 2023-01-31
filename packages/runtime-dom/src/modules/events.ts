export const patchEvent = (el, key, value) =>{
	const invokers = el._vei || (el._vei = {})
	const exists = invokers[key]
	if(value && exists){ //需要绑定事件 且存在的情况
		exists.value = value
	}else{
		const eventName = key.slice(2).toLowerCase()
		if(value){
			// 要绑定事件，以前没有绑定过
			let invoker = invokers[key] = createInvoker(value)
			el.addEventListener(eventName, invoker)
		}else{
			el.removeEventListener(eventName, exists)
			invokers[eventName] = undefined
		}
	}

	function createInvoker(value){
		const invoker = (e) => { invoker.value(e);}
		invoker.value = value
		return invoker
	}
}