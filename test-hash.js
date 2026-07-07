const bcrypt = require('bcryptjs');

async function test() {
  try {
    const hash = await bcrypt.hash('password123', 12);
    console.log('Hash created:', hash.substring(0, 20) + '...');
    
    const compare = await bcrypt.compare('password123', hash);
    console.log('Compare result:', compare);
    
    // Now try with Prisma
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.create({
      data: {
        name: 'API Test User',
        email: 'api_test@example.com',
        password: hash,
      }
    });
    console.log('User created via Prisma:', user.email);
    
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
    console.log('All tests passed!');
  } catch (e) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
  }
}

test();
