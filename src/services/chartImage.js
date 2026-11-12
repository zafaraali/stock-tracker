import { formatMoney } from './formatMoney';
import { chartColor } from './chartColors';

function imageCanvas(title, subtitle, height, theme) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image export is unavailable in this browser.');
  const light = theme === 'light';
  context.fillStyle = light ? '#ffffff' : '#0f172a';
  context.fillRect(0, 0, canvas.width, height);
  context.fillStyle = light ? '#0f172a' : '#f1f5f9';
  context.font = 'bold 32px system-ui, sans-serif';
  context.fillText(title, 48, 64);
  context.fillStyle = light ? '#475569' : '#94a3b8';
  context.font = '20px system-ui, sans-serif';
  context.fillText(subtitle, 48, 103);
  return { canvas, context, light };
}

async function downloadCanvas(canvas, filename) {
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not create the image.')), 'image/png'));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveAllocationImage({ title, data, currencyCode, theme, privateMode, sector = false }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const { canvas, context, light } = imageCanvas(title, `ApexFinance | ${new Date().toLocaleDateString()} | ${currencyCode}`, 650 + data.length * 48, theme);
  let angle = -Math.PI / 2;
  const gap = data.length > 1 ? Math.min(.025, Math.PI / data.length / 4) : 0;
  data.forEach(item => {
    const next = angle + item.value / total * Math.PI * 2;
    const sliceGap = Math.min(gap, (next - angle) * .2);
    context.beginPath();
    context.arc(600, 325, 170, angle + sliceGap / 2, next - sliceGap / 2);
    context.arc(600, 325, 112, next - sliceGap / 2, angle + sliceGap / 2, true);
    context.closePath();
    context.fillStyle = chartColor(item.name, sector ? 'sector' : undefined);
    context.fill();
    angle = next;
  });
  context.fillStyle = light ? '#475569' : '#94a3b8';
  context.font = '18px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText('TOTAL VALUE', 600, 311);
  context.fillStyle = light ? '#0f172a' : '#f1f5f9';
  context.font = 'bold 23px system-ui, sans-serif';
  context.fillText(privateMode ? 'Amount hidden' : formatMoney(total, currencyCode, { compact: true }), 600, 347, 210);
  data.forEach((item, index) => {
    const y = 554 + index * 48;
    context.fillStyle = chartColor(item.name, sector ? 'sector' : undefined);
    context.beginPath(); context.arc(60, y - 6, 7, 0, Math.PI * 2); context.fill();
    context.fillStyle = light ? '#0f172a' : '#f1f5f9';
    context.font = '22px system-ui, sans-serif';
    context.textAlign = 'left';
    context.fillText(item.name, 82, y, 540);
    context.textAlign = 'right';
    context.fillText(`${privateMode ? 'Amount hidden' : formatMoney(item.value, currencyCode)} | ${(item.value / total * 100).toFixed(1)}%`, 1152, y, 480);
  });
  context.textAlign = 'left';
  context.fillStyle = light ? '#64748b' : '#94a3b8';
  context.font = '18px system-ui, sans-serif';
  context.fillText('ApexFinance', 48, canvas.height - 36);
  await downloadCanvas(canvas, `apexfinance-${sector ? 'sector-breakdown' : 'asset-allocation'}`);
}

export async function savePerformanceImage({ element, title, range, theme, metrics }) {
  const source = element?.querySelector('svg.recharts-surface');
  if (!source) throw new Error('Chart data is not available yet.');
  const svg = source.cloneNode(true);
  const bounds = source.getBoundingClientRect();
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', bounds.width);
  svg.setAttribute('height', bounds.height);
  svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  const originalNodes = [source, ...source.querySelectorAll('*')];
  const clonedNodes = [svg, ...svg.querySelectorAll('*')];
  originalNodes.forEach((node, index) => {
    const style = window.getComputedStyle(node);
    for (const property of ['font-family', 'font-size', 'font-weight', 'fill', 'stroke', 'stroke-width', 'opacity']) clonedNodes[index].style.setProperty(property, style.getPropertyValue(property));
  });
  const url = URL.createObjectURL(new Blob([new window.XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new window.Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Could not render the chart image.')); image.src = url; });
    const { canvas, context, light } = imageCanvas(title, `ApexFinance | Range: ${range} | ${new Date().toLocaleDateString()}`, 780, theme);
    const plotHeight = Math.min(440, 1104 * bounds.height / bounds.width);
    const plotWidth = plotHeight * bounds.width / bounds.height;
    context.drawImage(image, (1200 - plotWidth) / 2, 140 + (440 - plotHeight) / 2, plotWidth, plotHeight);
    context.font = '22px system-ui, sans-serif';
    context.fillStyle = window.getComputedStyle(source.querySelector('.recharts-area-curve') || source).stroke || '#2f6f52';
    context.fillText(`Portfolio: ${metrics.portfolio}`, 48, 625);
    context.fillStyle = light ? '#b45309' : '#fbbf24';
    context.fillText(`VOO (S&P 500): ${metrics.benchmark}`, 440, 625);
    context.fillStyle = light ? '#0f172a' : '#f1f5f9';
    context.fillText(`Excess return: ${metrics.excess}`, 48, 673);
    context.font = '18px system-ui, sans-serif';
    context.fillStyle = light ? '#64748b' : '#94a3b8';
    context.fillText('Estimated backtest using current holding weights. Cash and dividends excluded.', 48, 738);
    await downloadCanvas(canvas, `apexfinance-performance-${range.toLowerCase()}`);
  } finally { URL.revokeObjectURL(url); }
}
