import { Footer, Layout, Navbar } from "nextra-theme-docs";
import "nextra-theme-docs/style.css";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";

export const metadata = {
  // Define your metadata here
  // For more information on metadata API, see: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
};

// const banner = <Banner storageKey="some-key">Nextra 4.0 is released 🎉</Banner>
const navbar = (
  <Navbar
    logo={<b>Translations</b>}
    // ... Your additional navbar options
  />
);
const footer = <Footer>Built with Nextra.</Footer>;

export default async function RootLayout({ children }) {
  return (
    <html
      // Not required, but good for SEO
      lang="ja"
      // Required to be set
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
    >
      <Head
      // ... Your additional head options
      >
        {/* Your additional tags should be passed as `children` of `<Head>` element */}
      </Head>
      <body>
        <Layout
          // banner={banner}
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/MToyokura/translations/tree/main"
          footer={footer}
          // ... Your additional layout options
          feedback={{
            content: null,
          }}
          // lastUpdated={<LastUpdated date={null} />} // Doesn't work
          editLink="このページを編集する"
          toc={{
            title: "目次",
            backToTop: "ページの先頭へ戻る",
          }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
