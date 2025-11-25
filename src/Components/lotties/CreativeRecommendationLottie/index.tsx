import Lottie from 'lottie-react';
import React from 'react';
import creativeRecommendationLottie from './creativeRecommendation.json';

export interface CreativeRecommendationLottieProps {
  /**
   * 是否自动播放动画
   * @default true
   */
  autoplay?: boolean;
  /**
   * 是否循环播放动画
   * @default true
   */
  loop?: boolean;
  /**
   * 动画容器类名
   */
  className?: string;
  /**
   * 动画容器样式
   */
  style?: React.CSSProperties;
  /**
   * 动画尺寸（宽度和高度）
   * @example size={64}
   */
  size?: number | string;
}

/**
 * 创意生成中火花组件
 *
 * 使用 Lottie 动画展示创意生成中火花的组件，支持自定义尺寸、样式和播放行为。
 *
 * @component
 * @example
 * // 基础用法
 * <CreativeRecommendationLottie />
 *
 * @example
 * // 自定义尺寸
 * <CreativeRecommendationLottie size={64} />
 *
 * @example
 * // 自定义样式
 * <CreativeRecommendationLottie
 *   size={80}
 *   style={{ margin: '20px' }}
 *   className="custom-creative-recommendation"
 * />
 *
 * @example
 * // 控制播放行为
 * <CreativeRecommendationLottie
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
 * @returns 渲染的创意生成中火花组件
 */
export const CreativeRecommendationLottie: React.FC<
  CreativeRecommendationLottieProps
> = ({ autoplay = true, loop = true, className, style, size }) => {
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    ...style,
  };

  return (
    <Lottie
      style={containerStyle}
      className={className}
      data-testid="lottie-animation"
      aria-hidden="true"
      animationData={creativeRecommendationLottie}
      loop={loop}
      autoplay={autoplay}
    />
  );
};

export default CreativeRecommendationLottie;
