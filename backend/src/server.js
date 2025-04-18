require('dotenv').config();
import express from 'express';

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.get('/', (req, res) => {
  res.send('¡Hola desde el backend de SkyVault!');
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});