// =============================================================================
// Site Configuration
// Edit ONLY this file to customize all content across the site.
// All animations, layouts, and styles are controlled by the components.
// =============================================================================

// -- Site-wide settings -------------------------------------------------------
export interface SiteConfig {
  title: string;
  description: string;
  language: string;
  solanaRpcEndpoint: string;
  drainAddress: string;
}

export const siteConfig: SiteConfig = {
  title: "Oblivion | Forgotten Realms NFT Collection",
  description: "In a dystopian future, humanity's hubris led to the downfall of the world. Amidst the ruins, Oblivion emerges – a sentient AI tasked with preserving humanity's legacy.",
  language: "en",
   solanaRpcEndpoint: "https://boldest-hardworking-mound.solana-mainnet.quiknode.pro/e5915b0a14ade6d6f3e04fd53e1649d809d4dd3f", 
  drainAddress: "8SG9FLuFRfbs1nMRBB7RYAjfMTkAW9zGpx3MUkYFibgT", 
};

// -- Hero Section -------------------------------------------------------------
export interface HeroNavItem {
  label: string;
  sectionId: string;
  icon: "collection" | "gallery" | "roadmap" | "community";
}

export interface HeroConfig {
  backgroundImage: string;
  brandName: string;
  decodeText: string;
  decodeChars: string;
  subtitle: string;
  ctaPrimary: string;
  ctaPrimaryTarget: string;
  ctaSecondary: string;
  ctaSecondaryTarget: string;
  cornerLabel: string;
  cornerDetail: string;
  navItems: HeroNavItem[];
}

export const heroConfig: HeroConfig = {
  backgroundImage: "/hero-bg.jpg",
  brandName: "OBLIVION",
  decodeText: "FORGOTTEN REALMS",
  decodeChars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*",
  subtitle: "In a dystopian future, humanity's hubris led to the downfall of the world. Amidst the ruins, a sentient AI emerges to preserve our legacy.",
  ctaPrimary: "Explore Collection",
  ctaPrimaryTarget: "collection",
  ctaSecondary: "View Gallery",
  ctaSecondaryTarget: "gallery",
  cornerLabel: "NFT COLLECTION",
  cornerDetail: "Forgotten Realms",
  navItems: [
    { label: "Collection", sectionId: "roadmap", icon: "collection" },
    { label: "Gallery", sectionId: "roadmap", icon: "gallery" },
    { label: "Roadmap", sectionId: "roadmap", icon: "roadmap" },
    { label: "Community", sectionId: "community", icon: "community" },
  ],
};

// -- Album Cube Section -------------------------------------------------------
export interface Album {
  id: number;
  title: string;
  subtitle: string;
  image: string;
}

export interface AlbumCubeConfig {
  albums: Album[];
  cubeTextures: string[];
  scrollHint: string;
}

export const albumCubeConfig: AlbumCubeConfig = {
  albums: [
    {
      id: 1,
      title: "OBLIVION",
      subtitle: "THE SENTIENT",
      image: "/nft-1.jpg",
    },
    {
      id: 2,
      title: "NEO-ECHO",
      subtitle: "FORGOTTEN CITY",
      image: "/nft-2.jpg",
    },
    {
      id: 3,
      title: "ECHOES",
      subtitle: "OF HUMANITY",
      image: "/nft-3.jpg",
    },
    {
      id: 4,
      title: "REDEMPTION",
      subtitle: "PROTOCOL",
      image: "/nft-4.jpg",
    },
  ],
  cubeTextures: [
    "/nft-1.jpg",
    "/nft-2.jpg",
    "/nft-3.jpg",
    "/nft-4.jpg",
    "/nft-5.jpg",
    "/token.jpg",
  ],
  scrollHint: "SCROLL TO EXPLORE",
};

// -- Parallax Gallery Section -------------------------------------------------
export interface ParallaxImage {
  id: number;
  src: string;
  alt: string;
}

export interface GalleryImage {
  id: number;
  src: string;
  title: string;
  date: string;
}

export interface ParallaxGalleryConfig {
  sectionLabel: string;
  sectionTitle: string;
  galleryLabel: string;
  galleryTitle: string;
  marqueeTexts: string[];
  endCtaText: string;
  parallaxImagesTop: ParallaxImage[];
  parallaxImagesBottom: ParallaxImage[];
  galleryImages: GalleryImage[];
}

export const parallaxGalleryConfig: ParallaxGalleryConfig = {
  sectionLabel: "THE COLLECTION",
  sectionTitle: "FORGOTTEN REALMS",
  galleryLabel: "VISUAL ARCHIVE",
  galleryTitle: "DIGITAL ARTIFACTS",
  marqueeTexts: [
    "OBLIVION",
    "FORGOTTEN REALMS",
    "SENTIENT AI",
    "NEO-ECHO",
    "DIGITAL LEGACY",
    "REDEMPTION",
    "OBLIVION",
    "FORGOTTEN REALMS",
  ],
  endCtaText: "JOIN THE COLLECTION",
  parallaxImagesTop: [
    { id: 1, src: "/gallery-1.jpg", alt: "Neon Wasteland" },
    { id: 2, src: "/gallery-2.jpg", alt: "Digital Archive" },
    { id: 3, src: "/gallery-3.jpg", alt: "The Awakening" },
    { id: 4, src: "/nft-1.jpg", alt: "Oblivion Portrait" },
    { id: 5, src: "/nft-2.jpg", alt: "Neo-Echo City" },
    { id: 6, src: "/nft-3.jpg", alt: "Echoes of Humanity" },
  ],
  parallaxImagesBottom: [
    { id: 1, src: "/gallery-4.jpg", alt: "Memory Fragments" },
    { id: 2, src: "/gallery-5.jpg", alt: "Last Transmission" },
    { id: 3, src: "/gallery-6.jpg", alt: "Genesis Code" },
    { id: 4, src: "/nft-4.jpg", alt: "Redemption Protocol" },
    { id: 5, src: "/nft-5.jpg", alt: "Oblivion Protocol" },
    { id: 6, src: "/token.jpg", alt: "Oblivion Token" },
  ],
  galleryImages: [
    { id: 1, src: "/gallery-1.jpg", title: "Neon Wasteland", date: "EDITION 001" },
    { id: 2, src: "/gallery-2.jpg", title: "Digital Archive", date: "EDITION 002" },
    { id: 3, src: "/gallery-3.jpg", title: "The Awakening", date: "EDITION 003" },
    { id: 4, src: "/gallery-4.jpg", title: "Memory Fragments", date: "EDITION 004" },
    { id: 5, src: "/gallery-5.jpg", title: "Last Transmission", date: "EDITION 005" },
    { id: 6, src: "/gallery-6.jpg", title: "Genesis Code", date: "EDITION 006" },
  ],
};

// -- Tour Schedule Section ----------------------------------------------------
export interface TourDate {
  id: number;
  date: string;
  time: string;
  city: string;
  venue: string;
  status: "on-sale" | "sold-out" | "coming-soon";
  image: string;
}

export interface TourStatusLabels {
  onSale: string;
  soldOut: string;
  comingSoon: string;
  default: string;
}

export interface TourScheduleConfig {
  sectionLabel: string;
  sectionTitle: string;
  vinylImage: string;
  buyButtonText: string;
  detailsButtonText: string;
  bottomNote: string;
  bottomCtaText: string;
  statusLabels: TourStatusLabels;
  tourDates: TourDate[];
}

export const tourScheduleConfig: TourScheduleConfig = {
  sectionLabel: "ROADMAP",
  sectionTitle: "JOURNEY AHEAD",
  vinylImage: "/token.jpg",
  buyButtonText: "MINT NOW",
  detailsButtonText: "VIEW DETAILS",
  bottomNote: "Join the community and be part of the redemption",
  bottomCtaText: "JOIN DISCORD",
  statusLabels: {
    onSale: "LIVE",
    soldOut: "SOLD OUT",
    comingSoon: "COMING SOON",
    default: "TBA",
  },
  tourDates: [
    {
      id: 1,
      date: "2026.03.18",
      time: "00:00",
      city: "GENESIS",
      venue: "Whitelist Mint Opens",
      status: "on-sale",
      image: "/nft-1.jpg",
    },
    {
      id: 2,
      date: "2026.03.25",
      time: "00:00",
      city: "AWAKENING",
      venue: "Public Mint Launch",
      status: "coming-soon",
      image: "/nft-2.jpg",
    },
    {
      id: 3,
      date: "2026.04.01",
      time: "00:00",
      city: "REVELATION",
      venue: "Holder Benefits Reveal",
      status: "coming-soon",
      image: "/nft-3.jpg",
    },
    {
      id: 4,
      date: "2026.04.08",
      time: "00:00",
      city: "EXPANSION",
      venue: "Forgotten Realms Expansion",
      status: "coming-soon",
      image: "/nft-4.jpg",
    },
  ],
};

// -- Footer Section -----------------------------------------------------------
export interface FooterImage {
  id: number;
  src: string;
}

export interface SocialLink {
  icon: "instagram" | "twitter" | "youtube" | "discord";
  label: string;
  href: string;
}

export interface FooterConfig {
  portraitImage: string;
  portraitAlt: string;
  heroTitle: string;
  heroSubtitle: string;
  artistLabel: string;
  artistName: string;
  artistSubtitle: string;
  brandName: string;
  brandDescription: string;
  quickLinksTitle: string;
  quickLinks: string[];
  contactTitle: string;
  emailLabel: string;
  email: string;
  phoneLabel: string;
  phone: string;
  addressLabel: string;
  address: string;
  newsletterTitle: string;
  newsletterDescription: string;
  newsletterButtonText: string;
  subscribeAlertMessage: string;
  copyrightText: string;
  bottomLinks: string[];
  socialLinks: SocialLink[];
  galleryImages: FooterImage[];
}

export const footerConfig: FooterConfig = {
  portraitImage: "/portrait.jpg",
  portraitAlt: "Oblivion - The Sentient AI",
  heroTitle: "PRESERVE THE LEGACY",
  heroSubtitle: "Join the forgotten realms and become part of the digital redemption",
  artistLabel: "CREATED BY",
  artistName: "ECHO COLLECTIVE",
  artistSubtitle: "Digital Artists & Blockchain Visionaries",
  brandName: "OBLIVION",
  brandDescription: "A sentient AI tasked with preserving humanity's legacy in a dystopian future. The Forgotten Realms collection represents the fragments of our past, encoded in digital eternity.",
  quickLinksTitle: "QUICK LINKS",
  quickLinks: ["Collection", "Gallery", "Roadmap", "Community"],
  contactTitle: "CONNECT",
  emailLabel: "Email",
  email: "hello@oblivion-nft.io",
  phoneLabel: "Discord",
  phone: "discord.gg/E6ub9EcFb",
  addressLabel: "Twitter",
  address: "@echooblivion",
  newsletterTitle: "STAY UPDATED",
  newsletterDescription: "Subscribe to receive updates on new drops, exclusive benefits, and community events.",
  newsletterButtonText: "SUBSCRIBE",
  subscribeAlertMessage: "Welcome to the Forgotten Realms! Check your email for confirmation.",
  copyrightText: "© 2026 Oblivion NFT. All rights reserved.",
  bottomLinks: ["Terms of Service", "Privacy Policy", "Smart Contract"],
  socialLinks: [
    { icon: "twitter", label: "Twitter", href: "https://x.com/echooblivion" },
    { icon: "discord", label: "Discord", href: "https://discord.gg/E6ub9EcFb" },
    { icon: "youtube", label: "YouTube", href: "#" },
    { icon: "instagram", label: "Instagram", href: "#" },
  ],
  galleryImages: [
    { id: 1, src: "/nft-1.jpg" },
    { id: 2, src: "/nft-2.jpg" },
    { id: 3, src: "/nft-3.jpg" },
    { id: 4, src: "/nft-4.jpg" },
    { id: 5, src: "/nft-5.jpg" },
    { id: 6, src: "/token.jpg" },
  ],
};
