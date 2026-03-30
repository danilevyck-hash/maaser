/* eslint-disable @next/next/no-page-custom-font */
export default function PropiedadesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
