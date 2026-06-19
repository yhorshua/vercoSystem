import './globals.css';
import { UserProvider } from './context/UserContext';
import ClientLayout from './components/ClientLayout';
import { DashboardSocketProvider } from './context/DashboardSocketContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0 }}>
        <UserProvider>
          <DashboardSocketProvider>
          <ClientLayout>{children}</ClientLayout>
          </DashboardSocketProvider>
        </UserProvider>
      </body>
    </html>
  );
}
