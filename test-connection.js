require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$connect()
  .then(() => console.log('Prisma connected'))
  .catch(e => console.error('Prisma failed:', e.message))
  .finally(() => p.$disconnect());
