import { Html, Head, Main, NextScript } from "next/document";
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Bebas+Neue&display=swap" rel="stylesheet" />
        <meta name="robots" content="noindex,nofollow" />
        <meta name="theme-color" content="#080808" />
      </Head>
      <body><Main /><NextScript /></body>
    </Html>
  );
}
