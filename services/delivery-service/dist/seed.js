import db from './db.js';
console.log('Seeding delivery database with drivers...');
const seedDrivers = [
    { id: 'driver_1', name: 'Ahmed Ksibi', vehicle: 'Motorcycle', status: 'IDLE', lat: 36.8065, lng: 10.1815 },
    { id: 'driver_2', name: 'Yassine Jlassi', vehicle: 'Bicycle', status: 'IDLE', lat: 36.8300, lng: 10.2100 },
    { id: 'driver_3', name: 'Abir Marzouki', vehicle: 'Car', status: 'IDLE', lat: 36.8450, lng: 10.2250 }
];
const insertDriver = db.prepare(`
  INSERT OR REPLACE INTO drivers (id, name, vehicle, status, lat, lng)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const runSeed = db.transaction(() => {
    // Clear old tables
    db.prepare('DELETE FROM deliveries').run();
    db.prepare('DELETE FROM drivers').run();
    for (const driver of seedDrivers) {
        insertDriver.run(driver.id, driver.name, driver.vehicle, driver.status, driver.lat, driver.lng);
    }
});
try {
    runSeed();
    console.log('Delivery database seeded successfully!');
}
catch (error) {
    console.error('Error seeding delivery database:', error);
}
