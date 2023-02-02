import { isFunction, isObject, ShapeFlags } from "@vue/shared"
import { PublicInstanceProxyHandlers } from "./componentPublicInstance"
// 创建实例
export function createComponentInstance(vnode){
	// webComponent 需要有‘属性’ ‘插槽’
	const instance = {
		vnode,
		type: vnode.type, //用户写的对象
		props:{},// props{c:3}
		attrs:{},// <my-component a=1 b=2>
		slots:{},
		ctx:{},
		data:{},
		setupState:{},// 如果setup返回一个对象，这个对象会作为setuoUpstate
		render: null,
		isMounted: false,//是否挂载过
	}
	instance.ctx = {_: instance} // 代理
	return instance
}

export function setupComponent(instance){
	const { props, children} = instance.vnode
	instance.props = props //initProps() 根据props 解析出props 和 attrs 
	instance.children = children // initSlot()

	let isStateful = instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
	//是否是有状态的组件，函数组件无state
	if(isStateful){
		// 调用当前实例的setup得到返回值，填充setupState和对应的render方法
		setupStatefulComponent(instance)
	}

}

function setupStatefulComponent(instance){
	// 代理，给render函数传递参数
	instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)
	// 获取组件类型，拿到组件的setup方法
	let Component = instance.type
	let { setup } = Component
	if(setup){
		let setupContext = createSetupContext(instance)
		const setupResult =  setup(instance.props, setupContext);// 拿到instance中的props attrs slots emit expose
		// 可能是一个函数也可能是一个对象setupResult
		handleSetupResult(instance, setupResult)
	}else{
		finishComponentSetup(instance)
	}
}

function handleSetupResult(instance, setupResult){
	if(isFunction(setupResult)){
		instance.render = setupResult
	}else if(isObject(setupResult)){
		instance.setupState = setupResult
	}

	finishComponentSetup(instance)
}

function finishComponentSetup(instance){
	let Component = instance.type

	if(!instance.render){
		//template -> render函数
		// render函数放到实例上
		if(!Component.render && Component.template){
		}
		instance.render = Component.render
		// applyOptions 对vueSAPI做了兼容
	}
	console.log('render---===', instance.render.toString())
}

function createSetupContext(instance){
	return {
		attrs: instance.attrs,
		slots: instance.slots,
		emit: () => {},
		expose: () => {}
	}
}

// instance 组件各种状态和信息
// context 4个参数方便开发时使用
// proxy 代理方面取值vue2中也有