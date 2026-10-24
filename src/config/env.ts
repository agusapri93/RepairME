function required(name: string): string {
  const value = Bun.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  PORT: Number(Bun.env.PORT ?? 3000),
  DATABASE_URL: required("DATABASE_URL"),
};
