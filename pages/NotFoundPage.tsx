import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const NotFoundPage: React.FC = () => {
  const location = useLocation();

  return (
    <>
      <Helmet>
        <title>Page Not Found | RIGRATER</title>
        {/* Tell search engines not to index these old/invalid URLs */}
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white">404</h1>
        <p className="text-lg text-slate-300">
          We couldn&apos;t find anything at{' '}
          <span className="font-mono text-sky-300 break-all">
            {location.pathname}
          </span>
        </p>
        <p className="text-slate-400 max-w-md">
          This is probably an old link from the previous version of the site.
          Try heading back to the homepage to browse the latest builds, deals
          and reviews.
        </p>
        <Link
          to="/"
          className="btn-blueprint btn-blueprint--primary mt-4"
        >
          Go to homepage
        </Link>
      </div>
    </>
  );
};

export default NotFoundPage;


