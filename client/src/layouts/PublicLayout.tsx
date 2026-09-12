import { Outlet } from 'react-router-dom';
import { useScrollToTop } from '@/hooks';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';

export function PublicLayout() {
  useScrollToTop();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* Bottom padding leaves room for the mobile bottom navigation. */}
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
