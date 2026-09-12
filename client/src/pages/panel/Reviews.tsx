import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, MessageSquareQuote, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { ApiError, mgmtApi } from '@/services';
import { toast } from '@/store/toast';
import { PanelHeader } from '@/layouts/PanelLayout';
import { Button } from '@/components/ui/Button';
import { Rating, Tabs } from '@/components/ui/data';
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { ConfirmDialog } from '@/components/ui/overlay';
import type { Review } from '@/types';

export function PanelReviewsPage() {
  useDocumentMeta('Відгуки — панель');

  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [deleting, setDeleting] = useState<Review | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'reviews', filter],
    queryFn: () => mgmtApi.reviews(filter),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['mgmt', 'reviews'] });
    void queryClient.invalidateQueries({ queryKey: ['product'] });
  };

  const approvalMutation = useMutation({
    mutationFn: ({ id, isApproved }: { id: number; isApproved: boolean }) =>
      mgmtApi.setReviewApproval(id, isApproved),
    onSuccess: (result) => {
      toast.success(result.item.isApproved ? 'Відгук опубліковано' : 'Відгук приховано');
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Не вдалося змінити відгук');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mgmtApi.deleteReview(id),
    onSuccess: () => {
      toast.success('Відгук видалено');
      setDeleting(null);
      invalidate();
    },
  });

  const reviews = data?.items ?? [];

  return (
    <div>
      <PanelHeader
        title="Відгуки"
        description="Приховані відгуки не впливають на рейтинг товару."
      />

      <Tabs
        tabs={[
          { value: 'all', label: 'Усі' },
          { value: 'approved', label: 'Опубліковані' },
          { value: 'pending', label: 'Приховані' },
        ]}
        active={filter}
        onChange={setFilter}
        className="mb-4"
      />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquareQuote className="size-6" aria-hidden />}
          title="Відгуків немає"
          description="Тут з’являться відгуки, які залишають клієнти на сторінках товарів."
        />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Rating value={review.rating} size="sm" showValue />
                    <span className="text-[13px] font-bold text-ink">
                      {review.author?.name ?? 'Покупець'}
                    </span>
                    <span className="text-[12px] text-ink-faint">
                      {formatDateTime(review.createdAt)}
                    </span>
                    {review.isApproved ? (
                      <Badge tone="ok">Опубліковано</Badge>
                    ) : (
                      <Badge tone="muted">Приховано</Badge>
                    )}
                  </div>

                  {review.product ? (
                    <Link
                      to={`/product/${review.product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 block text-[13px] font-semibold text-ink-muted hover:text-ink hover:underline"
                    >
                      {review.product.name}
                    </Link>
                  ) : null}
                </div>

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      approvalMutation.mutate({ id: review.id, isApproved: !review.isApproved })
                    }
                  >
                    {review.isApproved ? (
                      <>
                        <EyeOff className="size-3.5" aria-hidden />
                        Приховати
                      </>
                    ) : (
                      <>
                        <Eye className="size-3.5" aria-hidden />
                        Опублікувати
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleting(review)}
                    aria-label="Видалити відгук"
                    className="flex size-9 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{review.text}</p>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Видалити відгук?"
        description="Відгук буде видалено безповоротно, а рейтинг товару перерахується."
        confirmLabel="Видалити"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
