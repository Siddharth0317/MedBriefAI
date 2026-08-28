import React from 'react';

/**
 * Footer Component
 * Minimal, subtle copyright and developer attribution footer.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="print:hidden mt-auto py-4 px-4 border-t border-slate-200/80 bg-white/40 text-center">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
        <div>
          <span>© {currentYear} MedBrief_AI. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span>Developed by</span>
          <span className="font-semibold text-slate-500 hover:text-cyan-700 transition">sid.dev</span>
        </div>
      </div>
    </footer>
  );
}
