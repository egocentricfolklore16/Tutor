import React from "react";

const AuthLayout = ({ children }) => (
  <main className="auth-shell min-h-screen bg-white text-slate-900 lg:grid lg:grid-cols-2">
    <section className="relative flex min-h-screen flex-col px-6 py-7 sm:px-12 lg:px-16">
      <a href="/" className="flex w-fit items-center gap-3" aria-label="Hyper Tutor home">
        <img src="/logo3.png" alt="" className="h-10 w-10 object-contain" />
        <span className="text-lg font-bold tracking-tight text-slate-950">Hyper Tutor</span>
      </a>
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-[440px]">{children}</div>
      </div>
    </section>
    <section className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-100 to-cyan-100 px-8 py-12 text-emerald-950 lg:flex lg:flex-col lg:items-center lg:justify-center">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <span className="whitespace-nowrap text-[clamp(5rem,11vw,11rem)] font-black tracking-[-0.08em] text-emerald-900/[0.055]">Hyper Tutor</span>
      </div>
      <div className="relative z-10 flex max-w-lg flex-1 flex-col items-center justify-center text-center">
        <img src="/logo2.png" alt="Hyper Tutor mascot" className="mb-8 h-56 w-56 object-contain drop-shadow-xl" />
        <h2 className="max-w-md text-4xl font-black leading-tight tracking-tight text-emerald-950">Your study buddy is waiting.</h2>
        <p className="mt-4 max-w-sm text-base leading-7 text-emerald-900/70">Build better habits, understand difficult topics, and make every study session count.</p>
      </div>
      <div className="relative z-10 grid w-full max-w-lg grid-cols-3 gap-4 border-t border-emerald-900/10 pt-7 text-center">
        <div><strong className="block text-2xl font-black">50K+</strong><span className="text-xs font-semibold uppercase tracking-wider text-emerald-900/60">Students</span></div>
        <div><strong className="block text-2xl font-black">2M+</strong><span className="text-xs font-semibold uppercase tracking-wider text-emerald-900/60">Flashcards</span></div>
        <div><strong className="block text-2xl font-black">98%</strong><span className="text-xs font-semibold uppercase tracking-wider text-emerald-900/60">Satisfaction</span></div>
      </div>
    </section>
  </main>
);

export default AuthLayout;
