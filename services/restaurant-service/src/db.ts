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

export interface DBRestaurant {
  id: string;
  name: string;
  cuisine: string;
  address: string;
  is_open: number;
}

export interface DBMenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  available: number;
}

export const getRestaurants = (): DBRestaurant[] => {
  const stmt = db.prepare('SELECT * FROM restaurants');
  return stmt.all() as DBRestaurant[];
};

export const getRestaurantById = (id: string): DBRestaurant | undefined => {
  const stmt = db.prepare('SELECT * FROM restaurants WHERE id = ?');
  return stmt.get(id) as DBRestaurant | undefined;
};

export const getMenu = (restaurantId: string): DBMenuItem[] => {
  const stmt = db.prepare('SELECT * FROM menu_items WHERE restaurant_id = ?');
  return stmt.all(restaurantId) as DBMenuItem[];
};

export const getMenuItem = (restaurantId: string, itemId: string): DBMenuItem | undefined => {
  const stmt = db.prepare('SELECT * FROM menu_items WHERE restaurant_id = ? AND id = ?');
  return stmt.get(restaurantId, itemId) as DBMenuItem | undefined;
};

export default db;
