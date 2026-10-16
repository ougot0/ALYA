import { useMemo } from 'react';
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom';
import { Showroom } from '../components/Showroom';
import { Seo } from '../components/Seo';
import { allProducts, availabilityLabel, formatPrice, getCategory, settings } from '../data/catalog';
import type { Availability } from '../data/types';

type Sort = 'nouveautes' | 'prix-asc' | 'prix-desc';

export default function Shop() {
  const { category } = useParams();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const sort = (params.get('tri') as Sort) ?? 'nouveautes';
  const avail = params.get('dispo') as Availability | null;
  const color = params.get('couleur');
  const cat = category ? getCategory(category) : undefined;

  const base = useMemo(() => (category ? allProducts.filter((p) => p.category === category) : allProducts), [category]);
  // filtres proposés uniquement s'ils existent réellement dans les données
  const availOptions = [...new Set(base.map((p) => p.availability))];
  const colorOptions = [...new Set(base.flatMap((p) => p.colors.map((c) => c.name)))];

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    let r = base.filter(
      (p) =>
        (!needle || norm(`${p.name} ${p.shortDescription} ${p.materials} ${getCategory(p.category)?.name ?? ''}`).includes(needle)) &&
        (!avail || p.availability === avail) &&
        (!color || p.colors.some((c) => c.name === color)),
    );
    const price = (v: number | null, dir: 1 | -1) => (v === null ? Infinity : v * dir);
    if (sort === 'prix-asc') r = [...r].sort((a, b) => price(a.price, 1) - price(b.price, 1));
    else if (sort === 'prix-desc') r = [...r].sort((a, b) => price(a.price, -1) - price(b.price, -1));
    return r;
  }, [base, q, avail, color, sort]);

  const set = (k: string, v: string | null) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v); else n.delete(k);
    setParams(n, { replace: true });
  };

  if (category && !cat) {
    return (
      <section className="page-narrow">
        <h1>Catégorie introuvable</h1>
        <Link to="/boutique" className="link-arrow">Retour à la boutique</Link>
      </section>
    );
  }

  return (
    <div className="shop">
      <Seo title={cat?.name ?? 'Boutique'} description={cat?.description ?? `Tous les objets ${settings.brandName}.`} />
      <header className="shop__head">
        <p className="eyebrow">Boutique</p>
        <h1>{cat?.name ?? 'Tous les objets'}</h1>
        {cat && <p className="shop__lead">{cat.description}</p>}
      </header>

      <nav className="shop__cats" aria-label="Catégories">
        <NavLink to="/boutique" end>Tout <sup>{allProducts.length}</sup></NavLink>
        {settings.categories.map((c) => (
          <NavLink key={c.slug} to={`/boutique/${c.slug}`}>
            {c.name} <sup>{allProducts.filter((p) => p.category === c.slug).length}</sup>
          </NavLink>
        ))}
      </nav>

      <div className="shop__tools" role="search">
        <label className="field field--search">
          <span className="eyebrow">Rechercher</span>
          <input type="search" value={q} onChange={(e) => set('q', e.target.value || null)} placeholder="Nom, matière…" />
        </label>
        {availOptions.length > 1 && (
          <label className="field">
            <span className="eyebrow">Disponibilité</span>
            <select value={avail ?? ''} onChange={(e) => set('dispo', e.target.value || null)}>
              <option value="">Toutes</option>
              {availOptions.map((a) => <option key={a} value={a}>{availabilityLabel[a]}</option>)}
            </select>
          </label>
        )}
        {colorOptions.length > 0 && (
          <label className="field">
            <span className="eyebrow">Couleur</span>
            <select value={color ?? ''} onChange={(e) => set('couleur', e.target.value || null)}>
              <option value="">Toutes</option>
              {colorOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        )}
        <label className="field">
          <span className="eyebrow">Trier</span>
          <select value={sort} onChange={(e) => set('tri', e.target.value === 'nouveautes' ? null : e.target.value)}>
            <option value="nouveautes">Nouveautés</option>
            <option value="prix-asc">Prix croissant</option>
            <option value="prix-desc">Prix décroissant</option>
          </select>
        </label>
        <p className="shop__count" aria-live="polite">{list.length} objet{list.length > 1 ? 's' : ''}</p>
      </div>

      {list.length > 0 && <Showroom key={list.map((p) => p.slug).join()} products={list} id="showroom-boutique" heading={cat?.name ?? 'Tous les objets'} />}

      {list.length ? (
        <ol className="index">
          {list.map((p, i) => (
            <li key={p.slug}>
              <Link to={`/produit/${p.slug}`} className="index__row" viewTransition>
                <span className="index__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="index__thumb"><img src={p.images[0]?.src} alt="" loading="lazy" /></span>
                <span className="index__name">{p.name}</span>
                <span className="index__cat">{getCategory(p.category)?.name}</span>
                <span className="index__colors" aria-label={`${p.colors.length} couleurs`}>
                  {p.colors.map((c) => <i key={c.name} style={{ background: c.hex }} title={c.name} />)}
                </span>
                <span className="index__price">{formatPrice(p.price)}<small>{availabilityLabel[p.availability]}</small></span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="shop__empty">
          <p>{base.length ? 'Aucun objet ne correspond à ces critères.' : 'Les premiers objets de cette catégorie arrivent bientôt.'}</p>
          {base.length > 0 && <button className="link-arrow" onClick={() => setParams({}, { replace: true })}>Effacer les filtres</button>}
          {!base.length && <Link to="/personnalisation" className="link-arrow">Demander une création personnalisée</Link>}
        </div>
      )}
    </div>
  );
}
