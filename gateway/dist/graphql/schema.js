export const typeDefs = `#graphql
  type Restaurant {
    id: ID!
    name: String!
    cuisine: String!
    address: String!
    is_open: Boolean!
    menu: [MenuItem!]!
  }

  type MenuItem {
    id: ID!
    name: String!
    price: Float!
    available: Boolean!
  }

  type OrderItem {
    item_id: ID!
    name: String!
    quantity: Int!
    price: Float!
  }

  type Order {
    id: ID!
    user_id: String!
    restaurant_id: String!
    items: [OrderItem!]!
    total_price: Float!
    status: String!
    delivery_address: String!
    driver_id: String
    created_at: String!
    delivery: Delivery
  }

  type Delivery {
    id: ID!
    order_id: String!
    driver_id: String!
    driver_name: String!
    status: String!
    eta: String!
  }

  type Driver {
    id: ID!
    name: String!
    vehicle: String!
    status: String!
    lat: Float!
    lng: Float!
  }

  input OrderItemInput {
    item_id: ID!
    name: String!
    quantity: Int!
    price: Float!
  }

  type Query {
    restaurants: [Restaurant!]!
    restaurantMenu(restaurantId: ID!): [MenuItem!]!
    order(id: ID!): Order
    userOrders(userId: String!): [Order!]!
    drivers: [Driver!]!
  }

  type Mutation {
    createOrder(
      user_id: String!
      restaurant_id: String!
      items: [OrderItemInput!]!
      delivery_address: String!
    ): Order!
    registerDriver(name: String!, vehicle: String!): Driver!
    updateDriverLocation(driverId: ID!, lat: Float!, lng: Float!): Boolean!
  }
`;
