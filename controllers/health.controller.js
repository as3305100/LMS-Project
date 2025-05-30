import { getDBStatus } from "../database/db.js";

export const checkHealth = (_, res) => {
  const isHealthy = getDBStatus().isConnected;
  const statusCode = isHealthy ? 200 : 503;

  const healthReport = {
    status: isHealthy ? "ok" : "error",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: getDBStatus(),
    statusCode: statusCode
  };

  res.status(statusCode).json(healthReport);
};
