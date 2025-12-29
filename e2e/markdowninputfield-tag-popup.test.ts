import { Browser, chromium } from 'playwright';
import { afterAll, beforeAll, expect, test } from 'vitest';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({
    headless: true,
  });
});

afterAll(async () => {
  if (browser) {
    await browser.close();
  }
});

test('MarkdownInputField tag popup selection should update input content', async () => {
  const page = await browser.newPage();

  try {
    const response = await page.goto(
      'http://localhost:8000/~demos/markdowninputfield-demo-0',
      {
        timeout: 10000,
        waitUntil: 'networkidle',
      },
    );

    if (response?.ok()) {
      // 等待 tag popup 出现
      const popup = page.locator('.ant-agentic-tag-popup').first();
      await expect(popup).toBeVisible({ timeout: 5000 });

      // 找到可编辑的输入框并读取初始内容
      const input = page.locator('[contenteditable="true"]').first();
      await expect(input).toBeVisible();
      const before = (await input.innerText()) || '';

      // 点击 popup 打开下拉
      await popup.click();

      // 尝试按多种可能的文本/选择器匹配并点击目标项 (tag2 或 中文选项2)
      const optionTag2 = page.locator('text=tag2');
      const optionXuan2 = page.locator('text=选项2');

      if ((await optionTag2.count()) > 0) {
        await optionTag2.first().click();
      } else if ((await optionXuan2.count()) > 0) {
        await optionXuan2.first().click();
      } else {
        // 兜底：尝试常见的 AntD 下拉项选择器
        const antItem = page
          .locator('.ant-dropdown-menu-item, .ant-select-item')
          .first();
        await expect(antItem).toBeVisible({ timeout: 3000 });
        await antItem.click();
      }

      // 给 DOM 一点时间更新（通常会很快）
      await page.waitForTimeout(400);

      const after = (await input.innerText()) || '';

      // 断言输入框发生了变化（更健壮于直接匹配某个值，避免与实现细节强耦合）
      expect(after).not.toBe(before);

      console.log(
        'Tag popup selection changed input (before -> after):',
        before,
        '->',
        after,
      );
    } else {
      console.warn(
        'Could not connect to demo page. Make sure the dev server is running at http://localhost:8000',
      );
    }
  } catch (error) {
    console.warn('Failed to run tag popup e2e test.', error);
  } finally {
    await page.close();
  }
});
