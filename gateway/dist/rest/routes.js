import { Router } from 'express';
import { restaurantClient, orderClient, deliveryClient } from '../grpc-clients.js';
const router = Router();
// Utility for gRPC callbacks
const handleGrpcCallback = (res) => (err, data) => {
    if (err) {
        console.error('gRPC Error:', err);
        return res.status(500).json({ error: err.details || 'Internal gRPC error' });
    }
    res.json(data);
};
// GET /api/restaurants
router.get('/restaurants', (req, res) => {
    restaurantClient.GetRestaurants({}, handleGrpcCallback(res));
});
// GET /api/restaurants/:id/menu
router.get('/restaurants/:id/menu', (req, res) => {
    const restaurantId = req.params.id;
    restaurantClient.GetMenu({ id: restaurantId }, handleGrpcCallback(res));
});
// POST /api/orders
router.post('/orders', (req, res) => {
    const { user_id, restaurant_id, items, delivery_address } = req.body;
    if (!user_id || !restaurant_id || !items || !delivery_address) {
        return res.status(400).json({ error: 'Missing required order fields' });
    }
    orderClient.CreateOrder({
        user_id,
        restaurant_id,
        items,
        delivery_address
    }, handleGrpcCallback(res));
});
// GET /api/orders/:id
router.get('/orders/:id', (req, res) => {
    const orderId = req.params.id;
    orderClient.GetOrder({ id: orderId }, handleGrpcCallback(res));
});
// GET /api/drivers
router.get('/drivers', (req, res) => {
    deliveryClient.GetDrivers({}, handleGrpcCallback(res));
});
// POST /api/drivers/register
router.post('/drivers/register', (req, res) => {
    const { name, vehicle } = req.body;
    if (!name || !vehicle) {
        return res.status(400).json({ error: 'Missing driver name or vehicle details' });
    }
    deliveryClient.RegisterDriver({ name, vehicle }, handleGrpcCallback(res));
});
export default router;
