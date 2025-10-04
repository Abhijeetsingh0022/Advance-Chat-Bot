import Sidebar from '@/components/Sidebar';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex">
      <Sidebar />
      {children}
    </div>
  );
}
