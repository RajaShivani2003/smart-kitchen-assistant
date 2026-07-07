var bcrypt = require('bcryptjs');
var { PrismaClient } = require('@prisma/client');
var p = new PrismaClient();

p.user.findMany({select:{id:true, email:true, password:true}}).then(function(users) {
  users.forEach(function(u) {
    console.log('Email:', u.email, '| Hash starts with $2b$12:', u.password ? u.password.substring(0, 7) : 'null');
  });
  p.$disconnect();
}).catch(function(e) {
  console.error(e.message);
  p.$disconnect();
});
