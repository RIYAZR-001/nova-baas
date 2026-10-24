const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecretnova_key_2026';

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = { 
      id: decoded.id || decoded.userId, 
      userId: decoded.id || decoded.userId,
      username: decoded.username 
    };
    
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

const authenticateToken = authenticate;

module.exports = { authenticate, authenticateToken };