const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail, sendRegistrationOtp } = require('../services/emailService');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, username } = req.body;

    // Validations
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long' });
    }
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!email || !emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Validate username if provided
    if (username) {
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ message: 'Username must be 3-30 characters long' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ message: 'Username can only contain letters, numbers and underscores' });
      }
      const usernameExists = await User.findOne({ username: username.toLowerCase() });
      if (usernameExists) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Check if user exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Create user (unverified by default)
    const user = await User.create({
      name,
      email,
      password,
      username: username ? username.toLowerCase() : undefined,
      isVerified: false,
      otp,
      otpExpire,
    });

    // Send verification OTP email
    try {
      console.log('📧 Sending registration OTP to:', email);
      await sendRegistrationOtp(email, name, otp);
      console.log('✅ OTP sent successfully to:', email);
    } catch (emailError) {
      console.error('❌ OTP email failed:', emailError.message);
    }

    res.status(201).json({
      message: 'OTP sent to your email. Please verify your account.',
      email: user.email,
      requiresVerification: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/username and password are required' });
    }

    // Find user by email OR username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      // Generate new OTP and send it
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpire = Date.now() + 15 * 60 * 1000; // 15 mins
      await user.save();

      try {
        console.log('📧 Sending new registration OTP to unverified user:', user.email);
        await sendRegistrationOtp(user.email, user.name, otp);
      } catch (err) {
        console.error('Failed to resend OTP during login:', err);
      }

      return res.status(403).json({
        message: 'Account is not verified. A verification OTP has been sent to your email.',
        email: user.email,
        requiresVerification: true,
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    console.log('🔓 User logged in:', {
      email: user.email,
      username: user.username,
      role: user.role,
      token: token.substring(0, 20) + '...'
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      address: user.address,
      phone: user.phone,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (req.body.name) user.name = req.body.name;
    if (req.body.phone) user.phone = req.body.phone;
    if (req.body.address) user.address = req.body.address;

    // Handle username update
    if (req.body.username && req.body.username !== user.username) {
      const newUsername = req.body.username.toLowerCase();
      if (!/^[a-zA-Z0-9_]+$/.test(newUsername) || newUsername.length < 3 || newUsername.length > 30) {
        return res.status(400).json({ message: 'Username must be 3-30 characters, letters/numbers/underscores only' });
      }
      const taken = await User.findOne({ username: newUsername, _id: { $ne: user._id } });
      if (taken) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = newUsername;
    }

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      address: user.address,
      phone: user.phone,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const result = await sendEmail(email, 'Password Reset', 'passwordReset', {
      name: user.name,
      resetLink,
    });

    if (!result || !result.success) {
      return res.status(500).json({ message: result?.error || 'Failed to send password reset email' });
    }

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const newToken = generateToken(decoded.id);

    res.json({ token: newToken });
  } catch (_) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    user.isVerified = true;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (_) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// @desc    Verify registration OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account is already verified' });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpire < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Mark verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    // Send welcome email now!
    try {
      await sendEmail(user.email, 'Welcome to RongRani', 'welcome', { name: user.name });
      await sendEmail(
        process.env.SUPER_ADMIN_EMAIL || 'info.rongrani@gmail.com',
        '🆕 New User Registered - RongRani',
        'adminNewUser',
        { userName: user.name, userEmail: user.email, registeredAt: new Date().toLocaleString() }
      );
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
    }

    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resend registration OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account is already verified' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    await sendRegistrationOtp(user.email, user.name, otp);

    res.json({ message: 'New OTP sent to email' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyOtp,
  resendOtp,
};