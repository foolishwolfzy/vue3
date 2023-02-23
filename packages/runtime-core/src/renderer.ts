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
		nextSibling: hostNextSibling,
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
				const prevTree = instance.subTree
				let proxyToUse = instance.proxy
				const nextTree = instance.render.call(proxyToUse,proxyToUse)
				console.log('更新了diff---===', prevTree, nextTree)

				patch(prevTree, nextTree, container)
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
	const mountElement = (vnode, container, anchor = null) => {
		// 递归渲染
		const { props, shapeFlag, type, children } = vnode
		let el = (vnode.el = hostCreateElement(type))

		if(props){
			for (const key in props) {
				//porps渲染
				// console.log(props[key],key)
				hostPatchProp(el,key,null,props[key])
			}
		}
		if(shapeFlag & ShapeFlags.TEXT_CHILDREN){
			hostSetElementText(el,children)
		}else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
			mountChildren(children, el)
		}
		//插入
		hostInsert(el, container, anchor)
	}
	
	const patchProps = (oldProps, newProps, el) => {
		if(oldProps !== newProps){
			for (const key in newProps) {
				const prev = oldProps[key]
				const next = newProps[key]
				if(prev !== next){
					hostPatchProp(el, key, prev, next)
				}
			}
			for (const key in oldProps) {
				if(!(key in newProps)){
					hostPatchProp(el, key, oldProps[key], null)
				}
				
			}
		}
	}

	const unmountChildren = (children) => {
		for (let i = 0; i < children.length; i++) {
			unmount(children[i])
		}
	}

	const patchKeydChildren = (c1, c2, el) => {
		// 内部有优化策略 
		// abc    i = 0
		// abde  从头比
		let i = 0;
		let e1 = c1.length - 1; // 老儿子中最后一项的索引
		let e2 = c2.length - 1; // 新儿子中最后一项的索引
		while (i <= e1 && i <= e2) {
				const n1 = c1[i];
				const n2 = c2[i];
				if (isSameVNodeType(n1, n2)) {
						patch(n1, n2, el); // 会递归比对子元素
				} else {
						break;
				}
				i++;
		}
		// abc // e1 = 2
		//eabc // e2 = 3 // 从后比
		while (i <= e1 && i <= e2) {
				const n1 = c1[e1];
				const n2 = c2[e2];
				if (isSameVNodeType(n1, n2)) {
						patch(n1, n2, el);
				} else {
						break;
				}
				e1--;
				e2--;
		}

		//  只考虑 元素新增和删除的情况 
		// abc => abcd  (i=3  e1=2  e2=3 )    abc  => dabc (i=0  e1=-1  e2=0 )

		// 只要i 大于了 e1 表示新增属性 老的少 新的多  有一方已经完全对比完成了
		if (i > e1) { // 说明有新增 
				if (i <= e2) { // 表示有新增的部分
						// 先根据e2 取他的下一个元素  和 数组长度进行比较
						const nextPos = e2 + 1;
						// 向前还是向后插入
						const anchor = nextPos < c2.length ? c2[nextPos].el : null;
						while (i <= e2) {
								patch(null, c2[i], el, anchor); // 向后追加
								i++;
						}
				}
				// abcd  abc (i=3  e1=3  e2=2)
		} else if (i > e2) { // 删除 老的多 新的少 有一方已经完全对比完成了
				while (i <= e1) {
						hostRemove(c1[i].el);
						i++;
				}
		} else {
				// 无规律的情况 diff 算法
				// ab [cde] fg   // s1=2  e1=4  
				// ab [dech] fg  //  s2=2  e2=5;  => [5,4,3,0]; 无视他
				const s1 = i;
				const s2 = i;
				// 新的索引 和 key 做成一个映射表
				// vue3 用的是新的做映射表 vue用的是老的做映射表
				const keyToNewIndexMap = new Map();
				for (let i = s2; i <= e2; i++) {
						const nextChild = c2[i];
						keyToNewIndexMap.set(nextChild.key, i);
				}
				const toBePatched = e2 - s2 + 1;
				const newIndexToOldMapIndex = new Array(toBePatched).fill(0);

				// 只是做相同属性的diff 但是位置可能还不对
				for (let i = s1; i <= e1; i++) {
						const prevChild = c1[i];
						let newIndex = keyToNewIndexMap.get(prevChild.key); // 获取新的索引
						if (newIndex == undefined) {
								hostRemove(prevChild.el); // 老的有 新的没有直接删除
						} else {// 新老对比，比较完毕位置后有差异
								// 新的和旧的索引关系
								newIndexToOldMapIndex[newIndex - s2] = i + 1;
								patch(prevChild, c2[newIndex], el); // patch操作 会复用元素 更新属性 比较儿子
						}
				}
				//  最长增长序列 [0,1]  [0,1,2,3]
				let increasingIndexSequence = getSequence(newIndexToOldMapIndex)

				let j = increasingIndexSequence.length - 1;

				// 从后面开始插入往前插入，找他的下一个
				for (let i = toBePatched - 1; i >= 0; i--) {
						const nextIndex = s2 + i; // [edch]   找到h的索引 
						const nextChild = c2[nextIndex]; // 找到 h
						let anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null; // 找到当前元素的下一个元素，
						if (newIndexToOldMapIndex[i] == 0) { // 这是一个新元素 直接创建插入到 当前元素的下一个即可
								patch(null, nextChild, el, anchor)
						} else {
								// 根据参照物 将节点直接移动过去  所有节点都要移动 （但是有些节点可以不动）
								if(j < 0 || i != increasingIndexSequence[j]){
								// 此时没有考虑不动的情况 
										hostInsert(nextChild.el, el, anchor);
								}else{
										j--;
								}
						}
				}
		}
	}


	// 贪心 二分查找
	function getSequence(arr) { // 最终的结果是索引
			const p = arr.slice()// 里面内容无所谓，与原来数组相同 用来存放索引
			const result = [0] // 索引
			let i, 
			j, 
			u, // start
			v, // end
			c  //middle
			const len = arr.length
			for (i = 0; i < len; i++) {
					const arrI = arr[i]
					if (arrI !== 0) {
							j = result[result.length - 1]
							if (arr[j] < arrI) {
									p[i] = j // 标记当前前一个对应的索引
									result.push(i)// 当前啊的值 比上一个大 直接push 并且让这个人得记录他的前一个
									continue
							}
							// 二分查找 找到比当前值大的那一个
							u = 0
							v = result.length - 1
							while (u < v) { // 重合就说明找到了 对应的值
									c = ((u + v) / 2) | 0 // 找到中间位置的前一个
									if (arr[result[c]] < arrI) {
											u = c + 1
									} else {
											v = c
									}// 找到结果集中，比当前这一项大的数
							}
							// start / end 就是找到的位置
							if (arrI < arr[result[u]]) {
									if (u > 0) {//需要替换
											p[i] = result[u - 1] //将他替换的前一个记住
									}
									result[u] = i
							}
					}
			}
			u = result.length
			v = result[u - 1]
			while (u-- > 0) {
					result[u] = v
					v = p[v]
			}
			return result
	} // O(nlogn) 性能比 O(n^2)好

	const patchChildren = (n1, n2, el) => {
		const c1 = n1.children
		const c2 = n2.children

		const prevShapeFlag = n1.shapeFlag
		const shapeFlag = n2.shapeFlag//分别标识过儿子的状况
		// 老的是n个孩子，新的是文件
		if(shapeFlag === ShapeFlags.TEXT_CHILDREN){ // case 1 现在是文本 之前是数组
			if(prevShapeFlag === ShapeFlags.ARRAY_CHILDREN){
				unmountChildren(c1)
			}
			// 两个都是文本
			if(c2 !== c1){ // case 2 之前都是文本
				hostSetElementText(el, c2)
			}
		}else{
			// 现在是数组 上次可能是文本或数组
			if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN){ // case 3 之前和现在都是数组
				if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
					//当前是数组 之前是数组 2个数组对比 -》 diff算法
					console.log('patch----====diff')
					patchKeydChildren(c1, c2, el)
				}else{
					// 没有孩子 特殊情况 当前是null 老的删掉
					unmountChildren(c1)
				}
			}else{
				// case 4 现在是数组之前是文本 
				if(prevShapeFlag & ShapeFlags.TEXT_CHILDREN){
					hostSetElementText(el,'')
				}
				if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
					mountChildren(c2,el)
				}
			}
		}
	}

	const patchElement = (n1, n2, container) => {
		//元素是相同节点
		let el = (n2.el = n1.el)
		//跟新属性、跟新儿子
		const oldProps = n1.props || {}
		const newProps = n2.props || {}

		patchProps(oldProps, newProps, container)

		patchChildren(n1, n2, container)
	};

	const processElement = (n1, n2, container,anchor = null) => {
		if(n1 == null){
			mountElement(n2, container);
		}else{
			// 更新
			console.log('跟新---')
			patchElement(n1, n2, container);

		}
	}

	//-------------------- 元素 ---------------------
	const processText = (n1, n2, container) =>{
		console.log('processText--===')
		if(n1 == null){
			hostInsert((n2.el = hostCreateText(n2.children)), container)
		}
	}

	const unmount = (n1) => {
		//组件的话则调用组件生命周期等
		hostRemove(n1.el)
	}
	const isSameVNodeType = (n1, n2) => {
		return n1.type === n2.type && n1.key === n2.key
	}

	const patch = (n1, n2, container, anchor = null) => {
		const { shapeFlag, type } = n2
		if(n1 && isSameVNodeType(n1, n2)) {
			anchor = hostNextSibling(n1.el)
			unmount(n1)
			n1 = null
		}

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