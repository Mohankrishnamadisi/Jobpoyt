import React, { useState } from 'react';
import Avatar, { type AvatarProps } from '@mui/material/Avatar';
import { getCompanyLogoCandidates } from '@utils/companyLogo';

interface CompanyLogoAvatarProps extends Omit<AvatarProps, 'alt' | 'src'> {
  companyName: string;
  logoUrl?: string | null;
  alt?: string;
}

export const CompanyLogoAvatar: React.FC<CompanyLogoAvatarProps> = ({
  companyName,
  logoUrl,
  alt,
  children,
  ...avatarProps
}) => {
  const candidates = getCompanyLogoCandidates(companyName, logoUrl);
  const candidateKey = candidates.join('\n');
  const [logoState, setLogoState] = useState({ key: '', index: 0 });
  const candidateIndex = logoState.key === candidateKey ? logoState.index : 0;

  return (
    <Avatar
      {...avatarProps}
      src={candidates[candidateIndex]}
      alt={alt || (companyName ? `${companyName} logo` : 'Company logo')}
      imgProps={{
        onError: () => setLogoState((current) => ({
          key: candidateKey,
          index: current.key === candidateKey ? current.index + 1 : 1,
        })),
      }}
    >
      {children ?? companyName.trim().charAt(0).toUpperCase()}
    </Avatar>
  );
};
