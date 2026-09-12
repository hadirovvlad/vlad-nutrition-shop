import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { PublicLayout } from '@/layouts/PublicLayout';
import { GuestOnlyRoute, RoleRoute } from '@/components/auth/RoleRoute';
import { PageLoader } from '@/components/ui/feedback';

import { HomePage } from '@/pages/Home';
import { CatalogPage, NewArrivalsPage, SalePage } from '@/pages/Catalog';
import { ProductPage } from '@/pages/Product';
import { CartPage } from '@/pages/Cart';
import { CheckoutPage } from '@/pages/Checkout';
import { OrderSuccessPage } from '@/pages/OrderSuccess';
import { AboutPage, BrandsPage, NotFoundPage } from '@/pages/Static';

/**
 * Everything behind a sign-in is loaded on demand: a first-time shopper should
 * not download the admin panel to look at the catalogue.
 */
const AccountLayout = lazy(() =>
  import('@/layouts/AccountLayout').then((m) => ({ default: m.AccountLayout })),
);
const PanelLayout = lazy(() =>
  import('@/layouts/PanelLayout').then((m) => ({ default: m.PanelLayout })),
);

const LoginPage = lazy(() => import('@/pages/auth/Login').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('@/pages/auth/Register').then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/PasswordRecovery').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/PasswordRecovery').then((m) => ({ default: m.ResetPasswordPage })),
);

const AccountProfilePage = lazy(() =>
  import('@/pages/account/Profile').then((m) => ({ default: m.AccountProfilePage })),
);
const AccountOrdersPage = lazy(() =>
  import('@/pages/account/Orders').then((m) => ({ default: m.AccountOrdersPage })),
);
const AccountOrderDetailPage = lazy(() =>
  import('@/pages/account/Orders').then((m) => ({ default: m.AccountOrderDetailPage })),
);
const AccountFavoritesPage = lazy(() =>
  import('@/pages/account/Favorites').then((m) => ({ default: m.AccountFavoritesPage })),
);
const AccountAddressesPage = lazy(() =>
  import('@/pages/account/Addresses').then((m) => ({ default: m.AccountAddressesPage })),
);
const AccountSettingsPage = lazy(() =>
  import('@/pages/account/Settings').then((m) => ({ default: m.AccountSettingsPage })),
);

const PanelDashboardPage = lazy(() =>
  import('@/pages/panel/Dashboard').then((m) => ({ default: m.PanelDashboardPage })),
);
const PanelOrdersPage = lazy(() =>
  import('@/pages/panel/Orders').then((m) => ({ default: m.PanelOrdersPage })),
);
const PanelOrderDetailPage = lazy(() =>
  import('@/pages/panel/Orders').then((m) => ({ default: m.PanelOrderDetailPage })),
);
const PanelProductsPage = lazy(() =>
  import('@/pages/panel/Products').then((m) => ({ default: m.PanelProductsPage })),
);
const PanelProductFormPage = lazy(() =>
  import('@/pages/panel/ProductForm').then((m) => ({ default: m.PanelProductFormPage })),
);
const PanelCategoriesPage = lazy(() =>
  import('@/pages/panel/Taxonomy').then((m) => ({ default: m.PanelCategoriesPage })),
);
const PanelBrandsPage = lazy(() =>
  import('@/pages/panel/Taxonomy').then((m) => ({ default: m.PanelBrandsPage })),
);
const PanelCustomersPage = lazy(() =>
  import('@/pages/panel/Users').then((m) => ({ default: m.PanelCustomersPage })),
);
const PanelCustomerDetailPage = lazy(() =>
  import('@/pages/panel/Users').then((m) => ({ default: m.PanelCustomerDetailPage })),
);
const PanelManagersPage = lazy(() =>
  import('@/pages/panel/Users').then((m) => ({ default: m.PanelManagersPage })),
);
const PanelStockPage = lazy(() =>
  import('@/pages/panel/Stock').then((m) => ({ default: m.PanelStockPage })),
);
const PanelPromotionsPage = lazy(() =>
  import('@/pages/panel/Promotions').then((m) => ({ default: m.PanelPromotionsPage })),
);
const PanelReviewsPage = lazy(() =>
  import('@/pages/panel/Reviews').then((m) => ({ default: m.PanelReviewsPage })),
);
const PanelSettingsPage = lazy(() =>
  import('@/pages/panel/Settings').then((m) => ({ default: m.PanelSettingsPage })),
);

/**
 * Routes shared by the admin and manager panels. Both roles reach the same
 * screens; the admin-only ones are nested behind an extra RoleRoute so a
 * hand-typed /manager/settings redirects instead of rendering.
 */
function panelRoutes(base: '/admin' | '/manager') {
  return [
    <Route key="index" index element={<PanelDashboardPage base={base} />} />,
    <Route key="orders" path="orders" element={<PanelOrdersPage base={base} />} />,
    <Route key="order" path="orders/:id" element={<PanelOrderDetailPage base={base} />} />,
    <Route key="products" path="products" element={<PanelProductsPage base={base} />} />,
    <Route key="customers" path="customers" element={<PanelCustomersPage base={base} />} />,
    <Route
      key="customer"
      path="customers/:id"
      element={<PanelCustomerDetailPage base={base} />}
    />,
    <Route key="stock" path="stock" element={<PanelStockPage />} />,
    <Route key="promotions" path="promotions" element={<PanelPromotionsPage />} />,

    // Admin-only sections, gated again rather than merely hidden from the menu.
    <Route key="admin-only" element={<RoleRoute allow={['ADMIN']} />}>
      <Route path="products/new" element={<PanelProductFormPage base={base} />} />
      <Route path="products/:id" element={<PanelProductFormPage base={base} />} />
      <Route path="categories" element={<PanelCategoriesPage />} />
      <Route path="brands" element={<PanelBrandsPage />} />
      <Route path="managers" element={<PanelManagersPage />} />
      <Route path="reviews" element={<PanelReviewsPage />} />
      <Route path="settings" element={<PanelSettingsPage />} />
    </Route>,

    <Route key="fallback" path="*" element={<Navigate to={base} replace />} />,
  ];
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Storefront */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/catalog/:categorySlug" element={<CatalogPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/sale" element={<SalePage />} />
          <Route path="/new" element={<NewArrivalsPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/:number" element={<OrderSuccessPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Auth — redirects away when already signed in */}
        <Route element={<GuestOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Client account — every role may view their own account */}
        <Route element={<RoleRoute allow={['CLIENT', 'MANAGER', 'ADMIN']} />}>
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<AccountProfilePage />} />
            <Route path="orders" element={<AccountOrdersPage />} />
            <Route path="orders/:id" element={<AccountOrderDetailPage />} />
            <Route path="favorites" element={<AccountFavoritesPage />} />
            <Route path="addresses" element={<AccountAddressesPage />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>
        </Route>

        {/* Manager panel */}
        <Route element={<RoleRoute allow={['MANAGER', 'ADMIN']} />}>
          <Route path="/manager" element={<PanelLayout base="/manager" />}>
            {panelRoutes('/manager')}
          </Route>
        </Route>

        {/* Admin panel */}
        <Route element={<RoleRoute allow={['ADMIN']} />}>
          <Route path="/admin" element={<PanelLayout base="/admin" />}>
            {panelRoutes('/admin')}
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
