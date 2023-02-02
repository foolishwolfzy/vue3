import { effect } from '@vue/reactivity';
import { ShapeFlags } from '@vue/shared';
import { createAppAPI } from "./apiCreateApp";
import { createComponentInstance, setupComponent } from './component';

const setupRenderEffect = (instance, container) =>{
	// 创建一个effect 在effect中调用render 这样render方法中拿到的数据会收集这个effect，属性更新触发effect
	// instance.render()
	effect(function componentEffect() {
		if(!instance.isMounted){
			// 首次渲染
			let proxyToUse = instance.proxy
			// vue2 $vnode _vnode
			// vue3 vnode subTree
			let subTree = instance.render.call(proxyToUse, proxyToUse)
			patch(null, subTree, container)
			instance.isMounted = true
		}else{
			// update
		}
	})
}
const mountComponent = (initialVNode, container) => {
	// 调用setup得到返回值，获取render函数返回的结果来进行渲染
	// 1. 创建实例
	const instance = (initialVNode.component = createComponentInstance(initialVNode))
	// 2. 需要的数据解析到实例上
	setupComponent(instance)
	// 3. 创建effect 让render函数执行
	setupRenderEffect(instance, container)
}

const processComponent = (n1, n2, container) => {
	if(n1 == null){//没有上一次（老）的vnode
		mountComponent(n2, container);
	}else{
		//跟新，update
	}
}

const patch = (n1, n2, container) => {
	const { shapeFlag } = n2
	if(shapeFlag & ShapeFlags.ELEMENT){
		console.log('yuanshu',n1, n2, container)
	}else if(shapeFlag & ShapeFlags.STATEFUL_COMPONENT){
		processComponent(n1, n2, container)
	}
}
// 创建一个渲染器
export function createRenderer(rendererOptions){
	const render = (vnode, container) => {
		patch(null, vnode, container)
	}
	return {
		createApp:createAppAPI(render)
	}
}