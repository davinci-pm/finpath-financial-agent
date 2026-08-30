"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body>
        <main style={{ fontFamily: "sans-serif", maxWidth: 520, margin: "15vh auto", padding: 24 }}>
          <h1>FinPath 暂时无法加载</h1>
          <p>请稍后重试。尚未确认的操作不会自动提交。</p>
          <button type="button" onClick={reset}>重新加载</button>
        </main>
      </body>
    </html>
  );
}
