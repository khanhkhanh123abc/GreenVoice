import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    if (!email || !email.endsWith("@univoice.vn"))
      return res.status(400).json({ message: "Only @univoice.vn emails are allowed." });

    // Validate phone
    if (!phone || !/^0\d{9}$/.test(phone))
      return res.status(400).json({ message: "Phone must start with 0 and be exactly 10 digits." });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hashed, department, phone, role: 'Student'
    });
    res.status(201).json({ message: "Registered successfully", userId: user._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Giữ lại bản có termsAgreed để đồng bộ với tính năng đồng thuận của bạn
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        termsAgreed: user.termsAgreed
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getProfile = async (req, res) => {
  res.json(req.user);
};

export const updateProfile = async (req, res) => {
  try {
    const { name, department, phone } = req.body;

    // Server-side phone validation
    if (!phone) return res.status(400).json({ message: "Phone number is required." });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: "Phone number must be exactly 10 digits." });
    if (!phone.startsWith("0")) return res.status(400).json({ message: "Phone number must start with 0." });

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { name, department, phone },
      { returnDocument: 'after' }
    ).select("-password");
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const agreeToTerms = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { termsAgreed: true });
    res.json({ message: "Terms agreed" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};