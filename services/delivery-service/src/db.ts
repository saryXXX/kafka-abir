import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../deliveries.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    vehicle TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IDLE', -- IDLE, DELIVERING
    lat REAL NOT NULL DEFAULT 36.8065, -- Tunis Lat
    lng REAL NOT NULL DEFAULT 10.1815  -- Tunis Lng
  );

  CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    status TEXT NOT NULL, -- ASSIGNED, EN_ROUTE, COMPLETED
    eta TEXT NOT NULL,
    FOREIGN KEY(driver_id) REFERENCES drivers(id) ON DELETE CASCADE
  );
`);

export interface DBDriver {
  id: string;
  name: string;
  vehicle: string;
  status: string;
  lat: number;
  lng: number;
}

export interface DBDelivery {
  id: string;
  order_id: string;
  driver_id: string;
  status: string;
  eta: string;
}

export const saveDriver = (driver: DBDriver) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO drivers (id, name, vehicle, status, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(driver.id, driver.name, driver.vehicle, driver.status, driver.lat, driver.lng);
};

export const getDrivers = (): DBDriver[] => {
  const stmt = db.prepare('SELECT * FROM drivers');
  return stmt.all() as DBDriver[];
};

export const getDriverById = (id: string): DBDriver | undefined => {
  const stmt = db.prepare('SELECT * FROM drivers WHERE id = ?');
  return stmt.get(id) as DBDriver | undefined;
};

export const getIdleDriver = (): DBDriver | undefined => {
  const stmt = db.prepare("SELECT * FROM drivers WHERE status = 'IDLE' LIMIT 1");
  return stmt.get() as DBDriver | undefined;
};

export const updateDriverStatus = (id: string, status: string) => {
  const stmt = db.prepare('UPDATE drivers SET status = ? WHERE id = ?');
  stmt.run(status, id);
};

export const updateDriverLocation = (id: string, lat: number, lng: number) => {
  const stmt = db.prepare('UPDATE drivers SET lat = ?, lng = ? WHERE id = ?');
  stmt.run(lat, lng, id);
};

export const saveDelivery = (delivery: DBDelivery) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO deliveries (id, order_id, driver_id, status, eta)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(delivery.id, delivery.order_id, delivery.driver_id, delivery.status, delivery.eta);
};

export const getDeliveryByOrderId = (orderId: string): DBDelivery | undefined => {
  const stmt = db.prepare('SELECT * FROM deliveries WHERE order_id = ?');
  return stmt.get(orderId) as DBDelivery | undefined;
};

export const getDeliveryById = (id: string): DBDelivery | undefined => {
  const stmt = db.prepare('SELECT * FROM deliveries WHERE id = ?');
  return stmt.get(id) as DBDelivery | undefined;
};

export const updateDeliveryStatus = (deliveryId: string, status: string) => {
  const stmt = db.prepare('UPDATE deliveries SET status = ? WHERE id = ?');
  stmt.run(status, deliveryId);
};

export default db;
