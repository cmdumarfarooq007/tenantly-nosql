const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Project = require('../models/Project');
require('dotenv').config();

async function seedSubmissionData() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tenantly-nosql';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }
    console.log('🌱 Seeding Submission Data into MongoDB (tenantly-nosql)...');

    // 1. Create Super Admin
    const superHash = await bcrypt.hash('Admin@123', 10);
    let superAdmin = await User.findOne({ email: 'superadmin@system.com' });
    if (!superAdmin) {
      superAdmin = await User.create({
        email: 'superadmin@system.com',
        password_hash: superHash,
        full_name: 'Super Admin',
        role: 'super_admin',
        tenant_id: null
      });
      console.log('✅ Super Admin created');
    }

    // 2. Create Evaluation Tenant
    let tenant = await Tenant.findOne({ subdomain: 'eval' });
    if (!tenant) {
      tenant = await Tenant.create({
        name: 'Evaluation Corp',
        subdomain: 'eval',
        status: 'active',
        subscription_plan: 'pro',
        max_users: 10,
        max_projects: 10
      });
      console.log('✅ Evaluation Tenant created');
    }

    // 3. Create Tenant Admin
    const adminHash = await bcrypt.hash('Demo@123', 10);
    let admin = await User.findOne({ email: 'admin@eval.com', tenant_id: tenant._id });
    if (!admin) {
      admin = await User.create({
        tenant_id: tenant._id,
        email: 'admin@eval.com',
        password_hash: adminHash,
        full_name: 'Eval Admin',
        role: 'tenant_admin'
      });
      console.log('✅ Eval Admin created');
    }

    // 4. Create Normal User
    const userHash = await bcrypt.hash('User@123', 10);
    let user = await User.findOne({ email: 'user1@eval.com', tenant_id: tenant._id });
    if (!user) {
      user = await User.create({
        tenant_id: tenant._id,
        email: 'user1@eval.com',
        password_hash: userHash,
        full_name: 'Eval User 1',
        role: 'user'
      });
      console.log('✅ Eval User 1 created');
    }

    // 5. Create Project
    let project = await Project.findOne({ tenant_id: tenant._id, name: 'Evaluation Project A' });
    if (!project && admin) {
      project = await Project.create({
        tenant_id: tenant._id,
        name: 'Evaluation Project A',
        description: 'Project for automated testing',
        status: 'active',
        created_by: admin._id,
        assigned_members: user ? [user._id] : []
      });
      console.log('✅ Evaluation Project A created');
    }

    console.log('🎉 Submission Data Seeded Successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    process.exit(0);
  }
}

seedSubmissionData();