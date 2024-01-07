"use strict";
const stripe = require("stripe")(process.env.STRIPE_KEY);
/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

// Define the base URL
const BASE_URL = "http://localhost:1337";

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products, email } = ctx.request.body;
    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::product.product")
            .findOne(product.id);

          // Log title, description, and image URL
          console.log('Title:', item.title);
          console.log('Description:', item.desc);
          console.log('Image URL:', product.quantity);
          console.log("this is email: ", email);
          

          return {
            price_data: {
              currency: "inr", // Change currency to INR
              product_data: {
                name: item.title,
                description: item.desc,
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: product.quantity,
          };
        })
      );

      const session = await stripe.checkout.sessions.create({
        shipping_address_collection: { allowed_countries: ['IN'] }, // Set allowed countries to India
        payment_method_types: ["card"],
        mode: "payment",
        success_url: BASE_URL + "?success=true",
        cancel_url: BASE_URL,
        line_items: lineItems,
      });

      await strapi
        .service("api::order.order")
        .create({ data: { products, stripeId: session.id, email: email } });

      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return { error };
    }
  },
}));
