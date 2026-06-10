import express from 'express';
import prisma from '../db.js';
import axios from 'axios';

const router = express.Router();

// Get all local products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create a new product locally and on Hiboutik
router.post('/', async (req, res) => {
  const { name, price, description } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  try {
    // 1. Send to Hiboutik
    const HIBOUTIK_ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
    const HIBOUTIK_LOGIN = process.env.HIBOUTIK_LOGIN;
    const HIBOUTIK_API_KEY = process.env.HIBOUTIK_API_KEY;

    let hiboutikId = null;

    if (HIBOUTIK_ACCOUNT && HIBOUTIK_LOGIN && HIBOUTIK_API_KEY) {
      // Basic Auth uses Base64 encoded string of "login:apiKey"
      const authHeader = `Basic ${Buffer.from(`${HIBOUTIK_LOGIN}:${HIBOUTIK_API_KEY}`).toString('base64')}`;

      // POST to https://ACCOUNT.hiboutik.com/api/products/
      const apiUrl = `https://${HIBOUTIK_ACCOUNT}.hiboutik.com/api/products/`;

      try {
        const hiboutikResponse = await axios.post(apiUrl, {
          product_model: name,
          product_price: price.toString(), // usually price should be a string in Hiboutik API
        }, {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        // The response usually contains the product_id
        if (hiboutikResponse.data && hiboutikResponse.data.product_id) {
            hiboutikId = hiboutikResponse.data.product_id;
        } else if (hiboutikResponse.data && hiboutikResponse.data.insert_id) {
            hiboutikId = hiboutikResponse.data.insert_id;
        } else if (hiboutikResponse.data && typeof hiboutikResponse.data === 'number') {
            hiboutikId = hiboutikResponse.data;
        } else if (hiboutikResponse.data && hiboutikResponse.data[0] && hiboutikResponse.data[0].product_id) {
             hiboutikId = hiboutikResponse.data[0].product_id;
        } else {
             // If we don't know the exact format, we just log it and proceed
             console.log("Hiboutik created product, response:", hiboutikResponse.data);
             // fallback parsing if possible
             if (hiboutikResponse.data?.id) hiboutikId = hiboutikResponse.data.id;
        }
        
      } catch (hiboutikError) {
        console.error('Error creating product on Hiboutik:', hiboutikError.response?.data || hiboutikError.message);
        // We might want to continue and save it locally anyway, or fail the whole request
        // For now, let's continue but log the error
      }
    }

    // 2. Save to local DB
    const newProduct = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        description,
        hiboutikId: hiboutikId ? parseInt(hiboutikId) : null
      }
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product', details: error.message, stack: error.stack });
  }
});

export default router;
