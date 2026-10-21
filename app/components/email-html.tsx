import { useState } from "react";

function buildDocument(html: string, allowRemoteImages: boolean): string {
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
          body {
            margin: 0;
            padding: 12px;
            font-family: sans-serif;
            font-size: 14px;
            color: #1a1a1a;
            background: #ffffff;
            overflow-wrap: anywhere;
          }

          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        ${cleaned}
      </body>
    </html>
  `;
}

export function EmailHtml({ html, loadImages = false }: { html: string; loadImages?: boolean; }) {
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
        srcDoc={buildDocument(html, remoteImages)}
      />
    </>
  )
}
