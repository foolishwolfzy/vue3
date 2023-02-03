import { effect } from '@vue/reactivity';
import { ShapeFlags } from '@vue/shared';
import { createAppAPI } from "./apiCreateApp";
import { createComponentInstance, setupComponent } from './component';
import { queueJob } from './scheduler';
import { normalizeVNode, Text } from './vnode';
// 创建一个渲染器
export function createRenderer(rendererOptions){

	const {
		insert: hostInsert,
		remove: hostRemove,
		patchProp: hostPatchProp,
		createElement: hostCreateElement,
		createText: hostCreateText,
		createComment: hostCreateComment,
		setText: hostSetText,
		setElementText: hostSetElementText,
	} = rendererOptions;

	//-------------------- 组件 ---------------------
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
				// update diff 序列优化 watchApi 生命周期
				console.log('更新了')
			}
		},{
			scheduler:queueJob
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

	//-------------------- 组件 ---------------------

	//-------------------- 元素 ---------------------
	const mountChildren = (children, container) => {
		for (let i = 0; i < children.length; i++) {
			let child = normalizeVNode(children[i])
			patch(null, child, container)
		}
	}
	const mountElement = (vnode, container) => {
		// 递归渲染
		const { props, shapeFlag, type, children } = vnode
		let el = (vnode.el = hostCreateElement(type))

		if(props){
			for (const key in props) {
				//porps渲染
				console.log(props[key],key)
				hostPatchProp(el,key,null,props[key])
			}
		}
		if(shapeFlag & ShapeFlags.TEXT_CHILDREN){
			hostSetElementText(el,children)
		}else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
			mountChildren(children, el)
		}
		//插入
		hostInsert(el, container)
	}

	const processElement = (n1, n2, container) => {
		if(n1 == null){
			mountElement(n2, container);
		}else{
			// 更新
			console.log('跟新---')
		}
	}

	//-------------------- 元素 ---------------------
	const processText = (n1, n2, container) =>{
		console.log('processText--===')
		if(n1 == null){
			hostInsert((n2.el = hostCreateText(n2.children)), container)
		}
	}

	const patch = (n1, n2, container) => {
		const { shapeFlag, type } = n2
		switch (type) {
			case Text:
				processText(n1, n2, container)
				break;
		
			default:
				if(shapeFlag & ShapeFlags.ELEMENT){
					console.log('yuanshu',n1, n2, container)
					processElement(n1, n2, container)
		
				}else if(shapeFlag & ShapeFlags.STATEFUL_COMPONENT){
					processComponent(n1, n2, container)
				}
				break;
		}
		
	}

	const render = (vnode, container) => {
		patch(null, vnode, container)
	}
	return {
		createApp:createAppAPI(render)
	}
}