import { memo, useEffect, useMemo, useRef, type CSSProperties } from 'react';

type PixelBlastVariant = 'square' | 'circle' | 'triangle' | 'diamond';
type NormalizedRGB = [number, number, number];

type PixelBlastProps = {
  antialias?: boolean;
  autoPauseOffscreen?: boolean;
  className?: string;
  color?: string;
  edgeFade?: number;
  enableRipples?: boolean;
  liquid?: boolean;
  liquidRadius?: number;
  liquidStrength?: number;
  liquidWobbleSpeed?: number;
  noiseAmount?: number;
  patternDensity?: number;
  patternScale?: number;
  pixelSize?: number;
  pixelSizeJitter?: number;
  rippleIntensityScale?: number;
  rippleSpeed?: number;
  rippleThickness?: number;
  speed?: number;
  style?: CSSProperties;
  transparent?: boolean;
  variant?: PixelBlastVariant;
};

const MAX_CLICKS = 10;
const TARGET_FRAME_MS = 1000 / 30;
const quadVertices = new Float32Array([
  -1, -1,
  1, -1,
  -1, 1,
  -1, 1,
  1, -1,
  1, 1,
]);

const canvasStyle = {
  width: '100%',
  height: '100%',
  display: 'block',
} as const;

const shapeMap: Record<PixelBlastVariant, number> = {
  square: 0,
  circle: 1,
  triangle: 2,
  diamond: 3,
};

const vertexShader = `
attribute vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 uColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;
uniform int uShapeType;

const int MAX_CLICKS = 10;
uniform vec2 uClickPos[MAX_CLICKS];
uniform float uClickTimes[MAX_CLICKS];

float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}

float bayer4(vec2 a) {
  return bayer2(0.5 * a) * 0.25 + bayer2(a);
}

float bayer8(vec2 a) {
  return bayer4(0.5 * a) * 0.25 + bayer2(a);
}

float hash11(float n) {
  return fract(sin(n) * 43758.5453123);
}

float valueNoise(vec3 p) {
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  vec3 w = fp * fp * (3.0 - 2.0 * fp);

  float n000 = hash11(dot(ip + vec3(0.0, 0.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n100 = hash11(dot(ip + vec3(1.0, 0.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n010 = hash11(dot(ip + vec3(0.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n110 = hash11(dot(ip + vec3(1.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n001 = hash11(dot(ip + vec3(0.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0)));
  float n101 = hash11(dot(ip + vec3(1.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0)));
  float n011 = hash11(dot(ip + vec3(0.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0)));
  float n111 = hash11(dot(ip + vec3(1.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0)));

  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0 = mix(x00, x10, w.y);
  float y1 = mix(x01, x11, w.y);

  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm(vec2 uv, float t) {
  vec3 p = vec3(uv * uScale, t);
  float amp = 0.7;
  float sum = 0.0;

  for (int i = 0; i < 3; ++i) {
    sum += amp * valueNoise(p);
    p *= 1.55;
    amp *= 0.58;
  }

  return sum * 0.5 + 0.5;
}

float circleMask(vec2 p, float coverage) {
  float r = sqrt(max(coverage, 0.0)) * 0.34;
  return coverage * (1.0 - smoothstep(r, r + 0.08, length(p - 0.5)));
}

float triangleMask(vec2 p, vec2 id, float coverage) {
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;

  float r = sqrt(max(coverage, 0.0));
  float d = p.y - r * (1.0 - p.x);
  return coverage * (1.0 - smoothstep(-0.04, 0.04, d));
}

float diamondMask(vec2 p, float coverage) {
  float r = sqrt(max(coverage, 0.0)) * 0.56;
  return coverage * (1.0 - smoothstep(r, r + 0.05, abs(p.x - 0.5) + abs(p.y - 0.5)));
}

void main() {
  float pixelSize = max(uPixelSize, 1.0);
  vec2 fragCoord = gl_FragCoord.xy - uResolution * 0.5;
  float aspectRatio = uResolution.x / max(uResolution.y, 1.0);

  vec2 pixelId = floor(fragCoord / pixelSize);
  vec2 pixelUv = fract(fragCoord / pixelSize);
  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragCoord / cellPixelSize);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

  float base = fbm(uv, uTime * 0.045);
  float feed = base * 0.58 - 0.42 + (uDensity - 0.5) * 0.32;

  if (uEnableRipples == 1) {
    for (int i = 0; i < MAX_CLICKS; ++i) {
      vec2 pos = uClickPos[i];
      if (pos.x >= 0.0) {
        vec2 clickUv = ((pos - uResolution * 0.5 - cellPixelSize * 0.5) / uResolution) * vec2(aspectRatio, 1.0);
        float t = max(uTime - uClickTimes[i], 0.0);
        float r = distance(uv, clickUv);
        float ring = exp(-pow((r - uRippleSpeed * t) / max(uRippleThickness, 0.001), 2.0));
        float atten = exp(-1.05 * t) * exp(-9.0 * r);
        feed = max(feed, ring * atten * uRippleIntensity);
      }
    }
  }

  float bayer = bayer8(gl_FragCoord.xy / pixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);
  float jitter = fract(sin(dot(pixelId, vec2(127.1, 311.7))) * 43758.5453123);
  float coverage = clamp(bw * (1.0 + (jitter - 0.5) * uPixelJitter), 0.0, 1.0);

  float maskValue = coverage;
  if (uShapeType == 1) {
    maskValue = circleMask(pixelUv, coverage);
  } else if (uShapeType == 2) {
    maskValue = triangleMask(pixelUv, pixelId, coverage);
  } else if (uShapeType == 3) {
    maskValue = diamondMask(pixelUv, coverage);
  }

  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    maskValue *= smoothstep(0.0, uEdgeFade, edge);
  }

  gl_FragColor = vec4(uColor, maskValue);
}
`;

const hexToNormalizedRGB = (hex: string): NormalizedRGB => {
  const clean = hex.replace('#', '').trim();
  const normalized = clean.length === 3
    ? clean.split('').map((part) => part + part).join('')
    : clean.padEnd(6, '0').slice(0, 6);

  return [
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255,
  ];
};

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);

  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }

  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function PixelBlast({
  antialias = false,
  autoPauseOffscreen = true,
  className,
  color = '#B497CF',
  edgeFade = 0.25,
  enableRipples = true,
  patternDensity = 1,
  patternScale = 2,
  pixelSize = 4,
  pixelSizeJitter = 0,
  rippleIntensityScale = 1.5,
  rippleSpeed = 0.4,
  rippleThickness = 0.12,
  speed = 0.5,
  style,
  transparent = true,
  variant = 'square',
}: PixelBlastProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const normalizedColor = useMemo(() => hexToNormalizedRGB(color), [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const vertexBuffer = gl.createBuffer();
    const positionLocation = gl.getAttribLocation(program, 'aPosition');
    if (!vertexBuffer || positionLocation < 0) {
      gl.deleteProgram(program);
      return;
    }

    const uColor = gl.getUniformLocation(program, 'uColor');
    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uPixelSize = gl.getUniformLocation(program, 'uPixelSize');
    const uScale = gl.getUniformLocation(program, 'uScale');
    const uDensity = gl.getUniformLocation(program, 'uDensity');
    const uPixelJitter = gl.getUniformLocation(program, 'uPixelJitter');
    const uEnableRipples = gl.getUniformLocation(program, 'uEnableRipples');
    const uRippleSpeed = gl.getUniformLocation(program, 'uRippleSpeed');
    const uRippleThickness = gl.getUniformLocation(program, 'uRippleThickness');
    const uRippleIntensity = gl.getUniformLocation(program, 'uRippleIntensity');
    const uEdgeFade = gl.getUniformLocation(program, 'uEdgeFade');
    const uShapeType = gl.getUniformLocation(program, 'uShapeType');
    const uClickPos = gl.getUniformLocation(program, 'uClickPos[0]');
    const uClickTimes = gl.getUniformLocation(program, 'uClickTimes[0]');

    const clickPositions = new Float32Array(MAX_CLICKS * 2);
    const clickTimes = new Float32Array(MAX_CLICKS);
    clickPositions.fill(-1);

    let clickIndex = 0;
    let animationFrame = 0;
    let elapsed = 0;
    let lastTime = performance.now();
    let lastRender = 0;
    let isIntersecting = true;
    let isRunning = false;
    const timeOffset = Math.random() * 1000;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, transparent ? 0 : 1);

    const getPixelRatio = () => {
      const cap = window.matchMedia('(max-width: 768px)').matches ? 1 : 1.35;
      return Math.min(window.devicePixelRatio || 1, cap);
    };

    const resize = () => {
      const dpr = getPixelRatio();
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      return dpr;
    };

    const setStaticUniforms = (dpr: number) => {
      gl.uniform3f(uColor, normalizedColor[0], normalizedColor[1], normalizedColor[2]);
      gl.uniform1f(uPixelSize, pixelSize * dpr);
      gl.uniform1f(uScale, patternScale);
      gl.uniform1f(uDensity, patternDensity);
      gl.uniform1f(uPixelJitter, pixelSizeJitter);
      gl.uniform1i(uEnableRipples, enableRipples ? 1 : 0);
      gl.uniform1f(uRippleSpeed, rippleSpeed);
      gl.uniform1f(uRippleThickness, rippleThickness);
      gl.uniform1f(uRippleIntensity, rippleIntensityScale);
      gl.uniform1f(uEdgeFade, edgeFade);
      gl.uniform1i(uShapeType, shapeMap[variant] ?? 0);
    };

    const draw = (time: number, advanceTime: boolean) => {
      const dpr = resize();

      if (advanceTime) {
        elapsed += ((time - lastTime) / 1000) * speed;
        lastTime = time;
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      setStaticUniforms(dpr);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, timeOffset + elapsed);
      gl.uniform2fv(uClickPos, clickPositions);
      gl.uniform1fv(uClickTimes, clickTimes);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const stop = () => {
      isRunning = false;
      cancelAnimationFrame(animationFrame);
    };

    const render = (time: number) => {
      if (!isRunning) return;

      if (time - lastRender >= TARGET_FRAME_MS) {
        draw(time, true);
        lastRender = time;
      }

      animationFrame = requestAnimationFrame(render);
    };

    const shouldRun = () => (
      !reducedMotionQuery.matches
      && !document.hidden
      && (!autoPauseOffscreen || isIntersecting)
    );

    const start = () => {
      if (isRunning || !shouldRun()) return;

      isRunning = true;
      lastTime = performance.now();
      lastRender = 0;
      animationFrame = requestAnimationFrame(render);
    };

    const syncPlayback = () => {
      if (shouldRun()) {
        start();
      } else {
        stop();
        draw(performance.now(), false);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!enableRipples || reducedMotionQuery.matches) return;

      const rect = canvas.getBoundingClientRect();
      if (
        event.clientX < rect.left
        || event.clientX > rect.right
        || event.clientY < rect.top
        || event.clientY > rect.bottom
      ) {
        return;
      }

      const scaleX = canvas.width / Math.max(rect.width, 1);
      const scaleY = canvas.height / Math.max(rect.height, 1);
      const offset = clickIndex * 2;
      clickPositions[offset] = (event.clientX - rect.left) * scaleX;
      clickPositions[offset + 1] = (rect.height - (event.clientY - rect.top)) * scaleY;
      clickTimes[clickIndex] = timeOffset + elapsed;
      clickIndex = (clickIndex + 1) % MAX_CLICKS;
    };

    const resizeObserver = new ResizeObserver(() => {
      draw(performance.now(), false);
    });
    resizeObserver.observe(canvas);

    const intersectionObserver = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
        isIntersecting = entry.isIntersecting;
        syncPlayback();
      });

    intersectionObserver?.observe(canvas);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('visibilitychange', syncPlayback);
    reducedMotionQuery.addEventListener('change', syncPlayback);

    draw(performance.now(), false);
    syncPlayback();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('visibilitychange', syncPlayback);
      reducedMotionQuery.removeEventListener('change', syncPlayback);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteProgram(program);
    };
  }, [
    antialias,
    autoPauseOffscreen,
    edgeFade,
    enableRipples,
    normalizedColor,
    patternDensity,
    patternScale,
    pixelSize,
    pixelSizeJitter,
    rippleIntensityScale,
    rippleSpeed,
    rippleThickness,
    speed,
    transparent,
    variant,
  ]);

  return (
    <div
      aria-hidden="true"
      className={`pixel-blast-container ${className ?? ''}`}
      style={style}
    >
      <canvas ref={canvasRef} style={canvasStyle} />
    </div>
  );
}

export default memo(PixelBlast);
