import React from 'react';
import AbstractLottie, { AbstractLottieProps } from '../Abstract';
import refreshAnimation from './lottie.json';

export type RefreshLottieProps = Omit<AbstractLottieProps, 'animationData'>;

/**
 * 刷新操作动画组件
 *
 * 使用 Lottie 动画展示刷新操作的视觉反馈，支持自定义尺寸、样式和播放行为。
 *
 * @component
 * @example
 * // 基础用法
 * <RefreshLottie />
 *
 * @example
 * // 自定义尺寸
 * <RefreshLottie size={64} />
 *
 * @example
 * // 自定义样式
 * <RefreshLottie
 *   size={80}
 *   style={{ margin: '20px' }}
 *   className="custom-refresh"
 * />
 *
 * @example
 * // 控制播放行为
 * <RefreshLottie
 *   autoplay={false}
 *   loop={false}
 * />
 *
 * @param props - 组件属性
 * @param props.autoplay - 是否自动播放动画，默认为 true
 * @param props.loop - 是否循环播放动画，默认为 true
 * @param props.className - 动画容器类名
 * @param props.style - 动画容器自定义样式
 * @param props.size - 动画尺寸（宽度和高度）
 * @returns 渲染的刷新操作动画组件
 */
export const RefreshLottie: React.FC<RefreshLottieProps> = (props) => (
  <AbstractLottie {...props} animationData={refreshAnimation} />
);

export default RefreshLottie;
