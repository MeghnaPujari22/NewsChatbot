// vector-db.js
require('dotenv').config();
const { QdrantClient } = require("@qdrant/js-client-rest");
// If running with Docker Compose
//const QdrantClient = new QdrantClient({ host: 'news-qdrant' });

// OR if running locally without Docker
//const QdrantClient = new QdrantClient({ host: 'localhost' });
const client = new QdrantClient({
  //url: process.env.QDRANT_URL || 'http://news-qdrant:6333'
  url: process.env.QDRANT_URL || 'http://localhost:6333',
});

client.getCollections().then(console.log);
async function searchVectors(embedding, limit = 3) {
  try {
    const response = await client.search(process.env.QDRANT_COLLECTION, {
      vector: embedding,
      limit,
    });
    console.log('Search response:', response);
    return response;
  } catch (error) {
    console.error('Search failed:', error);
  }
}

module.exports = { searchVectors };