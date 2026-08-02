import '@m3e/web/badge';
import './Portfolio.css';

export default function Portfolio() {
  return (
    <div className="portfolio-page">
      <div className="blueprint-background"></div>
      <div className="blueprint-accents">
        <div className="crosshair tl"></div>
        <div className="crosshair tr"></div>
        <div className="crosshair bl"></div>
        <div className="crosshair br"></div>
      </div>
      
      <div className="portfolio-hero">
        <m3e-badge className="status-badge" size="large">
          <span className="status-badge-content">
            <span className="status-dot" />
            <span>Under Construction</span>
          </span>
        </m3e-badge>
        
        <h1 className="hero-title portfolio-title">Portfolio</h1>
        
        <p className="hero-subtitle portfolio-subtitle">
          Curating my best work. The full portfolio experience is meticulously being crafted and will be available shortly.
        </p>
      </div>
    </div>
  );
}
