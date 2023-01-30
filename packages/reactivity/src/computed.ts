import { isFunction } from './../../shared/src/index';
import { effect, track, trigger } from './effect';
import { TrackOpTyps, TriggerOrTyps } from './operators';

class ComputedRefImpl{
	public _dirty = true;
	public _value;
	public effect
	constructor(public getter, public setter){
		// 计算属性会默认产生一个effect
		this.effect = effect(getter,{
			lazy: true,
			scheduler:()=>{
				if(!this._dirty){
					this._dirty = true
					trigger(this, TriggerOrTyps.SET,'value')
				}
			}
		})
	}

	get value(){
		if(this._dirty){
			this._value = this.effect() // 返回用户返回值
			this._dirty = false
		}
		// 计算属性页要依赖收集
		track(this, TrackOpTyps.GET, 'value')
		return this._value;
	}
	
	set value(newValue){
		this.setter(newValue)
	}
}

export function computed(getterOrOptions) {
	let getter
	let setter

	if(isFunction(getterOrOptions)){
		getter = getterOrOptions
		setter = () => {
			console.warn('computed value must be readonly')
		}
	}else{
		getter = getterOrOptions.get
		setter = getterOrOptions.set
	}

	return new ComputedRefImpl(getter, setter)
}