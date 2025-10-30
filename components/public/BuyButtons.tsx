import React from 'react';
import { useApp } from '../../context/AppContext';
import { trackEvent } from '../../services/analytics';
import { AMAZON_TAG_US, AMAZON_TAG_UK } from '../../constants';

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
    variant?: 'primary' | 'amazon';
}

const BuyButtons: React.FC<BuyButtonsProps> = ({ affiliateLink, productName, productCategory, variant = 'primary' }) => {
    const { preferredRegion } = useApp();

    const handleAffiliateClick = (region: 'US' | 'UK', url: string) => {
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

    const primaryIsUK = preferredRegion === 'UK' && ukLink;

    const primaryBtnClass = variant === 'amazon'
        ? 'inline-flex items-center justify-center gap-2 font-bold rounded-md px-4 py-3 shadow-sm bg-[#FFD814] text-black hover:bg-[#FFA41C] hover:text-white transition-colors'
        : 'btn-blueprint btn-blueprint--primary flex-1 justify-center py-3 text-base';

    const secondaryBtnClass = variant === 'amazon'
        ? 'inline-flex items-center justify-center gap-2 font-semibold rounded-md px-4 py-3 shadow-sm bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 transition-colors'
        : 'btn-blueprint flex-1 justify-center py-3 text-base';

    return (
        <div className={variant === 'amazon' ? 'flex flex-wrap gap-3' : 'flex flex-col sm:flex-row gap-3'}>
            <a 
                href={primaryIsUK ? ukLink : usLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={primaryBtnClass}
                onClick={() => handleAffiliateClick(primaryIsUK ? 'UK' : 'US', primaryIsUK ? ukLink : usLink)}
            >
                {variant === 'amazon' ? '🛒 Buy on Amazon' : `Buy on Amazon (${primaryIsUK ? 'UK' : 'US'})`}
            </a>
            {ukLink && (
                <a 
                    href={primaryIsUK ? usLink : ukLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={secondaryBtnClass}
                    onClick={() => handleAffiliateClick(primaryIsUK ? 'US' : 'UK', primaryIsUK ? usLink : ukLink)}
                >
                    {variant === 'amazon' ? `Buy on Amazon (${primaryIsUK ? 'US' : 'UK'})` : `Buy on Amazon (${primaryIsUK ? 'US' : 'UK'})`}
                </a>
            )}
        </div>
    );
};

export default BuyButtons;
