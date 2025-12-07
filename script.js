// Force scroll to top on reload
if (history.scrollRestoration) {
  history.scrollRestoration = 'manual';
} else {
  window.onbeforeunload = function () {
    window.scrollTo(0, 0);
  }
}
window.onload = function() {
  setTimeout(() => window.scrollTo(0, 0), 10);
};


// --- Intersection Observer for Fade In ---
const observerOptions = {
  root: null,
  rootMargin: "0px",
  threshold: 0.1,
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.animation = `fadeUp 0.8s ease forwards ${
        getComputedStyle(entry.target).animationDelay
      }`;
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll(".animate-fade-up").forEach((el) => {
  observer.observe(el);
});

// --- 1. Spotlight Effect ---
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  });
});

// --- 14. Interactive Terminal & Context Menu ---
const runBtn = document.getElementById('runCodeBtn');
const terminalOutput = document.getElementById('terminalOutput');

// Create Context Menu Logic
let contextMenu = null;

function createContextMenu() {
  if (contextMenu) return;
  
  contextMenu = document.createElement('div');
  contextMenu.className = 'custom-context-menu';
  contextMenu.innerHTML = `
    <div class="menu-item" id="runErrorOption">⚠️ Simulate Error</div>
  `;
  document.body.appendChild(contextMenu);
  
  // Style is handled in CSS (we need to add it) or inline here for simplicity
  Object.assign(contextMenu.style, {
    position: 'absolute',
    background: '#09090b', // Darker bg like api window
    border: '1px solid var(--border-color)',
    borderColor: '#333',
    borderRadius: '6px',
    padding: '2px', // Compact padding
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    display: 'none',
    zIndex: '1000',
    minWidth: 'auto', // Auto width
    width: 'max-content', // Fit content
    fontSize: '0.75rem', // Match button text size
    fontFamily: 'var(--font-mono)', // Match font
    cursor: 'pointer'
  });

  const item = contextMenu.querySelector('.menu-item');
  Object.assign(item.style, {
    padding: '4px 8px', // Compact item padding
    color: '#ef4444', 
    borderRadius: '4px',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  });
  
  item.onmouseover = () => item.style.background = 'rgba(239, 68, 68, 0.1)';
  item.onmouseout = () => item.style.background = 'transparent';
  
  item.onclick = () => {
    runTerminal(true); // Run with error
    hideContextMenu();
  };
  
  // Hide on click elsewhere
  document.addEventListener('click', hideContextMenu);
}

function showContextMenu(e) {
  e.preventDefault();
  createContextMenu();
  
  contextMenu.style.display = 'block';
  contextMenu.style.left = `${e.pageX}px`;
  contextMenu.style.top = `${e.pageY}px`;
}

function hideContextMenu() {
  if (contextMenu) contextMenu.style.display = 'none';
}

function runTerminal(isError = false) {
  if (runBtn.textContent === 'Running...') return;
    
  runBtn.textContent = 'Running...';
  terminalOutput.style.display = 'block';
  terminalOutput.innerHTML = ''; 
  
  let logs = [];
  
  if (isError) {
     logs = [
      { text: '> Initializing instaScraper SDK...', delay: 100 },
      { text: '> Connecting to Apify Proxy (Residential)...', delay: 500 },
      { text: '> Target: Post @natgeo', delay: 1000 },
      { text: '> ⚠️ Connection Unstable. Retrying...', delay: 1800, type: 'info' },
      { text: '> Error: 429 Too Many Requests (Rate Limit)', delay: 2800, type: 'error' },
      { text: '> Switching Proxy Session...', delay: 3500 },
      { text: 'x Failed: Target is Private or Unavailable.', delay: 4500, type: 'error' }
    ];
  } else {
     logs = [
      { text: '> Initializing instaScraper SDK...', delay: 100 },
      { text: '> Connecting to Apify Proxy (Residential)...', delay: 600 },
      { text: '> Target: Post @natgeo (Type: Sidecar)', delay: 1200 },
      { text: '> Fetching metadata & child posts...', delay: 2000 },
      { text: '> Found 3 high-res images.', delay: 2800 },
      { text: '✓ Success! Data extracted.', delay: 3500, type: 'success' },
      { text: '[ "https://scontent-atl3-1.cdninstagram.com/v/...", "https://scontent-atl3-1.cdninstagram.com/v/..." ]', delay: 3600, type: 'info' }
    ];
  }

  logs.forEach(log => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = 'log-line';
      if (log.type === 'success') div.classList.add('log-success');
      if (log.type === 'info') div.classList.add('log-info');
      if (log.type === 'error') {
         div.style.color = '#ef4444'; // Red manually
      }
      div.textContent = log.text;
      terminalOutput.appendChild(div);
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }, log.delay);
  });

  setTimeout(() => {
    runBtn.textContent = '▶ Run';
  }, isError ? 4800 : 4500);
}

if (runBtn) {
  runBtn.addEventListener('click', () => runTerminal(false));
  runBtn.addEventListener('contextmenu', showContextMenu);
}

// --- Background Particles Animation (3D Space) ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let width, height;
let particles = [];

// Scroll state
let scrollY = window.scrollY;
let lastScrollY = scrollY;
let scrollSpeed = 0;

// Mouse state for parallax
let mouseX = 0;
let mouseY = 0;
let targetMouseX = 0;
let targetMouseY = 0;

window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
});

window.addEventListener('mousemove', (e) => {
  // Center-based coordinates for parallax
  targetMouseX = (e.clientX - window.innerWidth / 2) * 0.05; // Gentle sensitivity
  targetMouseY = (e.clientY - window.innerHeight / 2) * 0.05;
});

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

class Particle {
  constructor() {
    this.reset(true);
  }

  reset(randomY = false) {
    this.x = Math.random() * width;
    // If resetting randomly (start), any Y. If wrapping, usually top/bottom logic handled in update.
    this.y = randomY ? Math.random() * height : -50; 
    
    // Depth: 0.1 to 0.5 (Still background but closer)
    this.depth = Math.random() * 0.4 + 0.1;
    
    // Size: 1px to 2.5px (Visible but small)
    this.size = (this.depth * 3) + 0.8; 
    
    // Keep slow movement
    this.vx = (Math.random() - 0.5) * 0.1; 
    this.vy = (Math.random() - 0.5) * 0.1;
    
    // Base position
    this.universeY = Math.random() * height * 2; 
    
    // Opacity: 0.2 to 0.6 (Better visibility)
    this.baseAlpha = this.depth * 0.5 + 0.15; 
  }
  
  update() {
    this.x += this.vx;
    this.universeY += this.vy;
    
    // Horizontal wrapping
    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
  }
  
  draw(scrollVel, mX, mY) {
    // 3D Parallax Logic:
    // renderY = universeY - (scrollY * depth)
    // The closer the particle (high depth), the more it moves UP when we scroll DOWN.
    // This creates the sensation that the page content (foreground) is moving past static stars.
    
    let parallaxOffsetY = scrollY * this.depth;
    
    // Calculate render position with wrapping (Modulo)
    // We add 'height' to ensure positive result before modulo
    let effectiveY = this.universeY - parallaxOffsetY;
    let renderY = ((effectiveY % height) + height) % height;

    // Mouse Parallax (Opposite to mouse movement)
    let renderX = this.x - (mX * this.depth);
    renderX = ((renderX % width) + width) % width;

    // Safety check
    if (!Number.isFinite(renderX) || !Number.isFinite(renderY)) return;

    // Draw
    ctx.beginPath();
    
    // Motion Blur Stretch (Reduced)
    let stretch = Math.abs(scrollVel * this.depth * 0.2);
    let drawSize = Math.max(0.5, this.size);
    let radius = Math.max(0.1, drawSize);

    // Glow for close particles
    if (this.depth > 0.6) {
       // Softer gradient radius (x3 instead of x2)
       let g = ctx.createRadialGradient(renderX, renderY, 0, renderX, renderY, radius * 3);
       // Softer core color
       g.addColorStop(0, `rgba(255, 255, 255, ${this.baseAlpha * 0.8})`);
       g.addColorStop(1, `rgba(255, 255, 255, 0)`);
       ctx.fillStyle = g;
       ctx.fillRect(renderX - radius * 3, renderY - radius * 3 - stretch, radius * 6, (radius * 6) + stretch * 2);
    } else {
       // Simple circle for far ones
       ctx.fillStyle = `rgba(255, 255, 255, ${this.baseAlpha})`;
       if (stretch > 1) {
          ctx.ellipse(renderX, renderY, radius, radius + stretch, 0, 0, Math.PI*2);
       } else {
          ctx.arc(renderX, renderY, radius, 0, Math.PI * 2);
       }
       ctx.fill();
    }
  }
}

function initParticles() {
  resize();
  particles = [];
  const particleCount = Math.floor(window.innerWidth / 8); 
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, width, height);
  
  // Smooth mouse lerp
  mouseX += (targetMouseX - mouseX) * 0.1;
  mouseY += (targetMouseY - mouseY) * 0.1;
  
  // Scroll velocity calculation
  let currentScrollSpeed = scrollY - lastScrollY;
  scrollSpeed += (currentScrollSpeed - scrollSpeed) * 0.1;
  lastScrollY = scrollY;
  
  particles.forEach(p => {
    p.update();
    p.draw(scrollSpeed, mouseX, mouseY);
  });
  
  requestAnimationFrame(animateParticles);
}

window.addEventListener('resize', () => {
  resize();
  initParticles();
});

// Start
initParticles();
animateParticles();
