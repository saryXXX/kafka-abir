import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../restaurants.db');
const db = new Database(dbPath);
// Enable foreign keys
db.pragma('foreign_keys = ON');
// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cuisine TEXT NOT NULL,
    address TEXT NOT NULL,
    is_open INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    available INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
  );
`);
export const getRestaurants = () => {
    const stmt = db.prepare('SELECT * FROM restaurants');
    return stmt.all();
};
export const getRestaurantById = (id) => {
    const stmt = db.prepare('SELECT * FROM restaurants WHERE id = ?');
    return stmt.get(id);
};
export const getMenu = (restaurantId) => {
    const stmt = db.prepare('SELECT * FROM menu_items WHERE restaurant_id = ?');
    return stmt.all(restaurantId);
};
export const getMenuItem = (restaurantId, itemId) => {
    const stmt = db.prepare('SELECT * FROM menu_items WHERE restaurant_id = ? AND id = ?');
    return stmt.get(restaurantId, itemId);
};
export default db;
