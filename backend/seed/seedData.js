const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config();
connectDB();

const categories = [
    { name: 'clothing' },
    { name: 'digital' },
    { name: 'accessories' }
];

const products = [
    {
        name: 'Hackathon Hoodie 2026',
        category: 'clothing',
        price: 59.99,
        image: 'assets/images/hoodie.png',
        description: 'Exclusive premium clothing. Built for hackathon participants and active developers. Show off your skills with this official BackForge item, designed for maximum efficiency and style during long sprints.',
        stock: 25,
        featured: true
    },
    {
        name: 'Code Powered T-Shirt',
        category: 'clothing',
        price: 29.99,
        image: 'assets/images/tshirt.png',
        description: 'Premium quality developer t-shirt with unique code-inspired graphics. Comfortable cotton blend perfect for hackathons and coding sessions.',
        stock: 40,
        featured: true
    },
    {
        name: 'Premium Dev Backpack',
        category: 'accessories',
        price: 89.99,
        image: 'assets/images/backpack.png',
        description: 'Durable, water-resistant backpack designed for developers on the go. Features padded laptop compartment, multiple organizer pockets, and ergonomic design.',
        stock: 15,
        featured: true
    },
    {
        name: 'API Access Token (1Yr)',
        category: 'digital',
        price: 149.99,
        image: 'assets/images/api_token.png',
        description: 'One year of premium API access for BackForge services. Includes priority support, higher rate limits, and exclusive developer tools.',
        stock: 100,
        featured: true
    },
    {
        name: 'Developer Sticker Pack',
        category: 'accessories',
        price: 14.99,
        image: 'assets/images/stickers.png',
        description: 'A collection of premium developer stickers featuring popular frameworks, languages, and the BackForge logo. Perfect for laptops and gear.',
        stock: 200,
        featured: false
    },
    {
        name: 'ForgeCart Coffee Mug',
        category: 'accessories',
        price: 19.99,
        image: 'assets/images/mug.png',
        description: 'Official BackForge ceramic coffee mug. Keeps your brew hot during late-night coding sessions. Microwave and dishwasher safe.',
        stock: 50,
        featured: false
    }
];

const importData = async () => {
    try {
        await Category.deleteMany();
        await Product.deleteMany();

        // Create a demo user for testing
        const existingUser = await User.findOne({ email: 'demo@backforge.com' });
        if (!existingUser) {
            await User.create({
                name: 'Demo Developer',
                email: 'demo@backforge.com',
                password: 'demo1234',
                role: 'user'
            });
            console.log('Demo user created: demo@backforge.com / demo1234');
        }

        // Create an admin user
        const existingAdmin = await User.findOne({ email: 'admin@backforge.com' });
        if (!existingAdmin) {
            await User.create({
                name: 'Admin',
                email: 'admin@backforge.com',
                password: 'admin1234',
                role: 'admin'
            });
            console.log('Admin user created: admin@backforge.com / admin1234');
        }

        await Category.insertMany(categories);
        await Product.insertMany(products);

        console.log('All seed data imported successfully!');
        console.log(`  - ${categories.length} categories`);
        console.log(`  - ${products.length} products`);
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

importData();
