import { useState, type FormEvent } from 'react';
import { Seo } from '../components/Seo';
import { settings } from '../data/catalog';

/** Formulaire traité par Netlify Forms (aucun backend à maintenir). */
export default function Contact() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState('sending');
    const body = new URLSearchParams(new FormData(e.currentTarget) as unknown as Record<string, string>).toString();
    try {
      const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!r.ok) throw new Error();
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <section className="contact">
      <Seo title="Contact" description={`Écrire à ${settings.brandName}.`} />
      <header className="page-intro">
        <p className="eyebrow">Contact</p>
        <h1>Une question sur un objet, une commande ?</h1>
        {settings.contactEmail && <p>Ou directement : <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a></p>}
      </header>
      {state === 'sent' ? (
        <p className="contact__done" role="status">Message envoyé. Nous vous répondrons par e-mail.</p>
      ) : (
        <form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={submit} className="form">
          <input type="hidden" name="form-name" value="contact" />
          <p hidden><label>Ne pas remplir <input name="bot-field" /></label></p>
          <label className="field"><span className="eyebrow">Nom</span><input name="name" required autoComplete="name" /></label>
          <label className="field"><span className="eyebrow">E-mail</span><input name="email" type="email" required autoComplete="email" /></label>
          <label className="field">
            <span className="eyebrow">Sujet</span>
            <select name="subject">
              <option>Question sur un produit</option>
              <option>Suivi de commande</option>
              <option>Autre</option>
            </select>
          </label>
          <label className="field field--full"><span className="eyebrow">Message</span><textarea name="message" rows={6} required /></label>
          <button className="btn btn--solid" disabled={state === 'sending'}>{state === 'sending' ? 'Envoi…' : 'Envoyer'}</button>
          {state === 'error' && <p className="form-error" role="alert">L’envoi a échoué. Réessayez dans un instant.</p>}
        </form>
      )}
    </section>
  );
}
