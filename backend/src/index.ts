import { app } from './app.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Servidor Zion Services corriendo en puerto ${PORT}`, { port: PORT });
  });
}

export { app };
export default app;
