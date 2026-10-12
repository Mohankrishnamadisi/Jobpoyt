import { supabase } from '../services/supabase';

const companyLogoAliases: Record<string, string> = {
  cisco: 'cisco.png',
  deloitte: 'deloitte.png',
  google: 'google.png',
  ibm: 'ibm.png',
  infosys: 'infosys.png',
  'jp morgan': 'JP-Morgan-Chase-Emblem.png',
  'jp morgan chase': 'JP-Morgan-Chase-Emblem.png',
  jpmorgan: 'JP-Morgan-Chase-Emblem.png',
  'jpmorgan chase': 'JP-Morgan-Chase-Emblem.png',
  persistent: 'persistent.png',
  'persistent systems': 'persistent.png',
  nttdata: 'Nttdata.jpg',
  'ntt data': 'Nttdata.jpg',
  mphasis: 'Mphasis.jpg',
  ltimindtree: 'Ltimindtree.jpg',
  'lti mindtree': 'Ltimindtree.jpg',
  oracle: 'oracle.png',
  sap: 'sap.jpg',
  genomines: 'GENOMINES.png',
  hypotos: 'Hypatos Gmbh.png',
  'hypotos gmbh': 'Hypatos Gmbh.png',
  'hypertrics gmph': 'Hypertrics GmbH.jpg',
  margo: 'MARGO.jpg',
  nuuenegy: 'Nuuenergy.png',
  platoapp: 'Platoapp.jpg',
  twice: 'TWAICE.jpg',
  capgemini: 'Capgemini.png',
};

const logoExtensions = ['png', 'jpg', 'jpeg'];

const getStorageLogoPath = (fileName: string) =>
  Array.from(fileName, (character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint <= 0x7e && codePoint >= 0x20
      ? character
      : `_u${codePoint.toString(16)}_`;
  }).join('');

const getStorageLogoUrl = (path: string) =>
  supabase.storage.from('logos').getPublicUrl(getStorageLogoPath(path)).data.publicUrl;

const getCandidateNames = (companyName: string) => {
  const normalizedCompanyName = companyName.toLowerCase().replace(/\s+/g, ' ');
  const aliasKey = Object.keys(companyLogoAliases).find(
    (alias) => normalizedCompanyName === alias || normalizedCompanyName.startsWith(`${alias} `),
  );

  return [...new Set([
    aliasKey ? companyLogoAliases[aliasKey] : companyName,
    companyName,
    normalizedCompanyName,
  ])];
};

export const getCompanyLogoCandidates = (companyName: string, logoUrl?: string | null) => {
  const providedUrl = String(logoUrl || '').trim();
  if (providedUrl) {
    const localLogoPath = providedUrl.match(/^\/logos\/(.+)$/);
    if (localLogoPath) {
      try {
        return [getStorageLogoUrl(decodeURIComponent(localLogoPath[1]))];
      } catch {
        return [getStorageLogoUrl(localLogoPath[1])];
      }
    }
    return [providedUrl];
  }

  const name = companyName.trim();
  if (!name) return [];

  const candidatePaths = getCandidateNames(name).flatMap((candidateName) =>
    candidateName.includes('.')
      ? [candidateName]
      : logoExtensions.map((extension) => `${candidateName}.${extension}`),
  );

  return [...new Set(candidatePaths)].map(getStorageLogoUrl);
};
