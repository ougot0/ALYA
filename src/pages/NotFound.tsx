import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';

export default function NotFound() {
  return (
    <section className="page-narrow">
      <Seo title="Page introuvable" />
      <p className="eyebrow">404</p>
      <h1>Cette page n’existe pas.</h1>
      <Link to="/boutique" className="link-arrow">Aller à la boutique</Link>
    </section>
  );
}
