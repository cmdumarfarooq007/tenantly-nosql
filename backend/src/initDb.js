const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const Tenant = require('./models/Tenant');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Client = require('./models/Client');
const Meeting = require('./models/Meeting');

const initDb = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tenantly-nosql';
    console.log('⏳ Connecting to MongoDB database (tenantly-nosql)...');
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }
    
    console.log('✅ Connected to MongoDB.');

    // Drop existing database if it exists as requested
    console.log('🗑️ Dropping existing tenantly-nosql database...');
    await mongoose.connection.db.dropDatabase();
    console.log('✅ Existing tenantly-nosql database dropped.');

    console.log('🔐 Generating secure password hashes...');
    const passwordHash = await bcrypt.hash('Admin@123', 10);

    console.log('🌱 Seeding fresh initial data...');

    // 1. Seed Demo Tenant
    const demoTenant = await Tenant.create({
      name: 'Demo Company',
      subdomain: 'demo',
      status: 'active',
      subscription_plan: 'pro',
      max_users: 10,
      max_projects: 10
    });
    console.log('✅ Demo tenant created.');

    // 2. Seed Tenant Admin (admin@demo.com)
    const tenantAdmin = await User.create({
      tenant_id: demoTenant._id,
      email: 'admin@demo.com',
      password_hash: passwordHash,
      full_name: 'Demo Admin',
      role: 'tenant_admin'
    });
    console.log('✅ Tenant admin created.');

    // 3. Seed Standard Users (user1@demo.com & user2@demo.com)
    const standardUser = await User.create({
      tenant_id: demoTenant._id,
      email: 'user1@demo.com',
      password_hash: passwordHash,
      full_name: 'Alex Johnson',
      role: 'user'
    });
    const standardUser2 = await User.create({
      tenant_id: demoTenant._id,
      email: 'user2@demo.com',
      password_hash: passwordHash,
      full_name: 'Sam Miller',
      role: 'user'
    });
    console.log('✅ Standard users created.');

    // 4. Seed Super Admin (superadmin@system.com)
    const superAdmin = await User.create({
      tenant_id: null,
      email: 'superadmin@system.com',
      password_hash: passwordHash,
      full_name: 'System Super Admin',
      role: 'super_admin'
    });
    console.log('✅ Super Admin created.');

    // 5. Seed Sample Projects
    const sampleProject = await Project.create({
      tenant_id: demoTenant._id,
      name: 'Website Redesign',
      description: 'Complete overhaul of tenant marketing and client portal',
      status: 'active',
      created_by: tenantAdmin._id,
      assigned_members: [standardUser._id, standardUser2._id]
    });
    const sampleProject2 = await Project.create({
      tenant_id: demoTenant._id,
      name: 'Mobile App Launch',
      description: 'Cross-platform app for tenants and clients',
      status: 'active',
      created_by: tenantAdmin._id,
      assigned_members: [standardUser._id]
    });
    console.log('✅ Sample projects created.');

    // 6. Seed Sample Tasks
    await Task.create([
      {
        project_id: sampleProject._id,
        tenant_id: demoTenant._id,
        title: 'Design UI Mockups',
        description: 'Figma mockups for landing page',
        status: 'in_progress',
        priority: 'high',
        assigned_to: tenantAdmin._id
      },
      {
        project_id: sampleProject._id,
        tenant_id: demoTenant._id,
        title: 'Set up Backend API',
        description: 'REST API endpoints setup with MongoDB & Redis',
        status: 'completed',
        priority: 'medium',
        assigned_to: standardUser._id
      },
      {
        project_id: sampleProject2._id,
        tenant_id: demoTenant._id,
        title: 'Push Notification Service',
        description: 'Configure real-time event alerts',
        status: 'todo',
        priority: 'high',
        assigned_to: standardUser2._id
      }
    ]);
    console.log('✅ Sample tasks created.');

    // 7. Seed Sample Clients
    const sampleClient1 = await Client.create({
      tenant_id: demoTenant._id,
      name: 'Acme Global Innovations',
      company_name: 'Acme Corp',
      contact_person: 'Jane Doe',
      email: 'jane@acme.com',
      phone: '+1 555 0192',
      location: 'New York, USA',
      industry: 'Technology',
      status: 'active',
      allotted_budget: 75000,
      assigned_to: tenantAdmin._id
    });
    const sampleClient2 = await Client.create({
      tenant_id: demoTenant._id,
      name: 'Starlight Media Group',
      company_name: 'Starlight Enterprises',
      contact_person: 'Robert Lang',
      email: 'robert@starlight.io',
      phone: '+1 555 0184',
      location: 'San Francisco, USA',
      industry: 'Media & Entertainment',
      status: 'active',
      allotted_budget: 45000,
      assigned_to: standardUser._id
    });
    console.log('✅ Sample clients created.');

    // 8. Seed Sample Meetings
    await Meeting.create([
      {
        tenant_id: demoTenant._id,
        client_id: sampleClient1._id,
        title: 'Q4 Product Roadmap & Sprint Planning',
        description: 'Review features and milestone timeline for project deliverables',
        start_time: new Date(Date.now() + 86400000), // Tomorrow
        end_time: new Date(Date.now() + 90000000),
        duration_minutes: 60,
        meeting_link: 'https://meet.google.com/abc-demo-xyz',
        status: 'scheduled',
        created_by: tenantAdmin._id,
        attendees: [tenantAdmin._id, standardUser._id]
      },
      {
        tenant_id: demoTenant._id,
        client_id: sampleClient2._id,
        title: 'Architecture & Scalability Discussion',
        description: 'Deep dive into MongoDB sharding, caching, and multi-tenant performance',
        start_time: new Date(Date.now() + 172800000), // Day after tomorrow
        end_time: new Date(Date.now() + 176400000),
        duration_minutes: 60,
        meeting_link: 'https://meet.google.com/xyz-starlight-demo',
        status: 'scheduled',
        created_by: tenantAdmin._id,
        attendees: [tenantAdmin._id, standardUser2._id]
      }
    ]);
    console.log('✅ Sample meetings created.');

    console.log('🎉 tenantly-nosql database initialization complete!');
    if (require.main === module) {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error initializing MongoDB database:', err);
    if (require.main === module) {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  initDb();
}

module.exports = initDb;