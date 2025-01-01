import { authenticate } from '$lib/server/db.js';

export const init = async () => {
  await authenticate();
}