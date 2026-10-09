import LoginForm from './LoginForm';

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  return <LoginForm initialRole={role === 'admin' ? 'admin' : 'user'} />;
}