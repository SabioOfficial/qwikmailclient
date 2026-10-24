import { useState } from "react";

export type EmailMode = "light" | "dark" | "auto";

function themeCss(mode: EmailMode): string {
  if (mode === "dark") {
    return `
      :root {
        --email-bg: #e5e5e5;
      }

      html {
        filter: invert(1) hue-rotate(180deg);
      }

      img, video, picture {
        filter: invert(1) hue-rotate(180deg);
      }
    `;
  }
  if (mode === "auto") {
    return `
      @media (prefers-color-scheme: dark) {
        :root {
          --email-bg: #e5e5e5;
        }

        html {
          filter: invert(1) hue-rotate(180deg);
        }

        img, video, picture {
          filter: invert(1) hue-rotate(180deg);
        }
      }
    `;
  }
  return "";
}

function buildDocument(html: string, allowRemoteImages: boolean, mode: EmailMode): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<base[^>]*>/gi, "");

  const imgSrc = allowRemoteImages ? "img-src data: https: http:" : "img-src data:";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; ${imgSrc}; style-src 'unsafe-inline'; font-src data:">
        <base target="_blank">
        <style>
          :root {
            color-scheme: light;
            --email-bg: #ffffff;
            --email-fg: #1a1a1a;
          }

          html {
            background: var(--email-bg);
          }

          body {
            margin: 0;
            padding: 12px;
            font-family: sans-serif;
            font-size: 14px;
            color: var(--email-fg);
            background: var(--email-bg);
            overflow-wrap: anywhere;
          }

          img {
            max-width: 100%;
            height: auto;
          }

          ${themeCss(mode)}
        </style>
      </head>
      <body>
        ${cleaned}
      </body>
    </html>
  `;
}

export function EmailHtml({ html, loadImages = false, mode = "light" }: { html: string; loadImages?: boolean; mode?: EmailMode }) {
  const [remoteImages, setRemoteImages] = useState(loadImages);

  return (
    <>
      {!remoteImages ? (
        <p className="remote-note">
          Remote images are blocked.{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => setRemoteImages(true)}
          >
            Load Images
          </button>
        </p>
      ) : null}
      <iframe
        title="Email content"
        className="message-html"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        srcDoc={buildDocument(html, remoteImages, mode)}
      />
    </>
  )
}
