import { restaurantClient, orderClient, deliveryClient } from '../grpc-clients.js';
// Utility helper to convert callback-based gRPC to Promises
const promisify = (client, method, request) => {
    return new Promise((resolve, reject) => {
        client[method](request, (err, response) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(response);
            }
        });
    });
};
export const resolvers = {
    Query: {
        restaurants: async () => {
            try {
                const response = await promisify(restaurantClient, 'GetRestaurants', {});
                return response.restaurants || [];
            }
            catch (err) {
                console.error('GraphQL Error fetching restaurants:', err);
                throw new Error(err.details || 'Internal gRPC error');
            }
        },
        restaurantMenu: async (_, { restaurantId }) => {
            try {
                const response = await promisify(restaurantClient, 'GetMenu', { id: restaurantId });
                return response.items || [];
            }
            catch (err) {
                console.error(`GraphQL Error fetching menu for ${restaurantId}:`, err);
                throw new Error(err.details || 'Internal gRPC error');
            }
        },
        order: async (_, { id }) => {
            try {
                const response = await promisify(orderClient, 'GetOrder', { id });
                return response;
            }
            catch (err) {
                console.error(`GraphQL Error fetching order ${id}:`, err);
                throw new Error(err.details || 'Order not found');
            }
        },
        userOrders: async (_, { userId }) => {
            try {
                const response = await promisify(orderClient, 'GetUserOrders', { id: userId });
                return response.orders || [];
            }
            catch (err) {
                console.error(`GraphQL Error fetching user orders for ${userId}:`, err);
                throw new Error(err.details || 'Internal gRPC error');
            }
        },
        drivers: async () => {
            try {
                const response = await promisify(deliveryClient, 'GetDrivers', {});
                return response.drivers || [];
            }
            catch (err) {
                console.error('GraphQL Error fetching drivers:', err);
                throw new Error(err.details || 'Internal gRPC error');
            }
        }
    },
    Mutation: {
        createOrder: async (_, { user_id, restaurant_id, items, delivery_address }) => {
            try {
                const response = await promisify(orderClient, 'CreateOrder', {
                    user_id,
                    restaurant_id,
                    items,
                    delivery_address
                });
                return response;
            }
            catch (err) {
                console.error('GraphQL Error creating order:', err);
                throw new Error(err.details || 'Internal gRPC error');
            }
        },
        registerDriver: async (_, { name, vehicle }) => {
            try {
                const response = await promisify(deliveryClient, 'RegisterDriver', { name, vehicle });
                return response;
            }
            catch (err) {
                console.error('GraphQL Error registering driver:', err);
                throw new Error(err.details || 'Internal gRPC error');
            }
        },
        updateDriverLocation: async (_, { driverId, lat, lng }) => {
            try {
                const response = await promisify(deliveryClient, 'UpdateDriverLocation', {
                    driver_id: driverId,
                    lat,
                    lng
                });
                return response.success;
            }
            catch (err) {
                console.error(`GraphQL Error updating location for driver ${driverId}:`, err);
                return false;
            }
        }
    },
    Restaurant: {
        menu: async (parent) => {
            try {
                const response = await promisify(restaurantClient, 'GetMenu', { id: parent.id });
                return response.items || [];
            }
            catch (err) {
                return [];
            }
        }
    },
    Order: {
        delivery: async (parent) => {
            try {
                // Fetch status from delivery-service
                const response = await promisify(deliveryClient, 'GetDeliveryStatus', { id: parent.id });
                return response;
            }
            catch (err) {
                // Return null if delivery not yet registered (e.g. pending restaurant approval)
                return null;
            }
        }
    }
};
