const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../config/database');
const { User } = require('../models');

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminPhone = process.argv[2] || '9999999999';
    const adminName = process.argv[3] || 'Admin User';
    const adminEmail = process.argv[4] || 'admin@shaaka.com';

    // Check if admin exists
    let admin = await User.findOne({ phone: adminPhone });

    if (admin) {
      if (admin.role === 'ADMIN') {
        console.log('Admin already exists:', adminPhone);
      } else {
        admin.role = 'ADMIN';
        admin.name = adminName;
        admin.email = adminEmail;
        admin.isProfileComplete = true;
        await admin.save();
        console.log('User upgraded to admin:', adminPhone);
      }
    } else {
      admin = await User.create({
        phone: adminPhone,
        name: adminName,
        email: adminEmail,
        role: 'ADMIN',
        isProfileComplete: true,
      });
      console.log('Admin created:', adminPhone);
    }

    console.log('\nAdmin Details:');
    console.log('Phone:', admin.phone);
    console.log('Name:', admin.name);
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
