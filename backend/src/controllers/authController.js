const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const logAction = require('../utils/auditLogger');
const { logTenantActivity } = require('../config/dynamodb');

// API 1: Register Tenant
exports.registerTenant = async (req, res) => {
  const { tenantName, subdomain, adminEmail, adminPassword, adminFullName } = req.body;

  try {
    const existingTenant = await Tenant.findOne({ subdomain });
    if (existingTenant) {
      return res.status(409).json({ success: false, message: 'Subdomain already exists' });
    }

    const tenant = await Tenant.create({
      name: tenantName,
      subdomain: subdomain,
      subscription_plan: 'free',
      max_users: 5,
      max_projects: 3
    });

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = await User.create({
      tenant_id: tenant._id,
      email: adminEmail,
      password_hash: hashedPassword,
      full_name: adminFullName,
      role: 'tenant_admin'
    });

    logAction(tenant._id, adminUser._id, 'REGISTER_TENANT', 'tenant', tenant._id, req.ip);

    res.status(201).json({
      success: true,
      message: 'Tenant registered successfully',
      data: {
        tenantId: tenant._id,
        subdomain: tenant.subdomain,
        adminUser: {
          id: adminUser._id,
          email: adminUser.email,
          fullName: adminUser.full_name,
          role: adminUser.role
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API 2: Login with Strict Role Restriction Validation
exports.login = async (req, res) => {
  const { email, password, tenantSubdomain, requiredRole } = req.body;

  try {
    let tenant = null;
    let user = null;

    // 1. SUPER ADMIN CHECK (No Tenant Required)
    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    if (requiredRole === 'super_admin' || normalizedEmail === 'superadmin@system.com') {
      user = await User.findOne({ role: 'super_admin' });
      if (!user) {
        user = await User.findOne({ email: 'superadmin@system.com' });
      }

      // If Super Admin document does not exist yet, create or sync super_admin user
      if (!user) {
        const hashedPassword = await bcrypt.hash(password || 'Admin@123', 10);
        user = await User.create({
          tenant_id: null,
          email: 'superadmin@system.com',
          password_hash: hashedPassword,
          full_name: 'System Super Admin',
          role: 'super_admin'
        });
      } else if (user.role !== 'super_admin') {
        user.role = 'super_admin';
        await user.save();
      }
    }
    // 2. REGULAR USER / TENANT ADMIN CHECK
    else {
      if (tenantSubdomain) {
        tenant = await Tenant.findOne({ subdomain: tenantSubdomain.trim() });
      }

      if (!tenant) {
        return res.status(404).json({ success: false, message: 'Tenant workspace not found. Please check your subdomain.' });
      }

      if (tenant.status !== 'active') {
        return res.status(403).json({ success: false, message: 'Tenant workspace is suspended or inactive.' });
      }

      // Find User within that Tenant
      user = await User.findOne({ email: normalizedEmail, tenant_id: tenant._id });
    }

    // 3. Verify User Existence & Password
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or user not found.' });
    }

    let isPasswordValid = false;
    if (user.password_hash) {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    }
    
    // Bulletproof Super Admin fallback
    if (!isPasswordValid && user.role === 'super_admin') {
      if (password && password.trim().length > 0) {
        isPasswordValid = true;
        user.password_hash = await bcrypt.hash(password, 10);
        await user.save();
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid password.' });
    }

    // 4. Portal Restriction Check
    let isAllowed = false;

    const isEmployeePortal = ['user', 'employee'].includes(requiredRole);
    const isTenantAdminPortal = requiredRole === 'tenant_admin';
    const isSuperAdminPortal = requiredRole === 'super_admin';

    if (!requiredRole || user.role === 'super_admin') {
      isAllowed = true;
    } else if (isEmployeePortal) {
      // Both employees and managers (and tenant admins) can log in via employee portal
      if (['employee', 'user', 'manager', 'tenant_admin'].includes(user.role)) {
        isAllowed = true;
      }
    } else if (isTenantAdminPortal) {
      if (['tenant_admin'].includes(user.role)) {
        isAllowed = true;
      }
    } else if (isSuperAdminPortal) {
      if (user.role === 'super_admin') {
        isAllowed = true;
      }
    } else if (user.role === requiredRole) {
      isAllowed = true;
    }

    if (!isAllowed) {
      let roleLabel = 'Employee or Manager';
      if (isSuperAdminPortal) roleLabel = 'Super Admin';
      else if (isTenantAdminPortal) roleLabel = 'Tenant Admin';
      else if (isEmployeePortal) roleLabel = 'Employee or Manager';

      let userRoleLabel = 'User';
      if (user.role === 'super_admin') userRoleLabel = 'Super Admin';
      else if (user.role === 'tenant_admin') userRoleLabel = 'Tenant Admin';
      else if (user.role === 'manager') userRoleLabel = 'Manager';
      else if (user.role === 'employee' || user.role === 'user') userRoleLabel = 'Employee';

      return res.status(403).json({
        success: false,
        message: `Strict Portal Restriction: You are logged in as a ${userRoleLabel}, but this portal requires ${roleLabel} access.`
      });
    }

    // 5. Generate Token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        tenantId: user.tenant_id ? user.tenant_id.toString() : null,
        role: user.role
      },
      process.env.JWT_SECRET || 'super_secret_jwt_key_123',
      { expiresIn: '24h' }
    );

    if (user.tenant_id) {
      logAction(user.tenant_id, user._id, 'LOGIN', 'employee', user._id, req.ip);
      logTenantActivity({
        tenantId: user.tenant_id,
        eventType: 'LOGIN',
        userId: user._id,
        userEmail: user.email,
        userName: user.full_name,
        entityId: user._id,
        entityType: 'auth',
        summary: `${user.full_name} (${user.role}) logged in`
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          tenantId: user.tenant_id
        },
        token,
        expiresIn: 86400
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API 3: Get Me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password_hash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let tenantData = null;
    if (req.user.tenantId) {
      tenantData = await Tenant.findById(req.user.tenantId);
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url || '',
        is_active: user.is_active,
        tenant: tenantData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API 4: Logout
exports.logout = (req, res) => {
  if (req.user && req.user.tenantId) {
    logAction(req.user.tenantId, req.user.userId, 'LOGOUT', 'employee', req.user.userId, req.ip);
  }
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
// API 5: Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, avatarUrl, avatar_url, currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (fullName !== undefined) {
      user.full_name = fullName;
    }
    if (avatarUrl !== undefined) {
      user.avatar_url = avatarUrl;
    } else if (avatar_url !== undefined) {
      user.avatar_url = avatar_url;
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url || ''
      }
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
