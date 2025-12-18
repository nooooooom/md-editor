import { Keyframes } from '@ant-design/cssinjs';
import {
  ChatTokenType,
  GenerateStyle,
  useEditorStyleRegister,
} from '../../Hooks/useStyle';

const shimmerAnimation = new Keyframes('shimmer', {
  '0%': {
    backgroundPosition: '200% 50%',
  },
  '100%': {
    backgroundPosition: '0% 50%',
  },
});

const genStyle: GenerateStyle<ChatTokenType> = (token) => {
  return {
    [token.componentCls]: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      textAlign: 'center',
      verticalAlign: 'middle',

      [`${token.componentCls}-with-tip`]: {
        alignItems: 'center',
      },

      [`${token.componentCls}-with-children`]: {
        alignItems: 'center',
      },

      [`${token.componentCls}-tip`]: {
        fontFamily: 'PingFang SC',
        fontSize: 13,
        fontWeight: 500,
        lineHeight: '18px',
        letterSpacing: 0,
        color: 'var(--color-gray-text-secondary)',
      },
    },

    [`${token.componentCls}-nested-pattern`]: {
      position: 'relative',

      [`&${token.componentCls}-spinning`]: {
        background:
          'linear-gradient(90deg, rgba(240, 251, 254, 1) 0%, rgba(245, 249, 255, 1) 50%, rgba(241, 240, 255, 1) 100%)',
        borderRadius: 'var(--radius-card-lg, 22px)',
        overflow: 'hidden',

        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          insetInlineStart: 0,
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
          animationName: shimmerAnimation,
          animationDuration: '3s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          transition: 'background 0.25s cubic-bezier(0.645, 0.045, 0.355, 1)',
          zIndex: 1,
        },

        [`& > ${token.componentCls}`]: {
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          width: '100%',
          height: '100%',
        },
      },
    },
  };
};

export const prefixCls = 'loading';

export function useStyle(prefixCls?: string) {
  return useEditorStyleRegister('loading', (token) => {
    const badgeToken = {
      ...token,
      componentCls: `.${prefixCls}`,
    };
    return [genStyle(badgeToken)];
  });
}
