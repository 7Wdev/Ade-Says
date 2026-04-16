import { memo, useMemo } from "react";
import CryptoJS from "crypto-js";
import tikzCache from "../generated/tikz-cache.json";

interface TikZRendererProps {
  content: string;
}

const typedTikzCache = tikzCache as Record<string, string>;

function TikZRenderer({ content }: TikZRendererProps) {
  // Hash the content to find it in the cache, exactly as the build script does
  const hash = useMemo(() => {
    return CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex).slice(0, 16);
  }, [content]);

  const svgContent = typedTikzCache[hash];

  if (!svgContent) {
    return (
      <div className="tikz-wrapper">
        <div className="tikz-error" role="alert">
          <span className="material-symbols-rounded">error</span>
          <span>Failed to load pre-rendered TikZ diagram.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tikz-wrapper">
      <div 
        className="tikz-container" 
        dangerouslySetInnerHTML={{ __html: svgContent }} 
      />
    </div>
  );
}

export default memo(TikZRenderer);
