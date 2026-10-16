import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, createMemoryRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';

const Shop = lazy(() => import('./pages/Shop'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const Cart = lazy(() => import('./pages/Cart'));
const Confirmation = lazy(() => import('./pages/Confirmation'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Legal = lazy(() => import('./pages/Legal'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Custom = lazy(() => import('./pages/Custom'));

const s = (el: ReactNode) => <Suspense fallback={<div className="page-loading" aria-busy="true" />}>{el}</Suspense>;

const routes = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/boutique', element: s(<Shop />) },
      { path: '/boutique/:category', element: s(<Shop />) },
      { path: '/produit/:slug', element: s(<ProductPage />) },
      { path: '/panier', element: s(<Cart />) },
      { path: '/commande/confirmation', element: s(<Confirmation />) },
      { path: '/fabrication', element: s(<About />) },
      { path: '/personnalisation', element: s(<Custom />) },
      { path: '/contact', element: s(<Contact />) },
      { path: '/livraison-retours', element: s(<Legal page="livraison" />) },
      { path: '/mentions-legales', element: s(<Legal page="mentions" />) },
      { path: '/confidentialite', element: s(<Legal page="confidentialite" />) },
      { path: '/cgv', element: s(<Legal page="cgv" />) },
      { path: '*', element: s(<NotFound />) },
    ],
  },
];

// L'aperçu tourne dans un cadre isolé : routage en mémoire, sans dépendre de l'URL.
export const router = import.meta.env.VITE_DEMO === '1' ? createMemoryRouter(routes) : createBrowserRouter(routes);
