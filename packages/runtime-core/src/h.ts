import { isArray, isObject } from "@vue/shared"
import { createVNode, isVnode } from "./vnode"

export function h(type, propsOrChildren, children){
	const l = arguments.length // 儿子节点要么是字符串，要么是数组，针对的是createVnode
	if(l == 2){ //  类型 + 属性 、 类型 + 孩子
		if(isObject(propsOrChildren) && isArray(propsOrChildren)){
			if(isVnode(propsOrChildren)){
				return createVNode(type, null, [propsOrChildren])
			}
		} else {
			// 第二个参数不是对象，那就是孩子
			return createVNode(type, null, propsOrChildren)
		}
	} else {
		if(l > 3){
			children = Array.prototype.slice.call(arguments,2)
		}else if(l === 3 && isVnode(children)){
			children = [children]
		}
		return createVNode(type, propsOrChildren, children)
	}
}