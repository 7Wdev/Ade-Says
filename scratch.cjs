const fs = require('fs');

const path = './src/content/posts/02-steganography/index.md';
let content = fs.readFileSync(path, 'utf8');

// The replacement content for Block 1 (Microscope EN/AR)
const b1 = `\`\`\`html-live
<!-- sandbox-height: 500 -->
<style>
  body {
    min-height: 100vh;
    margin: 0;
    padding: 24px 16px;
    background: #0f1012;
    color: #e0e0e0;
    font-family: "Roboto Flex", system-ui, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }

  .lab {
    width: 100%;
    max-width: 900px;
    display: flex;
    gap: 48px;
    align-items: center;
    justify-content: center;
  }

  .stage {
    flex: 1.2;
    position: relative;
    max-width: 520px;
  }

  canvas {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    background: #0f1012;
    border-radius: 4px;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 12px 40px rgba(0,0,0,0.8);
    cursor: crosshair;
  }

  .formulas {
    flex: 0.8;
    display: flex;
    flex-direction: column;
    gap: 28px;
    font-family: "Courier New", Courier, monospace;
    font-size: 18px;
  }

  .hex-title {
    font-size: 42px;
    font-weight: bold;
    color: #fff;
    letter-spacing: 2px;
    margin-bottom: 0px;
  }

  .channel {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .ch-name {
    width: 18px;
    font-weight: bold;
  }

  .ch-val {
    width: 36px;
    text-align: right;
    color: #888;
  }

  .ch-hex {
    width: 30px;
    text-align: center;
    font-weight: bold;
  }

  .bits {
    display: flex;
    gap: 6px;
    margin-left: 12px;
  }

  .bit {
    font-size: 15px;
    color: #333;
    transition: color 0.15s ease-out, transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1.3);
  }

  .bit.on {
    transform: translateY(-2px);
  }

  /* 3blue1brown inspired colors */
  .r-row .ch-name, .r-row .ch-hex, .r-row .bit.on { color: #fc6255; text-shadow: 0 0 10px rgba(252,98,85,0.3); }
  .g-row .ch-name, .g-row .ch-hex, .g-row .bit.on { color: #83c167; text-shadow: 0 0 10px rgba(131,193,103,0.3); }
  .b-row .ch-name, .b-row .ch-hex, .b-row .bit.on { color: #58c4dd; text-shadow: 0 0 10px rgba(88,196,221,0.3); }

  .hint {
    position: absolute;
    bottom: -32px;
    left: 4px;
    font-size: 13px;
    color: #777;
    font-family: "Roboto Flex", sans-serif;
  }

  @media (max-width: 760px) {
    .lab {
      flex-direction: column;
      gap: 36px;
      padding: 0;
    }
    .hex-title {
      font-size: 32px;
      text-align: center;
    }
    .formulas {
      font-size: 14px;
      width: 100%;
      align-items: center;
      gap: 20px;
    }
    .channel {
      gap: 12px;
    }
    .bits {
      margin-left: 4px;
      gap: 4px;
    }
  }
</style>

<div class="lab" dir="ltr">
  <div class="stage">
    <canvas id="pixel-canvas" width="600" height="340"></canvas>
    <div class="hint">Drag across the canvas to sample pixels</div>
  </div>
  <div class="formulas">
    <div id="hex-view" class="hex-title">#000000</div>
    <div id="ch-r" class="channel r-row"><div class="ch-name">R</div><div class="ch-val">0</div><div class="ch-hex">00</div><div class="bits"></div></div>
    <div id="ch-g" class="channel g-row"><div class="ch-name">G</div><div class="ch-val">0</div><div class="ch-hex">00</div><div class="bits"></div></div>
    <div id="ch-b" class="channel b-row"><div class="ch-name">B</div><div class="ch-val">0</div><div class="ch-hex">00</div><div class="bits"></div></div>
  </div>
</div>

<script>
  const canvas = document.getElementById('pixel-canvas');
  const ctx = canvas.getContext('2d');
  const cols = 20;
  const rows = 12;
  
  // Setup HTML bit structures
  ['r', 'g', 'b'].forEach(ch => {
    const bitsEl = document.querySelector(\`#ch-\${ch} .bits\`);
    for(let i=0; i<8; i++) {
        const bit = document.createElement('div');
        bit.className = 'bit';
        bit.textContent = '0';
        bitsEl.appendChild(bit);
    }
  });

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
  function toHex(val) { return Math.round(val).toString(16).padStart(2, '0').toUpperCase(); }
  
  // Mathematical field
  function pixelColor(col, row) {
    const x = col / cols;
    const y = row / rows;
    
    const r = Math.sin(x * Math.PI) * 120 + 80;
    const g = Math.cos(y * Math.PI) * 100 + 120;
    const b = (Math.sin(x * 2) + Math.cos(y * 2)) * 60 + 130;
    
    let rgb = [r, g, b];
    
    if (col === 5 && row === 4) rgb = [252, 98, 85];
    if (col === 14 && row === 7) rgb = [131, 193, 103];
    
    return rgb.map(v => clamp(v, 0, 255));
  }

  const pixels = Array.from({length: rows}, (_, r) => 
    Array.from({length: cols}, (_, c) => pixelColor(c, r))
  );

  let target = {col: 5, row: 4};
  let focus = {col: 5, row: 4};
  let lastColorStr = '';

  function updateMath(rgb) {
    const hex = '#' + rgb.map(toHex).join('');
    document.getElementById('hex-view').textContent = hex;
    
    ['r', 'g', 'b'].forEach((ch, idx) => {
      const val = Math.round(rgb[idx]);
      const rowEl = document.getElementById(\`ch-\${ch}\`);
      rowEl.querySelector('.ch-val').textContent = val;
      rowEl.querySelector('.ch-hex').textContent = toHex(val);
      
      const bitStr = val.toString(2).padStart(8, '0');
      const bitNodes = rowEl.querySelector('.bits').children;
      for(let i=0; i<8; i++) {
         bitNodes[i].textContent = bitStr[i];
         if(bitStr[i] === '1') bitNodes[i].classList.add('on');
         else bitNodes[i].classList.remove('on');
      }
    });
  }

  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    target.col = clamp(Math.floor(x * cols), 0, cols - 1);
    target.row = clamp(Math.floor(y * rows), 0, rows - 1);
  });
  canvas.addEventListener('pointerdown', e => {
     canvas.setPointerCapture(e.pointerId);
  });

  function drawGrid(scalePass) {
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillStyle = '#' + pixels[row][col].map(toHex).join('');
        ctx.fillRect(col * cellW, row * cellH, cellW + 1, cellH + 1);
        if (!scalePass) {
          ctx.strokeStyle = 'rgba(0,0,0,0.15)';
          ctx.lineWidth = 1;
          ctx.strokeRect(col * cellW, row * cellH, cellW, cellH);
        }
      }
    }
  }

  function draw() {
    focus.col += (target.col - focus.col) * 0.15;
    focus.row += (target.row - focus.row) * 0.15;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(false);

    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    const cx = (focus.col + 0.5) * cellW;
    const cy = (focus.row + 0.5) * cellH;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, Math.PI * 2);
    ctx.clip();
    
    ctx.translate(cx, cy);
    ctx.scale(2.8, 2.8);
    ctx.translate(-cx, -cy);
    drawGrid(true);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(target.col * cellW + 2, target.row * cellH + 2, cellW - 4, cellH - 4);

    const sc = clamp(Math.round(focus.col), 0, cols - 1);
    const sr = clamp(Math.round(focus.row), 0, rows - 1);
    const pColor = pixels[sr][sc];
    const cStr = pColor.join();
    if (cStr !== lastColorStr) {
      updateMath(pColor);
      lastColorStr = cStr;
    }

    requestAnimationFrame(draw);
  }

  updateMath(pixels[target.row][target.col]);
  draw();
</script>
\`\`\``;

// Block 2: Nibble Lab English
// Needs to be math style equations, beautiful and minimal.
const b2 = `\`\`\`html-live
<!-- sandbox-height: 520 -->
<style>
  body {
    min-height: 100vh;
    margin: 0;
    padding: 24px;
    background: #0f1012;
    color: #e0e0e0;
    font-family: "Roboto Flex", system-ui, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow-x: hidden;
  }

  .lab {
    width: 100%;
    max-width: 900px;
    display: flex;
    gap: 60px;
    align-items: center;
    justify-content: center;
  }

  .stage {
    flex: 1.2;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .ch-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-family: "Courier New", Courier, monospace;
    font-size: 18px;
  }

  .ch-row {
    display: flex;
    align-items: center;
    gap: 16px;
    color: #888;
  }

  .ch-val {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .nibble {
    display: flex;
    position: relative;
  }

  .nibble span {
    transition: color 0.3s, transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.3);
  }

  .ch-label {
    width: 70px;
    font-family: "Roboto Flex", sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* 3blue1brown inspired colors */
  .ch-r .hi { color: #fc6255; font-weight: bold; }
  .ch-g .hi { color: #83c167; font-weight: bold; }
  .ch-b .hi { color: #58c4dd; font-weight: bold; }
  .hi-sec { color: #E8C170; font-weight: bold; }
  
  .ch-row.carrier .hi { color: #ccc; font-weight: bold; }
  .ch-row.carrier .lo { color: #E8C170; font-weight: bold; }
  .ch-row.reveal .hi { color: #E8C170; font-weight: bold; }

  .formulas {
    flex: 0.8;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .formulas h2 {
    font-size: 20px;
    color: #fff;
    margin-bottom: 8px;
    font-weight: 400;
  }

  .math-line {
    font-family: "Courier New", monospace;
    font-size: 15px;
    color: #ccc;
    background: rgba(255,255,255,0.03);
    padding: 12px 16px;
    border-radius: 6px;
    border-left: 2px solid #58c4dd;
  }

  button {
    margin-top: 16px;
    background: #E8C170;
    color: #111;
    border: none;
    padding: 10px 16px;
    font-weight: bold;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.2s;
  }
  button:hover { opacity: 0.8; }

  #lab-container.is-running .anim-target {
    animation: mathPop 0.8s cubic-bezier(0.2, 0.9, 0.3, 1.3) both;
  }

  @keyframes mathPop {
    0% { transform: scale(0.8) translateY(-10px); color: #fff; text-shadow: 0 0 10px #fff; opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }

  @media (max-width: 760px) {
    .lab {
      flex-direction: column;
      gap: 40px;
      padding: 0;
    }
    .math-line {
      font-size: 13px;
    }
  }
</style>

<div class="lab" id="lab-container" dir="ltr">
  <div class="stage">
    <div class="ch-block ch-r"><div class="ch-row cover"><div class="ch-label">Cover (R)</div><div class="ch-val">[ <span class="nibble hi">F</span> <span class="nibble lo">F</span> ]</div></div><div class="ch-row secret"><div class="ch-label">Secret</div><div class="ch-val">[ <span class="nibble hi-sec">8</span> <span class="nibble lo">F</span> ]</div></div><div class="ch-row carrier"><div class="ch-label" style="color:#fff">Carrier</div><div class="ch-val">[ <span class="nibble hi">F</span> <span class="nibble lo anim-target" style="animation-delay: 0.1s">8</span> ]</div></div><div class="ch-row reveal"><div class="ch-label" style="color:#E8C170">Reveal</div><div class="ch-val">[ <span class="nibble hi anim-target" style="animation-delay: 0.2s">8</span> <span class="nibble lo">0</span> ]</div></div></div>
    <div class="ch-block ch-g"><div class="ch-row cover"><div class="ch-label">Cover (G)</div><div class="ch-val">[ <span class="nibble hi">C</span> <span class="nibble lo">3</span> ]</div></div><div class="ch-row secret"><div class="ch-label">Secret</div><div class="ch-val">[ <span class="nibble hi-sec">C</span> <span class="nibble lo">5</span> ]</div></div><div class="ch-row carrier"><div class="ch-label" style="color:#fff">Carrier</div><div class="ch-val">[ <span class="nibble hi">C</span> <span class="nibble lo anim-target" style="animation-delay: 0.3s">C</span> ]</div></div><div class="ch-row reveal"><div class="ch-label" style="color:#E8C170">Reveal</div><div class="ch-val">[ <span class="nibble hi anim-target" style="animation-delay: 0.4s">C</span> <span class="nibble lo">0</span> ]</div></div></div>
    <div class="ch-block ch-b"><div class="ch-row cover"><div class="ch-label">Cover (B)</div><div class="ch-val">[ <span class="nibble hi">5</span> <span class="nibble lo">9</span> ]</div></div><div class="ch-row secret"><div class="ch-label">Secret</div><div class="ch-val">[ <span class="nibble hi-sec">6</span> <span class="nibble lo">C</span> ]</div></div><div class="ch-row carrier"><div class="ch-label" style="color:#fff">Carrier</div><div class="ch-val">[ <span class="nibble hi">5</span> <span class="nibble lo anim-target" style="animation-delay: 0.5s">6</span> ]</div></div><div class="ch-row reveal"><div class="ch-label" style="color:#E8C170">Reveal</div><div class="ch-val">[ <span class="nibble hi anim-target" style="animation-delay: 0.6s">6</span> <span class="nibble lo">0</span> ]</div></div></div>
  </div>
  <div class="formulas">
    <h2>Bitwise Operations</h2>
    <div class="math-line">C = (cover &amp; 0xF0) | (secret &gt;&gt; 4)</div>
    <div class="math-line">R = (carrier &amp; 0x0F) &lt;&lt; 4</div>
    <button id="replay">Re-animate</button>
  </div>
</div>

<script>
  const lab = document.getElementById('lab-container');
  const replay = document.getElementById('replay');
  function run() {
    lab.classList.remove('is-running');
    void lab.offsetWidth;
    lab.classList.add('is-running');
  }
  replay.addEventListener('click', run);
  setTimeout(run, 100);
</script>
\`\`\``;

const b3 = (b2).replace('Cover (R)', 'غلاف (R)')
                .replace('Cover (G)', 'غلاف (G)')
                .replace('Cover (B)', 'غلاف (B)')
                .replace('Secret', 'سر')
                .replace('Carrier', 'حامل')
                .replace('Reveal', 'إظهار')
                .replace('Bitwise Operations', 'العمليات الثنائية')
                .replace('Re-animate', 'إعادة الحركة');


const b4 = `\`\`\`html-live
<!-- sandbox-height: 280 -->
<style>
  body {
    min-height: 100vh;
    margin: 0;
    padding: 24px;
    background: #0f1012;
    color: #e0e0e0;
    font-family: "Roboto Flex", system-ui, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .timeline {
    width: 100%;
    max-width: 800px;
    display: flex;
    gap: 40px;
    align-items: center;
    justify-content: space-between;
    position: relative;
  }
  .timeline::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 40px;
    right: 40px;
    height: 2px;
    background: rgba(255,255,255,0.1);
    z-index: 0;
  }
  .node {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
    width: 120px;
  }
  .circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #0f1012;
    border: 2px solid #58c4dd;
    position: relative;
  }
  .circle.active {
    background: #58c4dd;
    box-shadow: 0 0 15px rgba(88,196,221,0.6);
  }
  .label { font-weight: 600; color: #fff; font-size: 15px; }
  .desc { font-size: 12px; color: #888; }
  
  .packet {
    position: absolute;
    top: 50%;
    left: 40px;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #E8C170;
    box-shadow: 0 0 12px #E8C170;
    z-index: 2;
    animation: travel 8s ease-in-out infinite;
  }

  @keyframes travel {
    0%, 15% { left: calc(0% + 60px); opacity: 0; }
    20% { left: calc(0% + 60px); opacity: 1; }
    40%, 45% { left: calc(33.33% + 20px); }
    60%, 65% { left: calc(66.66% - 20px); }
    85%, 100% { left: calc(100% - 60px); opacity: 1; }
  }

  @media (max-width: 760px) {
    .timeline {
      flex-direction: column;
      align-items: flex-start;
      gap: 32px;
    }
    .timeline::before {
      top: 40px;
      bottom: 40px;
      left: 10px;
      width: 2px;
      height: auto;
      right: auto;
    }
    .node {
      flex-direction: row;
      text-align: left;
      width: 100%;
      height: 40px;
      gap: 24px;
    }
    .circle { flex-shrink: 0; }
    .label { width: 80px; }
    .packet {
      top: 40px;
      left: 10px;
      animation: travel-v 8s ease-in-out infinite;
    }
    @keyframes travel-v {
      0%, 15% { top: 20px; opacity: 0; }
      20% { top: 20px; opacity: 1; }
      40%, 45% { top: calc(33.33% + 5px); }
      60%, 65% { top: calc(66.66% - 5px); }
      85%, 100% { top: calc(100% - 20px); opacity: 1; }
    }
  }
</style>

<div class="timeline" dir="ltr">
  <div class="packet"></div>
  <div class="node"><div class="circle"></div><div class="label">Wax</div><div class="desc">A blank tablet</div></div>
  <div class="node"><div class="circle"></div><div class="label">Ink</div><div class="desc">Heat turns visible</div></div>
  <div class="node"><div class="circle"></div><div class="label">Microdot</div><div class="desc">Shrinks into speck</div></div>
  <div class="node"><div class="circle"></div><div class="label">Pixels</div><div class="desc">Noise hiding place</div></div>
</div>
\`\`\``;

const b5 = b4.replace('dir="ltr"', 'dir="rtl"')
  .replace('Wax', 'شمع').replace('A blank tablet', 'لوح فاضي')
  .replace('Ink', 'حبر').replace('Heat turns visible', 'الحرارة للإظهار')
  .replace('Microdot', 'نقطة').replace('Shrinks into speck', 'تُصغر لنقطة')
  .replace('Pixels', 'بكسلات').replace('Noise hiding place', 'تختبئ بالضجيج');


// Now replace in content
const blocks = content.split('\`\`\`html-live');
// blocks[0] is text before 1
// blocks[1] is block 1 text \n\`\`\` text
// blocks[2] is block 2 ...

function replaceBlock(idx, newCode) {
    const endIdx = blocks[idx].indexOf('\`\`\`');
    blocks[idx] = newCode.replace('\`\`\`html-live', '') + blocks[idx].substring(endIdx + 3);
}

replaceBlock(1, b1);
replaceBlock(2, b2);
replaceBlock(3, b3);
replaceBlock(4, b4);
replaceBlock(5, b5);

fs.writeFileSync(path, blocks.join('\`\`\`html-live'));
console.log('done replacing');
