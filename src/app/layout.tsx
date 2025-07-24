// src/app/layout.tsx
import { UserProvider } from './context/UserContext'; // Importa el UserProvider
import Navbar from './components/Navbar'; // Importa el Navbar
import './globals.css'; // Estilos globales

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{marginTop: '0px'}}>
      <body style={{paddingTop: '0px', paddingLeft: '0px', paddingRight:'0px', paddingBottom: '0px'}}>
        {/* Asegúrate de envolver toda la aplicación con UserProvider */}
        <UserProvider>
          <Navbar /> {/* El Navbar debe estar dentro del UserProvider */}
          <main style={{ marginTop: '20px' }}>{children}</main> {/* Agregar margen superior para ajustar el contenido debajo del Navbar */}
        </UserProvider>
      </body>
    </html>
  );
}
