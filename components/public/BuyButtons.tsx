import React from 'react';
import { useApp } from '../../context/AppContext';
import { trackEvent } from '../../services/analytics';
import { AMAZON_TAG_US, AMAZON_TAG_UK, AMAZON_TAG_CA } from '../../constants';

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

interface BuyButtonsProps {
    affiliateLink: string;
    productName: string;
    productCategory: string;
}

const BuyButtons: React.FC<BuyButtonsProps> = ({ affiliateLink, productName, productCategory }) => {
    const { preferredRegion } = useApp();

    const handleAffiliateClick = (region: 'US' | 'UK' | 'CA', url: string) => {
        trackEvent('affiliate_click', {
            product_name: productName,
            product_category: productCategory,
            region,
            link_url: url,
            context: 'ProductPage'
        });
    };

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

    // Generate CA link
    let caLink = '';
    if (affiliateLink) {
        if (affiliateLink.includes('amazon.ca')) {
            caLink = enrichAmazonLink(affiliateLink, AMAZON_TAG_CA);
        } else {
            try {
                const url = new URL(affiliateLink);
                url.hostname = 'www.amazon.ca';
                caLink = enrichAmazonLink(url.toString(), AMAZON_TAG_CA);
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
                onClick={() => handleAffiliateClick(primaryIsUK ? 'UK' : 'US', primaryIsUK ? ukLink : usLink)}
            >
                Buy on Amazon ({primaryIsUK ? 'UK' : 'US'})
            </a>
            <a 
                href={primaryIsUK ? usLink : ukLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-blueprint flex-1 justify-center py-3 text-base"
                onClick={() => handleAffiliateClick(primaryIsUK ? 'US' : 'UK', primaryIsUK ? usLink : ukLink)}
            >
                Buy on Amazon ({primaryIsUK ? 'US' : 'UK'})
            </a>
            {caLink && (
                <a 
                    href={caLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-blueprint flex-1 justify-center py-3 text-base"
                    onClick={() => handleAffiliateClick('CA', caLink)}
                >
                    Buy on Amazon (CA)
                </a>
            )}
        </div>
    );
};

export default BuyButtons;
