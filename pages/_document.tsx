import { Html, Head, Main, NextScript } from 'next/document'

// Runs before paint — reads localStorage (or system preference) and sets/removes the dark class to prevent FOUC.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else if(!t&&window.matchMedia&&!window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.remove('dark')}}catch(e){}})()`

export default function Document() {
    return (
        <Html lang="en" className='dark'>
            <Head>
                <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
