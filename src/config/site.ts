export const siteConfig = {
  name: 'JobPoyt',
  url: 'https://jobpoyt.com',
  logo: 'https://jobpoyt.com/Jobpoyt.png',
  social: {
    instagramUrl: '',
    facebookUrl: '',
    linkedinUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
  },
};

export const knownSocialUrls = Object.values(siteConfig.social).filter(Boolean);