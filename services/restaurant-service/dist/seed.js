import db from './db.js';
console.log('Seeding restaurant database...');
const seedData = [
    {
        restaurant: { id: 'rest_1', name: 'La Bella Pizza', cuisine: 'Italian', address: 'Rue du Lac, Tunis', is_open: 1 },
        menu: [
            { id: 'item_1_1', name: 'Margherita Pizza', price: 12.50, available: 1 },
            { id: 'item_1_2', name: 'Quattro Formaggi', price: 18.00, available: 1 },
            { id: 'item_1_3', name: 'Pepperoni Supreme', price: 16.50, available: 1 },
            { id: 'item_1_4', name: 'Tiramisu', price: 8.00, available: 1 }
        ]
    },
    {
        restaurant: { id: 'rest_2', name: 'The Burger Club', cuisine: 'Burgers', address: 'Avenue Hedi Nouira, Ennasr', is_open: 1 },
        menu: [
            { id: 'item_2_1', name: 'Classic Cheeseburger', price: 14.00, available: 1 },
            { id: 'item_2_2', name: 'Double BBQ Bacon Burger', price: 19.50, available: 1 },
            { id: 'item_2_3', name: 'Truffle Fries', price: 7.50, available: 1 },
            { id: 'item_2_4', name: 'Chocolate Milkshake', price: 6.50, available: 1 }
        ]
    },
    {
        restaurant: { id: 'rest_3', name: 'Sushi Zen', cuisine: 'Japanese', address: 'Les Berges du Lac 2, Tunis', is_open: 1 },
        menu: [
            { id: 'item_3_1', name: 'Maki Salmon Roll (8pcs)', price: 22.00, available: 1 },
            { id: 'item_3_2', name: 'Assorted Nigiri (10pcs)', price: 32.00, available: 1 },
            { id: 'item_3_3', name: 'Chicken Katsu Curry', price: 24.50, available: 1 },
            { id: 'item_3_4', name: 'Green Tea Mochi', price: 9.00, available: 1 }
        ]
    }
];
const insertRestaurant = db.prepare(`
  INSERT OR REPLACE INTO restaurants (id, name, cuisine, address, is_open)
  VALUES (?, ?, ?, ?, ?)
`);
const insertMenuItem = db.prepare(`
  INSERT OR REPLACE INTO menu_items (id, restaurant_id, name, price, available)
  VALUES (?, ?, ?, ?, ?)
`);
const runSeed = db.transaction(() => {
    // Clear old tables
    db.prepare('DELETE FROM menu_items').run();
    db.prepare('DELETE FROM restaurants').run();
    for (const entry of seedData) {
        const { restaurant, menu } = entry;
        insertRestaurant.run(restaurant.id, restaurant.name, restaurant.cuisine, restaurant.address, restaurant.is_open);
        for (const item of menu) {
            insertMenuItem.run(item.id, restaurant.id, item.name, item.price, item.available);
        }
    }
});
try {
    runSeed();
    console.log('Restaurant database seeded successfully!');
}
catch (error) {
    console.error('Error seeding restaurant database:', error);
}
