import { useRef, useState, type FormEvent } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { DEMO } from '../data/catalog';

export const CUSTOM_TYPES = [
  {
    key: 'classique',
    name: 'Classique',
    text: 'Un objet imprimé à partir de votre idée : une forme, un texte, un motif ou une pièce à reproduire.',
    ask: 'Décrivez l’objet, son usage et, si possible, ses dimensions.',
  },
  {
    key: 'lampe',
    name: 'Lampe',
    text: 'Une lampe dont l’abat-jour ou la silhouette est dessiné pour vous : forme, motif, couleur de matière.',
    ask: 'Indiquez l’ambiance recherchée, la couleur souhaitée et l’endroit où elle sera posée.',
  },
  {
    key: 'nfc',
    name: 'NFC',
    text: 'Un objet qui intègre une puce NFC : approché d’un smartphone compatible, il ouvre le lien de votre choix.',
    ask: 'Précisez le lien à associer (site, profil, carte de contact) et la forme de l’objet.',
  },
  {
    key: 'aimante',
    name: 'Aimanté',
    text: 'Un objet équipé d’aimants, pour se fixer sur une surface métallique ou s’assembler en plusieurs parties.',
    ask: 'Dites-nous sur quoi l’objet doit tenir et ce qu’il doit porter.',
  },
] as const;

/** Demande de création personnalisée : 4 types, un message, une image de référence facultative. Netlify Forms. */
export function Customization({ standalone = false }: { standalone?: boolean }) {
  const [type, setType] = useState<(typeof CUSTOM_TYPES)[number]['key']>('classique');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const current = CUSTOM_TYPES.find((t) => t.key === type)!;
  const root = useRef<HTMLElement>(null);

  // les 4 types arrivent en cascade quand la liste entre à l'écran
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set('.custom__type', { autoAlpha: 0, x: 40 });
        ScrollTrigger.batch('.custom__type', {
          start: 'top 88%',
          once: true,
          onEnter: (els) => gsap.to(els, { autoAlpha: 1, x: 0, stagger: 0.09, duration: 0.7, ease: 'power3.out' }),
        });
        gsap.from('.custom__panel', { autoAlpha: 0, y: 30, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: '.custom__panel', start: 'top 90%', once: true } });
      });
    },
    { scope: root },
  );

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState('sending');
    if (DEMO) { setState('sent'); return; }
    try {
      const r = await fetch('/', { method: 'POST', body: new FormData(e.currentTarget) });
      if (!r.ok) throw new Error();
      setState('sent');
    } catch {
      setState('error');
    }
  };

  const Title = standalone ? 'h1' : 'h2';

  return (
    <section className="custom" id="personnalisation" aria-labelledby="custom-title" ref={root}>
      <div className="custom__intro">
        <Title id="custom-title" className="custom__title" data-reveal>Créations personnalisées</Title>
        <p>Choisissez un type, décrivez ce que vous voulez. Nous répondons par e-mail avec une proposition et un prix.</p>
      </div>

      <div className="custom__types" role="radiogroup" aria-label="Type de création">
        {CUSTOM_TYPES.map((t) => (
          <button
            key={t.key}
            role="radio"
            aria-checked={type === t.key}
            className="custom__type"
            onClick={() => setType(t.key)}
          >
            <span className="custom__name">{t.name}</span>
          </button>
        ))}
      </div>

      <div className="custom__panel">
        <p className="custom__desc">{current.text}</p>
        {state === 'sent' ? (
          <p className="custom__done" role="status">
            {DEMO ? 'Aperçu : rien n’a été envoyé. Sur le site déployé, la demande arrive dans Netlify Forms.' : 'Demande envoyée. Nous vous répondons par e-mail.'}
          </p>
        ) : (
          <form name="personnalisation" method="POST" encType="multipart/form-data" data-netlify="true" netlify-honeypot="bot-field" onSubmit={submit} className="custom__form">
            <input type="hidden" name="form-name" value="personnalisation" />
            <input type="hidden" name="type" value={current.name} />
            <p hidden><label>Ne pas remplir <input name="bot-field" /></label></p>
            <label className="field field--full">
              <span className="field__label">Votre demande</span>
              <textarea id="custom-message" name="message" rows={4} required placeholder={current.ask} />
            </label>
            <label className="field">
              <span className="field__label">E-mail</span>
              <input id="custom-email" name="email" type="email" required autoComplete="email" />
            </label>
            <label className="field">
              <span className="field__label">Image de référence (facultatif)</span>
              <input id="custom-file" name="reference" type="file" accept="image/*,.pdf,.stl" />
            </label>
            <button className="btn btn--solid" disabled={state === 'sending'}>
              {state === 'sending' ? 'Envoi…' : 'Envoyer la demande'}
            </button>
            {state === 'error' && <p className="form-error" role="alert">L’envoi a échoué. Réessayez dans un instant.</p>}
          </form>
        )}
      </div>
    </section>
  );
}
