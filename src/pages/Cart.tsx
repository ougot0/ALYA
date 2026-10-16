import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { DEMO, formatPrice, getProduct, settings } from '../data/catalog';
import { useCart } from '../lib/cart';

export default function Cart() {
  const { lines, subtotal, count, dispatch } = useCart();
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  const checkout = async () => {
    setState('loading');
    setError('');
    if (DEMO) {
      setState('error');
      setError('Aperçu : le paiement Stripe est désactivé. Sur le site déployé, ce bouton ouvre la page de paiement sécurisée.');
      return;
    }
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Le paiement est momentanément indisponible.');
      window.location.assign(data.url);
    } catch (e) {
      setState('error');
      setError(e instanceof TypeError ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : (e as Error).message);
    }
  };

  return (
    <section className="cart">
      <Seo title="Panier" />
      <header className="shop__head">
        <p className="eyebrow">Panier</p>
        <h1>{count ? `${count} article${count > 1 ? 's' : ''}` : 'Votre panier est vide'}</h1>
      </header>

      {!lines.length ? (
        <Link to="/boutique" className="link-arrow">Découvrir la boutique</Link>
      ) : (
        <div className="cart__layout">
          <ul className="cart__lines">
            {lines.map((l) => {
              const p = getProduct(l.slug);
              if (!p) return null;
              const key = `${l.slug}-${l.color}`;
              return (
                <li key={key} className="cart__line">
                  <Link to={`/produit/${p.slug}`} className="cart__img">
                    {p.images[0] && <img src={p.images[0].src} alt={p.images[0].alt} loading="lazy" />}
                  </Link>
                  <div className="cart__info">
                    <h2><Link to={`/produit/${p.slug}`}>{p.name}</Link></h2>
                    {l.color && <p>Couleur : {l.color}</p>}
                    <p>{formatPrice(p.price)} l’unité</p>
                    <div className="qty" role="group" aria-label={`Quantité de ${p.name}`}>
                      <button onClick={() => (l.qty > 1 ? dispatch({ type: 'set', slug: l.slug, color: l.color, qty: l.qty - 1 }) : dispatch({ type: 'remove', slug: l.slug, color: l.color }))} aria-label="Diminuer">−</button>
                      <input
                        type="number"
                        min={1}
                        max={p.stock ?? 20}
                        value={l.qty}
                        aria-label="Quantité"
                        onChange={(e) => dispatch({ type: 'set', slug: l.slug, color: l.color, qty: Math.min(p.stock ?? 20, Number(e.target.value)) })}
                      />
                      <button onClick={() => dispatch({ type: 'set', slug: l.slug, color: l.color, qty: Math.min(p.stock ?? 20, l.qty + 1) })} aria-label="Augmenter">+</button>
                    </div>
                  </div>
                  <p className="cart__total">{formatPrice((p.price ?? 0) * l.qty)}</p>
                  <button className="cart__remove" onClick={() => dispatch({ type: 'remove', slug: l.slug, color: l.color })}>
                    Retirer<span className="sr-only"> {p.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <aside className="cart__summary" aria-label="Récapitulatif">
            <dl>
              <div><dt>Sous-total</dt><dd>{formatPrice(subtotal)}</dd></div>
              <div><dt>Livraison</dt><dd>{settings.shippingInfo ? 'Calculée à l’étape suivante' : 'Calculée au paiement'}</dd></div>
            </dl>
            <p className="cart__legal">
              Le montant final est confirmé sur la page de paiement sécurisée Stripe. En continuant, vous acceptez les <Link to="/cgv">conditions générales de vente</Link>.
            </p>
            <button className="btn btn--solid btn--wide" onClick={checkout} disabled={state === 'loading'}>
              {state === 'loading' ? 'Redirection…' : 'Passer au paiement'}
            </button>
            {state === 'error' && <p className="form-error" role="alert">{error}</p>}
          </aside>
        </div>
      )}
    </section>
  );
}
