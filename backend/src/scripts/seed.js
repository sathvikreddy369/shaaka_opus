const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../config/database');
const { Category, Product, User } = require('../models');

// Test users that can bypass OTP verification
const testUsers = [
  {
    phone: '9999999999',
    name: 'Admin User',
    email: 'admin@shaaka.com',
    role: 'ADMIN',
    isProfileComplete: true,
  },
  {
    phone: '9999999998',
    name: 'Test User',
    email: 'user@shaaka.com',
    role: 'USER',
    isProfileComplete: true,
  },
  {
    phone: '9999999997',
    name: 'Test User 2',
    email: 'user2@shaaka.com',
    role: 'USER',
    isProfileComplete: true,
  },
  {
    phone: '9876543210',
    name: 'Demo Admin',
    email: 'demo@shaaka.com',
    role: 'ADMIN',
    isProfileComplete: true,
  },
  {
    phone: '9876543211',
    name: 'Demo User',
    email: 'demouser@shaaka.com',
    role: 'USER',
    isProfileComplete: true,
  },
];

const categories = [
  {
    name: 'Spices',
    slug: 'spices',
    description: 'Organic and natural spices sourced directly from farms',
    displayOrder: 1,
  },
  {
    name: 'Pulses & Lentils',
    slug: 'pulses-lentils',
    description: 'Healthy organic pulses and lentils',
    displayOrder: 2,
  },
  {
    name: 'Honey',
    slug: 'honey',
    description: 'Pure organic honey from sustainable apiaries',
    displayOrder: 3,
  },
  {
    name: 'Ghee & Oils',
    slug: 'ghee-oils',
    description: 'Pure desi ghee and cold-pressed oils',
    displayOrder: 4,
  },
  {
    name: 'Rice & Grains',
    slug: 'rice-grains',
    description: 'Organic rice and whole grains',
    displayOrder: 5,
  },
  {
    name: 'Dry Fruits',
    slug: 'dry-fruits',
    description: 'Premium quality dry fruits and nuts',
    displayOrder: 6,
  },
  {
    name: 'Jaggery & Sweeteners',
    slug: 'jaggery-sweeteners',
    description: 'Natural sweeteners and organic jaggery',
    displayOrder: 7,
  },
  {
    name: 'Flours',
    slug: 'flours',
    description: 'Stone-ground organic flours',
    displayOrder: 8,
  },
];

const sampleProducts = [
  {
    name: 'Organic Turmeric Powder',
    description: 'Premium quality organic turmeric powder with high curcumin content. Sourced directly from farmers in Andhra Pradesh.',
    constituents: '100% Pure Turmeric (Curcuma longa)',
    categorySlug: 'spices',
    quantityOptions: [
      { quantity: '100g', price: 65, discountPercent: 10, stock: 50 },
      { quantity: '250g', price: 150, discountPercent: 12, stock: 30 },
      { quantity: '500g', price: 280, discountPercent: 15, stock: 20 },
    ],
    isFeatured: true,
  },
  {
    name: 'Red Chilli Powder',
    description: 'Authentic Guntur red chilli powder with perfect heat and vibrant color. No artificial colors added.',
    constituents: '100% Pure Red Chilli (Capsicum annuum)',
    categorySlug: 'spices',
    quantityOptions: [
      { quantity: '100g', price: 55, discountPercent: 0, stock: 60 },
      { quantity: '250g', price: 130, discountPercent: 5, stock: 40 },
      { quantity: '500g', price: 250, discountPercent: 8, stock: 25 },
    ],
    isFeatured: true,
  },
  {
    name: 'Organic Coriander Powder',
    description: 'Freshly ground organic coriander seeds with aromatic flavor.',
    constituents: '100% Organic Coriander Seeds',
    categorySlug: 'spices',
    quantityOptions: [
      { quantity: '100g', price: 45, discountPercent: 0, stock: 70 },
      { quantity: '250g', price: 100, discountPercent: 5, stock: 50 },
    ],
    isFeatured: false,
  },
  {
    name: 'Organic Toor Dal',
    description: 'Premium quality organic toor dal (pigeon pea). Rich in protein and fiber.',
    constituents: '100% Organic Toor Dal',
    categorySlug: 'pulses-lentils',
    quantityOptions: [
      { quantity: '500g', price: 95, discountPercent: 5, stock: 40 },
      { quantity: '1kg', price: 180, discountPercent: 8, stock: 30 },
      { quantity: '2kg', price: 350, discountPercent: 10, stock: 15 },
    ],
    isFeatured: true,
  },
  {
    name: 'Organic Moong Dal',
    description: 'Split green gram dal, easy to digest and rich in nutrients.',
    constituents: '100% Organic Moong Dal',
    categorySlug: 'pulses-lentils',
    quantityOptions: [
      { quantity: '500g', price: 110, discountPercent: 0, stock: 35 },
      { quantity: '1kg', price: 210, discountPercent: 5, stock: 25 },
    ],
    isFeatured: false,
  },
  {
    name: 'Wild Forest Honey',
    description: 'Pure wild forest honey collected from the forests of Eastern Ghats. Raw and unprocessed.',
    constituents: '100% Pure Wild Honey',
    categorySlug: 'honey',
    quantityOptions: [
      { quantity: '250g', price: 280, discountPercent: 5, stock: 25 },
      { quantity: '500g', price: 520, discountPercent: 8, stock: 20 },
      { quantity: '1kg', price: 980, discountPercent: 10, stock: 10 },
    ],
    isFeatured: true,
  },
  {
    name: 'Multiflora Honey',
    description: 'Premium multiflora honey with natural floral notes. Perfect for daily use.',
    constituents: '100% Pure Multiflora Honey',
    categorySlug: 'honey',
    quantityOptions: [
      { quantity: '250g', price: 220, discountPercent: 0, stock: 30 },
      { quantity: '500g', price: 420, discountPercent: 5, stock: 20 },
    ],
    isFeatured: false,
  },
  {
    name: 'A2 Desi Cow Ghee',
    description: 'Pure A2 desi cow ghee made using traditional bilona method. Rich aroma and golden color.',
    constituents: '100% Pure A2 Cow Milk',
    categorySlug: 'ghee-oils',
    quantityOptions: [
      { quantity: '250ml', price: 450, discountPercent: 5, stock: 20 },
      { quantity: '500ml', price: 850, discountPercent: 8, stock: 15 },
      { quantity: '1L', price: 1600, discountPercent: 10, stock: 10 },
    ],
    isFeatured: true,
  },
  {
    name: 'Cold Pressed Coconut Oil',
    description: 'Virgin cold pressed coconut oil. Perfect for cooking and hair care.',
    constituents: '100% Pure Coconut',
    categorySlug: 'ghee-oils',
    quantityOptions: [
      { quantity: '500ml', price: 320, discountPercent: 0, stock: 25 },
      { quantity: '1L', price: 600, discountPercent: 5, stock: 15 },
    ],
    isFeatured: false,
  },
  {
    name: 'Organic Basmati Rice',
    description: 'Premium aged organic basmati rice with long grains and aromatic flavor.',
    constituents: '100% Organic Basmati Rice',
    categorySlug: 'rice-grains',
    quantityOptions: [
      { quantity: '1kg', price: 180, discountPercent: 5, stock: 30 },
      { quantity: '2kg', price: 350, discountPercent: 8, stock: 20 },
      { quantity: '5kg', price: 850, discountPercent: 10, stock: 10 },
    ],
    isFeatured: true,
  },
  {
    name: 'Organic Brown Rice',
    description: 'Nutritious organic brown rice with high fiber content.',
    constituents: '100% Organic Brown Rice',
    categorySlug: 'rice-grains',
    quantityOptions: [
      { quantity: '1kg', price: 120, discountPercent: 0, stock: 25 },
      { quantity: '2kg', price: 230, discountPercent: 5, stock: 15 },
    ],
    isFeatured: false,
  },
  {
    name: 'Premium Almonds',
    description: 'California almonds, rich in vitamin E and healthy fats.',
    constituents: '100% Premium Almonds',
    categorySlug: 'dry-fruits',
    quantityOptions: [
      { quantity: '250g', price: 320, discountPercent: 5, stock: 30 },
      { quantity: '500g', price: 620, discountPercent: 8, stock: 20 },
      { quantity: '1kg', price: 1200, discountPercent: 10, stock: 10 },
    ],
    isFeatured: true,
  },
  {
    name: 'Organic Jaggery Powder',
    description: 'Chemical-free organic jaggery powder. A healthy alternative to sugar.',
    constituents: '100% Organic Sugarcane',
    categorySlug: 'jaggery-sweeteners',
    quantityOptions: [
      { quantity: '500g', price: 95, discountPercent: 0, stock: 40 },
      { quantity: '1kg', price: 180, discountPercent: 5, stock: 25 },
    ],
    isFeatured: false,
  },
  {
    name: 'Whole Wheat Flour',
    description: 'Stone-ground organic whole wheat flour (atta). Rich in fiber and nutrients.',
    constituents: '100% Organic Wheat',
    categorySlug: 'flours',
    quantityOptions: [
      { quantity: '1kg', price: 65, discountPercent: 0, stock: 50 },
      { quantity: '5kg', price: 300, discountPercent: 8, stock: 20 },
      { quantity: '10kg', price: 580, discountPercent: 10, stock: 10 },
    ],
    isFeatured: true,
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await Category.deleteMany({});
    await Product.deleteMany({});

    // Seed test users
    console.log('Seeding test users...');
    for (const userData of testUsers) {
      const existingUser = await User.findOne({ phone: userData.phone });
      if (existingUser) {
        // Update existing user
        Object.assign(existingUser, userData);
        await existingUser.save();
        console.log(`Updated user: ${userData.phone} (${userData.role})`);
      } else {
        await User.create(userData);
        console.log(`Created user: ${userData.phone} (${userData.role})`);
      }
    }

    // Seed categories
    console.log('\nSeeding categories...');
    const createdCategories = await Category.insertMany(categories);
    console.log(`Created ${createdCategories.length} categories`);

    // Create category map
    const categoryMap = {};
    createdCategories.forEach((cat) => {
      categoryMap[cat.slug] = cat._id;
    });

    // Seed products
    console.log('Seeding products...');
    const productsToCreate = sampleProducts.map((product) => {
      const { categorySlug, ...productData } = product;
      
      // Calculate selling prices
      const quantityOptions = productData.quantityOptions.map((opt) => {
        const discount = (opt.price * (opt.discountPercent || 0)) / 100;
        return {
          ...opt,
          sellingPrice: opt.price - discount,
          discountFlat: 0,
        };
      });

      return {
        ...productData,
        category: categoryMap[categorySlug],
        quantityOptions,
        slug: productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        images: [], // Add images later via admin panel
      };
    });

    const createdProducts = await Product.insertMany(productsToCreate);
    console.log(`Created ${createdProducts.length} products`);

    // Update category product counts
    for (const category of createdCategories) {
      await Category.updateProductCount(category._id);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\nSeeded data:');
    console.log(`- ${testUsers.length} test users`);
    console.log(`- ${createdCategories.length} categories`);
    console.log(`- ${createdProducts.length} products`);
    
    console.log('\n📱 Test Login Credentials (OTP bypass enabled):');
    console.log('┌─────────────────┬──────────────┬────────┐');
    console.log('│ Phone           │ Name         │ Role   │');
    console.log('├─────────────────┼──────────────┼────────┤');
    testUsers.forEach(u => {
      console.log(`│ ${u.phone.padEnd(15)} │ ${u.name.padEnd(12)} │ ${u.role.padEnd(6)} │`);
    });
    console.log('└─────────────────┴──────────────┴────────┘');
    console.log('\n💡 Use OTP: 123456 for these test numbers');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
