import { defineConfig, devices } from "@playwright/test";

/**
 * FinPath Playwright 配置
 * 视觉基准：1440×960 桌面画布（原型图 1536×1024 缩放对照）
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "html" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // 启动后预热核心路由/API，避免测试并行时的首次编译竞争
    command:
      "sh -c 'pnpm dev & sleep 8 && curl -s -o /dev/null http://localhost:3000/ && curl -s -o /dev/null -X POST http://localhost:3000/api/diagnosis -H \"Content-Type: application/json\" -d \"{\\\"question\\\":\\\"预热\\\"}\" && curl -s -o /dev/null http://localhost:3000/tasks && curl -s -o /dev/null http://localhost:3000/money-map && wait'",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // e2e 强制 Mock Provider，不消耗真实 Token
    env: { AI_TEXT_PROVIDER: "mock" },
  },
});
