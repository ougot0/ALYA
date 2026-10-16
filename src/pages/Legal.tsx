import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { settings } from '../data/catalog';

/**
 * Pages juridiques : structure prête, informations de l'entreprise à compléter.
 * Rien n'est inventé : chaque champ manquant est signalé « À compléter ».
 */
const TODO = <mark className="todo">À compléter</mark>;

const pages = {
  livraison: {
    title: 'Livraison et retours',
    body: (
      <>
        <h2>Livraison</h2>
        <p>{settings.shippingInfo || <>Zones, délais et tarifs de livraison : {TODO}</>}</p>
        <h2>Retours</h2>
        <p>{settings.returnsInfo || <>Conditions de retour et de remboursement : {TODO}</>}</p>
        <p>Conformément au droit de la consommation, le délai légal de rétractation pour un achat en ligne dans l’Union européenne est de 14 jours, sauf exceptions prévues par la loi (notamment les biens confectionnés selon les spécifications du consommateur).</p>
      </>
    ),
  },
  mentions: {
    title: 'Mentions légales',
    body: (
      <>
        <h2>Éditeur du site</h2>
        <p>Raison sociale : {TODO}<br />Forme juridique et capital : {TODO}<br />Adresse du siège : {TODO}<br />SIREN / RCS : {TODO}<br />N° TVA intracommunautaire : {TODO}<br />Directeur de la publication : {TODO}<br />Contact : {settings.contactEmail || TODO}</p>
        <h2>Hébergement</h2>
        <p>Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis.</p>
        <h2>Paiement</h2>
        <p>Les paiements sont traités par Stripe. Aucune donnée bancaire n’est stockée par ce site.</p>
      </>
    ),
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    body: (
      <>
        <h2>Responsable du traitement</h2>
        <p>{TODO}</p>
        <h2>Données collectées</h2>
        <p>Formulaire de contact : nom, e-mail et message, transmis via Netlify Forms pour répondre à votre demande.<br />Commande : les informations de paiement, de facturation et de livraison sont saisies sur la page sécurisée de Stripe et traitées par Stripe.</p>
        <h2>Stockage local</h2>
        <p>Le contenu du panier est conservé dans le stockage local de votre navigateur. Le site n’utilise pas de cookie publicitaire ni d’outil de mesure d’audience.</p>
        <h2>Durée de conservation et droits</h2>
        <p>Durées de conservation : {TODO}. Vous disposez d’un droit d’accès, de rectification et de suppression de vos données : {settings.contactEmail || TODO}.</p>
      </>
    ),
  },
  cgv: {
    title: 'Conditions générales de vente',
    body: (
      <>
        <p>Les présentes conditions doivent être rédigées ou validées par le vendeur. Sections à compléter :</p>
        <h2>1. Identification du vendeur</h2><p>{TODO}</p>
        <h2>2. Produits</h2><p>Les caractéristiques essentielles figurent sur chaque fiche produit. Les objets imprimés en 3D peuvent présenter de légères variations d’aspect liées au procédé (lignes de couche).</p>
        <h2>3. Prix</h2><p>Les prix sont indiqués en euros, toutes taxes comprises le cas échéant : {TODO}</p>
        <h2>4. Commande et paiement</h2><p>Le paiement s’effectue par l’intermédiaire de Stripe. La commande est confirmée à réception de la validation du paiement.</p>
        <h2>5. Livraison</h2><p>Voir <Link to="/livraison-retours">Livraison et retours</Link>.</p>
        <h2>6. Droit de rétractation</h2><p>{TODO}</p>
        <h2>7. Garanties légales</h2><p>Garantie légale de conformité et garantie des vices cachés : {TODO}</p>
        <h2>8. Médiation et litiges</h2><p>{TODO}</p>
      </>
    ),
  },
} as const;

export default function Legal({ page }: { page: keyof typeof pages }) {
  const p = pages[page];
  return (
    <section className="page-narrow legal">
      <Seo title={p.title} />
      <h1>{p.title}</h1>
      {p.body}
    </section>
  );
}
