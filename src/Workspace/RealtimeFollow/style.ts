import type { ChatTokenType, GenerateStyle } from '../../hooks/useStyle';
import { useEditorStyleRegister } from '../../hooks/useStyle';

const genStyle: GenerateStyle<ChatTokenType> = (token) => {
  return {
    [`${token.componentCls}`]: {
      [`&-container`]: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      },

      [`&-header`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        marginLeft: -16,
        marginRight: -16,
        borderBottom: '1px solid var(--color-gray-border-light)',

        // 返回按钮
        [`&-back-button`]: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: '#767e8b',
          transition: 'all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)',
          borderRadius: 'var(--radius-control-base)',
          backdropFilter: 'blur(20px)',

          '&:hover': {
            background: '#f0f0f0',
          },
        },

        // 返回图标
        [`&-back-icon`]: {
          fontSize: '16px',
        },

        [`&-with-border`]: {
          borderBottom: '1px solid rgba(20, 22, 28, 0.07)',
        },

        [`&-with-back`]: {
          [`${token.componentCls}-header-icon`]: {
            [`&--html`]: {
              width: '16px',
              height: '16px',
              background: 'transparent',
            },

            [`&--default`]: {
              width: '16px',
              height: '16px',
              background: 'transparent',
            },
          },
        },

        [`&-left`]: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        },

        [`&-icon`]: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',

          [`&--html`]: {
            width: '40px',
            height: '40px',
            color: '#00B5FD',
            background:
              'linear-gradient(180deg, rgba(0, 181, 253, 0.15), rgba(0, 181, 253, 0.08))',
          },

          [`&--md`]: {
            width: '40px',
            height: '40px',
            color: '#FF7A00',
            background:
              'linear-gradient(180deg, rgba(35, 214, 220, 0.15), rgba(35, 214, 220, 0.08))',
          },

          [`&--default`]: {
            width: '40px',
            height: '40px',
            background: 'linear-gradient(180deg, #EAEEF4, #F4F6F9)',
          },
        },

        [`&-content`]: {
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        },

        [`&-title-wrapper`]: {
          display: 'flex',
          flexDirection: 'column',
          gap: '-4px',
        },

        [`&-title`]: {
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontFamily: 'AlibabaPuHuiTi',
          fontSize: '14px',
          fontWeight: '500',
          lineHeight: '22px',
          letterSpacing: 'normal',
          color: 'var(--color-gray-text-default)',
          gridColumn: '2', // 与图标同一行，位于第二列
          alignSelf: 'center',
        },

        [`&-subtitle`]: {
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'normal',
          color: 'var(--color-gray-text-secondary)',
          font: 'var(--font-text-body-sm)',
          letterSpacing: 'var(--letter-spacing-body-sm, normal)',
          gridColumn: '1 / span 2', // 下一行并与图标左对齐，横跨两列
        },

        [`&-right`]: {
          display: 'flex',
          alignItems: 'center',

          '.ant-segmented': {
            borderRadius: 'var(--radius-control-base)',
          },

          '.ant-segmented-item-selected ': {
            borderRadius: 'var(--radius-control-base)',
          },
        },

        // Segmented 右侧额外内容容器
        [`&-segmented-right`]: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',

          [`&-extra`]: {
            '*': {
              color: 'rgba(80, 92, 113, 0.42)',
            },
          },
        },
      },

      [`&--shell`]: {
        [`${token.componentCls}-header`]: {
          marginBottom: 0,
        },

        [`${token.componentCls}-content`]: {
          width: 'unset',
          margin: '0 -16px -16px',
          paddingTop: 16,
          paddingBottom: 16,
          background: 'var(--color-gray-text-default)',

          '.ace-container': {
            borderRadius: 'unset',
          },

          '.ace-tm': {
            color: 'rgba(255, 255, 255, 0.27)',
            background: 'transparent',
          },

          '.ace_gutter': {
            color: 'rgba(255, 255, 255, 0.45)',
            font: 'var(--font-text-code-base)',
            letterSpacing: 'var(--letter-spacing-code-base, normal)',
            background: 'transparent',
          },

          '.ace_gutter-cell': {
            paddingLeft: 12,
          },

          '.ace-tm .ace_gutter-active-line': {
            color: '#FFFFFF',
            background: 'transparent',
          },

          '.ace-tm .ace_comment': {
            color: 'rgba(255, 255, 255, 0.27)',
          },

          '.ace-tm .ace_keyword': {
            color: '#E873BB',
          },

          '.ace_identifier, .ace_paren': {
            color: '#FFFFFF',
          },

          '.ace-tm .ace_constant.ace_numeric': {
            color: '#84DC18',
          },

          '.code-editor-container': {
            marginTop: 0,
            marginBottom: 0,
            maxHeight: '100%',
            background: 'transparent !important',
            border: 'none',
            boxShadow: 'none',
          },

          '.code-editor-content': {
            padding: 0,
            background: 'transparent',
          },

          '.ant-empty-description': {
            color: '#d9d9d9',
          },
        },
      },

      [`&--markdown`]: {
        '.ant-md-editor-content div[data-be="paragraph"]:last-child': {
          paddingBottom: '16px',
          color: 'var(--color-gray-text-light)',
          font: 'var(--font-text-code-base)',
          letterSpacing: 'var(--letter-spacing-code-base, normal)',
        },
      },

      [`&-content`]: {
        position: 'relative',
        width: 'auto',
        height: '100%',
        overflow: 'auto',
        margin: '0 -16px',
        '.ant-workspace-html-preview-content': {
          '.ace-container': {
            border: 'unset',
            borderRadius: 'unset',
            boxShadow: 'unset',
          },

          '.ace_gutter-cell': {
            paddingLeft: 12,
          },

          '.code-editor-container': {
            maxHeight: '100%',
            borderRadius: 'var(--radius-card-base)',

            '.code-editor-content': {
              padding: '0!important',

              '.ace_gutter': {
                color: 'var(--color-gray-text-light)',
                font: 'var(--font-text-code-base)',
                letterSpacing: 'var(--letter-spacing-code-base, normal)',
                background: 'var(--color-gray-bg-card-white)',
              },

              '.ace-tm .ace_scroller .ace_content': {
                fontFamily: 'Roboto Mono',
              },

              '.ace-tm .ace_gutter-active-line': {
                color: 'var(--color-gray-text-default)',
                background: 'var(--color-gray-control-fill-hover)',
              },

              '.ace-tm .ace_marker-layer .ace_active-line': {
                background: 'var(--color-gray-control-fill-hover)',
              },
            },
          },
        },

        '.code-editor-container': {
          position: 'relative',
          borderRadius: 'var(--radius-card-base)',
          background: 'var(--color-gray-bg-card-white)',
          transition: 'border-color 0.2s ease-in-out',
          border: '1px solid var(--color-gray-border-light)',
          boxShadow: 'var(--shadow-control-base)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        },

        '.code-editor-container .ant-segmented .ant-segmented-item .ant-segmented-item-label': {
          padding: '7px var(--padding-3x)',
        },

        '.code-editor-content': {
          maxHeight: '400px',
          padding: '12px 0',
          background: 'var(--color-gray-bg-card-white)',
          overflow: 'auto',
        },

        '.ace_gutter': {
          color: 'var(--color-gray-text-light)',
          font: 'var(--font-text-code-base)',
          letterSpacing: 'var(--letter-spacing-code-base, normal)',
          background: 'var(--color-gray-bg-card-white)',
        },

        '.ace_content': {
          color: '#343a45',
          font: 'var(--font-text-code-base)',
          letterSpacing: 'var(--letter-spacing-code-base, normal)',
        },

        '.ace-tm .ace_scroller .ace_content': {
          fontFamily: 'Roboto Mono',
        },

        '.ace-tm .ace_gutter-active-line': {
          color: 'var(--color-gray-text-default)',
          background: 'transparent',
        },

        '.ace-tm .ace_marker-layer .ace_active-line': {
          background: 'var(--color-gray-control-fill-hover)',
        },

        '.ace-tm .ace_keyword': {
          color: '#B14089',
        },

        '.ace_identifier, .ace_paren': {
          color: '#343A45',
        },
      },

      [`&-overlay`]: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,

        [`&--loading`]: {
          background: 'rgba(255, 255, 255, 0.6)',
        },

        [`&--error`]: {
          background: 'rgba(255, 245, 245, 0.6)',
          color: '#cb1e1e',
        },
      },

      [`&-empty`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '240px',
        padding: '24px',
        textAlign: 'center',
      },
    },
  };
};

export function useRealtimeFollowStyle(prefixCls?: string) {
  return useEditorStyleRegister('WorkspaceRealtimeFollow', (token) => {
    const realtimeToken = {
      ...token,
      componentCls: `.${prefixCls}`,
    };

    return [genStyle(realtimeToken)];
  });
}
