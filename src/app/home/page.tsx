import Navbar from '../components/Navbar';

const Home = () => {
  const username = 'JOSE NIEVA'; // Nombre de usuario (puedes obtenerlo dinámicamente)
  const userArea = 'SISTEMAS'; // Área del usuario, también dinámico si es necesario

  return (
    <div className="home-container">

      {/* Contenido de la página */}
      <h1>Bienvenido a tu página de inicio</h1>
    </div>
  );
};

export default Home;
