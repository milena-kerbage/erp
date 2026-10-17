// Nenhuma variável pode liberar acesso anônimo em produção. Com DATABASE_URL (banco remoto,
// possivelmente com dados reais), o acesso anônimo de desenvolvimento nunca é permitido.
export const developmentAccess = () => process.env.NODE_ENV === 'development' && process.env.AUTH_REQUIRE_LOGIN !== 'true' && !process.env.DATABASE_URL;
