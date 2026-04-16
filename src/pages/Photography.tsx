import { memo } from "react";
import { Link } from "react-router-dom";

function Photography() {
  return (
    <section className="page-shell photography-page">
      <Link to="/" className="back-link">
        <span className="material-symbols-rounded">arrow_back</span>
        Back Home
      </Link>

      <div className="page-heading">
        <span className="page-kicker">Photography</span>
        <h1>Light, Places, People, Small Moments</h1>
        <p>A quiet space for frames from life that I took.</p>
      </div>

      <div className="photo-placeholder-grid" aria-label="Photography sections">
        <div className="photo-placeholder large">
          <span>Photo essays</span>
        </div>
        <div className="photo-placeholder warm">
          <span>Street notes</span>
        </div>
        <div className="photo-placeholder cool">
          <span>Portraits</span>
        </div>
      </div>
    </section>
  );
}

export default memo(Photography);
