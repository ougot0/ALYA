import { Customization } from '../components/Customization';
import { Seo } from '../components/Seo';

export default function Custom() {
  return (
    <>
      <Seo title="Créations personnalisées" description="Classique, lampe, NFC ou aimanté : demandez un objet imprimé en 3D pour vous." />
      <Customization standalone />
    </>
  );
}
