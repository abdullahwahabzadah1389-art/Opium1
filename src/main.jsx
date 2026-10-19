import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Minimal React entry point.
// Freebuff hosting builds Vite + React projects only, so this tiny root
// satisfies the framework requirement while the site itself stays static.
// Existing pages (games, emulators, proxies, ...) remain plain HTML and are
// copied verbatim into dist/ by scripts/copy-static.mjs during the build.
const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <></>
    </StrictMode>
  );
}
