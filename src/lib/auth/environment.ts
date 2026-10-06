// Nenhuma variável pode liberar acesso anônimo em produção.
export const developmentAccess = () => process.env.NODE_ENV === 'development' && process.env.AUTH_REQUIRE_LOGIN !== 'true';
