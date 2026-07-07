var bcrypt = require('bcryptjs');
var { PrismaClient } = require('@prisma/client');
var p = new PrismaClient();

p.user.findFirst({where:{email:'admin@kitchen.com'},select:{password:true}}).then(function(u) {
  console.log('Hash:', u.password);
  console.log('Test admin123:', bcrypt.compareSync('admin123', u.password));
  console.log('Test password123:', bcrypt.compareSync('password123', u.password));
  console.log('Test admin:', bcrypt.compareSync('admin', u.password));
  p.$disconnect();
}).catch(function(e) {
  console.error(e.message);
  p.$disconnect();
});
