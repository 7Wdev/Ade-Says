import { memo, useMemo } from "react";
import CryptoJS from "crypto-js";
import tikzCache from "../generated/tikz-cache.json";

interface TikZRendererProps {
  content: string;
}

const typedTikzCache = tikzCache as Record<string, string | null>;

function normalizeTikzContent(content: string) {
  return content.replace(/\r\n/g, "\n").trim();
}

function themeTikzSvg(svg: string) {
  return svg
    .replace(/stroke="#000"/g, 'stroke="#e6e0e9"')
    .replace(/fill="#000"/g, 'fill="#e6e0e9"')
    .replace(/ fill="#000" /g, ' fill="#e6e0e9" ');
}

function TikZRenderer({ content }: TikZRendererProps) {
  // Hash the content to find it in the cache, exactly as the build script does
  const hash = useMemo(() => {
    return CryptoJS.SHA256(normalizeTikzContent(content)).toString(CryptoJS.enc.Hex).slice(0, 16);
  }, [content]);

  const svgContent = typedTikzCache[hash];
  const themedSvgContent = svgContent ? themeTikzSvg(svgContent) : null;

  if (!themedSvgContent) {
    return (
      <div className="tikz-wrapper">
        <div className="tikz-error" role="alert">
          <m3e-icon aria-hidden="true" filled name="error" variant="rounded" />
          <span>Failed to load pre-rendered TikZ diagram.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tikz-wrapper">
      <div 
        className="tikz-container" 
        dangerouslySetInnerHTML={{ __html: themedSvgContent }} 
      />
    </div>
  );
}

export default memo(TikZRenderer);
