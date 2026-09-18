export const siteConfig = {
  name: 'JobPoyt',
  url: 'https://jobpoyt.com',
  logo: 'https://jobpoyt.com/Jobpoyt.png',
  social: {
    instagramUrl: 'https://www.instagram.com/jobpoyt/',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61594381205043',
    linkedinUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
  },
};

export const knownSocialUrls = Object.values(siteConfig.social).filter(Boolean);