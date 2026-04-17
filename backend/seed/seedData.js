const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const Product  = require('../models/Product');
const User     = require('../models/User');
const connectDB = require('../config/db');

dotenv.config();
connectDB();

const products = [
    {
        name: 'Hackathon Hoodie 2026',
        sku:  'BF-HOOD-2026',
        category: 'clothing',
        price: 59.99,
        image: 'assets/images/hoodie.png',
        description: 'Exclusive premium hoodie. Built for hackathon participants and active developers. Show off your skills with this official BackForge item, designed for maximum efficiency and style during long sprints.',
        stock: 25,
        featured: true,
        isActive: true
    },
    {
        name: 'Code Powered T-Shirt',
        sku:  'BF-TSHIRT-001',
        category: 'clothing',
        price: 29.99,
        image: 'assets/images/tshirt.png',
        description: 'Premium quality developer t-shirt with unique code-inspired graphics. Comfortable cotton blend perfect for hackathons and coding sessions.',
        stock: 40,
        featured: true,
        isActive: true
    },
    {
        name: 'Premium Dev Backpack',
        sku:  'BF-BAG-PRO',
        category: 'accessories',
        price: 89.99,
        image: 'assets/images/backpack.png',
        description: 'Durable, water-resistant backpack designed for developers on the go. Features padded laptop compartment, multiple organizer pockets, and ergonomic design.',
        stock: 15,
        featured: true,
        isActive: true
    },
    {
        name: 'API Access Token (1Yr)',
        sku:  'DIG-API-1YR',
        category: 'digital',
        price: 149.99,
        image: 'assets/images/api_token.png',
        description: 'One year of premium API access for BackForge services. Includes priority support, higher rate limits, and exclusive developer tools.',
        stock: 100,
        featured: true,
        isActive: true
    },
    {
        name: 'Developer Sticker Pack',
        sku:  'BF-STCK-V1',
        category: 'accessories',
        price: 14.99,
        image: 'assets/images/stickers.png',
        description: 'A collection of premium developer stickers featuring popular frameworks, languages, and the BackForge logo. Perfect for laptops and gear.',
        stock: 200,
        featured: false,
        isActive: true
    },
    {
        name: 'ForgeCart Coffee Mug',
        sku:  'BF-MUG-001',
        category: 'accessories',
        price: 19.99,
        image: 'assets/images/mug.png',
        description: 'Official BackForge ceramic coffee mug. Keeps your brew hot during late-night coding sessions. Microwave and dishwasher safe.',
        stock: 3,  // Low stock for demo of Low Stock badge
        featured: false,
        isActive: true
    }
];

const importData = async () => {
    try {
        // Drop existing products (they lack SKU)
        await Product.deleteMany();
        console.log('Existing products cleared.');

        // Upsert demo user
        const existingUser = await User.findOne({ email: 'demo@backforge.com' });
        if (!existingUser) {
            await User.create({
                name:     'Demo Developer',
                email:    'demo@backforge.com',
                password: 'demo1234',
                role:     'user'
            });
            console.log('✅ Demo user created: demo@backforge.com / demo1234');
        } else {
            console.log('ℹ️  Demo user already exists.');
        }

        // Upsert admin user
        const existingAdmin = await User.findOne({ email: 'admin@backforge.com' });
        if (!existingAdmin) {
            await User.create({
                name:     'Admin',
                email:    'admin@backforge.com',
                password: 'admin1234',
                role:     'admin'
            });
            console.log('✅ Admin user created: admin@backforge.com / admin1234');
        } else {
            console.log('ℹ️  Admin user already exists.');
        }

        // Insert products with SKU
        const inserted = await Product.insertMany(products);

        console.log('\n🎉 Seed data imported successfully!');
        console.log(`   - ${inserted.length} products (with SKU)`);
        console.log('\nDemo accounts:');
        console.log('   Customer: demo@backforge.com / demo1234');
        console.log('   Admin:    admin@backforge.com / admin1234');
        process.exit(0);
    } catch (error) {
        console.error(`❌ Seed error: ${error.message}`);
        process.exit(1);
    }
};

importData();
