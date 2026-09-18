import React from 'react';
import { Helmet } from 'react-helmet-async';
import { siteConfig } from '@config/site';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  image?: string;
  type?: 'website' | 'article';
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

const normalizeCanonical = (value: string): string => {
  try {
    const parsed = new URL(value, siteConfig.url);
    return `${siteConfig.url}${parsed.pathname || '/'}`.replace(/([^:]\/)\/+$/, '$1');
  } catch {
    return siteConfig.url;
  }
};

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonical = typeof window !== 'undefined' ? `${siteConfig.url}${window.location.pathname}` : siteConfig.url,
  robots = 'index,follow',
  image = siteConfig.logo,
  type = 'website',
  structuredData,
}) => (
  <Helmet>
    {(() => {
      const normalizedCanonical = normalizeCanonical(canonical);
      return (
        <>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="robots" content={robots} />
    <link rel="canonical" href={normalizedCanonical} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={normalizedCanonical} />
    <meta property="og:type" content={type} />
    <meta property="og:image" content={image} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={image} />
    {structuredData && <script type="application/ld+json">{JSON.stringify(structuredData)}</script>}
        </>
      );
    })()}
  </Helmet>
);