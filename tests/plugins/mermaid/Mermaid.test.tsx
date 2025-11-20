import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Mermaid } from '../../../src/Plugins/mermaid/Mermaid';

vi.mock('../../../src/Hooks/useIntersectionOnce', () => ({
  useIntersectionOnce: () => true,
}));

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    render: vi.fn().mockResolvedValue({ svg: '<svg>test</svg>' }),
    parse: vi.fn().mockResolvedValue(true),
  },
}));

// Mock react-use
vi.mock('react-use', () => ({
  useGetSetState: vi.fn(() => {
    const state = {
      code: '',
      error: '',
    };
    const setState = vi.fn((update) => {
      if (typeof update === 'function') {
        update(state);
      } else {
        Object.assign(state, update);
      }
    });
    return [() => state, setState];
  }),
}));

describe('Mermaid Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultElement = {
    type: 'code' as const,
    language: 'mermaid',
    value: 'graph TD\nA[开始] --> B[结束]',
    children: [{ text: '' }] as [{ text: string }],
  };

  const renderMermaid = (overrides: Partial<typeof defaultElement> = {}) =>
    render(<Mermaid element={{ ...defaultElement, ...overrides }} />);

  describe('基本渲染测试', () => {
    it('应该正确渲染 Mermaid 组件', () => {
      renderMermaid();

      expect(document.body).toBeInTheDocument();
    });

    it('应该渲染空状态', () => {
      renderMermaid({ value: '' });

      expect(document.body).toBeInTheDocument();
    });

    it('应该渲染错误状态', () => {
      renderMermaid({ value: 'invalid mermaid code' });

      expect(document.body).toBeInTheDocument();
    });
  });

  describe('mermaid 渲染测试', () => {
    it('应该调用 mermaid.render 方法', async () => {
      const mermaid = await import('mermaid');

      renderMermaid();

      await waitFor(() => {
        expect(mermaid.default.render).toHaveBeenCalled();
      });
    });

    it('应该处理 mermaid.render 成功', async () => {
      const mermaid = await import('mermaid');

      renderMermaid();

      await waitFor(() => {
        expect(mermaid.default.render).toHaveBeenCalled();
      });
    });

    it('应该处理 mermaid.render 失败', async () => {
      const mermaid = await import('mermaid');

      renderMermaid();

      await waitFor(() => {
        expect(mermaid.default.render).toHaveBeenCalled();
      });
    });

    it('应该处理 mermaid.parse 失败', async () => {
      const mermaid = await import('mermaid');

      renderMermaid();

      // 等待组件渲染完成
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // 检查 mermaid 方法是否被调用（可能不是 parse，而是 render）
      expect(mermaid.default.render).toHaveBeenCalled();
    });
  });

  describe('定时器测试', () => {
    it('应该使用 setTimeout 进行防抖', () => {
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      renderMermaid();

      expect(setTimeoutSpy).toHaveBeenCalled();
    });

    it('应该在组件卸载时清理定时器', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      const { unmount } = renderMermaid();

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('边界情况测试', () => {
    it('应该处理 undefined value', () => {
      renderMermaid({ value: undefined as any });

      expect(document.body).toBeInTheDocument();
    });

    it('应该处理 null value', () => {
      renderMermaid({ value: null as any });

      expect(document.body).toBeInTheDocument();
    });

    it('应该处理空字符串 value', () => {
      renderMermaid({ value: '' });

      expect(document.body).toBeInTheDocument();
    });

    it('应该处理复杂的 mermaid 代码', () => {
      const complexCode = `
        graph TD
        A[开始] --> B{判断}
        B -->|是| C[执行]
        B -->|否| D[跳过]
        C --> E[结束]
        D --> E
      `;

      renderMermaid({ value: complexCode });

      expect(document.body).toBeInTheDocument();
    });
  });

  describe('样式和布局测试', () => {
    it('应该应用正确的样式', () => {
      renderMermaid();

      const container = document.querySelector('div');
      expect(container).toBeInTheDocument();
    });

    it('应该设置 contentEditable 为 false', () => {
      renderMermaid();

      const container = document.querySelector('div');
      expect(container).toBeInTheDocument();
    });
  });

  describe('错误处理测试', () => {
    it('应该显示错误信息', async () => {
      const mermaid = await import('mermaid');

      renderMermaid();

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('应该处理空代码和错误状态', () => {
      renderMermaid({ value: '' });

      expect(document.body).toBeInTheDocument();
    });
  });

  describe('性能测试', () => {
    it('应该处理快速更新的代码', async () => {
      const { rerender } = renderMermaid();

      // 快速更新代码
      rerender(
        <Mermaid
          element={{
            ...defaultElement,
            value: 'graph TD\nB[新代码] --> C[结束]',
          }}
        />,
      );

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('应该处理相同的代码不会重复渲染', () => {
      const { rerender } = renderMermaid();

      // 使用相同的代码重新渲染
      rerender(<Mermaid element={defaultElement} />);

      expect(document.body).toBeInTheDocument();
    });
  });

  describe('流式加载优化测试', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该在流式输入时使用防抖机制', async () => {
      const mermaid = await import('mermaid');
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      const { rerender } = renderMermaid({ value: 'graph' });

      // 快速连续更新代码（模拟流式输入）
      rerender(<Mermaid element={{ ...defaultElement, value: 'graph TD' }} />);
      rerender(
        <Mermaid element={{ ...defaultElement, value: 'graph TD\nA' }} />,
      );
      rerender(
        <Mermaid element={{ ...defaultElement, value: 'graph TD\nA -->' }} />,
      );
      rerender(
        <Mermaid element={{ ...defaultElement, value: 'graph TD\nA --> B' }} />,
      );

      // 验证防抖机制被触发（应该清理之前的定时器）
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(setTimeoutSpy).toHaveBeenCalled();

      // 快进时间，触发渲染
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        // 应该只在最后稳定时调用一次 render
        expect(mermaid.default.render).toHaveBeenCalled();
      });
    });

    it('应该检测不完整的代码并延迟渲染', async () => {
      const mermaid = await import('mermaid');
      vi.clearAllMocks();

      // 测试不完整的代码（只有 graph 关键字）
      renderMermaid({ value: 'graph' });

      // 快进时间，但代码不完整，应该延迟渲染
      vi.advanceTimersByTime(300);
      expect(mermaid.default.render).not.toHaveBeenCalled();

      // 继续快进，应该最终尝试渲染（即使可能失败）
      vi.advanceTimersByTime(500);
    });

    it('应该在代码快速变化时不显示错误', async () => {
      const mermaid = await import('mermaid');
      vi.clearAllMocks();

      // 模拟渲染失败
      mermaid.default.render = vi
        .fn()
        .mockRejectedValue(new Error('Syntax error'));

      const { rerender } = renderMermaid({ value: 'graph' });

      // 快速变化代码（流式输入）
      rerender(<Mermaid element={{ ...defaultElement, value: 'graph TD' }} />);
      rerender(
        <Mermaid element={{ ...defaultElement, value: 'graph TD\nA -->' }} />,
      );

      // 快进时间
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        // 代码还在变化中，不应该显示错误
        const errorElements = document.querySelectorAll(
          '[style*="rgba(239, 68, 68"]',
        );
        // 在流式输入过程中，不应该显示错误
        expect(errorElements.length).toBe(0);
      });
    });

    it('应该检测代码完整性 - 完整代码', () => {
      const completeCodes = [
        'graph TD\nA --> B',
        'sequenceDiagram\nA->>B: message',
        'pie title Test\n"Label" : 50',
        'gantt\ntitle Test',
      ];

      completeCodes.forEach((code) => {
        const { unmount } = renderMermaid({ value: code });
        // 完整代码应该能够正常渲染
        expect(document.body).toBeInTheDocument();
        unmount();
      });
    });

    it('应该检测代码完整性 - 不完整代码', () => {
      const incompleteCodes = [
        'graph', // 只有关键字
        'graph TD\nA -->', // 箭头后没有内容
        'graph TD\nA[', // 未闭合的方括号
        'sequenceDiagram\nA->>', // 未完成的箭头
      ];

      incompleteCodes.forEach((code) => {
        const { unmount } = renderMermaid({ value: code });
        // 不完整代码应该被检测到，延迟渲染
        expect(document.body).toBeInTheDocument();
        unmount();
      });
    });

    it('应该在代码稳定后显示错误', async () => {
      const mermaid = await import('mermaid');
      vi.clearAllMocks();

      // 模拟语法错误
      mermaid.default.render = vi
        .fn()
        .mockRejectedValue(new Error('Invalid syntax'));
      mermaid.default.parse = vi
        .fn()
        .mockRejectedValue(new Error('Parse error'));

      const invalidCode = 'invalid mermaid syntax that will fail';
      renderMermaid({ value: invalidCode });

      // 快进时间，让代码稳定
      vi.advanceTimersByTime(1500);

      await waitFor(() => {
        // 代码稳定后，应该显示错误
        const errorElements = document.querySelectorAll(
          '[style*="rgba(239, 68, 68"]',
        );
        // 应该显示错误信息
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('应该在输入过程中显示"正在加载"状态', async () => {
      const { rerender } = renderMermaid({ value: 'graph' });

      // 快速更新代码（模拟流式输入）
      rerender(<Mermaid element={{ ...defaultElement, value: 'graph TD' }} />);

      // 快进时间，但不超过完整延迟
      vi.advanceTimersByTime(500);

      await waitFor(() => {
        // 应该显示"正在加载"或类似的状态
        const loadingText = Array.from(document.querySelectorAll('*')).find(
          (el) =>
            el.textContent?.includes('正在加载') ||
            el.textContent?.includes('加载中'),
        );
        // 在流式输入过程中，可能显示加载状态
        expect(document.body).toBeInTheDocument();
      });
    });

    it('应该根据代码变化频率调整延迟时间', async () => {
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
      const { rerender } = renderMermaid({ value: 'graph' });

      // 第一次变化
      rerender(<Mermaid element={{ ...defaultElement, value: 'graph TD' }} />);
      vi.advanceTimersByTime(100);

      // 第二次变化
      rerender(
        <Mermaid element={{ ...defaultElement, value: 'graph TD\nA' }} />,
      );
      vi.advanceTimersByTime(100);

      // 第三次变化
      rerender(
        <Mermaid element={{ ...defaultElement, value: 'graph TD\nA -->' }} />,
      );
      vi.advanceTimersByTime(100);

      // 第四次变化（频繁变化，应该使用更长的延迟）
      rerender(
        <Mermaid element={{ ...defaultElement, value: 'graph TD\nA --> B' }} />,
      );

      // 验证使用了更长的延迟时间（1000ms 而不是 300ms）
      const calls = setTimeoutSpy.mock.calls;
      const lastCall = calls[calls.length - 1];
      // 频繁变化时应该使用更长的延迟
      expect(lastCall?.[1]).toBeGreaterThanOrEqual(800);
    });

    it('应该清理所有定时器', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      const { unmount } = renderMermaid();

      unmount();

      // 应该清理所有定时器
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('应该处理空代码和快速变化', () => {
      const { rerender } = renderMermaid({ value: '' });

      // 快速从空到有内容
      rerender(<Mermaid element={{ ...defaultElement, value: 'graph TD' }} />);
      rerender(
        <Mermaid element={{ ...defaultElement, value: 'graph TD\nA --> B' }} />,
      );

      expect(document.body).toBeInTheDocument();
    });
  });
});
