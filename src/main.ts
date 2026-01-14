import { createApp } from 'vue'
import App from './App.vue'

let app: any = null
let vm: any = null

export function init(plugin: any) {
  console.log('Initializing Vue app for Halo Publisher plugin')
  
  // 创建Vue应用
  app = createApp(App)
  
  // 挂载应用到#app元素
  const appElement = document.getElementById('app')
  if (appElement) {
    vm = app.mount(appElement)
    
    // 将Vue实例绑定到window对象上，方便插件API调用
    ;(window as any)._sy_halo_publisher = vm
    
    console.log('Vue app initialized successfully and mounted to #app')
  } else {
    console.error('Failed to find #app element, Vue app not initialized')
  }
}

export function destroy() {
  console.log('Destroying Vue app for Halo Publisher plugin')
  
  // 销毁Vue应用
  if (app) {
    app.unmount()
    app = null
  }
  
  // 移除window对象上的引用
  if ((window as any)._sy_halo_publisher) {
    delete (window as any)._sy_halo_publisher
  }
  
  vm = null
  
  console.log('Vue app destroyed successfully')
}