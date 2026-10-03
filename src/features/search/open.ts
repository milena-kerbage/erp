/** Evento que abre a busca geral de qualquer lugar (ex.: dock do celular, menu). */
export const OPEN_SEARCH_EVENT = "mk:open-search";

export type OpenSearchDetail = { query?: string };

/** Abre a busca geral, já com um termo se vier. */
export function openSearch(query = "") {
  window.dispatchEvent(new CustomEvent<OpenSearchDetail>(OPEN_SEARCH_EVENT, { detail: { query } }));
}
