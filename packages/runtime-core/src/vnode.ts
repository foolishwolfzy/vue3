import { isArray, isObject, isString, ShapeFlags } from "@vue/shared"

export function isVnode(vnode){
	return vnode.__v_isVnode
}

export const createVNode = (type, props, children = null) => {
	// type区分组件还是普通元素

	const shapeFlag = isString(type) ? 
	ShapeFlags.ELEMENT : isObject(type) ? 
	ShapeFlags.STATEFUL_COMPONENT : 0

	const vnode = {
		__v_isVnode: true,
		type,
		props,
		children,
		component: null, // 组件对应的实例
		el: null, // 真实节点，和虚拟节点对应
		key: props && props.key,// diff中使用
		shapeFlag // 判断出自己的类型和儿子的类型
	}
	normalizeChildren(vnode, children)
	return vnode
}

function normalizeChildren(vnode, children){
	let type = 0
	if(children == null){
		
	}else if(isArray(children)){
		type = ShapeFlags.ARRAY_CHILDREN
	}else{
		type = ShapeFlags.TEXT_CHILDREN
	}

	vnode.shapeFlag |= type
}