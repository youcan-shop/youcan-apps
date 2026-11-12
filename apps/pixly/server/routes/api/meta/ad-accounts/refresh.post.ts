import { MetaGraphError } from '~~/lib/meta/graph';

export default defineEventHandler(async (event) => {
  const store = requireStore(event);
  const graph = requireMetaGraph();
  const token = await metaAccessToken(store);

  if (!token) {
    throw createError({ statusCode: 404, statusMessage: 'Facebook is not connected' });
  }

  try {
    await syncMetaAdAccounts(store, graph, token);
  }
  catch (error) {
    // 190 = the token expired or was revoked on Facebook's side
    if (error instanceof MetaGraphError && error.code === 190) {
      throw createError({ statusCode: 409, statusMessage: 'Your Facebook connection expired. Reconnect to continue.' });
    }
    throw error;
  }

  return metaConnectionView(store);
});
