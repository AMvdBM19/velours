(function () {
  'use strict';

  // Read config from script tag attributes or query params
  var script = document.currentScript;
  if (!script) return;

  var src = script.getAttribute('src') || '';
  var params = {};
  var queryString = src.split('?')[1] || '';
  queryString.split('&').forEach(function (pair) {
    var kv = pair.split('=');
    if (kv[0]) params[kv[0]] = decodeURIComponent(kv[1] || '');
  });

  var agency = params.agency || script.getAttribute('data-agency');
  var color = params.color || script.getAttribute('data-color') || '#10b981';
  var position = params.position || script.getAttribute('data-position') || 'bottom-right';
  var label = params.label || script.getAttribute('data-label') || 'Book Now';

  if (!agency) {
    console.error('[Velours] Missing agency slug. Add ?agency=your-slug to embed script URL.');
    return;
  }

  // Determine base URL from script source
  var baseUrl = src.split('/embed.js')[0] || window.location.origin;

  // Create container
  var container = document.createElement('div');
  container.id = 'velours-embed-container';
  container.style.cssText = 'position:fixed;z-index:999999;';

  // Position
  if (position === 'bottom-left') {
    container.style.bottom = '20px';
    container.style.left = '20px';
  } else {
    container.style.bottom = '20px';
    container.style.right = '20px';
  }

  // Create toggle button
  var button = document.createElement('button');
  button.id = 'velours-toggle-btn';
  button.textContent = label;
  button.style.cssText = [
    'display:block',
    'padding:12px 24px',
    'border:none',
    'border-radius:50px',
    'background:' + color,
    'color:white',
    'font-size:15px',
    'font-weight:600',
    'cursor:pointer',
    'box-shadow:0 4px 14px rgba(0,0,0,0.2)',
    'transition:transform 0.2s,box-shadow 0.2s',
    'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',
  ].join(';');

  button.onmouseenter = function () {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
  };
  button.onmouseleave = function () {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 14px rgba(0,0,0,0.2)';
  };

  // Create iframe (hidden initially)
  var iframe = document.createElement('iframe');
  iframe.id = 'velours-widget-frame';
  iframe.src = baseUrl + '/book/' + agency + '?embed=true';
  iframe.style.cssText = [
    'display:none',
    'width:400px',
    'height:600px',
    'max-width:95vw',
    'max-height:80vh',
    'border:none',
    'border-radius:16px',
    'box-shadow:0 8px 30px rgba(0,0,0,0.2)',
    'margin-bottom:12px',
    'background:white',
  ].join(';');
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.setAttribute('loading', 'lazy');

  var isOpen = false;

  button.onclick = function () {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? 'block' : 'none';
    button.textContent = isOpen ? '✕ Close' : label;
  };

  // Listen for close messages from the widget
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'velours-close') {
      isOpen = false;
      iframe.style.display = 'none';
      button.textContent = label;
    }
    // Auto-resize
    if (event.data && event.data.type === 'velours-resize' && event.data.height) {
      iframe.style.height = Math.min(event.data.height, window.innerHeight * 0.8) + 'px';
    }
  });

  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);
})();
