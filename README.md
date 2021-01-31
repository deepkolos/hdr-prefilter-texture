# HDRPrefilterTexture

### 介绍

在 THREE 中使用 HDR 需要经过 `PMREMGenerator` 处理才能使用，并且在小程序 WebGL 环境下有部分机型在前后切换页面会偶现生成出错误的纹理(见[小程序 WebGL 奇妙的 Bug 之旅 ](https://juejin.cn/post/6922829073920032775))，该项目的功能是导出`PMREMGenerator`生成产物到 PNG，再利用 PNG 无损压缩实现体积减少

输入大小为 5.3MB 的`http://www.yanhuangxueyuan.com/threejs/examples/textures/equirectangular/venice_sunset_2k.hdr`

| 环境   | REGBLoader 耗时 | PMREMGenerator 耗时 | 总耗时 |
| ------ | --------------- | ------------------- | ------ |
| 模拟器 | 144ms           | 17ms                | 161ms  |
| 小米 8 | 509ms           | 55ms                | 564ms  |

> 注：RGBELoader 主要是加载网络耗时

```
// HDR原本加载路径
RGBELoader -> PMREMGenerator -> 设置scene.environment

// 优化后的路径
TextureLoader -> 设置texture属性 -> 设置scene.environment
```

而`PMREMGenerator`产物导出后的PNG只有**1046.863kb**，体积减少了**4415.182kb**

所以就有了这个`HDRPrefilterTexture`的项目，同时解决小程序下某些机型 bug，同时也优化加载时间，**但是**仅仅适用于 HDR 需要`PMREMGenerator`处理的场景。

其实也是一个优化的思路，其他纹理需要经过特定处理才能直接使用的，均可以把产生物导出。

### [Demo](https://deepkolos.github.io/hdr-prefilter-texture/index.html)

<img src="https://raw.githubusercontent.com/deepkolos/hdr-prefilter-texture/master/demo.jpg" width="250" alt="" style="display:inline-block;"/>

## TODO

0. 支持批量导出 done
1. 生成导出大小对比表格 done
