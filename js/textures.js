// Card Textures & Typography Definitions for Card Forge

(function() {
  window.CARD_TEXTURES = [
    {
      id: 'smooth',
      name: 'Smooth Cardstock',
      description: 'Crisp satin card with subtle clean sheen',
      className: 'texture-smooth',
      previewGradient: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(0,0,0,0.1))'
    },
    {
      id: 'holographic',
      name: 'Holo Rainbow Foil',
      description: 'Dynamic prismatic iridescence with tilt sheen',
      className: 'texture-holographic',
      previewGradient: 'linear-gradient(135deg, #ff9a9e, #fecfef, #a1c4fd, #c2e9fb)'
    },
    {
      id: 'parchment',
      name: 'Vintage Parchment',
      description: 'Warm antique deckled paper with vignette edges',
      className: 'texture-parchment',
      previewGradient: 'linear-gradient(135deg, #d7c49e, #c2ab7c)'
    },
    {
      id: 'cosmic',
      name: 'Cosmic Starlight',
      description: 'Deep celestial nebulae and glowing starfield',
      className: 'texture-cosmic',
      previewGradient: 'radial-gradient(circle, #301934, #0b0c16)'
    },
    {
      id: 'linen',
      name: 'Fine Linen Weave',
      description: 'Premium board-game crosshatch fabric weave',
      className: 'texture-linen',
      previewGradient: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, transparent 2px)'
    },
    {
      id: 'leather',
      name: 'Weathered Leather',
      description: 'Rich organic grain with embossed feel',
      className: 'texture-leather',
      previewGradient: 'linear-gradient(135deg, #4a3525, #2b1d14)'
    },
    {
      id: 'gold',
      name: 'Gold Leaf Foil',
      description: 'Regal gilded reflection with metallic luster',
      className: 'texture-gold',
      previewGradient: 'linear-gradient(135deg, #f6d365, #fda085)'
    },
    {
      id: 'carbon',
      name: 'Matte Carbon',
      description: 'Sleek high-tech diagonal carbon-fiber weave',
      className: 'texture-carbon',
      previewGradient: 'linear-gradient(135deg, #232526, #414345)'
    }
  ];

  window.AVAILABLE_FONTS = {
    title: [
      { id: 'Cinzel', name: 'Cinzel (Heroic Serif)', family: "'Cinzel', serif" },
      { id: 'Outfit', name: 'Outfit (Modern Sans)', family: "'Outfit', sans-serif" },
      { id: 'Playfair Display', name: 'Playfair (Editorial Serif)', family: "'Playfair Display', serif" },
      { id: 'Caveat', name: 'Caveat (Warm Handwritten)', family: "'Caveat', cursive" },
      { id: 'Orbitron', name: 'Orbitron (Futuristic Tech)', family: "'Orbitron', sans-serif" },
      { id: 'Inter', name: 'Inter (Clean Neutral)', family: "'Inter', sans-serif" }
    ],
    body: [
      { id: 'Outfit', name: 'Outfit (Default Sans)', family: "'Outfit', sans-serif" },
      { id: 'Inter', name: 'Inter (Clean Modern)', family: "'Inter', sans-serif" },
      { id: 'Playfair Display', name: 'Playfair (Classic Book)', family: "'Playfair Display', serif" },
      { id: 'Caveat', name: 'Caveat (Handwritten Note)', family: "'Caveat', cursive" }
    ]
  };
})();
