import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useI18nStore } from '@/stores/i18n';

const SUPPORTED_LOCALES = ['es', 'en'];
const DEFAULT_LOCALE = 'es';

const publicRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'home',
    component: () => import('@/features/home/HomeView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: 'search',
    name: 'search',
    component: () => import('@/features/search/SearchView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: 'property/:id',
    name: 'property-detail',
    component: () => import('@/features/properties/PropertyDetailView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: 'profile',
    name: 'profile',
    component: () => import('@/features/profile/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'favorites',
    name: 'favorites',
    component: () => import('@/features/favorites/FavoritesView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: 'bookings',
    name: 'my-bookings',
    component: () => import('@/features/bookings/MyBookingsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'bookings/:id',
    name: 'booking-detail',
    component: () => import('@/features/bookings/BookingDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'bookings/:bookingId/payment',
    name: 'payment',
    component: () => import('@/features/payments/WompiCheckout.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'bookings/:bookingId/payment-success',
    name: 'payment-success',
    component: () => import('@/features/payments/PaymentSuccessView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'bookings/:bookingId/payment-failed',
    name: 'payment-failed',
    component: () => import('@/features/payments/PaymentFailedView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'panel',
    name: 'host-panel',
    component: () => import('@/features/host-panel/HostDashboardView.vue'),
    meta: { requiresAuth: true, requiredRole: 'host' },
  },
  {
    path: 'panel/property/:propertyId/bookings',
    name: 'property-bookings',
    component: () => import('@/features/bookings/PropertyBookingsView.vue'),
    meta: { requiresAuth: true, requiredRole: 'host' },
  },
  {
    path: 'panel/calendar',
    name: 'host-calendar',
    component: () => import('@/features/host-panel/HostCalendarView.vue'),
    meta: { requiresAuth: true, requiredRole: 'host' },
  },
  {
    path: 'panel/bookings',
    name: 'host-bookings',
    component: () => import('@/features/host-panel/HostBookingsView.vue'),
    meta: { requiresAuth: true, requiredRole: 'host' },
  },
  {
    path: 'panel/finances',
    name: 'host-finances',
    component: () => import('@/features/host-panel/HostFinancesView.vue'),
    meta: { requiresAuth: true, requiredRole: 'host' },
  },
  {
    path: 'panel/payouts',
    name: 'host-payouts',
    component: () => import('@/features/payouts/PayoutsView.vue'),
    meta: { requiresAuth: true, requiredRole: 'host' },
  },
  {
    path: 'panel/property/:id/ical',
    name: 'property-ical',
    component: () => import('@/features/ical/IcalLinksView.vue'),
    meta: { requiresAuth: true, requiredRole: 'host' },
  },
];

const adminRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'admin',
    component: () => import('@/features/admin/AdminDashboardView.vue'),
    meta: { requiresAuth: true, requiredRole: 'admin' },
  },
  {
    path: 'host-approvals',
    name: 'admin-host-approvals',
    component: () => import('@/features/admin/HostApprovalsView.vue'),
    meta: { requiresAuth: true, requiredRole: 'admin' },
  },
  {
    path: 'payouts',
    name: 'admin-payouts',
    component: () => import('@/features/admin/AdminPayoutsView.vue'),
    meta: { requiresAuth: true, requiredRole: 'admin' },
  },
  {
    path: 'reports/commissions',
    name: 'admin-commission-report',
    component: () => import('@/features/admin/CommissionReportView.vue'),
    meta: { requiresAuth: true, requiredRole: 'admin' },
  },
  {
    path: 'users',
    name: 'admin-users',
    component: () => import('@/features/admin/AdminUsersView.vue'),
    meta: { requiresAuth: true, requiredRole: 'admin' },
  },
  {
    path: 'settings',
    name: 'admin-settings',
    component: () => import('@/features/admin/AdminSettingsView.vue'),
    meta: { requiresAuth: true, requiredRole: 'admin' },
  },
  {
    path: 'queues',
    name: 'admin-queues',
    component: () => import('@/features/admin/QueueMonitorView.vue'),
    meta: { requiresAuth: true, requiredRole: 'admin' },
  },
];

const routes: RouteRecordRaw[] = [
  // Locale-prefixed public routes
  {
    path: '/:locale',
    children: publicRoutes,
  },
  // Admin routes (Spanish only, no locale prefix)
  {
    path: '/admin',
    children: adminRoutes,
  },
  // Catch-all redirect to default locale
  {
    path: '/',
    redirect: `/${DEFAULT_LOCALE}`,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: `/${DEFAULT_LOCALE}`,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Locale validation and i18n sync
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();
  const i18nStore = useI18nStore();

  // Extract locale from params
  const locale = to.params.locale as string;

  if (locale && SUPPORTED_LOCALES.includes(locale)) {
    // Valid locale - update i18n store
    i18nStore.setLocale(locale);
  } else if (!to.path.startsWith('/admin') && locale) {
    // Invalid locale in URL - redirect to default
    const newPath = to.path.replace(`/${locale}`, `/${DEFAULT_LOCALE}`) || `/${DEFAULT_LOCALE}`;
    next({ path: newPath, query: to.query });
    return;
  }

  // Auth guard
  if (to.meta.requiresAuth) {
    if (!authStore.user) {
      await authStore.checkSession();
    }

    if (!authStore.user) {
      next({ name: 'home', params: { locale: i18nStore.locale } });
      return;
    }

    if (to.meta.requiredRole && authStore.user.role !== to.meta.requiredRole) {
      if (authStore.user.role !== 'admin') {
        next({ name: 'profile', params: { locale: i18nStore.locale } });
        return;
      }
    }
  }

  next();
});

export default router;
export { SUPPORTED_LOCALES, DEFAULT_LOCALE };
