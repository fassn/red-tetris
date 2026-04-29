import type { NextPage } from 'next'
import Head from 'next/head'

import Welcome from "../components/welcome"
import Footer from "../components/footer"
import Navbar from "../components/navbar"

const Home: NextPage = () => {
    return (
        <div className='h-dvh flex flex-col overflow-hidden'>
            <Head>
                <title>Red Tetris</title>
                <meta name="description" content="A Typescript Implementation of Tetris" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <a href='#main-content' className='sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-surface-card focus:px-4 focus:py-2 focus:rounded-sm focus:shadow-xs'>
                Skip to content
            </a>

            <Navbar />

            <Welcome />

            <Footer />
        </div>
    )
}

export default Home
