require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // sync() is fine for a demo/internship project; in a real production
    // pipeline this would be replaced by versioned migrations (see
    // migrations/ for the equivalent raw-SQL schema).
    await sequelize.sync();
    console.log('Models synchronized.');

    app.listen(PORT, () => {
      console.log(`Cloud File Storage API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
