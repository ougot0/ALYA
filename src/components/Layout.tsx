import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { DEMO, settings, productsIn } from '../data/catalog';
import { useCart } from '../lib/cart';

export function Layout() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const loc = useLocation();
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [loc.pathname, loc.search]);
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); menuBtn.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <a className="skip" href="#contenu">Aller au contenu</a>
      {DEMO && (
        <p className="demo-banner">Aperçu de démonstration · visuels provisoires · prix fictifs pour essayer le panier · paiement désactivé</p>
      )}
      <header className="site-header">
        <Link to="/" className="wordmark" aria-label={`${settings.brandName} Impression 3D, accueil`}>
          {settings.brandName}<span>Impression 3D</span>
        </Link>
        <nav className="nav-desktop" aria-label="Navigation principale">
          <NavLink to="/boutique">Showroom</NavLink>
          <NavLink to="/personnalisation">Personnalisation</NavLink>
          <NavLink to="/fabrication">Fabrication</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>
        <Link to="/panier" className="cart-link" aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}>
          Panier <span className="cart-count">{String(count).padStart(2, '0')}</span>
        </Link>
        <button
          ref={menuBtn}
          className="menu-btn"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Fermer' : 'Menu'}
        </button>
      </header>

      <div id="menu-mobile" className={`menu-mobile ${open ? 'is-open' : ''}`} hidden={!open}>
        <nav aria-label="Navigation mobile">
          <ol className="menu-mobile__main">
            <li><Link to="/boutique"><span>01</span>Showroom</Link></li>
            <li><Link to="/personnalisation"><span>02</span>Personnalisation</Link></li>
            <li><Link to="/fabrication"><span>03</span>Fabrication</Link></li>
            <li><Link to="/contact"><span>04</span>Contact</Link></li>
            <li><Link to="/panier"><span>05</span>Panier ({count})</Link></li>
          </ol>
          <p className="eyebrow">Catégories</p>
          <ul className="menu-mobile__cats">
            {settings.categories.map((c) => (
              <li key={c.slug}>
                <Link to={`/boutique/${c.slug}`}>
                  {c.name} <span>{productsIn(c.slug).length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <main id="contenu" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <p className="wordmark wordmark--large">{settings.brandName}</p>
        <p>{settings.tagline}.</p>
      </div>
      <nav aria-label="Boutique" className="site-footer__col">
        <p className="eyebrow">Boutique</p>
        <ul>
          {settings.categories.map((c) => (
            <li key={c.slug}><Link to={`/boutique/${c.slug}`}>{c.name}</Link></li>
          ))}
        </ul>
      </nav>
      <nav aria-label="Maison" className="site-footer__col">
        <p className="eyebrow">Maison</p>
        <ul>
          <li><Link to="/personnalisation">Créations personnalisées</Link></li>
          <li><Link to="/fabrication">Fabrication</Link></li>
          <li><Link to="/contact">Contact</Link></li>
          <li><Link to="/livraison-retours">Livraison et retours</Link></li>
          {settings.instagram && <li><a href={settings.instagram} rel="noopener">Instagram</a></li>}
        </ul>
      </nav>
      <nav aria-label="Informations légales" className="site-footer__col">
        <p className="eyebrow">Informations</p>
        <ul>
          <li><Link to="/mentions-legales">Mentions légales</Link></li>
          <li><Link to="/confidentialite">Confidentialité</Link></li>
          <li><Link to="/cgv">Conditions générales de vente</Link></li>
        </ul>
      </nav>
      <p className="site-footer__legal">© {new Date().getFullYear()} {settings.brandName}. Paiement sécurisé par Stripe.</p>
    </footer>
  );
}
