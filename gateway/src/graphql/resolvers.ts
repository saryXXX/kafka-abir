import {
  restaurantClient,
  orderClient,
  deliveryClient
} from '../grpc-clients.js';

// Utility helper to convert callback-based gRPC to Promises
const promisify = (client: any, method: string, request: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    client[method](request, (err: any, response: any) => {
      if (err) {
        reject(err);
      } else {
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
      } catch (err: any) {
        console.error('GraphQL Error fetching restaurants:', err);
        throw new Error(err.details || 'Internal gRPC error');
      }
    },
    restaurantMenu: async (_: any, { restaurantId }: { restaurantId: string }) => {
      try {
        const response = await promisify(restaurantClient, 'GetMenu', { id: restaurantId });
        return response.items || [];
      } catch (err: any) {
        console.error(`GraphQL Error fetching menu for ${restaurantId}:`, err);
        throw new Error(err.details || 'Internal gRPC error');
      }
    },
    order: async (_: any, { id }: { id: string }) => {
      try {
        const response = await promisify(orderClient, 'GetOrder', { id });
        return response;
      } catch (err: any) {
        console.error(`GraphQL Error fetching order ${id}:`, err);
        throw new Error(err.details || 'Order not found');
      }
    },
    userOrders: async (_: any, { userId }: { userId: string }) => {
      try {
        const response = await promisify(orderClient, 'GetUserOrders', { id: userId });
        return response.orders || [];
      } catch (err: any) {
        console.error(`GraphQL Error fetching user orders for ${userId}:`, err);
        throw new Error(err.details || 'Internal gRPC error');
      }
    },
    drivers: async () => {
      try {
        const response = await promisify(deliveryClient, 'GetDrivers', {});
        return response.drivers || [];
      } catch (err: any) {
        console.error('GraphQL Error fetching drivers:', err);
        throw new Error(err.details || 'Internal gRPC error');
      }
    }
  },

  Mutation: {
    createOrder: async (
      _: any,
      { user_id, restaurant_id, items, delivery_address }: any
    ) => {
      try {
        const response = await promisify(orderClient, 'CreateOrder', {
          user_id,
          restaurant_id,
          items,
          delivery_address
        });
        return response;
      } catch (err: any) {
        console.error('GraphQL Error creating order:', err);
        throw new Error(err.details || 'Internal gRPC error');
      }
    },
    registerDriver: async (_: any, { name, vehicle }: { name: string; vehicle: string }) => {
      try {
        const response = await promisify(deliveryClient, 'RegisterDriver', { name, vehicle });
        return response;
      } catch (err: any) {
        console.error('GraphQL Error registering driver:', err);
        throw new Error(err.details || 'Internal gRPC error');
      }
    },
    updateDriverLocation: async (
      _: any,
      { driverId, lat, lng }: { driverId: string; lat: number; lng: number }
    ) => {
      try {
        const response = await promisify(deliveryClient, 'UpdateDriverLocation', {
          driver_id: driverId,
          lat,
          lng
        });
        return response.success;
      } catch (err: any) {
        console.error(`GraphQL Error updating location for driver ${driverId}:`, err);
        return false;
      }
    }
  },

  Restaurant: {
    menu: async (parent: any) => {
      try {
        const response = await promisify(restaurantClient, 'GetMenu', { id: parent.id });
        return response.items || [];
      } catch (err) {
        return [];
      }
    }
  },

  Order: {
    delivery: async (parent: any) => {
      try {
        // Fetch status from delivery-service
        const response = await promisify(deliveryClient, 'GetDeliveryStatus', { id: parent.id });
        return response;
      } catch (err) {
        // Return null if delivery not yet registered (e.g. pending restaurant approval)
        return null;
      }
    }
  }
};
