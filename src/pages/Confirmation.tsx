import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { useCart } from '../lib/cart';

type Status = 'loading' | 'paid' | 'unpaid' | 'error';

/** La commande n'est considérée payée que si Stripe le confirme côté serveur. */
export default function Confirmation() {
  const [params] = useSearchParams();
  const id = params.get('session_id');
  const { dispatch } = useCart();
  const [status, setStatus] = useState<Status>(id ? 'loading' : 'error');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/checkout-status?session_id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { paid: boolean; email: string | null }) => {
        setStatus(d.paid ? 'paid' : 'unpaid');
        setEmail(d.email);
        if (d.paid) dispatch({ type: 'clear' });
      })
      .catch(() => setStatus('error'));
  }, [id, dispatch]);

  return (
    <section className="page-narrow">
      <Seo title="Commande" />
      <p className="eyebrow">Commande</p>
      {status === 'loading' && <h1 aria-busy="true">Vérification du paiement…</h1>}
      {status === 'paid' && (
        <>
          <h1>Merci, votre commande est confirmée.</h1>
          <p>Le paiement a été validé par Stripe.{email && ` Un reçu est envoyé à ${email}.`}</p>
          <Link to="/boutique" className="link-arrow">Retour à la boutique</Link>
        </>
      )}
      {status === 'unpaid' && (
        <>
          <h1>Paiement non finalisé.</h1>
          <p>Aucun montant n’a été confirmé pour cette session. Votre panier est conservé.</p>
          <Link to="/panier" className="link-arrow">Retour au panier</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <h1>Impossible de vérifier la commande.</h1>
          <p>Si vous avez été débité, vous recevrez un reçu de Stripe par e-mail. Sinon, votre panier est conservé.</p>
          <Link to="/panier" className="link-arrow">Retour au panier</Link>
        </>
      )}
    </section>
  );
}
