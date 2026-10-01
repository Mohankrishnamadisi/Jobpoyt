export const siteConfig = {
  name: 'JobPoyt',
  url: 'https://jobpoyt.com',
  logo: 'https://jobpoyt.com/Jobpoyt.png',
  // Seller details printed on subscription invoices; leave blank to omit a line.
  billing: {
    legalName: 'JobPoyt',
    email: 'info@jobpoyt.com',
    website: 'www.jobpoyt.com',
    address: '',
    gstin: '',
    pan: '',
  },
  social: {
    instagramUrl: 'https://www.instagram.com/jobpoyt/',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61594381205043',
    linkedinUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
  },
};

export const knownSocialUrls = Object.values(siteConfig.social).filter(Boolean);