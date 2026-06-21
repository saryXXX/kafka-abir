import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../orders.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    restaurant_id TEXT NOT NULL,
    total_price REAL NOT NULL,
    status TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    driver_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );
`);

export interface DBOrder {
  id: string;
  user_id: string;
  restaurant_id: string;
  total_price: number;
  status: string;
  delivery_address: string;
  driver_id: string | null;
  created_at: string;
}

export interface DBOrderItem {
  id?: number;
  order_id: string;
  item_id: string;
  name: string;
  quantity: number;
  price: number;
}

export const saveOrder = (order: DBOrder, items: DBOrderItem[]) => {
  const insertOrder = db.prepare(`
    INSERT INTO orders (id, user_id, restaurant_id, total_price, status, delivery_address, driver_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, item_id, name, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertOrder.run(
      order.id,
      order.user_id,
      order.restaurant_id,
      order.total_price,
      order.status,
      order.delivery_address,
      order.driver_id,
      order.created_at
    );

    for (const item of items) {
      insertItem.run(
        order.id,
        item.item_id,
        item.name,
        item.quantity,
        item.price
      );
    }
  });

  transaction();
};

export const getOrderById = (id: string): DBOrder | undefined => {
  const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
  return stmt.get(id) as DBOrder | undefined;
};

export const getOrderItems = (orderId: string): DBOrderItem[] => {
  const stmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  return stmt.all(orderId) as DBOrderItem[];
};

export const getOrdersByUserId = (userId: string): DBOrder[] => {
  const stmt = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
  return stmt.all(userId) as DBOrder[];
};

export const updateOrderStatus = (orderId: string, status: string) => {
  const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  stmt.run(status, orderId);
};

export const updateOrderDriver = (orderId: string, driverId: string) => {
  const stmt = db.prepare('UPDATE orders SET driver_id = ? WHERE id = ?');
  stmt.run(driverId, orderId);
};

export default db;
