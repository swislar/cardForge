// Card Textures & Typography Definitions for Card Forge

(function() {
  window.CARD_TEXTURES = [
    {
      id: 'smooth',
      name: 'Smooth Satin Cardstock',
      description: '310gsm German black-core cardstock with protective satin varnish',
      className: 'texture-smooth',
      previewGradient: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(0,0,0,0.12))'
    },
    {
      id: 'linen',
      name: 'Air-Cushion Linen',
      description: 'USPCC & Bicycle playing card dimpled cross-hatch linen finish',
      className: 'texture-linen',
      previewGradient: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, transparent 2px)'
    },
    {
      id: 'parchment',
      name: 'Ivory Vellum Paper',
      description: 'Warm tactile adventure-game cotton paper with natural fiber tooth',
      className: 'texture-parchment',
      previewGradient: 'linear-gradient(135deg, #d8cbaf, #bead8c)'
    },
    {
      id: 'carbon',
      name: 'Matte Soft-Touch Velvet',
      description: 'Modern Euro board game anti-glare velvet laminate cardstock',
      className: 'texture-carbon',
      previewGradient: 'linear-gradient(135deg, #1e2229, #2d333b)'
    },
    {
      id: 'gold',
      name: 'Gilded Gold Foil',
      description: 'Deluxe Kickstarter hot-stamped gold foil with specular metallic luster',
      className: 'texture-gold',
      previewGradient: 'linear-gradient(135deg, #f3cf7a, #c69234)'
    },
    {
      id: 'leather',
      name: 'Embossed Tome Leather',
      description: 'Rich grimoire calfskin grain with tactile debossed depth',
      className: 'texture-leather',
      previewGradient: 'linear-gradient(135deg, #442f1f, #281a10)'
    },
    {
      id: 'holographic',
      name: 'Deluxe Prismatic Foil',
      description: 'Refined metallic rainbow foil sheen with subtle directional glints',
      className: 'texture-holographic',
      previewGradient: 'linear-gradient(135deg, #fca5a5, #fde68a, #93c5fd, #c4b5fd)'
    },
    {
      id: 'cosmic',
      name: 'Starlight Nebula Dust',
      description: 'Deep celestial stardust dusting with fine metallic micro-flecks',
      className: 'texture-cosmic',
      previewGradient: 'radial-gradient(circle, #2a1435, #080914)'
    },
    {
      id: 'pearl',
      name: 'Lustrous Opal Pearl',
      description: 'Silky pearlescent cardstock with delicate iridescent nacre sheen',
      className: 'texture-pearl',
      previewGradient: 'linear-gradient(135deg, #f8fafc, #f1f5f9, #e2e8f0)'
    },
    {
      id: 'crystal',
      name: 'Cracked-Ice Prism',
      description: 'Faceted geometric crystal prism facets with light-catching shards',
      className: 'texture-crystal',
      previewGradient: 'linear-gradient(135deg, #e0f2fe, #bae6fd, #e0e7ff)'
    },
    {
      id: 'aurora',
      name: 'Emerald Aurora Foil',
      description: 'Luminous northern lights ribbons with atmospheric emerald and cyan glow',
      className: 'texture-aurora',
      previewGradient: 'linear-gradient(135deg, #34d399, #38bdf8, #818cf8)'
    },
    {
      id: 'prismatic',
      name: 'Radiant Sunburst Foil',
      description: 'High-intensity spectral metallic refraction with brilliant gleam',
      className: 'texture-prismatic',
      previewGradient: 'linear-gradient(135deg, #fb7185, #fbbf24, #38bdf8, #e879f9)'
    }
  ];

  window.AVAILABLE_FONTS = {
    title: [
      { id: 'Cinzel', name: 'Cinzel (Heroic Inscription)', family: "'Cinzel', serif" },
      { id: 'Cinzel Decorative', name: 'Cinzel Decorative (Regal Ornate)', family: "'Cinzel Decorative', serif" },
      { id: 'Cormorant Garamond', name: 'Cormorant (Renaissance Card)', family: "'Cormorant Garamond', serif" },
      { id: 'Marcellus', name: 'Marcellus (Classic Roman Titling)', family: "'Marcellus', serif" },
      { id: 'Playfair Display', name: 'Playfair Display (Vintage Serif)', family: "'Playfair Display', serif" },
      { id: 'EB Garamond', name: 'EB Garamond (Lore & Legend)', family: "'EB Garamond', serif" },
      { id: 'Outfit', name: 'Outfit (Modern Tabletop)', family: "'Outfit', sans-serif" },
      { id: 'Caveat', name: 'Caveat (Warm Script)', family: "'Caveat', cursive" }
    ],
    body: [
      { id: 'Outfit', name: 'Outfit (Modern Crisp Sans)', family: "'Outfit', sans-serif" },
      { id: 'EB Garamond', name: 'EB Garamond (Classic Lore Book)', family: "'EB Garamond', serif" },
      { id: 'Cormorant Garamond', name: 'Cormorant (Renaissance Elegance)', family: "'Cormorant Garamond', serif" },
      { id: 'Playfair Display', name: 'Playfair (Vintage Memoir)', family: "'Playfair Display', serif" },
      { id: 'Caveat', name: 'Caveat (Handwritten Letter)', family: "'Caveat', cursive" },
      { id: 'Inter', name: 'Inter (Clean Tabletop Rules)', family: "'Inter', sans-serif" }
    ]
  };
})();
