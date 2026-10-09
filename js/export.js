// Export Engine using html2canvas for Card Forge

(function() {
  function sanitizeFilename(title) {
    if (!title || typeof title !== 'string') return 'friend-card.png';
    const clean = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${clean || 'friend'}-card.png`;
  }

  window.exportCardAsPng = async function() {
    const cardEl = document.getElementById('card');
    const downloadBtn = document.getElementById('download-btn');
    if (!cardEl) return;

    // 1. Hide active popovers
    if (typeof window.hidePopover === 'function') {
      window.hidePopover();
    }

    // 2. Prepare card for clean export (strip hover outlines, shimmer, etc.)
    cardEl.classList.add('card--exporting');

    // 3. Update button to loading state
    let originalBtnHtml = '';
    if (downloadBtn) {
      originalBtnHtml = downloadBtn.innerHTML;
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = `
        <svg class="btn-spinner" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12" stroke-linecap="round"></circle>
        </svg>
        <span class="btn-text">Forging Card...</span>
      `;
    }

    try {
      const h2c = window.html2canvas || (typeof html2canvas !== 'undefined' ? html2canvas : null);
      if (typeof h2c !== 'function') {
        throw new Error('html2canvas library is not loaded');
      }

      // Allow DOM updates to settle
      await new Promise(resolve => setTimeout(resolve, 50));

      const canvas = await h2c(cardEl, {
        scale: 2, // 2x resolution: 700x980px
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      });

      const title = window.AppState ? window.AppState.title : 'friend';
      const filename = sanitizeFilename(title);

      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export card as PNG:', err);
      if (typeof window.alert === 'function') {
        window.alert('Could not export card. Please check the browser console or try again.');
      }
    } finally {
      // 4. Restore interactive state
      cardEl.classList.remove('card--exporting');
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = originalBtnHtml;
      }
    }
  };

  // Wire download button on ready
  function initExport() {
    const btn = document.getElementById('download-btn');
    if (btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        window.exportCardAsPng();
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initExport);
    } else {
      initExport();
    }
  }
})();
