const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const excalidrawPath = path.join(__dirname, '详细设计模块图.excalidraw');
const outputPath = path.join(__dirname, '详细设计模块图.png');
const htmlPath = path.join(__dirname, 'excalidraw_temp.html');

// 读取excalidraw文件
const excalidrawData = fs.readFileSync(excalidrawPath, 'utf8');

// 创建临时HTML文件
const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@excalidraw/excalidraw/dist/excalidraw.production.min.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #root { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    const data = ${excalidrawData};
    const { Excalidraw } = ExcalidrawLib;
    const App = () => {
      return React.createElement(Excalidraw, {
        initialData: data,
        viewModeEnabled: true,
        zenModeEnabled: true,
        gridModeEnabled: false
      });
    };
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
  </script>
</body>
</html>`;

fs.writeFileSync(htmlPath, htmlContent);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 700 } });
  
  await page.goto('file://' + htmlPath.replace(/\\/g, '/'));
  
  // 等待Excalidraw加载
  await page.waitForTimeout(5000);
  
  // 等待canvas渲染
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(2000);
  
  // 截图保存
  await page.screenshot({ path: outputPath, fullPage: false });
  
  await browser.close();
  
  // 删除临时文件
  fs.unlinkSync(htmlPath);
  
  console.log('PNG已导出: ' + outputPath);
})().catch(err => {
  console.error('导出失败:', err);
  if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
});
