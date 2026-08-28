import '../styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>MedBrief_AI | AI Patient Intake & Clinical Summarizer</title>
        <meta
          name="description"
          content="Transform messy patient records into doctor-ready pre-consultation SOAP briefings with AI and RAG."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen flex flex-col font-sans antialiased text-slate-900 bg-slate-50 selection:bg-cyan-500 selection:text-white">
        <Component {...pageProps} />
      </div>
    </>
  );
}
