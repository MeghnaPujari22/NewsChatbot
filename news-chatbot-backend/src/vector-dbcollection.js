const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

// Create a new instance of the Qdrant Client
const client = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://news-qdrant:6333', // or 'http://news-qdrant:6333' based on your Docker setup
});

async function createCollection() {
  try {
    // Create the collection with a defined vector size (e.g., 512) and other parameters like distance
    const response = await client.createCollection({
      collection_name: 'news', // Name of the collection
      vectors_config: {
        size: 512, // Define the vector size (e.g., 512 for embedding vectors)
        distance: 'Cosine' // Choose the distance measure (Cosine, Euclidean, etc.)
      }
    });

    console.log('Collection created successfully:', response);
  } catch (error) {
    console.error('Error creating collection:', error);
  }
}

createCollection();
