import { MarkdownInputField, MarkdownEditorInstance } from '@ant-design/agentic-ui';
import { Alert, Card, Progress, Space, Typography } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

const { Title, Paragraph, Text } = Typography;

/**
 * 简化版本示例 - 模拟 WebLLM 行为
 * 用于演示集成方式，不依赖真实的 WebLLM 库
 */
function SimplifiedExample() {
  const inputRef = useRef<MarkdownEditorInstance>();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 模拟 AI 回复生成
   */
  const mockGenerateResponse = async (userMessage: string): Promise<string> => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 简单的回复逻辑（实际使用时替换为真实的 WebLLM 调用）
    const responses = [
      `我理解您的问题："${userMessage}"。这是一个很好的问题！`,
      `关于"${userMessage}"，我可以为您提供以下信息...`,
      `让我思考一下"${userMessage}"这个问题。根据我的理解...`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  /**
   * 处理发送消息
   */
  const handleSend = async (value: string) => {
    if (!value.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      // 添加用户消息
      const userMessage = { role: 'user' as const, content: value };
      setMessages(prev => [...prev, userMessage]);

      // 生成 AI 回复
      const assistantResponse = await mockGenerateResponse(value);
      const assistantMessage = { role: 'assistant' as const, content: assistantResponse };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('发送消息错误:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 对话历史 */}
      <Card size="small" title="对话历史">
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {messages.length === 0 ? (
            <Text type="secondary">暂无对话记录</Text>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 12px',
                  backgroundColor: msg.role === 'user' ? '#f0f0f0' : '#e6f7ff',
                  borderRadius: '4px',
                  marginLeft: msg.role === 'assistant' ? '20px' : '0',
                  marginRight: msg.role === 'user' ? '20px' : '0',
                }}
              >
                <Text strong>{msg.role === 'user' ? '👤 用户' : '🤖 AI'}: </Text>
                <Text>{msg.content}</Text>
              </div>
            ))
          )}
        </Space>
      </Card>

      {/* 输入框 */}
      <MarkdownInputField
        inputRef={inputRef}
        placeholder="输入消息进行测试..."
        onSend={handleSend}
        disabled={isLoading}
        typing={isLoading}
        style={{
          minHeight: '100px',
        }}
      />
    </div>
  );
}

/**
 * WebLLM 与 MarkdownInputField 结合示例
 * 
 * 本示例展示如何使用 WebLLM 在浏览器中运行大语言模型，
 * 并与 MarkdownInputField 组件结合，实现本地 AI 对话功能。
 * 
 * 使用前需要安装 @mlc-ai/web-llm:
 * npm install @mlc-ai/web-llm
 * 
 * 注意：WebLLM 需要下载模型文件，首次使用可能需要一些时间。
 */
export default () => {
  const inputRef = useRef<MarkdownEditorInstance>();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<'unloaded' | 'loading' | 'ready'>('unloaded');
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadProgressText, setLoadProgressText] = useState('');
  
  // WebLLM 引擎实例
  const engineRef = useRef<any>(null);

  /**
   * 初始化 WebLLM 引擎
   * @description 动态加载 WebLLM 库并创建引擎实例
   */
  const initWebLLM = async () => {
    if (engineRef.current) {
      return engineRef.current;
    }

    try {
      setModelStatus('loading');
      setError(null);

      // 动态导入 @mlc-ai/web-llm
      // 注意：实际使用时需要先安装 npm install @mlc-ai/web-llm
      // @ts-ignore - 可选依赖，可能未安装
      const { CreateWebLLMEngine } = await import('@mlc-ai/web-llm');
      
      // 创建引擎实例
      // 使用 Qwen3-0.6B-q0f16-MLC 模型（轻量级模型，适合快速响应）
      const engine = await CreateWebLLMEngine('Qwen3-0.6B-q0f16-MLC', {
        initProgressCallback: (report: { progress: number; text: string }) => {
          // 更新加载进度
          const progressPercent = Math.round(report.progress * 100);
          setLoadProgress(progressPercent);
          setLoadProgressText(report.text || '');
          console.log('模型加载进度:', report);
        },
      });

      engineRef.current = engine;
      setModelStatus('ready');
      return engine;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'WebLLM 初始化失败';
      setError(errorMsg);
      setModelStatus('unloaded');
      console.error('WebLLM 初始化错误:', err);
      throw err;
    }
  };

  /**
   * 使用 WebLLM 生成回复
   * @param userMessage 用户输入的消息
   * @returns AI 生成的回复内容
   */
  const generateResponse = async (userMessage: string): Promise<string> => {
    try {
      // 确保引擎已初始化
      const engine = await initWebLLM();

      // 构建对话历史
      const conversation = [
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: userMessage,
        },
      ];

      // 生成回复（流式输出）
      let fullResponse = '';
      const response = await engine.chat.completions.create({
        messages: conversation,
        stream: true,
      });

      // 处理流式输出
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          // 可以在这里实时更新 UI（如果需要流式显示）
          // updateStreamingResponse(fullResponse);
        }
      }

      return fullResponse;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '生成回复失败';
      throw new Error(errorMsg);
    }
  };

  /**
   * 处理发送消息
   */
  const handleSend = async (value: string) => {
    if (!value.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 添加用户消息
      const userMessage = { role: 'user' as const, content: value };
      setMessages(prev => [...prev, userMessage]);

      // 生成 AI 回复
      const assistantResponse = await generateResponse(value);

      // 添加 AI 回复
      const assistantMessage = { role: 'assistant' as const, content: assistantResponse };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '发送消息失败';
      setError(errorMsg);
      console.error('发送消息错误:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理停止生成
   */
  const handleStop = () => {
    // WebLLM 目前不支持中断生成，这里可以添加清理逻辑
    setIsLoading(false);
    console.log('停止生成');
  };

  /**
   * 清空对话历史
   */
  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  /**
   * 组件挂载时自动加载模型
   */
  useEffect(() => {
    // 自动初始化模型
    initWebLLM().catch((err) => {
      console.error('自动加载模型失败:', err);
    });
  }, []);

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <Card>
        <Title level={4}>WebLLM + MarkdownInputField 示例</Title>
        <Paragraph>
          本示例展示如何将 <Text code>@mlc-ai/web-llm</Text> 与{' '}
          <Text code>MarkdownInputField</Text> 结合，实现本地 AI 对话功能。
        </Paragraph>
        <Paragraph>
          <Text strong>使用模型：</Text> <Text code>Qwen3-0.6B-q0f16-MLC</Text>
        </Paragraph>
        <Paragraph>
          <Text strong>使用说明：</Text>
        </Paragraph>
        <ul>
          <li>使用轻量级模型 Qwen3-0.6B，适合快速响应和低资源消耗</li>
          <li>首次使用需要下载模型文件，可能需要几分钟时间</li>
          <li>模型会在浏览器本地运行，无需服务器</li>
          <li>支持流式输出，实时显示生成内容</li>
          <li>对话历史会保存在内存中，刷新页面会丢失</li>
        </ul>
        <Paragraph>
          <Text type="warning">
            注意：需要先安装 <Text code>npm install @mlc-ai/web-llm</Text>
          </Text>
        </Paragraph>
      </Card>

      {/* 模型状态和进度 */}
      <Card size="small">
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Space>
            <Text>模型状态：</Text>
            {modelStatus === 'unloaded' && <Text type="secondary">未加载</Text>}
            {modelStatus === 'loading' && <Text type="warning">加载中...</Text>}
            {modelStatus === 'ready' && <Text type="success">已就绪</Text>}
          </Space>
          {modelStatus === 'loading' && (
            <div style={{ width: '100%' }}>
              <Progress
                percent={loadProgress}
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                format={(percent) => `${percent}%`}
              />
              {loadProgressText && (
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
                  {loadProgressText}
                </Text>
              )}
            </div>
          )}
        </Space>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
        />
      )}

      {/* 对话历史 */}
      <Card title={`对话历史 (${messages.length} 条)`} extra={<a onClick={clearMessages}>清空</a>}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {messages.length === 0 ? (
            <Text type="secondary">暂无对话记录，开始对话吧！</Text>
          ) : (
            messages.map((msg, index) => (
              <Card
                key={index}
                size="small"
                style={{
                  backgroundColor: msg.role === 'user' ? '#f0f0f0' : '#e6f7ff',
                  marginLeft: msg.role === 'assistant' ? '40px' : '0',
                  marginRight: msg.role === 'user' ? '40px' : '0',
                }}
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>{msg.role === 'user' ? '👤 用户' : '🤖 AI'}</Text>
                  <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Paragraph>
                </Space>
              </Card>
            ))
          )}
        </Space>
      </Card>

      {/* 输入框 */}
      <Card>
        <MarkdownInputField
          inputRef={inputRef}
          placeholder="输入你的问题，按 Enter 发送，Shift+Enter 换行..."
          onSend={handleSend}
          onStop={handleStop}
          disabled={isLoading}
          typing={isLoading}
          style={{
            minHeight: '120px',
          }}
        />
      </Card>

      {/* 简化版本示例（不使用真实 WebLLM，仅展示集成方式） */}
      <Card title="简化版本（模拟 WebLLM）">
        <Paragraph>
          如果不想安装 WebLLM，可以使用以下简化版本进行测试：
        </Paragraph>
        <SimplifiedExample />
      </Card>
    </div>
  );
};
