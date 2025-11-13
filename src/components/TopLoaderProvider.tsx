"use client";

import NextTopLoader from "nextjs-toploader";

export function TopLoaderProvider() {
    return (
        <NextTopLoader
            color="#4A3A26"
            initialPosition={0.08}
            crawlSpeed={200}
            height={3}
            crawl={true}
            showSpinner={false}
            easing="ease"
            speed={200}
            shadow="0 0 10px #4A3A26,0 0 5px #4A3A26"
            zIndex={1600}
        />
    );
}
