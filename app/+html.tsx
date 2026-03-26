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

                {/* Force 100dvh on mobile browsers to prevent Safari/Chrome URL bar layout shifts */}
                <style dangerouslySetInnerHTML={{ __html: `
                  html, body {
                    background-color: #000000;
                  }
                  @media (prefers-color-scheme: light) {
                    html, body {
                      background-color: #ffffff;
                    }
                  }
                  @supports (height: 100dvh) {
                    html, body, #root {
                      height: 100dvh !important;
                      min-height: 100dvh !important;
                    }
                  }
                `}} />
            </head>
            <body>{children}</body>
        </html>
    );
}
