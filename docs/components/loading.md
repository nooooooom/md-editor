---
title: Loading 加载
atomId: Loading
group:
  title: 通用
  order: 5
---

# Loading 加载

一个优雅的加载动画组件，基于 Framer Motion 实现展示流畅的加载动画效果。

## 代码演示

<code src="../demos/loading.tsx">基础用法</code>

## API

### Loading

| 参数      | 说明                   | 类型                                       | 默认值      |
| --------- | ---------------------- | ------------------------------------------ | ----------- |
| type      | 动画类型               | `'loading' \| 'spark' \| 'recommendation'` | `'loading'` |
| autoplay  | 是否自动播放动画       | `boolean`                                  | `true`      |
| loop      | 是否循环播放动画       | `boolean`                                  | `true`      |
| className | 动画容器类名           | `string`                                   | -           |
| style     | 动画容器样式           | `React.CSSProperties`                      | -           |
| size      | 动画尺寸（宽度和高度） | `number \| string`                         | `'1em'`     |

### 动画类型

Loading 组件支持三种动画类型，通过 `type` 属性进行切换：

- **`loading`** (默认): 标准的加载动画，适用于通用的加载场景
- **`spark`**: 创意生成中火花，适用于创意生成、灵感激发、内容创作等场景
- **`recommendation`**: 创意推荐闪动，适用于推荐系统、建议生成、智能推荐等场景

### 特性

- 🎨 **多种类型**: 支持三种不同的动画类型，适应不同的使用场景
- ⚡ **高性能**: 基于 Framer Motion 实现，确保动画流畅且性能优异
- 📏 **灵活尺寸**: 支持通过 `size` 属性或 `style` 中的 `fontSize` 控制整体大小
- 🔄 **播放控制**: 支持自定义自动播放和循环播放行为

### 使用说明

- 组件默认尺寸为 `1em`，可以很好地与文本内容对齐
- 可以通过 `size` 属性直接设置动画的宽度和高度
- 也可以通过 `style` 属性传递 `fontSize` 来控制大小
- 支持所有 `LoadingLottie` 组件的属性，可灵活配置播放行为
- 根据不同的使用场景选择合适的 `type` 类型
