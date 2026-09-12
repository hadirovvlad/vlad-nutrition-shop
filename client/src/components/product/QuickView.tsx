import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { toast } from '@/store/toast';
import { Badge } from '@/components/ui/feedback';
import { Button } from '@/components/ui/Button';
import { Rating } from '@/components/ui/data';
import { Modal } from '@/components/ui/overlay';
import { ProductImage } from './ProductVisual';
import { PriceTag, StockStatus } from './PriceTag';
import { OptionPills, QuantityStepper } from './QuantityStepper';
import type { Product } from '@/types';

export function QuickView({
  product,
  open,
  onClose,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
}) {
  const addToCart = useCartStore((state) => state.add);

  const [weight, setWeight] = useState<string | null>(product.weights[0] ?? product.weight ?? null);
  const [flavor, setFlavor] = useState<string | null>(product.flavors[0] ?? product.flavor ?? null);
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    addToCart(product, { quantity, weight, flavor });
    toast.success('Товар додано в кошик ✓', product.name);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Швидкий перегляд" size="lg">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-line bg-ground">
          <div className="aspect-square w-full">
            <ProductImage
              src={product.image}
              name={product.name}
              slug={product.slug}
              form={product.form}
              categorySlug={product.category?.slug ?? null}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap gap-1.5">
            {product.discount > 0 ? <Badge tone="danger">−{product.discount}%</Badge> : null}
            {product.isNew ? <Badge tone="ink">Новинка</Badge> : null}
            {product.isBestseller ? <Badge tone="lime">Хіт</Badge> : null}
          </div>

          {product.brand ? (
            <p className="text-[11px] font-bold tracking-wider text-ink-faint uppercase">
              {product.brand.name}
            </p>
          ) : null}

          <h3 className="text-xl leading-tight font-extrabold text-ink">{product.name}</h3>

          {product.reviewCount > 0 ? (
            <Rating value={product.rating} showValue count={product.reviewCount} />
          ) : null}

          <PriceTag price={product.price} oldPrice={product.oldPrice} size="lg" />
          <StockStatus stock={product.stock} showCount />

          <p className="line-clamp-2-safe text-sm leading-relaxed text-ink-soft">
            {product.description}
          </p>

          <OptionPills label="Вага:" options={product.weights} value={weight} onChange={setWeight} />
          <OptionPills label="Смак:" options={product.flavors} value={flavor} onChange={setFlavor} />

          <div className="mt-1 flex items-center gap-3">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={Math.max(1, product.stock)}
            />
            <Button onClick={handleAdd} disabled={!product.inStock} className="flex-1">
              <ShoppingCart className="size-4" aria-hidden />
              В кошик
            </Button>
          </div>

          <Link
            to={`/product/${product.slug}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
          >
            Детальніше про товар
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </Modal>
  );
}
