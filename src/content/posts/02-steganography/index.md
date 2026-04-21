---
title: Steganography, The Art of Hiding a Whisper Inside a Picture!
titleAr: الستيغانوغرافي، فن إخفاء الهمسة داخل صورة!
author: Ade
date: April -, 2026
excerpt: A walk through hidden messages, old tricks, pixel secrets, and hiding techniques.
excerptAr: المرور عبر الرسائل المخفية، من الحيل القديمة وصولا الى أسرار البكسلات وأساليب اخفاء المعلومات.
pinned: true
pinnedRank: 1
tags: steganography, cryptography, images, experiment
thumbnail: ./banner.webp
---

I like **steganography** because it feels *sneaky in a very gentle way*.

**Cryptography** says: "I have a message, but you cannot read it." **Steganography** says: "*Message? What message?*" It is the art of hiding **the existence of the message itself**. Not a locked box, exactly. More like a note folded into the wallpaper.

The little color story that started this article is beautifully simple: one **pixel** is <span class="inline-yellow">yellow</span>, another pixel is <span class="inline-green">green</span>, and if we borrow only the *tiny parts* of the green pixel that the eye barely notices, the yellow still looks yellow. But the green leaves a trace. <span class="inline-quiet">Quiet</span>, but there.

That is the whole mood of steganography. The <span class="inline-secret">secret</span> does not shout. It just moves into the **least suspicious place in the room**.

## A Short History of Hiding in Plain Sight

### The Message "Under the Surface"

One of the oldest stories in history is the story of the Greek ruler **Histiaeus**, who was trapped and wanted to send a secret message for a military revolt. What did he do? He brought his trusted servant, shaved his head completely, and tattooed the message on his scalp! He waited a few weeks until the hair grew back and covered the tattoo, then sent him off. The messenger passed through all the guards and checkpoints like an ordinary traveler carrying no paper at all. The message was not encrypted. It was literally hidden "under the surface".

### Secrets Hidden in Knitting Stitches

And if we want a less ancient example, during World War II, spies, especially women, used knitting to hide dangerous military messages and details about train movements! You would look at the sweater or shawl and think it was just a normal piece of clothing, but the type of stitch and its order formed **Morse code**. The secret was hiding in the middle of the room, visible to everyone, but no one suspected it.

### The Paper That Changes Its Mind

Then, of course, came the era of invisible inks: lemon juice, hidden ink, and chemicals. All those little activities we used to do as kids, getting excited when a blank page suddenly changed and gave away its secret when we exposed it to heat or certain kinds of light. All of these were ways of hiding information without realizing it.

### The Digital Age: Hiding Inside "Noise"

And when we entered the age of computers, technology opened doors to new places where we could hide messages: **noise**.

The digital images we see every day are full of extremely fine details and color gradients. To the computer, an image is just numbers, but our eyes interpret them as colors. That is why today we can hide information inside a digital image, and that is what we are going to explore today.

## Pixels and Hex Without the Headache

A **pixel** is one tiny spot of color in a digital image. More precisely, it is the smallest part of the image that the computer can point to and give a color. A photo is just a huge grid of these tiny spots. One pixel alone does not say much, but when millions of pixels sit next to each other, your eye blends them into a face, a street, a sky, or a cat doing something suspicious.

![A zoomed-in image showing how a normal picture becomes individual pixels with RGB values](./assets/pixels.webp)

*From far away, your eye blends all those tiny color decisions into one smooth image. Up close, the picture turns back into little squares with numbers behind them.*

Most digital colors are stored as three color channels: <span class="inline-red">red</span>, <span class="inline-green">green</span>, and <span class="inline-blue">blue</span>. You will often see that written as <span class="inline-red">R</span><span class="inline-green">G</span><span class="inline-blue">B</span>. Each channel is a number that says how much of that color of light is in the pixel.

Each channel usually goes from `0` to `255`. **Zero** means none of that color. `255` means that channel is fully on. So one pixel is simply three channel values sitting next to each other:

![A phone display magnified to show the red, green, and blue subpixels inside one screen area](./assets/rgb-phone-subpixels.webp)

**Hex** is the same color written in a shorter format. Hex counts `0` through `9`, then `A` through `F`, so one color channel fits into two hex digits from `00` to `FF`.

Start with decimal RGB values: `255, 195, 89`.

Turn each channel into a two-digit hex pair: `255 -> FF`, `195 -> C3`, `89 -> 59`.

Then place the three pairs side by side and add `#`: `#FFC359`.

That is all `#RRGGBB` means: one pair for <span class="inline-red">red</span>, one for <span class="inline-green">green</span>, and one for <span class="inline-blue">blue</span>.

You do not need to calculate it in your head every time. The only important idea here is this: each color channel has a <span class="inline-loud">loud part</span> and a <span class="inline-quiet">quiet part</span>. Steganography likes the <span class="inline-quiet">quiet part</span>.

Here is a more playful way to see it. **Move around the pixel field.** The big **hex code** updates from the square under the lens, and the bit rows show how every color channel is really *eight little on/off decisions*.

```html-live
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
    background:
      radial-gradient(circle at top left, rgba(255, 196, 87, 0.12), transparent 34%),
      radial-gradient(circle at bottom right, rgba(255, 126, 62, 0.1), transparent 40%),
      #0f1012;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 18px 48px rgba(0,0,0,0.55);
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

  .r-row .ch-name, .r-row .ch-hex, .r-row .bit.on { color: #ff7a70; text-shadow: 0 0 12px rgba(255,122,112,0.34); }
  .g-row .ch-name, .g-row .ch-hex, .g-row .bit.on { color: #9be26a; text-shadow: 0 0 12px rgba(155,226,106,0.28); }
  .b-row .ch-name, .b-row .ch-hex, .b-row .bit.on { color: #78cfff; text-shadow: 0 0 12px rgba(120,207,255,0.28); }

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
    const bitsEl = document.querySelector(`#ch-${ch} .bits`);
    for(let i=0; i<8; i++) {
        const bit = document.createElement('div');
        bit.className = 'bit';
        bit.textContent = '0';
        bitsEl.appendChild(bit);
    }
  });

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
  function toHex(val) { return Math.round(val).toString(16).padStart(2, '0').toUpperCase(); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function blendColor(colorA, colorB, t) {
    return colorA.map((value, index) => mix(value, colorB[index], t));
  }
  
  function pixelColor(col, row) {
    const x = col / (cols - 1);
    const y = row / (rows - 1);

    const topLeft = [248, 214, 112];
    const topRight = [255, 168, 74];
    const bottomLeft = [88, 29, 146];
    const bottomRight = [129, 37, 183];

    const topBand = blendColor(topLeft, topRight, x);
    const bottomBand = blendColor(bottomLeft, bottomRight, x);
    let rgb = blendColor(topBand, bottomBand, y);

    const centerGlow = Math.max(0, 1 - Math.hypot(x - 0.5, y - 0.64) / 0.78);
    rgb = blendColor(rgb, [204, 58, 160], centerGlow * 0.46);

    const orangeBloom = Math.max(0, 1 - Math.hypot(x - 0.2, y - 0.24) / 0.5);
    rgb = blendColor(rgb, [255, 137, 62], orangeBloom * 0.2);

    const yellowBloom = Math.max(0, 1 - Math.hypot(x - 0.78, y - 0.12) / 0.42);
    rgb = blendColor(rgb, [255, 232, 109], yellowBloom * 0.18);

    const wave = Math.sin(x * 4.2 - y * 2.4) * 13 + Math.cos(y * 4.9 + x * 1.3) * 8;
    rgb = rgb.map((value, index) => value + wave * [0.72, 0.22, 0.62][index]);

    if (col === 5 && row === 4) rgb = [255, 0, 0];
    if (col === 14 && row === 7) rgb = [0, 255, 0];
    if (col === 17 && row === 3) rgb = [0, 0, 255];
    
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
      const rowEl = document.getElementById(`ch-${ch}`);
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
          ctx.strokeStyle = 'rgba(27, 18, 40, 0.14)';
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
    ctx.strokeStyle = 'rgba(255,225,53,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 242, 186, 0.96)';
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
```

## The Pixel Trick From the Story

Take this <span class="inline-yellow">yellow</span>:

`#FFC359`

And this <span class="inline-green">green</span>:

`#8FC56C`

Each color is three numbers in hexadecimal: <span class="inline-red">red</span>, <span class="inline-green">green</span>, and <span class="inline-blue">blue</span>. Two hex digits per channel. The first digit is <span class="inline-loud">loud</span>. The second digit is <span class="inline-quiet">quieter</span>.

So the trick is:

```text
carrier = (visible_color & 0xF0) | (secret_color >> 4)
reveal  = (carrier & 0x0F) << 4
```

In normal words: keep the strong half of the <span class="inline-yellow">visible color</span>, then tuck the strong half of the <span class="inline-secret">secret color</span> into the <span class="inline-quiet">quiet half</span> of the visible color.

For the two colors above:

```text
visible yellow: #FFC359
hidden green:   #8FC56C
carrier pixel:  #F8CC56
revealed trace: #80C060
```

The <span class="inline-carrier">carrier pixel</span> is still very close to the original yellow. But if we look only at the <span class="inline-quiet">quiet half</span>, the <span class="inline-secret">hidden green</span> starts to come back.

```tikz
\begin{tikzpicture}[font=\sffamily, every node/.style={align=center}]
  \node[draw, rounded corners=4pt, fill=yellow!20, minimum width=2.7cm, minimum height=0.85cm] (visible) at (0, 1.3) {visible\\\ttfamily \#FFC359};
  \node[draw, rounded corners=4pt, fill=green!18, minimum width=2.7cm, minimum height=0.85cm] (secret) at (0, -1.3) {secret\\\ttfamily \#8FC56C};
  \node[draw, rounded corners=4pt, thick, minimum width=2.8cm, minimum height=0.85cm] (carrier) at (4.1, 0) {carrier\\\ttfamily \#F8CC56};
  \node[draw, rounded corners=4pt, minimum width=2.8cm, minimum height=0.85cm] (reveal) at (8.2, 0) {revealed\\\ttfamily \#80C060};
  \draw[->, thick] (visible) -- node[above, sloped] {keep loud half} (carrier);
  \draw[->, thick] (secret) -- node[below, sloped] {borrow loud half} (carrier);
  \draw[->, thick] (carrier) -- node[above] {read quiet half} (reveal);
  \node[font=\small] at (4.1, -1.35) {high nibble stays visible, low nibble carries the secret};
\end{tikzpicture}
```

```html-live
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
```

What I love about this example is that it is **not dramatic**. It does not turn the image into static. It does not scream "<span class="inline-secret">secret</span>." It only nudges a few *low-value digits* and trusts the eye to ignore them.

That also means steganography is **not automatically secure**. If someone suspects the trick, they can test for it. Real security often combines steganography with **encryption**: first make the message unreadable, then hide the unreadable thing somewhere boring.

## Same Old Instinct, New Places

The <span class="inline-carrier">carrier</span> keeps changing. The instinct stays the same.

```html-live
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
```

The digital version feels modern, but it is really an ancient habit wearing new clothes. Find a surface. Find the part people are trained not to question. Hide there.

## My Tiny Experiment

For the ending, I made a **real carrier image**. I took a normal photograph from my own gallery, then made a small black-and-white <span class="inline-secret">hidden image</span>. I embedded that hidden image in the <span class="inline-quiet">least significant bit</span> of the carrier photo's color channels.

The <span class="inline-carrier">carrier</span> still looks like a normal street photo. The hidden image is **not pasted on top of it**. It is distributed across the pixels as tiny *one-bit decisions*.

This is the <span class="inline-secret">hidden layer</span> after extracting those lowest bits:

![The hidden image revealed from the least significant bits](./assets/hidden-revealed.png)

And this is the real image that carries it:

![A street photograph with a hidden image embedded in its least significant bits](./assets/carrier-lsb.png)

===AR===

أنا معجب بفن **إخفاء المعلومات (الستيغانوغرافي - Steganography)**، لأنه بحسه *خبيث بس بطريقة كتير لطيفة*.

**التشفير (Cryptography)** بحكيلك: "أنا عندي رسالة، بس إنت ما بتقدر تقرأها".

أما **إخفاء المعلومات** بحكيلك: "*رسالة؟ أي رسالة؟*"

فهو فن إنك تخفي **وجود الرسالة من الأساس**. يعني هو مش مثل صندوق مسكّر بقفل بالضبط، بل أقرب لورقة صغيرة مطوية ومخباية بورق زينة.

قصة الألوان الصغيرة اللي بلّش فيها هالمقال حلوة وبسيطة كتير: **بيكسل** لونه <span class="inline-yellow">أصفر</span>، وبيكسل تاني لونه <span class="inline-green">أخضر</span>، وإذا أخدنا بس *الأجزاء الصغيرة كتير* من البيكسل الأخضر اللي العين يا دوب بتلاحظها، الأصفر بضل مبيّن أصفر. بس الأخضر بيترك أثر. أثر <span class="inline-quiet">هادي</span>، بس موجود.

هاد هو بالضبط الجوهر تبع إخفاء المعلومات. <span class="inline-secret">السر</span> ما بيصيّح ولا بيلفت الانتباه. هو بس بيروح بيقعد **بأقل مكان ممكن يثير الشك بالغرفة**.

## تاريخ قصير للإخفاء في وضح البصر

### الرسالة اللي "تحت السطح"

من أقدم القصص بالتاريخ، قصة الحاكم اليوناني **هيستيايوس** اللي كان محاصر وبده يبعث رسالة سرية لتمرد عسكري. شو عمل؟ جاب خادمه الموثوق، حلقله شعر راسه على الصفر، ووشم الرسالة على فروة راسه! استنى كم أسبوع لحد ما الشعر رجع طول وغطى الوشم، وبعثه. المرسال مرّ من كل الحراس ونقاط التفتيش كأنه مجرد شخص مسافر ما معه أي ورقة. الرسالة ما كانت مشفرة، كانت حرفياً مخبية "تحت السطح".

### أسرار مخبية بغرز الصوف

وإذا بدنا مثال مش من فترة، فخلال الحرب العالمية الثانية، الجواسيس (وخاصة النساء) كانوا يخفوا رسائل عسكرية خطيرة وتفاصيل عن حركة القطارات من خلال حياكة الصوف! تتطلع على الكنزة أو الشال تفكره قطعة ملابس عادية، بس نوع الغرزة وترتيبها كان عبارة عن شيفرة "**مورس**". السر كان متخفي بنص الغرفة ومكشوف للكل، بس ولا حدا شك فيه.

### الورق اللي بيغير رأيه

بعدين طبعاً إجت فترة الأحبار المخفية: عصير الليمون، الحبر المخفي، والمواد الكيميائية.. كل هالفعاليات اللي كنا نعملها وإحنا صغار ونكيف لما الورقة الفاضية تتغير فجأة وتفضح سرها لما نعرضها للحرارة أو اشعة معينة. كل هاي طرق كنا نخفي فيها معلومات بدون ما ندرك.

### العصر الرقمي: الاختباء جوا "الضجيج"

ولما دخلنا عصر الكمبيوترات، التكنولوجيا فتحتلنا أبواب لمحلات جديدة نخبي فيها رسائل: **الضجيج (Noise)**.

الصور الرقمية اللي بنشوفها كل يوم مليانة تفاصيل ودرجات ألوان دقيقة جداً. بالنسبة للكمبيوتر الصورة مجرد ارقام ولكن عيوننا بتترجمها لالوان. لهيك اليوم أصبح بإمكاننا نخفي معلومات داخل صورة رقمية وهاذ يلي رح نتناوله اليوم.

## البكسلات والـ hex ببساطة

البكسل هو نقطة الها لون صغيرة جداً في الصورة الرقمية. أو بمعنى أدق، هو أصغر جزء بالصورة الكمبيوتر بقدر يحدده ويعطيه لون. الصورة كلها شبكة كبيرة من هاي النقاط الصغيرة. البكسل لحاله ما بحكي إشي، بس لما ملايين البكسلات تيجي وتصطف جنب بعض، عينك بتمزجهم وبتشوف وجه، شارع، سما، أو بسّة عاملة كركبة.

![صورة مكبرة بتوضح كيف الصورة العادية بتصير بكسلات صغيرة إلها قيم RGB](./assets/pixels.webp)

*من بعيد عينك بتخلط كل اشعة اللون الصغيرة وبتشوف صورة منسجمة. من قريب، الصورة بترجع مربعات صغيرة وخلف كل مربع أرقام.*

أغلب الألوان الرقمية بتنحفظ في ثلاث قنوات لون: <span class="inline-red">أحمر</span>، <span class="inline-green">أخضر</span>، <span class="inline-blue">أزرق</span>. غالبا بنكتبهم <span class="inline-red">R</span><span class="inline-green">G</span><span class="inline-blue">B</span>. كل قناة هي رقم بحكي قديش في من هاللون الضوئي داخل البكسل.

كل قناة عادة بتمشي من `0` لـ `255`. **صفر** يعني ما في من هاللون. `255` يعني هاذ الون متواجد بشدة (**ماكسيموم**). يعني البكسل الواحد هو ببساطة ثلاث قيم لون جنب بعض:

![صورة لشاشة موبايل مع تكبير يوضح قنوات اللون الأحمر والأخضر والأزرق داخل جزء صغير من الشاشة](./assets/rgb-phone-subpixels.webp)

**الـ hex** هو نفس اللون بس مكتوب بصيغة أقصر. بالـ hex العد بكمّل بعد `9` بـ `A` لحد `F`، وعشان هيك كل قناة لون بتنكتب برقمين من `00` لحد `FF`.

ابدأ من قيم RGB العشرية: `255, 195, 89`.

حوّل كل قناة لزوج hex: `255 -> FF`، `195 -> C3`، `89 -> 59`.

بعدين حط الأزواج جنب بعض وحط `#` بالبداية: `#FFC359`.

يعني `#RRGGBB` بكل بساطة: زوج <span class="inline-red">للأحمر</span>، زوج <span class="inline-green">للأخضر</span>، وزوج <span class="inline-blue">للأزرق</span>.

ومش لازم تحسبها براسك كل مرة. الفكرة المهمة من هون بس: انو كل قناة لون إلها <span class="inline-loud">جزء صوته عالي</span> وجزء <span class="inline-quiet">صوته واطي</span>. الستيغانوغرافي بتعشق <span class="inline-quiet">الجزء الواطي</span>.

وهون طريقة أوضح تشوفها بعينك وتستكشف. **حرّك العدسة داخل شبكة البكسلات.** كود الـ **hex** الكبير بتغيّر حسب المربع اللي تحت العدسة، وصفوف البِتّات بتورجيك كيف انو كل قناة لون هي فعلياً *ثماني قرارات on/off صغيرة*.

```html-live
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
    background:
      radial-gradient(circle at top left, rgba(255, 196, 87, 0.12), transparent 34%),
      radial-gradient(circle at bottom right, rgba(255, 126, 62, 0.1), transparent 40%),
      #0f1012;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 18px 48px rgba(0,0,0,0.55);
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

  .r-row .ch-name, .r-row .ch-hex, .r-row .bit.on { color: #ff7a70; text-shadow: 0 0 12px rgba(255,122,112,0.34); }
  .g-row .ch-name, .g-row .ch-hex, .g-row .bit.on { color: #9be26a; text-shadow: 0 0 12px rgba(155,226,106,0.28); }
  .b-row .ch-name, .b-row .ch-hex, .b-row .bit.on { color: #78cfff; text-shadow: 0 0 12px rgba(120,207,255,0.28); }

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
  
  ['r', 'g', 'b'].forEach(ch => {
    const bitsEl = document.querySelector(`#ch-${ch} .bits`);
    for(let i=0; i<8; i++) {
        const bit = document.createElement('div');
        bit.className = 'bit';
        bit.textContent = '0';
        bitsEl.appendChild(bit);
    }
  });

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
  function toHex(val) { return Math.round(val).toString(16).padStart(2, '0').toUpperCase(); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function blendColor(colorA, colorB, t) {
    return colorA.map((value, index) => mix(value, colorB[index], t));
  }
  
  function pixelColor(col, row) {
    const x = col / (cols - 1);
    const y = row / (rows - 1);

    const topLeft = [248, 214, 112];
    const topRight = [255, 168, 74];
    const bottomLeft = [88, 29, 146];
    const bottomRight = [129, 37, 183];

    const topBand = blendColor(topLeft, topRight, x);
    const bottomBand = blendColor(bottomLeft, bottomRight, x);
    let rgb = blendColor(topBand, bottomBand, y);

    const centerGlow = Math.max(0, 1 - Math.hypot(x - 0.5, y - 0.64) / 0.78);
    rgb = blendColor(rgb, [204, 58, 160], centerGlow * 0.46);

    const orangeBloom = Math.max(0, 1 - Math.hypot(x - 0.2, y - 0.24) / 0.5);
    rgb = blendColor(rgb, [255, 137, 62], orangeBloom * 0.2);

    const yellowBloom = Math.max(0, 1 - Math.hypot(x - 0.78, y - 0.12) / 0.42);
    rgb = blendColor(rgb, [255, 232, 109], yellowBloom * 0.18);

    const wave = Math.sin(x * 4.2 - y * 2.4) * 13 + Math.cos(y * 4.9 + x * 1.3) * 8;
    rgb = rgb.map((value, index) => value + wave * [0.72, 0.22, 0.62][index]);

    if (col === 5 && row === 4) rgb = [255, 0, 0];
    if (col === 14 && row === 7) rgb = [0, 255, 0];
    if (col === 17 && row === 3) rgb = [0, 0, 255];
    
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
      const rowEl = document.getElementById(`ch-${ch}`);
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
          ctx.strokeStyle = 'rgba(27, 18, 40, 0.14)';
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
    ctx.strokeStyle = 'rgba(255,225,53,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 242, 186, 0.96)';
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
```

## خدعة البكسل من القصة

خذ هاد <span class="inline-yellow">الأصفر</span>:

`#FFC359`

وهاد <span class="inline-green">الأخضر</span>:

`#8FC56C`

كل لون هو تلات أرقام بالـ hexadecimal: <span class="inline-red">أحمر</span>، <span class="inline-green">أخضر</span>، <span class="inline-blue">أزرق</span>. كل قناة إلها رقمين. الرقم الأول <span class="inline-loud">صوته عالي</span>. الرقم التاني <span class="inline-quiet">أهدى</span>.

فالخدعة هيك:

```text
carrier = (visible_color & 0xF0) | (secret_color >> 4)
reveal  = (carrier & 0x0F) << 4
```

بكلام أبسط: بنخلي النص القوي من <span class="inline-yellow">اللون الظاهر</span>، وبنحط النص القوي من <span class="inline-secret">اللون المخفي</span> جوّا <span class="inline-quiet">النص الهادي</span> من اللون الظاهر.

مع اللونين اللي فوق:

```text
اللون الظاهر:   #FFC359
اللون المخفي:  #8FC56C
لون الحامل:    #F8CC56
الأثر المستخرج:#80C060
```

<span class="inline-carrier">لون الحامل</span> قريب كتير من الأصفر الأصلي. بس إذا ركزنا بس <span class="inline-quiet">بالأجزاء الهادية</span>، <span class="inline-secret">الأخضر المخفي</span> برجع يبين.

```tikz
\begin{tikzpicture}[font=\sffamily, every node/.style={align=center}]
  \node[draw, rounded corners=4pt, fill=yellow!20, minimum width=2.7cm, minimum height=0.85cm] (visible) at (0, 1.3) {visible\\\ttfamily \#FFC359};
  \node[draw, rounded corners=4pt, fill=green!18, minimum width=2.7cm, minimum height=0.85cm] (secret) at (0, -1.3) {secret\\\ttfamily \#8FC56C};
  \node[draw, rounded corners=4pt, thick, minimum width=2.8cm, minimum height=0.85cm] (carrier) at (4.1, 0) {carrier\\\ttfamily \#F8CC56};
  \node[draw, rounded corners=4pt, minimum width=2.8cm, minimum height=0.85cm] (reveal) at (8.2, 0) {revealed\\\ttfamily \#80C060};
  \draw[->, thick] (visible) -- node[above, sloped] {keep loud half} (carrier);
  \draw[->, thick] (secret) -- node[below, sloped] {borrow loud half} (carrier);
  \draw[->, thick] (carrier) -- node[above] {read quiet half} (reveal);
  \node[font=\small] at (4.1, -1.35) {high nibble stays visible, low nibble carries the secret};
\end{tikzpicture}
```

```html-live
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
    <div class="ch-block ch-r"><div class="ch-row cover"><div class="ch-label">غلاف (R)</div><div class="ch-val">[ <span class="nibble hi">F</span> <span class="nibble lo">F</span> ]</div></div><div class="ch-row secret"><div class="ch-label">سر</div><div class="ch-val">[ <span class="nibble hi-sec">8</span> <span class="nibble lo">F</span> ]</div></div><div class="ch-row carrier"><div class="ch-label" style="color:#fff">حامل</div><div class="ch-val">[ <span class="nibble hi">F</span> <span class="nibble lo anim-target" style="animation-delay: 0.1s">8</span> ]</div></div><div class="ch-row reveal"><div class="ch-label" style="color:#E8C170">إظهار</div><div class="ch-val">[ <span class="nibble hi anim-target" style="animation-delay: 0.2s">8</span> <span class="nibble lo">0</span> ]</div></div></div>
    <div class="ch-block ch-g"><div class="ch-row cover"><div class="ch-label">غلاف (G)</div><div class="ch-val">[ <span class="nibble hi">C</span> <span class="nibble lo">3</span> ]</div></div><div class="ch-row secret"><div class="ch-label">Secret</div><div class="ch-val">[ <span class="nibble hi-sec">C</span> <span class="nibble lo">5</span> ]</div></div><div class="ch-row carrier"><div class="ch-label" style="color:#fff">Carrier</div><div class="ch-val">[ <span class="nibble hi">C</span> <span class="nibble lo anim-target" style="animation-delay: 0.3s">C</span> ]</div></div><div class="ch-row reveal"><div class="ch-label" style="color:#E8C170">Reveal</div><div class="ch-val">[ <span class="nibble hi anim-target" style="animation-delay: 0.4s">C</span> <span class="nibble lo">0</span> ]</div></div></div>
    <div class="ch-block ch-b"><div class="ch-row cover"><div class="ch-label">غلاف (B)</div><div class="ch-val">[ <span class="nibble hi">5</span> <span class="nibble lo">9</span> ]</div></div><div class="ch-row secret"><div class="ch-label">Secret</div><div class="ch-val">[ <span class="nibble hi-sec">6</span> <span class="nibble lo">C</span> ]</div></div><div class="ch-row carrier"><div class="ch-label" style="color:#fff">Carrier</div><div class="ch-val">[ <span class="nibble hi">5</span> <span class="nibble lo anim-target" style="animation-delay: 0.5s">6</span> ]</div></div><div class="ch-row reveal"><div class="ch-label" style="color:#E8C170">Reveal</div><div class="ch-val">[ <span class="nibble hi anim-target" style="animation-delay: 0.6s">6</span> <span class="nibble lo">0</span> ]</div></div></div>
  </div>
  <div class="formulas">
    <h2>العمليات الثنائية</h2>
    <div class="math-line">C = (cover &amp; 0xF0) | (secret &gt;&gt; 4)</div>
    <div class="math-line">R = (carrier &amp; 0x0F) &lt;&lt; 4</div>
    <button id="replay">إعادة الحركة</button>
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
```

أحلى إشي بالمثال إنه **مش درامي**. الصورة ما بتصير مشوشة. ما بتصرخ "<span class="inline-secret">في سر هون</span>". بس بتغير كم *رقم صغير*، وبتراهن إن العين رح تطنش.

عشان هيك كمان لازم ننتبه: الستيغانوغرافي لحاله **مش دايما أمان**. إذا حدا شك بالموضوع، بقدر يفحص. بالأمان الحقيقي غالبا بنجمعه مع **التشفير**: أول إشي بنخلي الرسالة نفسها غير مقروءة، بعدين بنخبيها بمكان ممل.

## نفس الغريزة، أماكن جديدة

<span class="inline-carrier">الحامل</span> بتغير. الغريزة بتضل.

```html-live
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

<div class="timeline" dir="rtl">
  <div class="packet"></div>
  <div class="node"><div class="circle"></div><div class="label">شمع</div><div class="desc">لوح فاضي</div></div>
  <div class="node"><div class="circle"></div><div class="label">حبر</div><div class="desc">الحرارة للإظهار</div></div>
  <div class="node"><div class="circle"></div><div class="label">نقطة</div><div class="desc">تُصغر لنقطة</div></div>
  <div class="node"><div class="circle"></div><div class="label">بكسلات</div><div class="desc">تختبئ بالضجيج</div></div>
</div>
```

النسخة الرقمية شكلها حديث، بس هي فعليا عادة قديمة لابسة لبس جديد. دور على سطح. دور على الجزء اللي الناس متعودة ما تسأل عنه. وخبي هناك.

## تجربتي الصغيرة

بالنهاية عملت **صورة حقيقية حاملة للسر**. أخذت صورة عادية من معرضي، وعملت صورة صغيرة أبيض وأسود <span class="inline-secret">مخفية</span>. بعدين خبيتها داخل <span class="inline-quiet">أقل bit مهم</span> بقنوات الألوان تبعات الصورة.

<span class="inline-carrier">الصورة الحاملة</span> بعدها بتبين صورة شارع عادية. الصورة المخفية **مش ملصوقة فوقها**. هي موزعة على البكسلات كقرارات صغيرة من *bit واحد*.

هاي <span class="inline-secret">الطبقة المخفية</span> بعد ما استخرجنا أقل bits:

![الصورة المخفية بعد استخراج أقل bits من الصورة](./assets/hidden-revealed.png)

وهاي الصورة الحقيقية اللي شايلتها جواتها:

![صورة شارع فيها صورة مخفية داخل أقل bits من الألوان](./assets/carrier-lsb.png)
