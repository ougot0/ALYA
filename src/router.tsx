import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
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

const s = (el: ReactNode) => <Suspense fallback={<div className="page-loading" aria-busy="true" />}>{el}</Suspense>;

export const router = createBrowserRouter([
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
      { path: '/contact', element: s(<Contact />) },
      { path: '/livraison-retours', element: s(<Legal page="livraison" />) },
      { path: '/mentions-legales', element: s(<Legal page="mentions" />) },
      { path: '/confidentialite', element: s(<Legal page="confidentialite" />) },
      { path: '/cgv', element: s(<Legal page="cgv" />) },
      { path: '*', element: s(<NotFound />) },
    ],
  },
]);
