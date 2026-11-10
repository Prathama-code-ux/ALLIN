import React from 'react';
import { Outlet } from 'react-router-dom';
import DesktopNav from './DesktopNav';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#080B0D] text-[#F3F6F6] flex flex-col relative overflow-x-hidden selection:bg-[#00E5D4]/20 selection:text-[#00E5D4]">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00E5D4]/5 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[300px] bg-[#087E78]/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Desktop Header Navigation */}
      <DesktopNav />

      {/* Main App Content Viewport */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12 relative z-10">
        <Outlet />
      </main>

      {/* Mobile App Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

