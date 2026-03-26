import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
 */
export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
                <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />

                {/*
                  Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
                  However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
                */}
                <ScrollViewStyleReset />

                {/* Force full-screen coverage on mobile browsers including safe areas */}
                <style dangerouslySetInnerHTML={{ __html: `
                  html, body {
                    background-color: #000000;
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    width: 100%;
                    height: 100%;
                  }
                  @media (prefers-color-scheme: light) {
                    html, body {
                      background-color: #ffffff;
                    }
                  }
                  #root {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                  }
                  @supports (height: 100dvh) {
                    html, body, #root {
                      height: 100dvh !important;
                      min-height: 100dvh !important;
                    }
                  }
                  @supports (padding-bottom: env(safe-area-inset-bottom)) {
                    body {
                      padding-bottom: 0 !important;
                    }
                    #root {
                      padding-bottom: env(safe-area-inset-bottom);
                      box-sizing: border-box;
                    }
                  }
                `}} />
            </head>
            <body>{children}</body>
        </html>
    );
}
