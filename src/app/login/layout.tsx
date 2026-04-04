export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // Login page has its own layout — no navbar
  return <>{children}</>;
}
