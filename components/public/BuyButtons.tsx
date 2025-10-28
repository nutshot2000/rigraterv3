import React from 'react';
import { useApp } from '../context/AppContext';
import { AMAZON_TAG_US, AMAZON_TAG_UK } from '../constants';

const enrichAmazonLink = (url: string, tag: string): string => {
    if (!url || !tag) return url;
    try {
        const u = new URL(url);
        if (u.hostname.includes('amazon.')) {
            u.searchParams.set('tag', tag);
            return u.toString();
        }
    } catch {
        // Ignore invalid URLs
    }
    return url;
};

const BuyButtons: React.FC<{ affiliateLink: string }> = ({ affiliateLink }) => {
    const { preferredRegion } = useApp();

    // Generate US link
    const usLink = enrichAmazonLink(affiliateLink, AMAZON_TAG_US);

    // Generate UK link
    let ukLink = '';
    if (affiliateLink) {
        if (affiliateLink.includes('amazon.co.uk')) {
            ukLink = enrichAmazonLink(affiliateLink, AMAZON_TAG_UK);
        } else {
            try {
                const url = new URL(affiliateLink);
                url.hostname = 'www.amazon.co.uk';
                ukLink = enrichAmazonLink(url.toString(), AMAZON_TAG_UK);
            } catch {}
        }
    }

    const primaryIsUK = preferredRegion === 'UK' && ukLink;

    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <a 
                href={primaryIsUK ? ukLink : usLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-blueprint btn-blueprint--primary flex-1 justify-center py-3 text-base"
            >
                Buy on Amazon ({primaryIsUK ? 'UK' : 'US'})
            </a>
            <a 
                href={primaryIsUK ? usLink : ukLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-blueprint flex-1 justify-center py-3 text-base"
            >
                Buy on Amazon ({primaryIsUK ? 'US' : 'UK'})
            </a>
        </div>
    );
};

export default BuyButtons;
