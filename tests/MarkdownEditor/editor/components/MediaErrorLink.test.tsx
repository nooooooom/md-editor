import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaErrorLink } from '../../../../src/MarkdownEditor/editor/components/MediaErrorLink';
import * as editorStore from '../../../../src/MarkdownEditor/editor/store';
import { createLinkConfigTestSuite } from '../elements/__testUtils__/linkConfig.testUtils';

vi.mock('../../../../src/MarkdownEditor/editor/store.ts');

// Mock window.open
const mockWindowOpen = vi.fn();
beforeEach(() => {
  window.open = mockWindowOpen;
  mockWindowOpen.mockClear();
});

describe('MediaErrorLink Component', () => {
  beforeEach(() => {
    vi.mocked(editorStore.useEditorStore).mockReturnValue({
      editorProps: {},
    } as any);
  });

  it('应该渲染基本链接', () => {
    const { container } = render(
      <MediaErrorLink
        url="https://example.com/image.jpg"
        displayText="测试链接"
      />,
    );

    const link = container.querySelector('span');
    expect(link).toBeDefined();
    expect(link?.textContent).toContain('测试链接');
  });

  it('应该显示警告图标和外部链接图标', () => {
    const { container } = render(
      <MediaErrorLink
        url="https://example.com/image.jpg"
        displayText="测试链接"
      />,
    );

    const link = container.querySelector('span');
    expect(link).toBeDefined();
    // 检查是否包含图标（通过 SVG 元素）
    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('应该使用 fallbackUrl 当 url 为空时', () => {
    const { container } = render(
      <MediaErrorLink
        url={undefined}
        fallbackUrl="https://fallback.com/image.jpg"
        displayText="备用链接"
      />,
    );

    const link = container.querySelector('span');
    expect(link).toBeDefined();
    expect(link?.textContent).toContain('备用链接');
  });

  it('应该支持自定义样式', () => {
    const customStyle = {
      fontSize: '16px',
      color: 'red',
    };

    const { container } = render(
      <MediaErrorLink
        url="https://example.com/image.jpg"
        displayText="测试链接"
        style={customStyle}
      />,
    );

    const link = container.querySelector('span');
    expect(link).toHaveStyle({
      fontSize: '16px',
      color: 'red',
    });
  });

  it('当 url 和 fallbackUrl 都为空时不应该打开链接', () => {
    const { container } = render(
      <MediaErrorLink url={undefined} displayText="无链接" />,
    );

    const link = container.querySelector('span');
    expect(link).toBeDefined();

    fireEvent.click(link!);
    expect(mockWindowOpen).not.toHaveBeenCalled();
  });

  it('应该阻止事件冒泡和默认行为', () => {
    const { container } = render(
      <MediaErrorLink
        url="https://example.com/image.jpg"
        displayText="测试链接"
      />,
    );

    const link = container.querySelector('span');
    const mockEvent = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    };

    fireEvent.click(link!, mockEvent);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  describe('linkConfig 功能测试', () => {
    let containerElement: HTMLElement | null = null;

    const getErrorLink = async () => {
      if (!containerElement) return null;
      return containerElement.querySelector('span');
    };

    const triggerError = () => {
      // MediaErrorLink 直接渲染，不需要触发错误
    };

    const updateEditorStore = (linkConfig: {
      onClick?: (url: string) => boolean | void;
      openInNewTab?: boolean;
    }) => {
      vi.mocked(editorStore.useEditorStore).mockReturnValue({
        editorProps: {
          linkConfig,
        },
      } as any);
    };

    beforeEach(() => {
      mockWindowOpen.mockClear();
      if (typeof window !== 'undefined') {
        window.open = mockWindowOpen;
      }
      const { container } = render(
        <MediaErrorLink
          url="https://example.com/test.jpg"
          displayText="测试链接"
        />,
      );
      containerElement = container;
    });

    createLinkConfigTestSuite({
      getErrorLink: async () => {
        const element = await getErrorLink();
        return element as HTMLAnchorElement | null;
      },
      triggerError,
      testUrl: 'https://example.com/test.jpg',
      mockWindowOpen,
      updateEditorStore,
    });
  });
});

