import db from './db.js';
console.log('Seeding order database...');
try {
    db.prepare('DELETE FROM order_items').run();
    db.prepare('DELETE FROM orders').run();
    console.log('Order database cleared and initialized successfully!');
}
catch (error) {
    console.error('Error seeding order database:', error);
}
