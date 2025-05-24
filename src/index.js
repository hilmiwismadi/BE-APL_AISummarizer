const express = require("express");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Use proper env variable in production

app.use(express.json());
app.use(cookieParser());

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token" });
  }
};

app.use(cors({
  origin: 'http://localhost:5173', // Your React dev server URL
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic API route
app.get("/api", (req, res) => {
  res.send("Selamat datang di API Summarization");
});

// 1. Create User (Register)
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("❌ Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// 2. Login and save cookie
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    
    // Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    
    // Create and assign token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      maxAge: 3600000 // 1 hour
    });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(200).json({
      message: "Logged in successfully",
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error("❌ Error during login:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout - clear cookie
app.post("/api/logout", (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: "Logged out successfully" });
});

// 3 & 4. Send text to be summarized and return AI output
app.post("/api/summarize", authenticateToken, async (req, res) => {
  try {
    const { inputText, summaryText, modelUsed } = req.body;
    const userId = req.user.id;
    
    // console.log("📨 Backend received data:");
    // console.log("👤 User ID:", userId);
    // console.log("📝 Input text length:", inputText?.length);
    // console.log("📄 Summary text:", summaryText);
    // console.log("🤖 Model used:", modelUsed);
    
    // Validation
    if (!inputText) {
      console.error("❌ Input text is required");
      return res.status(400).json({ error: "Input text is required" });
    }
    
    if (!summaryText) {
      console.error("❌ Summary text is required");
      return res.status(400).json({ error: "Summary text is required" });
    }
    
    // Save the summarization with the AI-generated summary
    const summary = await prisma.summarization.create({
      data: {
        userId,
        inputText,
        summaryText, // Menggunakan summaryText yang dikirim dari frontend
        modelUsed: modelUsed || "unknown-model",
      },
    });
    
    console.log("✅ Summary saved to database:", summary.id);
    console.log("📄 Saved summary text:", summary.summaryText.substring(0, 100) + "...");
    
    res.status(201).json(summary);
  } catch (error) {
    console.error("❌ Error creating summary:", error);
    console.error("❌ Error details:", error.message);
    res.status(500).json({ error: "Failed to create summary" });
  }
});

// 5. Get summaries for specific user
app.get("/api/summaries", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const summaries = await prisma.summarization.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    
    res.status(200).json(summaries);
  } catch (error) {
    console.error("❌ Error fetching summaries:", error);
    res.status(500).json({ error: "Failed to fetch summaries" });
  }
});

// Get specific summary by ID
app.get("/api/summaries/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const summary = await prisma.summarization.findFirst({
      where: { 
        id,
        userId // Ensure user can only access their own summaries
      },
    });
    
    if (!summary) {
      return res.status(404).json({ error: "Summary not found" });
    }
    
    res.status(200).json(summary);
  } catch (error) {
    console.error("❌ Error fetching summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// Get user profile
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});