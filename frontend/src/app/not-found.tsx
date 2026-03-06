"use client"

import Link from "next/link"
import { Shield, Home } from "lucide-react"

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[var(--color-base-bg)] flex flex-col items-center justify-center p-4 text-center">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-[var(--color-brand-primary)]/20 blur-[60px] rounded-full animate-float" />
                <div className="relative bg-[var(--color-base-panel)]/40 backdrop-blur-md p-10 rounded-[3rem] border border-[var(--color-brand-primary)]/20 shadow-2xl">
                    <Shield className="w-24 h-24 text-[var(--color-brand-primary)] drop-shadow-lg" />
                </div>
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-[var(--color-base-text)] mb-4 tracking-tighter">404</h1>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-base-text)] mb-6">Page Not Found</h2>
            <p className="text-[var(--color-base-muted)] max-w-md mb-10 text-lg font-medium leading-relaxed">
                It seems you've wandered into an unsecured zone. Don't worry, our shields are still up—let's get you back to safety.
            </p>

            <Link
                href="/"
                className="flex items-center gap-2 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-[var(--color-brand-primary)]/20 hover:-translate-y-1 active:translate-y-0"
            >
                <Home className="w-5 h-5" />
                Return Home
            </Link>
        </div>
    )
}
