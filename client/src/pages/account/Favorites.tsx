import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useDocumentMeta } from '@/hooks';
import { accountApi } from '@/services';
import { useAuth } from '@/store/auth';
import { useFavoritesStore } from '@/store/favorites';
import { ProductGrid } from '@/components/product/ProductCard';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, ProductGridSkeleton } from '@/components/ui/feedback';

export function AccountFavoritesPage() {
  useDocumentMeta('Обране');

  const { isAuthenticated } = useAuth();
  const localIds = useFavoritesStore((state) => state.ids);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['account', 'favorites'],
    queryFn: () => accountApi.favorites(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <EmptyState
        icon={<Heart className="size-6" aria-hidden />}
        title="Увійдіть, щоб зберігати обране"
        description={
          localIds.length > 0
            ? `У вас ${localIds.length} товар(ів) в обраному на цьому пристрої. Увійдіть, щоб вони збереглися в акаунті.`
            : 'Додавайте товари в обране, щоб не шукати їх наступного разу.'
        }
        action={<ButtonLink to="/login">Увійти</ButtonLink>}
      />
    );
  }

  if (isError) {
    return <ErrorState description="Не вдалося завантажити обране." onRetry={() => void refetch()} />;
  }

  if (isLoading) return <ProductGridSkeleton count={6} />;

  const products = data?.items ?? [];

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="size-6" aria-hidden />}
        title="В обраному поки нічого немає"
        description="Натисніть на серце на картці товару, щоб додати його сюди."
        action={<ButtonLink to="/catalog">Перейти до каталогу</ButtonLink>}
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-ink-muted">
        Товарів в обраному: <span className="font-bold text-ink">{products.length}</span>
      </p>
      <ProductGrid products={products} className="lg:grid-cols-3 xl:grid-cols-3" />
    </div>
  );
}
