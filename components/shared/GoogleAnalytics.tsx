import React from 'react';
import { Helmet } from 'react-helmet-async';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

const GoogleAnalytics: React.FC = () => {
    // Only render the script in production and if the ID is set
    if (import.meta.env.MODE !== 'production' || !GA_MEASUREMENT_ID) {
        return null;
    }

    return (
        <Helmet>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}></script>
            <script>
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${GA_MEASUREMENT_ID}');
                `}
            </script>
        </Helmet>
    );
};

export default GoogleAnalytics;
