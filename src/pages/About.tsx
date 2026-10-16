import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { settings } from '../data/catalog';
import { Process } from '../components/Process';

export default function About() {
  return (
    <>
      <Seo title="Fabrication" description={`Comment les objets ${settings.brandName} sont dessinés et imprimés en 3D.`} />
      <section className="page-intro">
        <h1>{settings.brandName} dessine des objets du quotidien et les fabrique par impression 3D.</h1>
        <p>
          L’impression 3D construit un objet en superposant de fines couches de matière. Cette technique permet de produire
          des formes qu’un moule rendrait difficiles, et laisse à la surface une trace visible de sa fabrication : les lignes
          de couche, que nous traitons comme une texture à part entière.
        </p>
      </section>
      <Process standalone />
      <section className="page-intro">
        <h2>Matières</h2>
        <p>Les matériaux utilisés sont indiqués sur chaque fiche produit.</p>
        <Link to="/boutique" className="link-arrow">Voir les objets</Link>
      </section>
    </>
  );
}
